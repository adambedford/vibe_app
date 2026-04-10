class GenerateFromPlanJob < ApplicationJob
  queue_as :generation
  retry_on StandardError, wait: :polynomially_longer, attempts: 2
  discard_on ActiveRecord::RecordNotFound
  MAX_FIX_PASSES = 3

  def perform(session_id)
    session = CreationSession.find(session_id)
    firebase = FirebaseClient.new

    firebase.update_status(session_id, status: "generating", progress: 40)
    bundle_html = AI::Generator.call(
      plan: session.plan,
      enhanced_spec: session.enhanced_prompt,
      original_prompt: session.user_prompt,
      source_app_bundle: session.source_app&.current_version&.bundle_url
    )

    validate_and_finalize(session, bundle_html, firebase)
  end

  private

  def validate_and_finalize(session, html, firebase, pass: 0)
    firebase.update_status(session.id, status: "validating", progress: 80 + (pass * 5))
    result = AI::Validator.call(html)

    if result.passed?
      finalize_generation(session, html, result, firebase)
    elsif pass < MAX_FIX_PASSES
      retry_generation(session, html, result, firebase, pass)
    else
      session.add_error(
        error_type: "validation_failed",
        message: "We tried #{MAX_FIX_PASSES} times but couldn't get it working. Try a simpler idea.",
        details: result.failures.to_json,
        retryable: false
      )
      session.update!(status: "failed")
      firebase.update_status(session.id, status: "failed", error: "Generation failed after #{MAX_FIX_PASSES} fix attempts")
      AnalyticsTracker.track_generation(user_id: session.user_id, session_id: session.id,
        duration_seconds: ((Time.current - session.created_at) rescue 0).to_i,
        cost_usd: session.generation_cost || 0, fix_passes: session.fix_passes, success: false)
    end
  end

  def finalize_generation(session, html, result, firebase)
    timestamp = Time.current.iso8601
    url = GcsClient.upload_bundle(session.app_id, html, timestamp: timestamp)
    screenshot_b64 = AI::Validator.screenshot(html)
    thumb_url = GcsClient.upload_thumbnail(session.app_id, screenshot_b64, timestamp: timestamp)

    version = AppVersion.create!(
      app_id: session.app_id,
      bundle_url: url,
      thumbnail_url: thumb_url,
      source: "generation"
    )

    content_check = ContentModerationService.scan(
      text: result.extracted_text,
      screenshot: screenshot_b64
    )

    duration = ((Time.current - session.created_at) rescue 0).to_i

    if content_check.safe?
      session.app.update!(current_version_id: version.id)
      session.update!(generated_version_id: version.id, status: "completed", generation_cost: 0.30)
      firebase.update_status(session.id, status: "complete", progress: 100, result_url: url)
      AnalyticsTracker.track_generation(user_id: session.user_id, session_id: session.id,
        duration_seconds: duration, cost_usd: 0.30, fix_passes: session.fix_passes, success: true)
    else
      session.update!(generated_version_id: version.id, status: "under_review", generation_cost: 0.30)
      firebase.update_status(session.id, status: "under_review", progress: 100)
    end
  end

  def retry_generation(session, html, result, firebase, pass)
    firebase.update_status(session.id, status: "retrying", progress: 85 + (pass * 3))
    fix_instructions = AI::ErrorInterpreter.call(result.failures)
    session.increment!(:fix_passes)
    session.add_error(
      error_type: "validation_failed",
      message: "Fixing issues... (attempt #{pass + 1} of #{MAX_FIX_PASSES})",
      details: result.failures.to_json,
      retryable: true
    )

    retried_html = AI::Generator.call(
      plan: session.plan,
      enhanced_spec: session.enhanced_prompt,
      original_prompt: session.user_prompt,
      source_app_bundle: html,
      fix_instructions: fix_instructions
    )

    validate_and_finalize(session, retried_html, firebase, pass: pass + 1)
  end
end
