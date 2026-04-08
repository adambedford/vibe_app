require "rails_helper"

RSpec.describe UserPresenter do
  let(:user) { create(:user, username: "testpresenter", display_name: "Test") }

  describe "#as_json" do
    it "includes all profile fields" do
      json = described_class.new(user).as_json

      expect(json[:id]).to eq(user.id)
      expect(json[:username]).to eq("testpresenter")
      expect(json[:display_name]).to eq("Test")
      expect(json).to have_key(:follower_count)
      expect(json).to have_key(:following_count)
      expect(json).to have_key(:app_count)
      expect(json).to have_key(:created_at)
    end

    it "includes is_following when current_user present" do
      other = create(:user)
      create(:follow, follower: other, following: user)

      json = described_class.new(user, current_user: other).as_json
      expect(json[:is_following]).to be true
    end

    it "sets is_following to nil without current_user" do
      json = described_class.new(user).as_json
      expect(json[:is_following]).to be_nil
    end
  end

  describe "#as_json_compact" do
    it "includes only essential fields" do
      json = described_class.new(user).as_json_compact

      expect(json[:id]).to eq(user.id)
      expect(json[:username]).to eq("testpresenter")
      expect(json[:display_name]).to eq("Test")
      expect(json).to have_key(:avatar_url)
      expect(json).not_to have_key(:follower_count)
      expect(json).not_to have_key(:bio)
    end
  end
end
