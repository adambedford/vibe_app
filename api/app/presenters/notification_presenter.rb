class NotificationPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      type: object.notification_type,
      read: object.read,
      actor: object.actor ? UserPresenter.new(object.actor, options).as_json_compact : nil,
      app: object.app ? { id: object.app.id, title: object.app.title, thumbnail_url: object.app.current_version&.thumbnail_url } : nil,
      created_at: fmt(object.created_at)
    }
  end
end
