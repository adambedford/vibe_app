module AI
  class ErrorInterpreter
    SYSTEM_PROMPT = <<~PROMPT
      You are the Error Interpreter for Vibe's app generation pipeline. You receive
      test failure reports and translate them into clear, specific fix instructions.

      Your output must be:
      1. SPECIFIC — point to the exact issue
      2. ACTIONABLE — tell the Generator exactly what to change
      3. MINIMAL — only fix what's broken

      FORMAT:
      FAILURES:
      - [Test name]: [What went wrong]

      FIX INSTRUCTIONS:
      1. [Specific instruction]
      2. [Specific instruction]
    PROMPT

    def self.call(failures)
      prompt = "Test failures:\n#{failures.map { |f| "- #{f['name']}: #{f['error'] || f['message']}" }.join("\n")}"

      ModelProvider.complete(
        layer: :error_interpreter,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_tokens: 1500
      )
    end
  end
end
