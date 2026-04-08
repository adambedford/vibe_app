require "rails_helper"

RSpec.describe ScoreboardEntry, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:score) }
  end
end
