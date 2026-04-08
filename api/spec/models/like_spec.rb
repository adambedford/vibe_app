require "rails_helper"

RSpec.describe Like, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    subject { create(:like) }
    it { is_expected.to validate_uniqueness_of(:user_id).scoped_to(:app_id) }
  end
end
