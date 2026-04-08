require "rails_helper"

RSpec.describe GenerateThumbnailJob, type: :job do
  it "enqueues on default queue" do
    expect {
      described_class.perform_later(1)
    }.to have_enqueued_job.on_queue("default")
  end
end
