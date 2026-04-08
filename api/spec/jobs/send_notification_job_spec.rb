require "rails_helper"

RSpec.describe SendNotificationJob, type: :job do
  let(:actor) { create(:user) }
  let(:recipient) { create(:user) }

  it "creates a notification" do
    expect {
      described_class.perform_now("follow", actor_id: actor.id, user_id: recipient.id)
    }.to change(Notification, :count).by(1)

    notification = Notification.last
    expect(notification.notification_type).to eq("follow")
    expect(notification.actor_id).to eq(actor.id)
    expect(notification.user_id).to eq(recipient.id)
  end

  it "does not notify yourself" do
    expect {
      described_class.perform_now("follow", actor_id: actor.id, user_id: actor.id)
    }.not_to change(Notification, :count)
  end

  it "enqueues on notifications queue" do
    expect {
      described_class.perform_later("follow", actor_id: actor.id, user_id: recipient.id)
    }.to have_enqueued_job.on_queue("notifications")
  end
end
