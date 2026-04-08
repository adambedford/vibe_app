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
    per = [ per_page_param, MAX_PER_PAGE ].min

    if params[:cursor].present?
      cursor_value = parse_cursor(params[:cursor])
      operator = cursor_direction == :desc ? "<" : ">"
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
        next_cursor: has_more ? encode_cursor(records.last) : nil
      }
    }
  end

  def per_page_param
    (params[:per_page] || DEFAULT_PER_PAGE).to_i
  end

  def parse_cursor(cursor)
    if cursor_column == :created_at
      Time.iso8601(cursor)
    else
      cursor
    end
  end

  def encode_cursor(record)
    value = record.send(cursor_column)
    value.respond_to?(:iso8601) ? value.iso8601(6) : value.to_s
  end
end
