class ContentModerationService
  Result = Struct.new(:safe, :flags, keyword_init: true) do
    def safe?
      safe
    end
  end

  def self.scan(text:, screenshot: nil)
    text_safe = check_text(text)
    screenshot_safe = screenshot ? check_screenshot(screenshot) : Result.new(safe: true, flags: [])

    Result.new(
      safe: text_safe.safe? && screenshot_safe.safe?,
      flags: (text_safe.flags || []) + (screenshot_safe.flags || [])
    )
  end

  def self.check_text(text)
    return Result.new(safe: true, flags: []) if text.blank?

    result = AI::ModelProvider.complete(
      layer: :prompt_enhancer, # Reuse haiku-class model
      system: "You are a content safety classifier. Classify text as SAFE or UNSAFE. " \
              "Respond with ONLY a JSON object: { \"safe\": true } or { \"safe\": false, \"reason\": \"...\" }",
      prompt: text.truncate(4000),
      max_tokens: 100
    )

    parsed = JSON.parse(result) rescue { "safe" => true }
    Result.new(safe: parsed["safe"], flags: parsed["safe"] ? [] : [ parsed["reason"] ])
  end

  def self.check_screenshot(screenshot_base64)
    # Placeholder for AWS Rekognition or vision model integration
    Result.new(safe: true, flags: [])
  end
end
