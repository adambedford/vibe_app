FactoryBot.define do
  factory :bookmark do
    association :user
    association :app
  end
end
