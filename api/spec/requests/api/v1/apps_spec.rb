require "rails_helper"

RSpec.describe "Api::V1::Apps", type: :request do
  let(:user) { create(:user) }
  let(:creator) { create(:user) }

  describe "GET /api/v1/apps/:id" do
    let(:app_record) { create(:app, :published, creator: creator) }
    let!(:version) { create(:app_version, app: app_record) }

    before { app_record.update!(current_version: version) }

    it "returns app details without auth" do
      get "/api/v1/apps/#{app_record.id}"
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["title"]).to eq(app_record.title)
      expect(body["data"]["creator"]["username"]).to eq(creator.username)
    end
  end

  describe "POST /api/v1/apps/:id/like" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "likes an app" do
      post "/api/v1/apps/#{app_record.id}/like", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(app_record.reload.like_count).to eq(1)
    end

    it "prevents duplicate likes" do
      create(:like, user: user, app: app_record)
      post "/api/v1/apps/#{app_record.id}/like", headers: auth_headers(user)
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "DELETE /api/v1/apps/:id/like" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "unlikes an app" do
      create(:like, user: user, app: app_record)
      delete "/api/v1/apps/#{app_record.id}/like", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(app_record.reload.like_count).to eq(0)
    end
  end

  describe "POST /api/v1/apps/:id/comments" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "creates a comment" do
      post "/api/v1/apps/#{app_record.id}/comments",
        params: { body: "Great game!" },
        headers: auth_headers(user)
      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["body"]).to eq("Great game!")
    end
  end

  describe "POST /api/v1/apps/:id/save" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "bookmarks an app" do
      post "/api/v1/apps/#{app_record.id}/save", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(Bookmark.exists?(user: user, app: app_record)).to be true
    end
  end

  describe "POST /api/v1/apps/:id/play" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "records a play session" do
      post "/api/v1/apps/#{app_record.id}/play",
        params: { duration_seconds: 45 },
        headers: auth_headers(user)
      expect(response).to have_http_status(:no_content)
      expect(PlaySession.last.duration_seconds).to eq(45)
    end
  end

  describe "POST /api/v1/apps/:id/remix" do
    let(:app_record) { create(:app, :published, creator: creator) }

    it "creates a remix creation session" do
      post "/api/v1/apps/#{app_record.id}/remix", headers: auth_headers(user)
      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("active")

      new_app = App.last
      expect(new_app.parent).to eq(app_record)
      expect(new_app.creator).to eq(user)
    end
  end

  describe "GET /api/v1/apps/:id/lineage" do
    let(:original) { create(:app, :published, creator: creator) }
    let(:remix) { create(:app, :published, creator: user, parent: original, root: original) }

    it "returns the ancestry chain" do
      get "/api/v1/apps/#{remix.id}/lineage", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"].length).to eq(2)
      expect(body["data"][0]["id"]).to eq(remix.id)
      expect(body["data"][1]["id"]).to eq(original.id)
    end
  end
end
