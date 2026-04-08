require "rails_helper"

RSpec.describe EditAppJob, type: :job do
  it "enqueues on generation queue" do
    expect {
      described_class.perform_later(1, "change color")
    }.to have_enqueued_job.on_queue("generation")
  end
end
