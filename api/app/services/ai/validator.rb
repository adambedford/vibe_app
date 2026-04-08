module AI
  class Validator
    SIDECAR_URL = ENV.fetch("VALIDATOR_SERVICE_URL", "http://vibe-validator.railway.internal:3001")

    ValidationResult = Struct.new(:passed, :failures, :extracted_text, :screenshot, keyword_init: true) do
      def passed?
        passed
      end
    end

    def self.call(html)
      response = HTTParty.post(
        "#{SIDECAR_URL}/validate",
        body: { html: html }.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 30
      )

      result = JSON.parse(response.body)
      ValidationResult.new(
        passed: result["passed"],
        failures: result["results"]&.select { |r| !r["passed"] } || [],
        extracted_text: result["extracted_text"],
        screenshot: result["screenshot"]
      )
    end

    def self.screenshot(html)
      response = HTTParty.post(
        "#{SIDECAR_URL}/screenshot",
        body: { html: html }.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 15
      )

      JSON.parse(response.body)["screenshot"]
    end
  end
end
