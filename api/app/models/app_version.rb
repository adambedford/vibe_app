class AppVersion < ApplicationRecord
  belongs_to :app

  validates :bundle_url, presence: true
  validates :source, presence: true, inclusion: { in: %w[generation edit revert] }
end
