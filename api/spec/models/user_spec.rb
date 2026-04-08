require "rails_helper"

RSpec.describe User, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:apps).with_foreign_key(:creator_id).dependent(:destroy) }
    it { is_expected.to have_many(:creation_sessions).dependent(:destroy) }
    it { is_expected.to have_many(:active_follows).class_name("Follow").with_foreign_key(:follower_id).dependent(:destroy) }
    it { is_expected.to have_many(:passive_follows).class_name("Follow").with_foreign_key(:following_id).dependent(:destroy) }
    it { is_expected.to have_many(:following).through(:active_follows) }
    it { is_expected.to have_many(:followers).through(:passive_follows) }
    it { is_expected.to have_many(:likes).dependent(:destroy) }
    it { is_expected.to have_many(:bookmarks).dependent(:destroy) }
    it { is_expected.to have_many(:notifications).dependent(:destroy) }
  end

  describe "validations" do
    subject { build(:user) }

    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_uniqueness_of(:email) }
    it { is_expected.to validate_presence_of(:username) }
    it { is_expected.to validate_uniqueness_of(:username) }
    it { is_expected.to validate_presence_of(:display_name) }
    it { is_expected.to validate_presence_of(:date_of_birth) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[active pending_deletion deleted]) }
    it { is_expected.to have_secure_password }

    it "rejects users under 16" do
      user = build(:user, date_of_birth: 10.years.ago.to_date)
      expect(user).not_to be_valid
      expect(user.errors[:date_of_birth]).to include("must be at least 16")
    end

    it "accepts users 16 or older" do
      user = build(:user, date_of_birth: 16.years.ago.to_date)
      expect(user).to be_valid
    end
  end

  describe "scopes" do
    it ".active returns only active users" do
      active = create(:user, status: "active")
      create(:user, status: "deleted")
      expect(User.active).to eq([ active ])
    end
  end

  describe "#following_ids" do
    it "returns ids of users being followed" do
      user = create(:user)
      followed = create(:user)
      create(:follow, follower: user, following: followed)
      expect(user.following_ids).to eq([ followed.id ])
    end
  end

  describe "#followers_count" do
    it "returns the count of followers" do
      user = create(:user)
      create(:follow, following: user)
      create(:follow, following: user)
      expect(user.followers_count).to eq(2)
    end
  end
end
