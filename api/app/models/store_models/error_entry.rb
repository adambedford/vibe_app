module StoreModels
  class ErrorEntry
    include StoreModel::Model

    attribute :error_type, :string
    attribute :message, :string
    attribute :details, :string
    attribute :retryable, :boolean, default: false
    attribute :occurred_at, :datetime, default: -> { Time.current }

    ERROR_TYPES = %w[content_rejected validation_failed service_unavailable unknown].freeze

    validates :error_type, inclusion: { in: ERROR_TYPES }
    validates :message, presence: true
  end
end
