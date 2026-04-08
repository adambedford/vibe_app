FactoryBot.define do
  factory :scoreboard_entry do
    association :app
    association :user
    score { rand(100..10000) }
  end
end
