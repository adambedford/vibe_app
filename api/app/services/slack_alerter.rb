class SlackAlerter
  WEBHOOK_URL = ENV["SLACK_WEBHOOK_URL"]

  def self.alert(title:, message:, level: :warning)
    return unless WEBHOOK_URL.present?

    color = case level
            when :error then "#FF3B30"
            when :warning then "#FF9500"
            else "#007AFF"
            end

    HTTParty.post(WEBHOOK_URL, {
      headers: { "Content-Type" => "application/json" },
      body: {
        attachments: [ {
          color: color,
          title: title,
          text: message,
          ts: Time.current.to_i
        } ]
      }.to_json,
      timeout: 5
    })
  rescue StandardError => e
    Rails.logger.warn("Slack alert failed: #{e.message}")
  end

  def self.error_rate_alert(rate:, window_minutes:)
    alert(
      title: "Error rate spike",
      message: "Error rate is #{(rate * 100).round(1)}% over the last #{window_minutes} minutes",
      level: :error
    )
  end

  def self.ai_failure_alert(failure_rate:, window_minutes:)
    alert(
      title: "AI pipeline failure rate high",
      message: "#{(failure_rate * 100).round(1)}% of generations failed in the last #{window_minutes} minutes",
      level: :error
    )
  end

  def self.deploy_alert(service:, status:)
    alert(
      title: "Deploy: #{service}",
      message: "#{service} deployment #{status}",
      level: status == "failed" ? :error : :info
    )
  end
end
