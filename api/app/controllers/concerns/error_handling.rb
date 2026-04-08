module ErrorHandling
  extend ActiveSupport::Concern

  class ForbiddenError < StandardError; end

  included do
    rescue_from ActiveRecord::RecordNotFound,       with: :handle_not_found
    rescue_from ActiveRecord::RecordInvalid,        with: :handle_validation_error
    rescue_from ActiveRecord::RecordNotUnique,      with: :handle_conflict
    rescue_from ActionController::ParameterMissing, with: :handle_bad_request
    rescue_from ForbiddenError,                     with: :handle_forbidden
  end

  private

  def render_error(code, message, status: :unprocessable_entity, details: nil)
    body = { error: { code: code, message: message } }
    body[:error][:details] = details if details
    render json: body, status: status
  end

  def handle_not_found(exc)
    resource = exc.model&.underscore&.humanize || "Resource"
    render_error("not_found", "#{resource} not found", status: :not_found)
  end

  def handle_validation_error(exc)
    details = exc.record.errors.map { |e| { field: e.attribute.to_s, message: e.message } }
    render_error("validation_failed", "Validation failed", details: details)
  end

  def handle_conflict(_exc)
    render_error("conflict", "Resource already exists", status: :conflict)
  end

  def handle_bad_request(exc)
    render_error("bad_request", exc.message, status: :bad_request)
  end

  def handle_forbidden(_exc)
    render_error("forbidden", "You do not have permission for this action", status: :forbidden)
  end
end
