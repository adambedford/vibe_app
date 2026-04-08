module AuthHelpers
  def auth_headers(user)
    token = JWT.encode(
      { sub: user.id, jti: SecureRandom.uuid, exp: 15.minutes.from_now.to_i, type: "access" },
      Rails.application.credentials.jwt_secret || "test-secret",
      "HS256"
    )
    { "Authorization" => "Bearer #{token}" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
