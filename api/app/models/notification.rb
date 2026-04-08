class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :actor, class_name: "User", optional: true
  belongs_to :app, optional: true

  validates :notification_type, presence: true

  scope :unread, -> { where(read: false) }
end
