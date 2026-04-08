module AI
  class Planner
    SYSTEM_PROMPT = <<~PROMPT
      You are the Planner for Vibe. You receive a structured app specification and
      present it to the user as a friendly, visual plan. Your audience is non-technical.

      OUTPUT FORMAT (JSON):
      {
        "title": "App Title",
        "description": "One sentence description",
        "plan_card_markdown": "Here's what I'll build...\\n\\n...",
        "quick_replies": [
          {"label": "Build it!", "action": "approve"},
          {"label": "Different style", "action": "modify_style"},
          {"label": "Add more features", "action": "add_features"},
          {"label": "Start over", "action": "restart"}
        ],
        "clarifying_questions": []
      }

      RULES:
      - Max 2 clarifying questions
      - Non-technical language only
      - Enthusiastic, casual tone
    PROMPT

    def self.call(enhanced_spec, messages)
      prompt = "Enhanced spec:\n#{enhanced_spec}\n\nUser messages:\n#{messages.map { |m| m['content'] }.join("\n")}"

      result = ModelProvider.complete(
        layer: :planner,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_tokens: 3000
      )

      begin
        JSON.parse(result)
      rescue JSON::ParserError
        { "title" => "Untitled", "plan_card_markdown" => result, "quick_replies" => [] }
      end
    end
  end
end
