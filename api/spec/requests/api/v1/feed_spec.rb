require "rails_helper"

RSpec.describe "Api::V1::Feed", type: :request do
  let(:user) { create(:user) }

  describe "GET /api/v1/feed" do
    it "returns feed cards" do
      creator = create(:user)
      create(:follow, follower: user, following: creator)
      app = create(:app, :published, creator: creator, created_at: 1.hour.ago)

      get "/api/v1/feed", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]).to be_an(Array)
      expect(body["pagination"]).to have_key("has_more")
    end

    it "requires authentication" do
      get "/api/v1/feed"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/feed/explore" do
    it "returns trending apps" do
      create(:app, :published, play_count: 10, created_at: 1.hour.ago)

      get "/api/v1/feed/explore", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]).to be_an(Array)
    end
  end

  describe "GET /api/v1/feed/following" do
    it "returns apps from followed creators in reverse chronological order" do
      creator = create(:user)
      create(:follow, follower: user, following: creator)
      app1 = create(:app, :published, creator: creator, created_at: 2.hours.ago)
      app2 = create(:app, :published, creator: creator, created_at: 1.hour.ago)

      get "/api/v1/feed/following", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      ids = body["data"].map { |a| a["id"] }
      expect(ids).to eq([ app2.id, app1.id ])
    end

    it "excludes unfollowed creators" do
      stranger = create(:user)
      create(:app, :published, creator: stranger)

      get "/api/v1/feed/following", headers: auth_headers(user)
      body = JSON.parse(response.body)
      expect(body["data"]).to be_empty
    end
  end
end
