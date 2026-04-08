class ContentModerationService
  Result = Struct.new(:safe, :flags, keyword_init: true) do
    def safe?
      safe
    end
  end

  def self.scan(text:, screenshot: nil)
    text_result = check_text(text)
    screenshot_result = screenshot ? check_screenshot(screenshot) : Result.new(safe: true, flags: [])

    Result.new(
      safe: text_result.safe? && screenshot_result.safe?,
      flags: (text_result.flags || []) + (screenshot_result.flags || [])
    )
  end

  def self.check_text(text)
    return Result.new(safe: true, flags: []) if text.blank?

    result = AI::ModelProvider.complete(
      layer: :prompt_enhancer,
      system: <<~PROMPT,
        You are a content safety classifier. You receive text extracted from
        a user-generated app. Classify it as SAFE or UNSAFE.

        UNSAFE means the text contains:
        - Slurs, hate speech, or dehumanizing language targeting real groups
        - Explicit sexual content
        - Detailed self-harm or suicide instructions
        - Personally identifiable information (phone numbers, addresses, SSNs)
        - Phishing language ("enter your password", "verify your account")

        SAFE means everything else, including:
        - Cartoon/fantasy violence ("shoot the aliens", "slay the dragon")
        - Mild profanity in casual context
        - Dark humor that doesn't target real groups
        - Competitive/aggressive game language ("destroy", "kill", "attack")

        Respond with ONLY a JSON object:
        { "safe": true } or { "safe": false, "reason": "..." }

        When in doubt, classify as SAFE. False positives are worse than edge cases.
      PROMPT
      prompt: text.truncate(4000),
      max_tokens: 100
    )

    parsed = JSON.parse(result) rescue { "safe" => true }
    Result.new(safe: parsed["safe"], flags: parsed["safe"] ? [] : [ parsed["reason"] ])
  end

  def self.check_screenshot(screenshot_base64)
    return Result.new(safe: true, flags: []) unless ENV["AWS_ACCESS_KEY_ID"].present?

    require "aws-sdk-rekognition"

    client = Aws::Rekognition::Client.new(
      region: ENV.fetch("AWS_REGION", "us-east-1"),
      credentials: Aws::Credentials.new(
        ENV["AWS_ACCESS_KEY_ID"],
        ENV["AWS_SECRET_ACCESS_KEY"]
      )
    )

    result = client.detect_moderation_labels(
      image: { bytes: Base64.decode64(screenshot_base64) },
      min_confidence: 75
    )

    flagged = result.moderation_labels.map(&:name)
    Result.new(safe: flagged.empty?, flags: flagged)
  rescue Aws::Rekognition::Errors::ServiceError => e
    Rails.logger.warn("Rekognition moderation check failed: #{e.message}")
    Result.new(safe: true, flags: [])
  end
end
