require "rails_helper"

RSpec.describe AppQualityScore, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:calculated_at) }
  end
end
