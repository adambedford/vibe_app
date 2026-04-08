require "rails_helper"

RSpec.describe FeedBuilder do
  describe ".freshness_multiplier" do
    it "returns 2.0 for brand new apps" do
      app = build(:app, created_at: Time.current)
      expect(described_class.freshness_multiplier(app)).to be_within(0.1).of(2.0)
    end

    it "returns ~1.0 for 24-hour-old apps" do
      app = build(:app, created_at: 24.hours.ago)
      expect(described_class.freshness_multiplier(app)).to be_within(0.1).of(1.0)
    end

    it "decays for older apps" do
      app = build(:app, created_at: 72.hours.ago)
      expect(described_class.freshness_multiplier(app)).to be < 0.6
    end
  end

  describe ".cold_start_boost" do
    it "returns 2.0 for new apps with few plays" do
      app = build(:app, play_count: 3, created_at: 1.hour.ago)
      expect(described_class.cold_start_boost(app)).to eq(2.0)
    end

    it "returns 1.0 for apps with 10+ plays" do
      app = build(:app, play_count: 15, created_at: 1.hour.ago)
      expect(described_class.cold_start_boost(app)).to eq(1.0)
    end

    it "returns 1.0 for apps older than 6 hours" do
      app = build(:app, play_count: 3, created_at: 7.hours.ago)
      expect(described_class.cold_start_boost(app)).to eq(1.0)
    end
  end

  describe ".social_multiplier" do
    let(:user) { create(:user) }
    let(:followed_creator) { create(:user) }
    let(:stranger) { create(:user) }

    before { create(:follow, follower: user, following: followed_creator) }

    it "returns 1.5 for apps by followed creators" do
      app = build(:app, creator: followed_creator)
      expect(described_class.social_multiplier(app, user)).to eq(1.5)
    end

    it "returns 1.0 for apps by strangers" do
      app = build(:app, creator: stranger)
      expect(described_class.social_multiplier(app, user)).to eq(1.0)
    end
  end

  describe ".explore" do
    it "returns published apps from last 48 hours" do
      recent = create(:app, :published, play_count: 10, created_at: 1.hour.ago)
      old = create(:app, :published, play_count: 10, created_at: 3.days.ago)

      result = described_class.explore
      expect(result[:records].map(&:id)).to include(recent.id)
      expect(result[:records].map(&:id)).not_to include(old.id)
    end
  end
end
