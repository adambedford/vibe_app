module Authorizable
  extend ActiveSupport::Concern

  included do
    class_attribute :owner_field, default: nil
    before_action :authenticate!
  end

  class_methods do
    def owned_by(field)
      self.owner_field = field.to_s
    end
  end

  private

  def current_user
    @current_user ||= begin
      token = request.headers["Authorization"]&.split(" ")&.last
      return nil unless token

      secret = Rails.application.credentials.jwt_secret || "test-secret"
      payload = JWT.decode(token, secret, true, algorithm: "HS256").first

      return nil if JwtDenylist.revoked?(payload["jti"])

      User.find_by(id: payload["sub"])
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end
  end

  def authenticate!
    return if @allow_anonymous

    render_error("unauthorized", "Authentication required", status: :unauthorized) unless current_user
  end

  def allow_anonymous!
    @allow_anonymous = true
  end

  def authorize!(resource, action)
    case action
    when :create
      true
    when :update, :destroy
      raise ErrorHandling::ForbiddenError unless owner?(resource)
    end
  end

  def owner?(resource)
    return true unless owner_field
    resource.send(owner_field) == current_user&.id
  end
end
