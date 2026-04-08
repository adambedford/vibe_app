class AppVersionPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      bundle_url: object.bundle_url,
      thumbnail_url: object.thumbnail_url,
      source: object.source,
      is_current: object.id == object.app.current_version_id,
      created_at: fmt(object.created_at)
    }
  end
end
