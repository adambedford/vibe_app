require "rails_helper"

RSpec.describe "Api::V1::CreationSessions", type: :request do
  let(:user) { create(:user) }

  describe "POST /api/v1/create/sessions" do
    it "creates a session with a draft app" do
      post "/api/v1/create/sessions",
        params: { prompt: "make a snake game" },
        headers: auth_headers(user)

      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("active")
      expect(body["data"]["app_id"]).to be_present

      app = App.find(body["data"]["app_id"])
      expect(app.status).to eq("draft")
      expect(app.creator).to eq(user)
    end

    it "enqueues GenerateAppJob when prompt provided" do
      expect {
        post "/api/v1/create/sessions",
          params: { prompt: "make a clicker" },
          headers: auth_headers(user)
      }.to have_enqueued_job(GenerateAppJob)
    end

    it "creates session without prompt" do
      post "/api/v1/create/sessions", headers: auth_headers(user)
      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("active")
    end

    it "requires authentication" do
      post "/api/v1/create/sessions", params: { prompt: "test" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/create/sessions/:id" do
    it "returns the session" do
      app = create(:app, creator: user)
      session = create(:creation_session, user: user, app: app)

      get "/api/v1/create/sessions/#{session.id}", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["id"]).to eq(session.id)
    end

    it "cannot access another user's session" do
      other = create(:user)
      app = create(:app, creator: other)
      session = create(:creation_session, user: other, app: app)

      get "/api/v1/create/sessions/#{session.id}", headers: auth_headers(user)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/create/sessions/:id/message" do
    let(:app_record) { create(:app, creator: user) }
    let(:session) { create(:creation_session, user: user, app: app_record, messages: []) }

    it "appends message to session" do
      post "/api/v1/create/sessions/#{session.id}/message",
        params: { content: "change the color to blue" },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(session.reload.messages.last["content"]).to eq("change the color to blue")
    end
  end

  describe "POST /api/v1/create/sessions/:id/approve" do
    let(:app_record) { create(:app, creator: user) }
    let(:session) { create(:creation_session, user: user, app: app_record, plan: { "title" => "Snake" }) }

    it "sets plan_approved and enqueues generation" do
      expect {
        post "/api/v1/create/sessions/#{session.id}/approve", headers: auth_headers(user)
      }.to have_enqueued_job(GenerateFromPlanJob)

      expect(response).to have_http_status(:ok)
      expect(session.reload.plan_approved).to be true
    end
  end

  describe "POST /api/v1/create/sessions/:id/publish" do
    let(:app_record) { create(:app, creator: user) }
    let(:version) { create(:app_version, app: app_record) }
    let(:session) do
      app_record.update!(current_version: version)
      create(:creation_session, user: user, app: app_record, generated_version: version,
        enhanced_prompt: "APP_TYPE: game\nTITLE: Snake", plan: { "title" => "Neon Snake", "description" => "A snake game" })
    end

    it "publishes the app" do
      post "/api/v1/create/sessions/#{session.id}/publish", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"]["status"]).to eq("published")
      expect(body["data"]["title"]).to eq("Neon Snake")
    end

    it "rejects publish without generated version" do
      no_version_app = create(:app, creator: user)
      no_version_session = create(:creation_session, user: user, app: no_version_app)

      post "/api/v1/create/sessions/#{no_version_session.id}/publish", headers: auth_headers(user)
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
