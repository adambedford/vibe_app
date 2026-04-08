class FirebaseClient
  def initialize
    @project_id = ENV.fetch("FIREBASE_PROJECT_ID", "vibe-development")
    @base_url = "https://#{@project_id}-default-rtdb.firebaseio.com"
  end

  def update_status(session_id, **attrs)
    path = "/generation/#{session_id}.json"
    HTTParty.patch(
      "#{@base_url}#{path}",
      body: attrs.to_json,
      headers: { "Content-Type" => "application/json" },
      timeout: 5
    )
  end

  def create_multiplayer_session(session_id, host:, max_players:)
    path = "/multiplayer/#{session_id}.json"
    HTTParty.put(
      "#{@base_url}#{path}",
      body: {
        lobby: {
          host: host.id,
          status: "waiting",
          max_players: max_players,
          players: { host.id => { name: host.display_name, joined_at: Time.current.iso8601 } }
        },
        state: {},
        scores: {}
      }.to_json,
      headers: { "Content-Type" => "application/json" },
      timeout: 5
    )
  end
end
