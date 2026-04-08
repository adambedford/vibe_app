class CreationSession < ApplicationRecord
  belongs_to :user
  belongs_to :app
  belongs_to :source_app, class_name: "App", optional: true
  belongs_to :generated_version, class_name: "AppVersion", optional: true

  validates :status, inclusion: { in: %w[active enhancing planning awaiting_approval generating validating retrying completed under_review failed] }

  def user_prompt
    messages&.select { |m| m["role"] == "user" }&.last&.dig("content")
  end
end
