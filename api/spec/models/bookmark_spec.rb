require "rails_helper"

RSpec.describe Bookmark, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    subject { create(:bookmark) }
    it { is_expected.to validate_uniqueness_of(:user_id).scoped_to(:app_id) }
  end
end
