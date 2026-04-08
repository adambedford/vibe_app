require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  describe "POST /api/v1/auth/register" do
    let(:valid_params) do
      {
        email: "test@example.com",
        password: "password123",
        display_name: "Test User",
        username: "testuser",
        date_of_birth: "2000-01-01"
      }
    end

    it "creates a user and returns tokens" do
      post "/api/v1/auth/register", params: valid_params
      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["user"]["username"]).to eq("testuser")
      expect(body["data"]["tokens"]["access_token"]).to be_present
      expect(body["data"]["tokens"]["refresh_token"]).to be_present
    end

    it "rejects duplicate emails" do
      create(:user, email: "test@example.com")
      post "/api/v1/auth/register", params: valid_params
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects users under 16" do
      post "/api/v1/auth/register", params: valid_params.merge(date_of_birth: 10.years.ago.to_date.to_s)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/auth/login" do
    let!(:user) { create(:user, email: "login@example.com", password: "password123") }

    it "returns tokens for valid credentials" do
      post "/api/v1/auth/login", params: { email: "login@example.com", password: "password123" }
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["user"]["email"]).to be_nil # email not in presenter
      expect(body["data"]["tokens"]["access_token"]).to be_present
    end

    it "rejects invalid password" do
      post "/api/v1/auth/login", params: { email: "login@example.com", password: "wrong" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/auth/refresh" do
    let(:user) { create(:user) }
    let(:secret) { Rails.application.credentials.jwt_secret || "test-secret" }
    let(:refresh_token) { JWT.encode({ sub: user.id, exp: 30.days.from_now.to_i, type: "refresh" }, secret, "HS256") }

    it "returns new tokens" do
      post "/api/v1/auth/refresh", params: { refresh_token: refresh_token }
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["access_token"]).to be_present
    end
  end

  describe "DELETE /api/v1/auth/logout" do
    let(:user) { create(:user) }

    it "revokes the token" do
      delete "/api/v1/auth/logout", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(JwtDenylist.count).to eq(1)
    end
  end
end
