require "rails_helper"

RSpec.describe CleanupDraftsJob, type: :job do
  it "deletes draft apps older than 30 days" do
    old_draft = create(:app, status: "draft", updated_at: 31.days.ago)
    recent_draft = create(:app, status: "draft", updated_at: 1.day.ago)
    published = create(:app, :published, updated_at: 31.days.ago)

    allow(GcsClient).to receive(:delete)

    described_class.perform_now

    expect(App.exists?(old_draft.id)).to be false
    expect(App.exists?(recent_draft.id)).to be true
    expect(App.exists?(published.id)).to be true
  end
end
