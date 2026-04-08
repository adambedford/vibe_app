module Renderable
  extend ActiveSupport::Concern

  private

  def render_resource(resource, status: :ok, presenter: nil, **opts)
    klass = presenter || self.class.presenter_class
    body = { data: klass.new(resource, presenter_context.merge(opts)).as_json }
    render json: body, status: status
  end

  def render_collection(scope, presenter: nil, variant: :default, **opts)
    klass = presenter || self.class.presenter_class
    paginated = paginate(scope)
    records = paginated[:records]

    # Batch-load interaction state to avoid N+1 in presenters
    ctx = presenter_context.merge(opts)
    if current_user && records.any?
      app_ids = records.select { |r| r.is_a?(App) }.map(&:id)
      user_ids = records.select { |r| r.is_a?(User) }.map(&:id)

      if app_ids.any?
        ctx[:liked_app_ids] = Like.where(user_id: current_user.id, app_id: app_ids).pluck(:app_id).to_set
        ctx[:saved_app_ids] = Bookmark.where(user_id: current_user.id, app_id: app_ids).pluck(:app_id).to_set
      end

      if user_ids.any?
        ctx[:following_user_ids] = Follow.where(follower_id: current_user.id, following_id: user_ids).pluck(:following_id).to_set
      end
    end

    data = records.map do |record|
      p = klass.new(record, ctx)
      variant == :card ? p.as_json_card : p.as_json
    end

    render json: { data: data, pagination: paginated[:meta] }
  end

  def render_ok(message: "ok")
    render json: { data: { status: message } }
  end

  def presenter_context
    {
      current_user: current_user,
      include: params[:include]&.split(",")
    }
  end
end
