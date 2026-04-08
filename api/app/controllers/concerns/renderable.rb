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

    data = paginated[:records].map do |record|
      p = klass.new(record, presenter_context.merge(opts))
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
