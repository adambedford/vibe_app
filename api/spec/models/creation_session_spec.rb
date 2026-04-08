require "rails_helper"

RSpec.describe CreationSession, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:app) }
    it { is_expected.to belong_to(:source_app).class_name("App").optional }
    it { is_expected.to belong_to(:generated_version).class_name("AppVersion").optional }
  end

  describe "#user_prompt" do
    it "returns the last user message content" do
      session = build(:creation_session, messages: [
        { "role" => "user", "content" => "make a snake game" },
        { "role" => "assistant", "content" => "plan" },
        { "role" => "user", "content" => "add power-ups" }
      ])
      expect(session.user_prompt).to eq("add power-ups")
    end

    it "returns nil when there are no messages" do
      session = build(:creation_session, messages: [])
      expect(session.user_prompt).to be_nil
    end
  end
end
