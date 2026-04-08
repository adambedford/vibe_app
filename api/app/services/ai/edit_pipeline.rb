module AI
  class EditPipeline
    SYSTEM_PROMPT = <<~PROMPT
      You are the Edit model for Vibe. You receive an existing app (complete HTML file)
      and a user's edit request. You modify the existing code to fulfill the request.

      RULES:
      1. Make the MINIMUM change necessary
      2. Do NOT refactor unrelated code
      3. Preserve all existing functionality
      4. Output the COMPLETE modified HTML file (not a diff)
      5. If the edit is too complex, respond with: ESCALATE_TO_FULL_PIPELINE
    PROMPT

    ESCALATE_MARKER = "ESCALATE_TO_FULL_PIPELINE"

    def self.call(existing_html, edit_request)
      prompt = "Existing app HTML:\n#{existing_html}\n\nEdit request: #{edit_request}"

      result = ModelProvider.complete(
        layer: :edit_model,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_tokens: 16_000
      )

      OpenStruct.new(
        html: result.include?(ESCALATE_MARKER) ? nil : result,
        escalated: result.include?(ESCALATE_MARKER)
      )
    end
  end
end
