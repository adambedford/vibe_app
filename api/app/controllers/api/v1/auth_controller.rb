module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate!, only: [ :register, :login, :refresh, :oauth ]

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

      def oauth
        provider = params.require(:provider)
        token = params.require(:token)

        unless %w[apple google].include?(provider)
          return render_error("bad_request", "Unsupported provider", status: :bad_request)
        end

        identity = verify_oauth_token(provider, token)
        unless identity
          return render_error("unauthorized", "Invalid OAuth token", status: :unauthorized)
        end

        user = User.find_by(oauth_provider: provider, oauth_uid: identity[:uid])
        user ||= User.find_by(email: identity[:email])

        if user
          user.update!(oauth_provider: provider, oauth_uid: identity[:uid]) unless user.oauth_uid
        else
          user = User.create!(
            email: identity[:email],
            display_name: identity[:name] || identity[:email].split("@").first,
            username: generate_username(identity[:name] || identity[:email].split("@").first),
            date_of_birth: params[:date_of_birth] || 18.years.ago.to_date,
            oauth_provider: provider,
            oauth_uid: identity[:uid],
            password: SecureRandom.hex(16)
          )
        end

        tokens = generate_tokens(user)
        render json: { data: { user: UserPresenter.new(user, presenter_context).as_json, tokens: tokens, is_new: user.previously_new_record? } }
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

      def verify_oauth_token(provider, token)
        case provider
        when "apple"
          verify_apple_token(token)
        when "google"
          verify_google_token(token)
        end
      end

      def verify_apple_token(identity_token)
        # Decode Apple identity token (JWT signed by Apple)
        # In production: verify against Apple's public keys
        # https://developer.apple.com/documentation/sign_in_with_apple
        payload = JWT.decode(identity_token, nil, false).first
        {
          uid: payload["sub"],
          email: payload["email"],
          name: payload["name"]
        }
      rescue JWT::DecodeError
        nil
      end

      def verify_google_token(id_token)
        # Verify Google ID token
        # In production: verify via Google's tokeninfo endpoint or google-id-token gem
        response = HTTParty.get("https://oauth2.googleapis.com/tokeninfo?id_token=#{id_token}")
        return nil unless response.success?

        data = JSON.parse(response.body)
        {
          uid: data["sub"],
          email: data["email"],
          name: data["name"]
        }
      rescue StandardError
        nil
      end

      def generate_username(name)
        base = name.downcase.gsub(/[^a-z0-9]/, "").first(12)
        base = "user" if base.blank?
        candidate = base
        counter = 1
        while User.exists?(username: candidate)
          candidate = "#{base}#{counter}"
          counter += 1
        end
        candidate
      end
    end
  end
end
