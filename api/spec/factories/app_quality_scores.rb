FactoryBot.define do
  factory :app_quality_score do
    association :app
    calculated_at { Time.current }
    composite_score { 0.5 }
  end
end
