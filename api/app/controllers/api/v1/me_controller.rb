module Api
  module V1
    class MeController < BaseController
      self.presenter_class = UserPresenter

      def show
        render_resource(current_user)
      end

      def update
        current_user.avatar.attach(params[:avatar]) if params[:avatar].present?
        current_user.update!(me_params)
        render_resource(current_user)
      end

      def destroy
        current_user.update!(status: "pending_deletion", email: "deleted_#{current_user.id}@deleted.vibe.app")
        AccountDeletionJob.perform_later(current_user.id)
        render_ok(message: "Account scheduled for deletion")
      end

      private

      def me_params
        params.permit(:display_name, :username, :bio)
      end
    end
  end
end
