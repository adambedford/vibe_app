module Api
  module V1
    class BaseController < ActionController::API
      include ErrorHandling
      include Authorizable
      include Renderable
      include Paginatable
      include Sortable
      include Filterable

      class << self
        attr_writer :model_class, :presenter_class

        def model_class
          @model_class ||= controller_name.classify.constantize
        end

        def presenter_class
          @presenter_class ||= "#{model_class.name}Presenter".constantize
        end

        def permit_params(*attrs)
          @permitted_params = attrs
        end

        def permitted_params
          @permitted_params || []
        end
      end

      def index
        scope = apply_scopes(base_scope)
        render_collection(scope)
      end

      def show
        render_resource(record)
      end

      def create
        obj = self.class.model_class.new(permitted_resource_params)
        authorize!(obj, :create)
        obj.save!
        render_resource(obj, status: :created)
      end

      def update
        authorize!(record, :update)
        record.update!(permitted_resource_params)
        render_resource(record)
      end

      def destroy
        authorize!(record, :destroy)
        record.destroy!
        render_ok
      end

      private

      def base_scope
        self.class.model_class.all
      end

      def record
        @record ||= base_scope.find(params[:id])
      end

      def apply_scopes(scope)
        scope = apply_sort(scope)
        scope = apply_filters(scope)
        scope = apply_includes(scope)
        scope
      end

      def apply_includes(scope)
        scope
      end

      def permitted_resource_params
        params.permit(*self.class.permitted_params)
      end
    end
  end
end
