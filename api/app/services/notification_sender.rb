class NotificationSender
  def self.send(type:, actor_id: nil, user_id:, app_id: nil)
    notification = Notification.create!(
      user_id: user_id,
      notification_type: type,
      actor_id: actor_id,
      app_id: app_id
    )

    # Push notification via Expo (placeholder)
    send_push(notification) if ENV["EXPO_ACCESS_TOKEN"].present?

    notification
  end

  def self.send_push(notification)
    # Placeholder for Expo push notification
    # HTTParty.post("https://exp.host/--/api/v2/push/send", ...)
  end
end
