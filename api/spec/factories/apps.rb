FactoryBot.define do
  factory :app do
    association :creator, factory: :user
    title { Faker::App.name }
    description { Faker::Lorem.sentence }
    status { "draft" }
    category { %w[game story art_tool utility social].sample }

    trait :published do
      status { "published" }
    end

    trait :multiplayer do
      is_multiplayer { true }
      max_players { 4 }
    end
  end
end
