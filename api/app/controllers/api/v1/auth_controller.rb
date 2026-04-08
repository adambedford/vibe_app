module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate!, only: [ :register, :login, :refresh ]

      def register
        user = User.create!(register_params)
        tokens = generate_tokens(user)
        render json: { data: { user: UserPresenter.new(user, presenter_context).as_json, tokens: tokens } }, status: :created
      end

      def login
        user = User.find_by!(email: params.require(:email))
        unless user.authenticate(params.require(:password))
          return render_error("unauthorized", "Invalid email or password", status: :unauthorized)
        end
        tokens = generate_tokens(user)
        render json: { data: { user: UserPresenter.new(user, presenter_context).as_json, tokens: tokens } }
      end

      def refresh
        secret = Rails.application.credentials.jwt_secret || "test-secret"
        payload = JWT.decode(params.require(:refresh_token), secret, true, algorithm: "HS256").first
        user = User.find(payload["sub"])
        tokens = generate_tokens(user)
        render json: { data: tokens }
      rescue JWT::DecodeError, JWT::ExpiredSignature
        render_error("unauthorized", "Invalid refresh token", status: :unauthorized)
      end

      def logout
        token = request.headers["Authorization"]&.split(" ")&.last
        secret = Rails.application.credentials.jwt_secret || "test-secret"
        payload = JWT.decode(token, secret, true, algorithm: "HS256").first
        JwtDenylist.create!(jti: payload["jti"], exp: Time.at(payload["exp"]))
        render_ok
      end

      private

      def register_params
        params.permit(:email, :password, :display_name, :username, :date_of_birth)
      end

      def generate_tokens(user)
        secret = Rails.application.credentials.jwt_secret || "test-secret"
        jti = SecureRandom.uuid
        access = JWT.encode(
          { sub: user.id, jti: jti, exp: 15.minutes.from_now.to_i, type: "access" },
          secret, "HS256"
        )
        refresh = JWT.encode(
          { sub: user.id, exp: 30.days.from_now.to_i, type: "refresh" },
          secret, "HS256"
        )
        { access_token: access, refresh_token: refresh, expires_in: 900 }
      end
    end
  end
end
