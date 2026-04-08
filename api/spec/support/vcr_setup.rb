require "vcr"

VCR.configure do |config|
  config.cassette_library_dir = "spec/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.configure_rspec_metadata!
  config.filter_sensitive_data("<BEDROCK_KEY>") { ENV["AWS_SECRET_ACCESS_KEY"] }
  config.filter_sensitive_data("<FIREBASE_KEY>") { ENV["FIREBASE_SERVICE_ACCOUNT_KEY"] }
end
