require "rails_helper"

RSpec.describe "Api::V1::Multiplayer", type: :request do
  let(:user) { create(:user) }
  let(:app_record) { create(:app, :published, :multiplayer, creator: create(:user)) }

  describe "POST /api/v1/lobbies" do
    it "creates a lobby" do
      post "/api/v1/lobbies",
        params: { app_id: app_record.id, max_players: 4 },
        headers: auth_headers(user)

      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("lobby")
      expect(body["data"]["firebase_path"]).to be_present
    end

    it "makes the creator the host" do
      post "/api/v1/lobbies",
        params: { app_id: app_record.id },
        headers: auth_headers(user)

      session = MultiplayerSession.last
      expect(session.host_user).to eq(user)
      expect(session.multiplayer_players.first.is_host).to be true
    end

    it "requires authentication" do
      post "/api/v1/lobbies", params: { app_id: app_record.id }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/lobbies/:id" do
    it "returns lobby details with players" do
      session = create(:multiplayer_session, app: app_record, host_user: user)
      create(:multiplayer_player, multiplayer_session: session, user: user, is_host: true)

      get "/api/v1/lobbies/#{session.id}", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["players"].length).to eq(1)
      expect(body["data"]["host"]["username"]).to eq(user.username)
    end
  end

  describe "POST /api/v1/lobbies/:id/join" do
    let(:host) { create(:user) }
    let(:session) { create(:multiplayer_session, app: app_record, host_user: host, max_players: 2) }

    before { create(:multiplayer_player, multiplayer_session: session, user: host, is_host: true) }

    it "joins a lobby" do
      post "/api/v1/lobbies/#{session.id}/join", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(session.multiplayer_players.count).to eq(2)
    end

    it "rejects join when full" do
      other = create(:user)
      create(:multiplayer_player, multiplayer_session: session, user: other)

      post "/api/v1/lobbies/#{session.id}/join", headers: auth_headers(user)
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
