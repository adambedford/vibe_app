FactoryBot.define do
  factory :play_session do
    association :app
    association :user
    duration_seconds { rand(5..300) }
  end
end
