FactoryBot.define do
  factory :comment do
    association :app
    association :user
    body { Faker::Lorem.paragraph }
  end
end
