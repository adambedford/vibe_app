require "rails_helper"

RSpec.describe Follow, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:follower).class_name("User") }
    it { is_expected.to belong_to(:following).class_name("User") }
  end

  describe "validations" do
    subject { create(:follow) }
    it { is_expected.to validate_uniqueness_of(:follower_id).scoped_to(:following_id) }

    it "prevents self-follows" do
      user = create(:user)
      follow = build(:follow, follower: user, following: user)
      expect(follow).not_to be_valid
      expect(follow.errors[:follower_id]).to include("cannot follow yourself")
    end
  end
end
