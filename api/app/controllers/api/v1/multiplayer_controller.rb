module Api
  module V1
    class MultiplayerController < BaseController
      def create
        app = App.find(params.require(:app_id))

        ApplicationRecord.transaction do
          session = MultiplayerSession.create!(
            app: app,
            host_user: current_user,
            max_players: params[:max_players] || 4,
            firebase_path: "/multiplayer/#{SecureRandom.hex}"
          )
          MultiplayerPlayer.create!(multiplayer_session: session, user: current_user, is_host: true)

          render json: { data: { id: session.id, lobby_id: session.id, firebase_path: session.firebase_path, status: session.status } }, status: :created
        end
      end

      def show
        session = MultiplayerSession.includes(:multiplayer_players, :players).find(params[:id])
        render json: {
          data: {
            id: session.id,
            status: session.status,
            max_players: session.max_players,
            firebase_path: session.firebase_path,
            host: UserPresenter.new(session.host_user, presenter_context).as_json_compact,
            players: session.players.map { |p| UserPresenter.new(p, presenter_context).as_json_compact }
          }
        }
      end

      def join
        session = MultiplayerSession.lock.find(params[:id])

        if session.multiplayer_players.count >= session.max_players
          return render_error("lobby_full", "Lobby is full", status: :unprocessable_entity)
        end

        MultiplayerPlayer.create!(multiplayer_session: session, user: current_user, is_host: false)
        render_ok
      end
    end
  end
end
