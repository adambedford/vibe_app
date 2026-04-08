require "rails_helper"

RSpec.describe AppPresenter do
  let(:creator) { create(:user) }
  let(:app_record) { create(:app, :published, creator: creator, title: "Test App") }
  let!(:version) { create(:app_version, app: app_record) }

  before { app_record.update!(current_version: version) }

  describe "#as_json" do
    it "includes all app fields" do
      json = described_class.new(app_record).as_json

      expect(json[:id]).to eq(app_record.id)
      expect(json[:title]).to eq("Test App")
      expect(json[:status]).to eq("published")
      expect(json[:thumbnail_url]).to eq(version.thumbnail_url)
      expect(json[:bundle_url]).to eq(version.bundle_url)
      expect(json[:creator][:username]).to eq(creator.username)
      expect(json).to have_key(:play_count)
      expect(json).to have_key(:like_count)
      expect(json).to have_key(:remix_count)
    end

    it "includes is_liked/is_saved for authenticated user" do
      user = create(:user)
      create(:like, user: user, app: app_record)

      json = described_class.new(app_record, current_user: user).as_json
      expect(json[:is_liked]).to be true
      expect(json[:is_saved]).to be false
      expect(json[:is_mine]).to be false
    end

    it "shows is_mine for the creator" do
      json = described_class.new(app_record, current_user: creator).as_json
      expect(json[:is_mine]).to be true
    end

    it "includes parent for remixes" do
      remix = create(:app, :published, creator: create(:user), parent: app_record, root: app_record)
      json = described_class.new(remix).as_json
      expect(json[:parent][:id]).to eq(app_record.id)
      expect(json[:parent][:title]).to eq("Test App")
    end
  end

  describe "#as_json_card" do
    it "excludes description and bundle_url" do
      json = described_class.new(app_record).as_json_card

      expect(json[:id]).to eq(app_record.id)
      expect(json[:title]).to eq("Test App")
      expect(json).not_to have_key(:description)
      expect(json).not_to have_key(:bundle_url)
      expect(json).not_to have_key(:status)
      expect(json[:creator]).to have_key(:username)
    end
  end
end
