module Api
  module V1
    class CreationSessionsController < BaseController
      self.presenter_class = CreationSessionPresenter
      owned_by :user_id

      def create
        source_app = params[:source_app_id] ? App.find(params[:source_app_id]) : nil

        app = App.create!(
          creator: current_user,
          title: "Untitled",
          status: "draft",
          parent: source_app,
          root: source_app&.root || source_app,
          category: nil
        )

        session = CreationSession.create!(
          user: current_user,
          app: app,
          source_app: source_app,
          status: "active"
        )

        if params[:prompt].present?
          session.update!(messages: [ { role: "user", content: params[:prompt] } ])
          GenerateAppJob.perform_later(session.id)
        end

        render_resource(session, status: :created)
      end

      def show
        render_resource(record)
      end

      def message
        authorize!(record, :update)
        messages = record.messages + [ { role: "user", content: params.require(:content) } ]
        record.update!(messages: messages)

        if record.generated_version_id.present?
          EditAppJob.perform_later(record.id, params[:content])
        elsif record.plan.blank?
          GenerateAppJob.perform_later(record.id)
        end

        render_resource(record)
      end

      def approve
        authorize!(record, :update)
        record.update!(plan_approved: true)
        if params[:modifications].present?
          record.update!(messages: record.messages + [ { role: "user", content: params[:modifications] } ])
        end
        GenerateFromPlanJob.perform_later(record.id)
        render_resource(record)
      end

      def publish
        authorize!(record, :update)
        app = record.app

        unless app.current_version_id.present?
          return render_error("not_ready", "No generated version to publish")
        end

        app.update!(
          status: "published",
          title: record.plan&.dig("title") || app.title,
          description: record.plan&.dig("description"),
          category: record.enhanced_prompt&.match(/APP_TYPE:\s*(\w+)/)&.captures&.first
        )

        render_resource(app, presenter: AppPresenter)
      end

      private

      def base_scope
        current_user.creation_sessions
      end
    end
  end
end
