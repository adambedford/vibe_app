FactoryBot.define do
  factory :report do
    association :reporter, factory: :user
    association :app
    reason { "inappropriate content" }
    status { "pending" }
  end
end
