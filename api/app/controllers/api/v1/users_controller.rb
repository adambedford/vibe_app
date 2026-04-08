module Api
  module V1
    class UsersController < BaseController
      self.presenter_class = UserPresenter
      skip_before_action :authenticate!, only: [ :show, :apps, :followers, :following ]
      before_action :allow_anonymous!, only: [ :show, :apps, :followers, :following ]

      def show
        render_resource(record)
      end

      def apps
        scope = record.apps.published.includes(:creator, :current_version).order(created_at: :desc)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      def remixes
        scope = record.apps.published.where.not(parent_id: nil).includes(:creator, :current_version)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      def saves
        app_ids = record.bookmarks.order(created_at: :desc).pluck(:app_id)
        scope = App.published.where(id: app_ids).includes(:creator, :current_version)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      def followers
        user_ids = record.passive_follows.order(created_at: :desc).pluck(:follower_id)
        scope = User.where(id: user_ids)
        render_collection(scope)
      end

      def following
        user_ids = record.active_follows.order(created_at: :desc).pluck(:following_id)
        scope = User.where(id: user_ids)
        render_collection(scope)
      end

      def follow
        Follow.create!(follower: current_user, following: record)
        SendNotificationJob.perform_later("follow", actor_id: current_user.id, user_id: record.id)
        render_ok
      end

      def unfollow
        Follow.find_by!(follower: current_user, following: record).destroy!
        render_ok
      end

      private

      def record
        @record ||= User.find(params[:id])
      end
    end
  end
end
