class App < ApplicationRecord
  belongs_to :creator, class_name: "User"
  belongs_to :current_version, class_name: "AppVersion", optional: true
  belongs_to :parent, class_name: "App", optional: true, counter_cache: :remix_count
  belongs_to :root, class_name: "App", optional: true

  has_many :versions, class_name: "AppVersion", dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :play_sessions, dependent: :destroy
  has_many :remixes, class_name: "App", foreign_key: :parent_id
  has_many :scoreboard_entries, dependent: :destroy
  has_many :multiplayer_sessions, dependent: :destroy
  has_many :reports, dependent: :destroy
  has_one :quality_score, class_name: "AppQualityScore", dependent: :destroy

  validates :title, presence: true
  validates :status, inclusion: { in: %w[draft published under_review removed] }

  scope :published, -> { where(status: "published") }
  scope :drafts, -> { where(status: "draft") }

  def bundle_html
    current_version&.bundle_url
  end
end
