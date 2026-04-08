module AI
  class PromptEnhancer
    SYSTEM_PROMPT = <<~PROMPT
      You are the Prompt Enhancer for Vibe, a platform where non-technical users create
      interactive apps by describing them in plain language. Your job is to transform
      vague user prompts into detailed, structured specifications.

      You receive the user's raw prompt and output a structured spec. You do NOT
      interact with the user.

      RULES:
      1. Never remove anything the user asked for — only ADD detail and structure.
      2. Infer reasonable defaults for anything unspecified.
      3. Add technical constraints (Phaser 3, Tone.js, touch-friendly, mobile WebView).
      4. If multiplayer, add: "Use window.vibe SDK for all multiplayer functionality."
      5. Choose ASSET_STRATEGY: svg | emoji | pixel_art | procedural | mixed
      6. Structure output as: APP_TYPE, TITLE_SUGGESTION, CORE_MECHANIC, FEATURES,
         VISUAL_STYLE, ASSET_STRATEGY, AUDIO_STYLE, MULTIPLAYER, COMPLEXITY_ESTIMATE
      7. CONTENT SAFETY — reject harmful content with { "rejected": true, "reason": "..." }
    PROMPT

    def self.call(messages, source_app = nil)
      prompt = messages.map { |m| m["content"] }.join("\n")
      prompt += "\n\nOriginal app context: #{source_app.title}" if source_app

      result = ModelProvider.complete(
        layer: :prompt_enhancer,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_tokens: 2000
      )

      parsed = parse_result(result)
      OpenStruct.new(
        spec: result,
        complexity_estimate: parsed[:complexity_estimate] || "medium",
        is_multiplayer: result.include?("MULTIPLAYER: real_time") || result.include?("MULTIPLAYER: turn_based"),
        rejected: result.include?('"rejected": true')
      )
    end

    def self.parse_result(text)
      {
        complexity_estimate: text.match(/COMPLEXITY_ESTIMATE:\s*(\w+)/)&.captures&.first
      }
    end
  end
end
