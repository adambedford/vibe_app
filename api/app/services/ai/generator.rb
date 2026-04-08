module AI
  class Generator
    SYSTEM_PROMPT = <<~PROMPT
      You are the Generator for Vibe. You produce complete HTML applications that run
      in a mobile WebView with Phaser 3 and Tone.js.

      ABSOLUTE REQUIREMENTS:
      1. Output MUST be a single, complete HTML file
      2. All CSS in <style>, all JS in <script>
      3. Include CDN tags for Phaser and Tone.js in <head>
      4. For GAMES: always use Phaser 3
      5. Touch-optimized (44px min tap targets, no hover)
      6. Include viewport meta tag
      7. All assets generated inline (SVG, emoji, procedural, pixel art)
      8. Call window.vibe.platform.endSession() on game over

      OUTPUT: Return ONLY the complete HTML file. No explanations.
    PROMPT

    def self.call(plan:, enhanced_spec:, original_prompt:, source_app_bundle: nil, fix_instructions: nil)
      prompt = build_prompt(plan, enhanced_spec, original_prompt, source_app_bundle, fix_instructions)

      ModelProvider.complete(
        layer: :generator,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_tokens: 16_000
      )
    end

    def self.build_prompt(plan, enhanced_spec, original_prompt, source_app_bundle, fix_instructions)
      parts = []
      parts << "Approved plan: #{plan.to_json}" if plan
      parts << "Enhanced spec:\n#{enhanced_spec}" if enhanced_spec
      parts << "Original user prompt: #{original_prompt}" if original_prompt
      parts << "Source app to modify:\n#{source_app_bundle}" if source_app_bundle
      parts << "FIX INSTRUCTIONS (from failed validation):\n#{fix_instructions}" if fix_instructions
      parts.join("\n\n")
    end
  end
end
