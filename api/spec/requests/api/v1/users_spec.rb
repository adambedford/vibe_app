require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }

  describe "GET /api/v1/users/:id" do
    it "returns user profile without auth" do
      get "/api/v1/users/#{other_user.id}"
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["username"]).to eq(other_user.username)
    end
  end

  describe "POST /api/v1/users/:id/follow" do
    it "follows a user" do
      post "/api/v1/users/#{other_user.id}/follow", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(Follow.exists?(follower: user, following: other_user)).to be true
    end

    it "prevents self-follow" do
      post "/api/v1/users/#{user.id}/follow", headers: auth_headers(user)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/users/:id/follow" do
    it "unfollows a user" do
      create(:follow, follower: user, following: other_user)
      delete "/api/v1/users/#{other_user.id}/follow", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(Follow.exists?(follower: user, following: other_user)).to be false
    end
  end

  describe "GET /api/v1/users/:id/apps" do
    it "returns user's published apps" do
      create(:app, :published, creator: other_user)
      create(:app, creator: other_user) # draft - should not appear

      get "/api/v1/users/#{other_user.id}/apps"
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"].length).to eq(1)
    end
  end
end
