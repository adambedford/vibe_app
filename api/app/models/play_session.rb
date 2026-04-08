class PlaySession < ApplicationRecord
  belongs_to :app
  belongs_to :user

  validates :duration_seconds, presence: true, numericality: { greater_than_or_equal_to: 0 }
end
