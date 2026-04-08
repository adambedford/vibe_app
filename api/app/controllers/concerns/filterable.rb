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
              when "true"  then scope.where(field => true)
              when "false" then scope.where(field => false)
              else scope.where(field => value)
              end
    end
    scope
  end
end
