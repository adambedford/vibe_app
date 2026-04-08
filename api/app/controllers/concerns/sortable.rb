module Sortable
  extend ActiveSupport::Concern

  included do
    class_attribute :sortable_fields, default: %w[created_at]
    class_attribute :default_sort, default: "-created_at"
  end

  class_methods do
    def sortable_by(*fields, default: "-created_at")
      self.sortable_fields = fields.map(&:to_s)
      self.default_sort = default.to_s
    end
  end

  private

  def apply_sort(scope)
    sort_param = params[:sort].presence || default_sort
    direction = sort_param.start_with?("-") ? :desc : :asc
    column = sort_param.delete_prefix("-")

    return scope unless sortable_fields.include?(column)

    scope.order(column => direction)
  end
end
