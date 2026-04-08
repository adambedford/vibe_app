FactoryBot.define do
  factory :like do
    association :user
    association :app
  end
end
