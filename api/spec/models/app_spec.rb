require "rails_helper"

RSpec.describe App, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:creator).class_name("User") }
    it { is_expected.to belong_to(:current_version).class_name("AppVersion").optional }
    it { is_expected.to belong_to(:parent).class_name("App").optional }
    it { is_expected.to belong_to(:root).class_name("App").optional }
    it { is_expected.to have_many(:versions).class_name("AppVersion").dependent(:destroy) }
    it { is_expected.to have_many(:likes).dependent(:destroy) }
    it { is_expected.to have_many(:comments).dependent(:destroy) }
    it { is_expected.to have_many(:bookmarks).dependent(:destroy) }
    it { is_expected.to have_many(:play_sessions).dependent(:destroy) }
    it { is_expected.to have_many(:remixes).class_name("App").with_foreign_key(:parent_id) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to define_enum_for(:status).backed_by_column_of_type(:string).with_values(draft: "draft", published: "published", under_review: "under_review", removed: "removed") }
  end

  describe "scopes" do
    it ".published returns only published apps" do
      published = create(:app, :published)
      create(:app, status: "draft")
      expect(App.published).to eq([ published ])
    end
  end

  describe "counter caches" do
    it "increments like_count when a like is created" do
      app = create(:app)
      expect { create(:like, app: app) }.to change { app.reload.like_count }.by(1)
    end

    it "increments comment_count when a comment is created" do
      app = create(:app)
      expect { create(:comment, app: app) }.to change { app.reload.comment_count }.by(1)
    end
  end

  describe "remix lineage" do
    it "tracks parent and root" do
      original = create(:app, :published)
      remix = create(:app, parent: original, root: original)
      remix2 = create(:app, parent: remix, root: original)

      expect(remix.parent).to eq(original)
      expect(remix2.root).to eq(original)
      expect(original.remixes).to include(remix)
    end
  end
end
