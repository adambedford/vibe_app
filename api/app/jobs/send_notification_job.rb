class SendNotificationJob < ApplicationJob
  queue_as :notifications

  def perform(type, actor_id: nil, user_id:, app_id: nil)
    return if actor_id == user_id # Don't notify yourself

    NotificationSender.send(
      type: type,
      actor_id: actor_id,
      user_id: user_id,
      app_id: app_id
    )
  end
end
