require "rails_helper"

RSpec.describe "Api::V1::Me", type: :request do
  let(:user) { create(:user) }

  describe "GET /api/v1/me" do
    it "returns the current user" do
      get "/api/v1/me", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["username"]).to eq(user.username)
      expect(body["data"]["follower_count"]).to eq(0)
    end

    it "requires authentication" do
      get "/api/v1/me"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PATCH /api/v1/me" do
    it "updates display name" do
      patch "/api/v1/me", params: { display_name: "New Name" }, headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(user.reload.display_name).to eq("New Name")
    end

    it "updates bio" do
      patch "/api/v1/me", params: { bio: "Hello world" }, headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(user.reload.bio).to eq("Hello world")
    end
  end

  describe "DELETE /api/v1/me" do
    it "schedules account deletion" do
      delete "/api/v1/me", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("Account scheduled for deletion")
      expect(user.reload.status).to eq("pending_deletion")
    end

    it "enqueues AccountDeletionJob" do
      expect {
        delete "/api/v1/me", headers: auth_headers(user)
      }.to have_enqueued_job(AccountDeletionJob)
    end
  end
end
