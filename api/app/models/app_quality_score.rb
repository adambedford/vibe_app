class AppQualityScore < ApplicationRecord
  belongs_to :app

  validates :calculated_at, presence: true
end
