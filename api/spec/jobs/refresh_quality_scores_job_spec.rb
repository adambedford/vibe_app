require "rails_helper"

RSpec.describe RefreshQualityScoresJob, type: :job do
  it "creates quality scores for published apps" do
    app = create(:app, :published, created_at: 1.day.ago)
    create(:play_session, app: app, duration_seconds: 60)

    described_class.perform_now

    expect(AppQualityScore.exists?(app_id: app.id)).to be true
  end

  it "skips apps older than 30 days" do
    old_app = create(:app, :published, created_at: 31.days.ago)

    described_class.perform_now

    expect(AppQualityScore.exists?(app_id: old_app.id)).to be false
  end

  it "enqueues on default queue" do
    expect {
      described_class.perform_later
    }.to have_enqueued_job.on_queue("default")
  end
end
