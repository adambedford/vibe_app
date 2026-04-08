class EditAppJob < ApplicationJob
  queue_as :generation

  def perform(session_id, edit_request)
    session = CreationSession.find(session_id)
    firebase = FirebaseClient.new

    existing_html = session.generated_version&.bundle_url
    firebase.update_status(session_id, status: "generating", progress: 50)

    result = AI::EditPipeline.call(existing_html, edit_request)

    if result.escalated
      GenerateFromPlanJob.perform_later(session_id)
      return
    end

    # Validate the edit
    validation = AI::Validator.call(result.html)

    if validation.passed?
      timestamp = Time.current.iso8601
      url = GcsClient.upload_bundle(session.app_id, result.html, timestamp: timestamp)
      screenshot_b64 = AI::Validator.screenshot(result.html)
      thumb_url = GcsClient.upload_thumbnail(session.app_id, screenshot_b64, timestamp: timestamp)

      version = AppVersion.create!(
        app_id: session.app_id,
        bundle_url: url,
        thumbnail_url: thumb_url,
        source: "edit"
      )

      session.app.update!(current_version_id: version.id)
      session.update!(generated_version_id: version.id)
      firebase.update_status(session_id, status: "complete", progress: 100, result_url: url)
    else
      firebase.update_status(session_id, status: "failed", error: "Edit validation failed")
    end
  end
end
