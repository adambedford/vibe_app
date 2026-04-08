require "rails_helper"

RSpec.describe AppVersion, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:bundle_url) }
    it { is_expected.to validate_presence_of(:source) }
    it { is_expected.to validate_inclusion_of(:source).in_array(%w[generation edit revert]) }
  end
end
