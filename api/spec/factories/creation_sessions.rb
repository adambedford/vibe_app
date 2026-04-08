FactoryBot.define do
  factory :creation_session do
    association :user
    association :app
    status { "active" }
    messages { [] }
  end
end
