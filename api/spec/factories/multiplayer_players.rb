FactoryBot.define do
  factory :multiplayer_player do
    association :multiplayer_session
    association :user
    is_host { false }
  end
end
