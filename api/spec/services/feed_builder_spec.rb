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
      app = create(:app, play_count: 2, created_at: 1.hour.ago)
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

    it "returns 0.5 penalty when early plays bounce (<5s median)" do
      app = create(:app, play_count: 3, created_at: 1.hour.ago)
      user = create(:user)
      create(:play_session, app: app, user: user, duration_seconds: 2)
      create(:play_session, app: app, user: user, duration_seconds: 1)
      create(:play_session, app: app, user: user, duration_seconds: 3)

      medians = described_class.preload_early_medians([ app.id ])
      expect(described_class.cold_start_boost(app, medians)).to eq(0.5)
    end

    it "keeps boost when early plays have good duration" do
      app = create(:app, play_count: 3, created_at: 1.hour.ago)
      user = create(:user)
      create(:play_session, app: app, user: user, duration_seconds: 30)
      create(:play_session, app: app, user: user, duration_seconds: 45)
      create(:play_session, app: app, user: user, duration_seconds: 20)

      medians = described_class.preload_early_medians([ app.id ])
      expect(described_class.cold_start_boost(app, medians)).to eq(2.0)
    end
  end

  describe ".social_multiplier" do
    let(:user) { create(:user) }
    let(:followed_creator) { create(:user) }
    let(:stranger) { create(:user) }

    before { create(:follow, follower: user, following: followed_creator) }

    it "returns 1.5 for apps by followed creators" do
      app = build(:app, creator: followed_creator)
      following_set = user.following_ids.to_set
      expect(described_class.social_multiplier(app, following_set)).to eq(1.5)
    end

    it "returns 1.2 for apps liked by followed users" do
      app = create(:app, :published, creator: stranger)
      create(:like, user: followed_creator, app: app)
      following_set = user.following_ids.to_set
      expect(described_class.social_multiplier(app, following_set)).to eq(1.2)
    end

    it "returns 1.0 for apps by strangers with no social proof" do
      app = build(:app, creator: stranger)
      following_set = user.following_ids.to_set
      expect(described_class.social_multiplier(app, following_set)).to eq(1.0)
    end
  end

  describe ".fetch_candidates" do
    let(:user) { create(:user) }
    let(:followed) { create(:user) }

    before { create(:follow, follower: user, following: followed) }

    it "includes apps from followed creators" do
      app = create(:app, :published, creator: followed, created_at: 1.day.ago)
      candidates = described_class.fetch_candidates(user)
      expect(candidates.map(&:id)).to include(app.id)
    end

    it "includes trending apps" do
      trending = create(:app, :published, play_count: 100, created_at: 1.day.ago)
      candidates = described_class.fetch_candidates(user)
      expect(candidates.map(&:id)).to include(trending.id)
    end

    it "excludes unpublished apps" do
      draft = create(:app, creator: followed, status: "draft", created_at: 1.day.ago)
      candidates = described_class.fetch_candidates(user)
      expect(candidates.map(&:id)).not_to include(draft.id)
    end
  end

  describe ".home" do
    let(:user) { create(:user) }
    let(:followed) { create(:user) }

    before { create(:follow, follower: user, following: followed) }

    it "returns scored and diversified results" do
      create(:app, :published, creator: followed, created_at: 1.hour.ago)
      result = described_class.home(user)
      expect(result[:records]).to be_an(Array)
      expect(result[:meta]).to have_key(:has_more)
      expect(result[:meta]).to have_key(:per_page)
    end
  end

  describe ".explore" do
    it "returns published apps from last 48 hours with minimum plays" do
      recent = create(:app, :published, play_count: 10, created_at: 1.hour.ago)
      low_plays = create(:app, :published, play_count: 2, created_at: 1.hour.ago)
      old = create(:app, :published, play_count: 10, created_at: 3.days.ago)

      result = described_class.explore
      ids = result[:records].map(&:id)
      expect(ids).to include(recent.id)
      expect(ids).not_to include(old.id)
      expect(ids).not_to include(low_plays.id)
    end
  end

  describe ".apply_diversity" do
    it "limits to 2 apps per creator in a page of 20" do
      creator = create(:user)
      apps = 5.times.map { create(:app, :published, creator: creator) }
      result = described_class.apply_diversity(apps)
      expect(result.length).to eq(2)
    end

    it "prevents 3+ consecutive apps from same category" do
      apps = 4.times.map { create(:app, :published, category: "game") }
      apps += [ create(:app, :published, category: "story") ]
      result = described_class.apply_diversity(apps)
      categories = result.map(&:category)
      # Should not have 4 consecutive games
      expect(categories.each_cons(4).any? { |c| c.uniq.length == 1 }).to be false
    end
  end
end
