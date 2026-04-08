require "rails_helper"

RSpec.describe ModerationScanJob, type: :job do
  it "enqueues on moderation queue" do
    expect {
      described_class.perform_later(1)
    }.to have_enqueued_job.on_queue("moderation")
  end
end
