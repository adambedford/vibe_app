class Report < ApplicationRecord
  belongs_to :reporter, class_name: "User"
  belongs_to :app

  validates :reason, presence: true
  validates :status, inclusion: { in: %w[pending reviewed dismissed] }
end
