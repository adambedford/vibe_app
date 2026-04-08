FactoryBot.define do
  factory :notification do
    association :user
    notification_type { "follow" }
    read { false }
  end
end
