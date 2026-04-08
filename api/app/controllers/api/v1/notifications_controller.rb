module Api
  module V1
    class NotificationsController < BaseController
      self.presenter_class = NotificationPresenter

      def index
        scope = current_user.notifications.includes(:actor, app: :current_version).order(created_at: :desc)
        render_collection(scope)
      end

      def read
        notification = current_user.notifications.find(params[:id])
        notification.update!(read: true)
        render_resource(notification)
      end

      def read_all
        current_user.notifications.where(read: false).update_all(read: true)
        render_ok
      end
    end
  end
end
