module AI
  class ModelProvider
    MODELS = {
      prompt_enhancer:   ENV.fetch("MODEL_PROMPT_ENHANCER",   "anthropic.claude-3-haiku-20240307-v1:0"),
      planner:           ENV.fetch("MODEL_PLANNER",           "anthropic.claude-3-haiku-20240307-v1:0"),
      generator:         ENV.fetch("MODEL_GENERATOR",         "anthropic.claude-3-5-sonnet-20241022-v2:0"),
      error_interpreter: ENV.fetch("MODEL_ERROR_INTERPRETER", "anthropic.claude-3-haiku-20240307-v1:0"),
      edit_model:        ENV.fetch("MODEL_EDIT",              "anthropic.claude-3-haiku-20240307-v1:0")
    }.freeze

    def self.client
      @client ||= Aws::BedrockRuntime::Client.new(
        region: ENV.fetch("AWS_REGION", "us-east-1"),
        credentials: Aws::Credentials.new(
          ENV["AWS_ACCESS_KEY_ID"],
          ENV["AWS_SECRET_ACCESS_KEY"]
        )
      )
    end

    def self.complete(layer:, system:, prompt:, max_tokens: 4096)
      model_id = MODELS.fetch(layer)
      response = client.invoke_model(
        model_id: model_id,
        content_type: "application/json",
        accept: "application/json",
        body: {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: max_tokens,
          system: system,
          messages: [ { role: "user", content: prompt } ]
        }.to_json
      )
      JSON.parse(response.body.string).dig("content", 0, "text")
    end
  end
end
