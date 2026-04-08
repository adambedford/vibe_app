FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { "password123" }
    display_name { Faker::Name.name }
    username { Faker::Internet.unique.username(specifier: 5..15) }
    date_of_birth { 20.years.ago.to_date }
    status { "active" }
  end
end
