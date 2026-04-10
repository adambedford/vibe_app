class CreationSession < ApplicationRecord
  belongs_to :user
  belongs_to :app
  belongs_to :source_app, class_name: "App", optional: true
  belongs_to :generated_version, class_name: "AppVersion", optional: true

  attribute :form_inputs, StoreModels::FormInputs.to_type
  attribute :error_log, StoreModels::ErrorEntry.to_array_type, default: -> { [] }

  STATUSES = %w[active enhancing planning awaiting_approval generating validating retrying completed under_review failed].freeze
  validates :status, inclusion: { in: STATUSES }

  def user_prompt
    messages&.select { |m| m["role"] == "user" }&.last&.dig("content")
  end

  def last_error
    error_log&.last
  end

  def add_error(error_type:, message:, details: nil, retryable: false)
    entry = StoreModels::ErrorEntry.new(
      error_type: error_type,
      message: message,
      details: details,
      retryable: retryable,
      occurred_at: Time.current
    )
    self.error_log = (error_log || []) + [entry]
    save!
  end

  def terminal_status?
    %w[completed failed under_review].include?(status)
  end

  def in_progress?
    %w[active enhancing planning generating validating retrying].include?(status)
  end
end
