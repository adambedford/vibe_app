class AnalyticsTracker
  def self.track(user_id:, event:, properties: {})
    return unless ENV["AMPLITUDE_API_KEY"].present?

    AmplitudeAPI.track(
      AmplitudeAPI::Event.new(
        user_id: user_id.to_s,
        event_type: event,
        event_properties: properties,
        time: Time.current.to_i * 1000
      )
    )
  rescue StandardError => e
    Rails.logger.warn("Amplitude tracking failed: #{e.message}")
  end

  # AI pipeline events (server-side only)
  def self.track_generation(user_id:, session_id:, duration_seconds:, cost_usd:, fix_passes:, success:)
    track(
      user_id: user_id,
      event: success ? "creation_generation_completed" : "creation_generation_failed",
      properties: {
        session_id: session_id,
        duration_seconds: duration_seconds,
        cost_usd: cost_usd,
        fix_passes: fix_passes
      }
    )
  end

  def self.track_edit(user_id:, session_id:, edit_type:)
    track(
      user_id: user_id,
      event: "creation_edit_sent",
      properties: { session_id: session_id, edit_type: edit_type }
    )
  end

  def self.track_publish(user_id:, app_id:, session_id:)
    track(
      user_id: user_id,
      event: "creation_published",
      properties: { app_id: app_id, session_id: session_id }
    )
  end
end
