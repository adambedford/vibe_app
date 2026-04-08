module Api
  module V1
    class AppsController < BaseController
      self.presenter_class = AppPresenter
      owned_by :creator_id
      sortable_by :created_at, :play_count, :like_count, default: "-created_at"
      filterable_by :category, :is_multiplayer

      skip_before_action :authenticate!, only: [ :show, :bundle, :comments ]
      before_action :allow_anonymous!, only: [ :show, :bundle, :comments ]

      def show
        render_resource(record)
      end

      def bundle
        version = record.current_version
        return render_error("not_found", "No published version", status: :not_found) unless version
        redirect_to version.bundle_url, allow_other_host: true
      end

      def versions
        authorize!(record, :update)
        scope = record.versions.order(created_at: :desc)
        render_collection(scope, presenter: AppVersionPresenter)
      end

      def lineage
        chain = []
        app = record
        while app
          chain << { id: app.id, title: app.title, creator: UserPresenter.new(app.creator, presenter_context).as_json_compact }
          app = app.parent
        end
        render json: { data: chain }
      end

      def remixes
        scope = record.remixes.published.includes(:creator, :current_version)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      def like
        Like.create!(user: current_user, app: record)
        render_ok
      end

      def unlike
        Like.find_by!(user: current_user, app: record).destroy!
        render_ok
      end

      def comments
        scope = record.comments.includes(:user).order(created_at: :asc)
        render_collection(scope, presenter: CommentPresenter)
      end

      def create_comment
        comment = record.comments.create!(user: current_user, body: params.require(:body), parent_id: params[:parent_id])
        SendNotificationJob.perform_later("comment", actor_id: current_user.id, app_id: record.id, user_id: record.creator_id)
        render_resource(comment, presenter: CommentPresenter, status: :created)
      end

      def report
        Report.create!(reporter: current_user, app: record, reason: params.require(:reason))
        render_ok
      end

      def save
        Bookmark.create!(user: current_user, app: record)
        render_ok
      end

      def unsave
        Bookmark.find_by!(user: current_user, app: record).destroy!
        render_ok
      end

      def play
        PlaySession.create!(user: current_user, app: record, duration_seconds: params.require(:duration_seconds).to_i)
        head :no_content
      end

      def remix
        app = App.create!(
          creator: current_user,
          title: "Remix of #{record.title}",
          status: "draft",
          parent: record,
          root: record.root || record,
          category: record.category
        )
        session = CreationSession.create!(user: current_user, app: app, source_app: record, status: "active")
        render_resource(session, presenter: CreationSessionPresenter, status: :created)
      end

      def revert
        authorize!(record, :update)
        version = record.versions.find(params[:version_id])
        record.update!(current_version: version)
        render_resource(record)
      end

      private

      def base_scope
        App.published.includes(:creator, :current_version)
      end

      def record
        @record ||= App.includes(:creator, :current_version, :parent).find(params[:id])
      end
    end
  end
end
