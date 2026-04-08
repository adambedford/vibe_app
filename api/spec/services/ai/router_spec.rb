require "rails_helper"

RSpec.describe AI::Router do
  let(:session_no_app) { build(:creation_session, generated_version_id: nil) }
  let(:session_with_app) { build(:creation_session, generated_version_id: 1) }

  context "when session has no generated app" do
    it "routes to full generation pipeline" do
      expect(described_class.route(session_no_app, "make a snake game")).to eq(:full_generation)
    end
  end

  context "when session has a generated app" do
    it "routes color changes to edit pipeline" do
      expect(described_class.route(session_with_app, "change the color to blue")).to eq(:edit)
    end

    it "routes text changes to edit pipeline" do
      expect(described_class.route(session_with_app, "change the title to Neon Snake")).to eq(:edit)
    end

    it "routes speed changes to edit pipeline" do
      expect(described_class.route(session_with_app, "make the enemies faster")).to eq(:edit)
    end

    it "routes new features to full generation" do
      expect(described_class.route(session_with_app, "add a multiplayer mode")).to eq(:full_generation)
    end

    it "routes structural changes to full generation" do
      expect(described_class.route(session_with_app, "completely redesign the UI")).to eq(:full_generation)
    end

    it "routes short ambiguous messages to edit" do
      expect(described_class.route(session_with_app, "more sparkle")).to eq(:edit)
    end
  end
end
