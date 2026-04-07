# Vibe — API Reference & Rails Architecture

**Version:** 2.0
**Last Updated:** 2026-03-29
**Status:** Ready for Engineering

---

## 1. Architecture Overview

The API is a framework-level abstraction where resource controllers inherit full CRUD behavior from a base class and only override what's custom. All cross-cutting concerns — rendering, errors, pagination, sorting, filtering, permissions — are implemented as composable concerns that the base controller wires together.

```
Api::V1::BaseController
├── include Renderable         # Presenter-based response rendering
├── include ErrorHandling      # Rescue handlers, error envelope
├── include Paginatable        # Cursor-based pagination
├── include Sortable           # Query param sorting
├── include Filterable         # Query param filtering
├── include Authorizable       # Permission checks
│
├── default index/show/create/update/destroy actions
├── convention-based model/presenter resolution
│
└── Resource controllers inherit and configure:
    ├── Api::V1::AppsController
    ├── Api::V1::UsersController
    ├── Api::V1::CommentsController
    └── ...
```

**Design principles:**
- A new resource controller with zero overrides should give you a working CRUD API
- Configuration over implementation — controllers declare behavior, concerns execute it
- Override individual actions only when the default doesn't fit
- Every controller action produces consistent response shapes without thinking about it

---

## 2. Namespace & Routing

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth (not RESTful — custom controller)
      post   'auth/register',        to: 'auth#register'
      post   'auth/login',           to: 'auth#login'
      post   'auth/refresh',         to: 'auth#refresh'
      delete 'auth/logout',          to: 'auth#logout'

      # Users
      resource  :me, controller: 'me', only: [:show, :update, :destroy]  # Current user
      resources :users, only: [:show] do
        member do
          get    :apps
          get    :remixes
          get    :saves
          get    :followers
          get    :following
          post   :follow
          delete :follow, action: :unfollow
        end
      end

      # Feed
      get 'feed',           to: 'feed#home'
      get 'feed/explore',   to: 'feed#explore'
      get 'feed/following', to: 'feed#following'

      # Apps
      resources :apps, only: [:show] do
        member do
          get    :bundle
          get    :lineage
          get    :versions
          get    :remixes
          post   :like
          delete :like,    action: :unlike
          get    :comments
          post   :comments, action: :create_comment
          post   :report
          post   :save
          delete :save,    action: :unsave
          post   :play
          post   :remix
          post   'revert/:version_id', action: :revert
        end
      end

      # Creation Sessions
      resources :creation_sessions, path: 'create/sessions', only: [:create, :show] do
        member do
          post :message
          post :approve
          post :publish
        end
      end

      # Multiplayer
      resources :lobbies, controller: 'multiplayer', only: [:create, :show] do
        member do
          post :join
        end
      end

      # Notifications
      resources :notifications, only: [:index] do
        member do
          patch :read
        end
        collection do
          post :read_all
        end
      end
    end
  end
end
```

All routes are prefixed `/api/v1/`. Versioning via URL path — when V2 is needed, mount a new namespace without breaking existing clients.

---

## 3. BaseController

The core of the framework. Provides default CRUD actions that work via convention. Resource controllers inherit and configure.

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ActionController::API
      include Renderable
      include ErrorHandling
      include Paginatable
      include Sortable
      include Filterable
      include Authorizable

      before_action :authenticate!

      # --- Convention-based configuration ---

      class << self
        attr_writer :model_class, :presenter_class

        # Infer model from controller name: AppsController -> App
        def model_class
          @model_class ||= controller_name.classify.constantize
        end

        # Infer presenter from model: App -> AppPresenter
        def presenter_class
          @presenter_class ||= "#{model_class.name}Presenter".constantize
        end

        # Declare permitted params for create/update
        def permit_params(*attrs)
          @permitted_params = attrs
        end

        def permitted_params
          @permitted_params || []
        end
      end

      # --- Default CRUD actions ---

      # GET /resources
      def index
        scope = apply_scopes(base_scope)
        render_collection(scope)
      end

      # GET /resources/:id
      def show
        render_resource(record)
      end

      # POST /resources
      def create
        obj = self.class.model_class.new(permitted_resource_params)
        authorize!(obj, :create)
        obj.save!
        render_resource(obj, status: :created)
      end

      # PATCH /resources/:id
      def update
        authorize!(record, :update)
        record.update!(permitted_resource_params)
        render_resource(record)
      end

      # DELETE /resources/:id
      def destroy
        authorize!(record, :destroy)
        record.destroy!
        render_ok
      end

      private

      # Base scope — override in subclass for default filtering (e.g., published only)
      def base_scope
        self.class.model_class.all
      end

      # Find record by :id — override for custom lookup (e.g., by username)
      def record
        @record ||= base_scope.find(params[:id])
      end

      # Apply all scope modifiers: sort, filter, includes
      def apply_scopes(scope)
        scope = apply_sort(scope)
        scope = apply_filters(scope)
        scope = apply_includes(scope)
        scope
      end

      # Override to eager-load associations
      def apply_includes(scope)
        scope
      end

      def permitted_resource_params
        params.permit(*self.class.permitted_params)
      end
    end
  end
end
```

---

## 4. Concerns

### 4.1 Renderable

Presenter-based rendering. Controllers never call `render json:` directly — they call `render_resource` or `render_collection`, which route through the presenter layer.

```ruby
# app/controllers/concerns/renderable.rb
module Renderable
  extend ActiveSupport::Concern

  private

  # Render single resource: { data: { ... } }
  def render_resource(resource, status: :ok, presenter: nil, **opts)
    klass = presenter || self.class.presenter_class
    body = { data: klass.new(resource, presenter_context.merge(opts)).as_json }
    render json: body, status: status
  end

  # Render collection with pagination: { data: [...], pagination: { ... } }
  def render_collection(scope, presenter: nil, variant: :default, **opts)
    klass = presenter || self.class.presenter_class
    paginated = paginate(scope)

    data = paginated[:records].map do |record|
      p = klass.new(record, presenter_context.merge(opts))
      variant == :card ? p.as_json_card : p.as_json
    end

    render json: { data: data, pagination: paginated[:meta] }
  end

  # Simple success response for actions (like, follow, etc.)
  def render_ok(message: 'ok')
    render json: { data: { status: message } }
  end

  # Context passed to every presenter
  def presenter_context
    {
      current_user: current_user,
      include: params[:include]&.split(','),
    }
  end
end
```

### 4.2 ErrorHandling

Consistent error envelope for all failure cases. Controllers can call `render_error` explicitly or let rescue_from handlers catch exceptions.

```ruby
# app/controllers/concerns/error_handling.rb
module ErrorHandling
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound,       with: :handle_not_found
    rescue_from ActiveRecord::RecordInvalid,        with: :handle_validation_error
    rescue_from ActiveRecord::RecordNotUnique,      with: :handle_conflict
    rescue_from ActionController::ParameterMissing, with: :handle_bad_request
    rescue_from Pundit::NotAuthorizedError,         with: :handle_forbidden if defined?(Pundit)
  end

  private

  # Standard error envelope — all errors use this shape
  #
  # {
  #   "error": {
  #     "code": "validation_failed",
  #     "message": "Validation failed",
  #     "details": [{ "field": "email", "message": "is invalid" }]
  #   }
  # }
  def render_error(code, message, status: :unprocessable_entity, details: nil)
    body = { error: { code: code, message: message } }
    body[:error][:details] = details if details
    render json: body, status: status
  end

  def handle_not_found(exc)
    resource = exc.model&.underscore&.humanize || 'Resource'
    render_error('not_found', "#{resource} not found", status: :not_found)
  end

  def handle_validation_error(exc)
    details = exc.record.errors.map { |e| { field: e.attribute.to_s, message: e.message } }
    render_error('validation_failed', 'Validation failed', details: details)
  end

  def handle_conflict(_exc)
    render_error('conflict', 'Resource already exists', status: :conflict)
  end

  def handle_bad_request(exc)
    render_error('bad_request', exc.message, status: :bad_request)
  end

  def handle_forbidden(_exc)
    render_error('forbidden', 'You do not have permission for this action', status: :forbidden)
  end
end
```

**Error codes:**

| HTTP | Code | When |
|---|---|---|
| 400 | `bad_request` | Missing required params |
| 401 | `unauthorized` | No token or expired |
| 403 | `forbidden` | Action not allowed for this user |
| 404 | `not_found` | Resource doesn't exist |
| 409 | `conflict` | Duplicate action (already liked, already following) |
| 422 | `validation_failed` | Model validation errors (with per-field details) |
| 429 | `rate_limited` | Rack::Attack throttle hit |
| 500 | `internal_error` | Unhandled server error (Sentry captures these) |

### 4.3 Paginatable

Cursor-based pagination using `created_at` as the default cursor. Controllers can override the cursor column.

```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  DEFAULT_PER_PAGE = 20
  MAX_PER_PAGE = 50

  included do
    class_attribute :cursor_column, default: :created_at
    class_attribute :cursor_direction, default: :desc
  end

  private

  def paginate(scope)
    per = [per_page_param, MAX_PER_PAGE].min

    if params[:cursor].present?
      cursor_value = parse_cursor(params[:cursor])
      operator = cursor_direction == :desc ? '<' : '>'
      scope = scope.where("#{cursor_column} #{operator} ?", cursor_value)
    end

    records = scope.order(cursor_column => cursor_direction).limit(per + 1).to_a
    has_more = records.size > per
    records = records.first(per)

    {
      records: records,
      meta: {
        per_page: per,
        has_more: has_more,
        next_cursor: has_more ? encode_cursor(records.last) : nil,
      }
    }
  end

  # For custom cursor columns (e.g., score-based leaderboards)
  def paginate_by(scope, column:, direction: :desc)
    old_col, old_dir = self.cursor_column, self.cursor_direction
    self.cursor_column = column
    self.cursor_direction = direction
    result = paginate(scope)
    self.cursor_column = old_col
    self.cursor_direction = old_dir
    result
  end

  def per_page_param
    (params[:per_page] || DEFAULT_PER_PAGE).to_i
  end

  def parse_cursor(cursor)
    if cursor_column == :created_at
      Time.iso8601(cursor)
    else
      cursor # Numeric or string, depends on column type
    end
  end

  def encode_cursor(record)
    value = record.send(cursor_column)
    value.respond_to?(:iso8601) ? value.iso8601(6) : value.to_s
  end
end
```

**Pagination response shape (on every collection endpoint):**

```json
{
  "data": [ ... ],
  "pagination": {
    "per_page": 20,
    "has_more": true,
    "next_cursor": "2026-03-29T14:32:07.123456Z"
  }
}
```

Client fetches next page by passing `?cursor=2026-03-29T14:32:07.123456Z`.

### 4.4 Sortable

Declared per-controller. Query param `?sort=play_count` or `?sort=-created_at` (prefix `-` for desc).

```ruby
# app/controllers/concerns/sortable.rb
module Sortable
  extend ActiveSupport::Concern

  included do
    class_attribute :sortable_fields, default: %w[created_at]
    class_attribute :default_sort, default: '-created_at'
  end

  class_methods do
    def sortable_by(*fields, default: '-created_at')
      self.sortable_fields = fields.map(&:to_s)
      self.default_sort = default.to_s
    end
  end

  private

  def apply_sort(scope)
    sort_param = params[:sort].presence || default_sort
    direction = sort_param.start_with?('-') ? :desc : :asc
    column = sort_param.delete_prefix('-')

    return scope unless sortable_fields.include?(column)

    scope.order(column => direction)
  end
end
```

### 4.5 Filterable

Declared per-controller. Automatically applies `WHERE` clauses from query params.

```ruby
# app/controllers/concerns/filterable.rb
module Filterable
  extend ActiveSupport::Concern

  included do
    class_attribute :filterable_fields, default: []
  end

  class_methods do
    def filterable_by(*fields)
      self.filterable_fields = fields.map(&:to_s)
    end
  end

  private

  def apply_filters(scope)
    filterable_fields.each do |field|
      value = params[field]
      next unless value.present?

      scope = case value
              when 'true'  then scope.where(field => true)
              when 'false' then scope.where(field => false)
              else scope.where(field => value)
              end
    end
    scope
  end
end
```

### 4.6 Authorizable

Lightweight permission framework. Controllers declare ownership rules; the concern enforces them.

```ruby
# app/controllers/concerns/authorizable.rb
module Authorizable
  extend ActiveSupport::Concern

  included do
    class_attribute :owner_field, default: nil  # e.g., :creator_id, :user_id
  end

  class_methods do
    def owned_by(field)
      self.owner_field = field.to_s
    end
  end

  private

  def current_user
    @current_user ||= begin
      token = request.headers['Authorization']&.split(' ')&.last
      return nil unless token
      payload = JWT.decode(
        token,
        Rails.application.credentials.jwt_secret,
        true,
        algorithm: 'HS256'
      ).first
      User.find_by(id: payload['sub'])
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end
  end

  def authenticate!
    render_error('unauthorized', 'Authentication required', status: :unauthorized) unless current_user
  end

  # Skip auth for specific actions
  def skip_auth!
    # Override authenticate! to be a no-op for this request
  end

  # Check if current user can perform action on resource
  def authorize!(resource, action)
    case action
    when :create
      # Default: any authenticated user can create
      true
    when :update, :destroy
      unless owner?(resource)
        raise Pundit::NotAuthorizedError if defined?(Pundit)
        render_error('forbidden', 'You do not have permission', status: :forbidden)
      end
    end
  end

  def owner?(resource)
    return true unless owner_field
    resource.send(owner_field) == current_user&.id
  end

  # Allow anonymous access (current_user may be nil)
  def allow_anonymous!
    @allow_anonymous = true
  end

  def authenticate!
    return if @allow_anonymous
    super
  end
end
```

---

## 5. Presenters

### 5.1 ApplicationPresenter

```ruby
# app/presenters/application_presenter.rb
class ApplicationPresenter
  attr_reader :object, :options

  def initialize(object, options = {})
    @object = object
    @options = options
  end

  def as_json
    raise NotImplementedError, "#{self.class}#as_json must be implemented"
  end

  # Default card representation — override in subclass for compact feed cards
  def as_json_card
    as_json
  end

  # Wrap in response envelope
  def to_response
    { data: as_json }
  end

  private

  def fmt(time)
    time&.iso8601
  end

  def current_user
    options[:current_user]
  end

  def include?(key)
    options[:include]&.include?(key.to_s)
  end
end
```

### 5.2 Resource Presenters

```ruby
# app/presenters/user_presenter.rb
class UserPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      username: object.username,
      display_name: object.display_name,
      avatar_url: object.avatar_url,
      bio: object.bio,
      follower_count: object.followers_count,
      following_count: object.following_count,
      app_count: object.apps.published.count,
      is_following: current_user ? Follow.exists?(follower_id: current_user.id, following_id: object.id) : nil,
      created_at: fmt(object.created_at),
    }
  end

  # Embedded in feed cards, comments, notifications
  def as_json_compact
    {
      id: object.id,
      username: object.username,
      display_name: object.display_name,
      avatar_url: object.avatar_url,
    }
  end
end

# app/presenters/app_presenter.rb
class AppPresenter < ApplicationPresenter
  def as_json
    version = object.current_version
    {
      id: object.id,
      title: object.title,
      description: object.description,
      category: object.category,
      thumbnail_url: version&.thumbnail_url,
      bundle_url: version&.bundle_url,
      is_multiplayer: object.is_multiplayer,
      max_players: object.max_players,
      play_count: object.play_count,
      like_count: object.like_count,
      remix_count: object.remix_count,
      comment_count: object.comment_count,
      creator: UserPresenter.new(object.creator, options).as_json_compact,
      parent: object.parent ? { id: object.parent_id, title: object.parent.title } : nil,
      is_liked: current_user ? Like.exists?(user_id: current_user.id, app_id: object.id) : nil,
      is_saved: current_user ? Save.exists?(user_id: current_user.id, app_id: object.id) : nil,
      is_mine: current_user&.id == object.creator_id,
      status: object.status,
      version_id: object.current_version_id,
      created_at: fmt(object.created_at),
      updated_at: fmt(object.updated_at),
    }
  end

  # Compact card for feed — no description, no bundle_url, no version details
  def as_json_card
    version = object.current_version
    {
      id: object.id,
      title: object.title,
      category: object.category,
      thumbnail_url: version&.thumbnail_url,
      is_multiplayer: object.is_multiplayer,
      play_count: object.play_count,
      like_count: object.like_count,
      remix_count: object.remix_count,
      creator: UserPresenter.new(object.creator, options).as_json_compact,
      is_liked: current_user ? Like.exists?(user_id: current_user.id, app_id: object.id) : nil,
      is_saved: current_user ? Save.exists?(user_id: current_user.id, app_id: object.id) : nil,
      created_at: fmt(object.created_at),
    }
  end
end

# app/presenters/app_version_presenter.rb
class AppVersionPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      bundle_url: object.bundle_url,
      thumbnail_url: object.thumbnail_url,
      source: object.source,
      is_current: object.id == object.app.current_version_id,
      created_at: fmt(object.created_at),
    }
  end
end

# app/presenters/comment_presenter.rb
class CommentPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      body: object.body,
      user: UserPresenter.new(object.user, options).as_json_compact,
      parent_id: object.parent_id,
      created_at: fmt(object.created_at),
    }
  end
end

# app/presenters/notification_presenter.rb
class NotificationPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      type: object.notification_type,
      read: object.read,
      actor: object.actor ? UserPresenter.new(object.actor, options).as_json_compact : nil,
      app: object.app ? { id: object.app.id, title: object.app.title, thumbnail_url: object.app.current_version&.thumbnail_url } : nil,
      created_at: fmt(object.created_at),
    }
  end
end

# app/presenters/creation_session_presenter.rb
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
      updated_at: fmt(object.updated_at),
    }
  end
end
```

---

## 6. Resource Controllers

Each controller inherits from BaseController, declares its configuration, and only overrides actions that diverge from the default CRUD pattern.

### 6.1 Apps

```ruby
# app/controllers/api/v1/apps_controller.rb
module Api
  module V1
    class AppsController < BaseController
      self.presenter_class = AppPresenter
      owned_by :creator_id
      sortable_by :created_at, :play_count, :like_count, default: '-created_at'
      filterable_by :category, :is_multiplayer

      skip_before_action :authenticate!, only: [:show, :bundle, :comments]

      # GET /api/v1/apps/:id
      def show
        render_resource(record)
      end

      # GET /api/v1/apps/:id/bundle
      def bundle
        version = record.current_version
        return render_error('not_found', 'No published version', status: :not_found) unless version
        redirect_to version.bundle_url, allow_other_host: true
      end

      # GET /api/v1/apps/:id/versions (creator only)
      def versions
        authorize!(record, :update)
        scope = record.versions.order(created_at: :desc)
        render_collection(scope, presenter: AppVersionPresenter)
      end

      # GET /api/v1/apps/:id/lineage
      def lineage
        chain = []
        app = record
        while app
          chain << { id: app.id, title: app.title, creator: UserPresenter.new(app.creator, presenter_context).as_json_compact }
          app = app.parent
        end
        render json: { data: chain }
      end

      # GET /api/v1/apps/:id/remixes
      def remixes
        scope = record.remixes.published.includes(:creator, :current_version)
        render_collection(scope, variant: :card)
      end

      # POST /api/v1/apps/:id/like
      def like
        Like.create!(user: current_user, app: record)
        render_ok
      end

      # DELETE /api/v1/apps/:id/like
      def unlike
        Like.find_by!(user: current_user, app: record).destroy!
        render_ok
      end

      # GET /api/v1/apps/:id/comments
      def comments
        scope = record.comments.includes(:user).order(created_at: :asc)
        render_collection(scope, presenter: CommentPresenter)
      end

      # POST /api/v1/apps/:id/comments
      def create_comment
        comment = record.comments.create!(user: current_user, body: params.require(:body), parent_id: params[:parent_id])
        render_resource(comment, presenter: CommentPresenter, status: :created)
      end

      # POST /api/v1/apps/:id/report
      def report
        Report.create!(reporter: current_user, app: record, reason: params.require(:reason))
        render_ok
      end

      # POST /api/v1/apps/:id/save
      def save
        Save.create!(user: current_user, app: record)
        render_ok
      end

      # DELETE /api/v1/apps/:id/save
      def unsave
        Save.find_by!(user: current_user, app: record).destroy!
        render_ok
      end

      # POST /api/v1/apps/:id/play
      def play
        PlaySession.create!(user: current_user, app: record, duration_seconds: params.require(:duration_seconds).to_i)
        head :no_content
      end

      # POST /api/v1/apps/:id/remix
      def remix
        app = App.create!(
          creator: current_user,
          title: "Remix of #{record.title}",
          status: 'draft',
          parent: record,
          root: record.root || record,
          category: record.category,
        )
        session = CreationSession.create!(user: current_user, app: app, source_app: record, status: 'active')
        render_resource(session, presenter: CreationSessionPresenter, status: :created)
      end

      # POST /api/v1/apps/:id/revert/:version_id (creator only)
      def revert
        authorize!(record, :update)
        version = record.versions.find(params[:version_id])
        record.update!(current_version: version)
        render_resource(record)
      end

      private

      def base_scope
        App.published.includes(:creator, :current_version)
      end

      def record
        @record ||= App.includes(:creator, :current_version, :parent).find(params[:id])
      end
    end
  end
end
```

### 6.2 Feed

Not a resource controller — custom actions only.

```ruby
# app/controllers/api/v1/feed_controller.rb
module Api
  module V1
    class FeedController < BaseController
      # GET /api/v1/feed
      def home
        apps = FeedBuilder.home(current_user, cursor: params[:cursor], per_page: per_page_param)
        render json: {
          data: apps[:records].map { |a| AppPresenter.new(a, presenter_context).as_json_card },
          pagination: apps[:meta],
        }
      end

      # GET /api/v1/feed/explore
      def explore
        apps = FeedBuilder.explore(cursor: params[:cursor], per_page: per_page_param)
        render json: {
          data: apps[:records].map { |a| AppPresenter.new(a, presenter_context).as_json_card },
          pagination: apps[:meta],
        }
      end

      # GET /api/v1/feed/following
      def following
        scope = App.published
                    .where(creator_id: current_user.following_ids)
                    .includes(:creator, :current_version)
                    .order(created_at: :desc)
        render_collection(scope, variant: :card)
      end
    end
  end
end
```

### 6.3 Users

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < BaseController
      self.presenter_class = UserPresenter
      skip_before_action :authenticate!, only: [:show, :apps, :followers, :following]

      # GET /api/v1/users/:id
      def show
        render_resource(record)
      end

      # GET /api/v1/users/:id/apps
      def apps
        scope = record.apps.published.includes(:creator, :current_version).order(created_at: :desc)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      # GET /api/v1/users/:id/remixes
      def remixes
        scope = record.apps.published.where.not(parent_id: nil).includes(:creator, :current_version)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      # GET /api/v1/users/:id/saves
      def saves
        app_ids = record.saves.order(created_at: :desc).pluck(:app_id)
        scope = App.published.where(id: app_ids).includes(:creator, :current_version)
        render_collection(scope, presenter: AppPresenter, variant: :card)
      end

      # GET /api/v1/users/:id/followers
      def followers
        user_ids = record.passive_follows.order(created_at: :desc).pluck(:follower_id)
        scope = User.where(id: user_ids)
        render_collection(scope)
      end

      # GET /api/v1/users/:id/following
      def following
        user_ids = record.active_follows.order(created_at: :desc).pluck(:following_id)
        scope = User.where(id: user_ids)
        render_collection(scope)
      end

      # POST /api/v1/users/:id/follow
      def follow
        Follow.create!(follower: current_user, following: record)
        SendNotificationJob.perform_later('follow', actor_id: current_user.id, user_id: record.id)
        render_ok
      end

      # DELETE /api/v1/users/:id/follow
      def unfollow
        Follow.find_by!(follower: current_user, following: record).destroy!
        render_ok
      end

      private

      def record
        @record ||= User.find(params[:id])
      end
    end
  end
end
```

### 6.4 Me (Current User)

```ruby
# app/controllers/api/v1/me_controller.rb
module Api
  module V1
    class MeController < BaseController
      self.presenter_class = UserPresenter

      # GET /api/v1/me
      def show
        render_resource(current_user)
      end

      # PATCH /api/v1/me (multipart — accepts avatar file)
      def update
        current_user.avatar.attach(params[:avatar]) if params[:avatar].present?
        current_user.update!(me_params)
        render_resource(current_user)
      end

      # DELETE /api/v1/me (account deletion)
      def destroy
        current_user.update!(status: 'pending_deletion', email: "deleted_#{current_user.id}@deleted.vibe.app")
        AccountDeletionJob.perform_later(current_user.id)
        render_ok(message: 'Account scheduled for deletion')
      end

      private

      def me_params
        params.permit(:display_name, :username, :bio)
      end
    end
  end
end
```

### 6.5 Creation Sessions

```ruby
# app/controllers/api/v1/creation_sessions_controller.rb
module Api
  module V1
    class CreationSessionsController < BaseController
      self.presenter_class = CreationSessionPresenter
      owned_by :user_id

      # POST /api/v1/create/sessions
      def create
        source_app = params[:source_app_id] ? App.find(params[:source_app_id]) : nil

        app = App.create!(
          creator: current_user,
          title: 'Untitled',
          status: 'draft',
          parent: source_app,
          root: source_app&.root || source_app,
          category: nil,
        )

        session = CreationSession.create!(
          user: current_user,
          app: app,
          source_app: source_app,
          status: 'active',
        )

        if params[:prompt].present?
          session.update!(messages: [{ role: 'user', content: params[:prompt] }])
          GenerateAppJob.perform_later(session.id)
        end

        render_resource(session, status: :created)
      end

      # GET /api/v1/create/sessions/:id
      def show
        render_resource(record)
      end

      # POST /api/v1/create/sessions/:id/message
      def message
        authorize!(record, :update)
        messages = record.messages + [{ role: 'user', content: params.require(:content) }]
        record.update!(messages: messages)

        if record.generated_version_id.present?
          # Post-generation edit
          EditAppJob.perform_later(record.id, params[:content])
        else
          # Still in initial generation flow
          GenerateAppJob.perform_later(record.id) unless record.plan.present?
        end

        render_resource(record)
      end

      # POST /api/v1/create/sessions/:id/approve
      def approve
        authorize!(record, :update)
        record.update!(plan_approved: true)
        if params[:modifications].present?
          record.update!(messages: record.messages + [{ role: 'user', content: params[:modifications] }])
        end
        GenerateFromPlanJob.perform_later(record.id)
        render_resource(record)
      end

      # POST /api/v1/create/sessions/:id/publish
      def publish
        authorize!(record, :update)
        app = record.app

        unless app.current_version_id.present?
          return render_error('not_ready', 'No generated version to publish')
        end

        app.update!(
          status: 'published',
          title: record.plan&.dig('title') || app.title,
          description: record.plan&.dig('description'),
          category: record.enhanced_prompt&.match(/APP_TYPE:\s*(\w+)/)&.captures&.first,
        )

        record.app.creator.increment!(:apps_count) if record.app.creator.respond_to?(:apps_count)
        render_resource(app, presenter: AppPresenter)
      end

      private

      def base_scope
        current_user.creation_sessions
      end
    end
  end
end
```

### 6.6 Notifications

```ruby
# app/controllers/api/v1/notifications_controller.rb
module Api
  module V1
    class NotificationsController < BaseController
      self.presenter_class = NotificationPresenter

      # GET /api/v1/notifications
      def index
        scope = current_user.notifications.includes(:actor, app: :current_version).order(created_at: :desc)
        render_collection(scope)
      end

      # PATCH /api/v1/notifications/:id/read
      def read
        notification = current_user.notifications.find(params[:id])
        notification.update!(read: true)
        render_resource(notification)
      end

      # POST /api/v1/notifications/read_all
      def read_all
        current_user.notifications.where(read: false).update_all(read: true)
        render_ok
      end
    end
  end
end
```

### 6.7 Auth

Custom controller — doesn't use BaseController CRUD patterns.

```ruby
# app/controllers/api/v1/auth_controller.rb
module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate!, only: [:register, :login, :refresh]

      def register
        user = User.create!(register_params)
        tokens = generate_tokens(user)
        render json: { data: { user: UserPresenter.new(user, presenter_context).as_json, tokens: tokens } }, status: :created
      end

      def login
        user = User.find_by!(email: params.require(:email))
        unless user.valid_password?(params.require(:password))
          return render_error('unauthorized', 'Invalid email or password', status: :unauthorized)
        end
        tokens = generate_tokens(user)
        render json: { data: { user: UserPresenter.new(user, presenter_context).as_json, tokens: tokens } }
      end

      def refresh
        payload = JWT.decode(params.require(:refresh_token), Rails.application.credentials.jwt_secret, true, algorithm: 'HS256').first
        user = User.find(payload['sub'])
        tokens = generate_tokens(user)
        render json: { data: tokens }
      rescue JWT::DecodeError, JWT::ExpiredSignature
        render_error('unauthorized', 'Invalid refresh token', status: :unauthorized)
      end

      def logout
        # Add current token JTI to denylist
        token = request.headers['Authorization']&.split(' ')&.last
        payload = JWT.decode(token, Rails.application.credentials.jwt_secret, true, algorithm: 'HS256').first
        JwtDenylist.create!(jti: payload['jti'], exp: Time.at(payload['exp']))
        render_ok
      end

      private

      def register_params
        params.permit(:email, :password, :display_name, :username, :date_of_birth)
      end

      def generate_tokens(user)
        jti = SecureRandom.uuid
        access = JWT.encode(
          { sub: user.id, jti: jti, exp: 15.minutes.from_now.to_i, type: 'access' },
          Rails.application.credentials.jwt_secret,
          'HS256'
        )
        refresh = JWT.encode(
          { sub: user.id, exp: 30.days.from_now.to_i, type: 'refresh' },
          Rails.application.credentials.jwt_secret,
          'HS256'
        )
        { access_token: access, refresh_token: refresh, expires_in: 900 }
      end
    end
  end
end
```

---

## 7. Response Examples

### 7.1 Envelope Shapes

**Single resource:** `{ "data": { ... } }`

**Collection:** `{ "data": [ ... ], "pagination": { "per_page": 20, "has_more": true, "next_cursor": "..." } }`

**Action:** `{ "data": { "status": "ok" } }`

**Error:** `{ "error": { "code": "...", "message": "...", "details": [...] } }`

### 7.2 Feed Card

```json
{
  "id": "app_xyz789",
  "title": "Neon Snake",
  "category": "game",
  "thumbnail_url": "https://storage.googleapis.com/vibe-thumbnails/app_xyz789/2026-03-29T12:00:00Z.png",
  "is_multiplayer": false,
  "play_count": 234,
  "like_count": 56,
  "remix_count": 12,
  "creator": {
    "id": "usr_abc123",
    "username": "alex",
    "display_name": "Alex",
    "avatar_url": "https://storage.googleapis.com/vibe-avatars/usr_abc123.jpg"
  },
  "is_liked": false,
  "is_saved": true,
  "created_at": "2026-03-29T12:00:00Z"
}
```

### 7.3 App Detail (Full)

```json
{
  "id": "app_xyz789",
  "title": "Neon Snake",
  "description": "A fast-paced snake game with neon visuals.",
  "category": "game",
  "thumbnail_url": "...",
  "bundle_url": "https://storage.googleapis.com/vibe-bundles/app_xyz789/2026-03-29T12:00:00Z.html",
  "is_multiplayer": false,
  "max_players": 1,
  "play_count": 234,
  "like_count": 56,
  "remix_count": 12,
  "comment_count": 8,
  "creator": { "id": "usr_abc123", "username": "alex", "display_name": "Alex", "avatar_url": "..." },
  "parent": null,
  "is_liked": false,
  "is_saved": true,
  "is_mine": false,
  "status": "published",
  "version_id": "ver_001",
  "created_at": "2026-03-29T12:00:00Z",
  "updated_at": "2026-03-29T14:30:00Z"
}
```

### 7.4 Auth Response

```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "username": "alex",
      "display_name": "Alex",
      "avatar_url": null,
      "bio": null,
      "follower_count": 0,
      "following_count": 0,
      "app_count": 0,
      "is_following": null,
      "created_at": "2026-03-29T14:32:07Z"
    },
    "tokens": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_in": 900
    }
  }
}
```

### 7.5 Validation Error

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Validation failed",
    "details": [
      { "field": "username", "message": "has already been taken" },
      { "field": "email", "message": "is invalid" }
    ]
  }
}
```

---

## 8. Avatar Upload

Active Storage with GCS backend. Uploaded via multipart on `PATCH /api/v1/me`.

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar

  def avatar_url
    avatar.attached? ? avatar.url : nil
  end
end

# config/storage.yml
google:
  service: GCS
  project: <%= ENV['GCS_PROJECT_ID'] %>
  credentials: <%= ENV['GCS_CREDENTIALS_JSON'] %>
  bucket: vibe-avatars
```

| Constraint | Value |
|---|---|
| Max file size | 5 MB |
| Formats | JPEG, PNG, WebP |
| Resizing | V1: accept as-is. V1.1: `image_processing` gem for 400×400 resize |

---

## 9. Account Deletion

Required for App Store / Play Store approval.

**DELETE /api/v1/me** → Immediate logout, async deletion via `AccountDeletionJob`.

```ruby
# app/jobs/account_deletion_job.rb
class AccountDeletionJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find(user_id)

    user.apps.find_each do |app|
      app.versions.each { |v| GcsClient.delete(v.bundle_url) }
      app.destroy!
    end

    user.active_follows.destroy_all
    user.passive_follows.destroy_all
    user.likes.destroy_all
    user.comments.update_all(body: '[deleted]', user_id: nil)
    user.saves.destroy_all
    user.avatar.purge if user.avatar.attached?

    user.update!(
      display_name: 'Deleted User',
      username: "deleted_#{user.id}",
      bio: nil,
      email: "deleted_#{user.id}@deleted.vibe.app",
      status: 'deleted',
      password_digest: '',
    )
  end
end
```

| Data | Treatment |
|---|---|
| Apps, bundles, thumbnails, versions | Hard deleted (GCS + DB) |
| Likes, follows, saves | Hard deleted |
| Comments | Body → `[deleted]`, user_id nullified |
| Profile | Anonymized, soft-deleted |
| Email | Replaced with non-routable address |
