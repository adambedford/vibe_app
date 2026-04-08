class ScoreboardEntry < ApplicationRecord
  belongs_to :app
  belongs_to :user

  validates :score, presence: true, numericality: true
end
