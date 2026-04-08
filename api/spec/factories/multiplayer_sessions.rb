FactoryBot.define do
  factory :multiplayer_session do
    association :app
    association :host_user, factory: :user
    status { "lobby" }
    max_players { 4 }
    firebase_path { "/multiplayer/#{SecureRandom.hex}" }
  end
end
