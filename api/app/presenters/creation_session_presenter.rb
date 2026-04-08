class CreationSessionPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      status: object.status,
      plan: object.plan,
      plan_approved: object.plan_approved,
      app_id: object.app_id,
      generated_version_id: object.generated_version_id,
      fix_passes: object.fix_passes,
      created_at: fmt(object.created_at),
      updated_at: fmt(object.updated_at)
    }
  end
end
