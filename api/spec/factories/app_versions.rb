FactoryBot.define do
  factory :app_version do
    association :app
    bundle_url { "https://storage.googleapis.com/vibe-bundles/#{SecureRandom.hex}/test.html" }
    thumbnail_url { "https://storage.googleapis.com/vibe-thumbnails/#{SecureRandom.hex}/thumb.png" }
    source { "generation" }
  end
end
