module Api
  module V1
    class FeedController < BaseController
      def home
        apps = FeedBuilder.home(current_user, cursor: params[:cursor], per_page: per_page_param)
        render json: {
          data: apps[:records].map { |a| AppPresenter.new(a, presenter_context).as_json_card },
          pagination: apps[:meta]
        }
      end

      def explore
        apps = FeedBuilder.explore(cursor: params[:cursor], per_page: per_page_param)
        render json: {
          data: apps[:records].map { |a| AppPresenter.new(a, presenter_context).as_json_card },
          pagination: apps[:meta]
        }
      end

      def following
        scope = App.published
                    .where(creator_id: current_user.following_ids)
                    .includes(:creator, :current_version)
                    .order(created_at: :desc)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end
    end
  end
end
