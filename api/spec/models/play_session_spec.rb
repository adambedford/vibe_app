require "rails_helper"

RSpec.describe PlaySession, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:duration_seconds) }
    it { is_expected.to validate_numericality_of(:duration_seconds).is_greater_than_or_equal_to(0) }
  end
end
