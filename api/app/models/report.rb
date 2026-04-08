class Report < ApplicationRecord
  belongs_to :reporter, class_name: "User", optional: true
  belongs_to :app

  enum :status, { pending: "pending", reviewed: "reviewed", dismissed: "dismissed" }, default: :pending

  validates :reason, presence: true
end
