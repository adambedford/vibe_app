class CreationSessionPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      status: object.status,
      plan: object.plan,
      plan_approved: object.plan_approved,
      app_id: object.app_id,
      generated_version_id: object.generated_version_id,
      thumbnail_url: object.app&.current_version&.thumbnail_url,
      fix_passes: object.fix_passes,
      max_fix_passes: 3,
      form_inputs: form_inputs_json,
      error: error_json,
      created_at: fmt(object.created_at),
      updated_at: fmt(object.updated_at)
    }
  end

  private

  def form_inputs_json
    object.form_inputs&.attributes&.compact
  end

  def error_json
    return nil unless object.last_error
    {
      type: object.last_error.error_type,
      message: object.last_error.message,
      retryable: object.last_error.retryable?
    }
  end
end
