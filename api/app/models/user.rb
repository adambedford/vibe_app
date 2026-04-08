class User < ApplicationRecord
  has_secure_password
  has_one_attached :avatar

  has_many :apps, foreign_key: :creator_id, dependent: :destroy
  has_many :creation_sessions, dependent: :destroy
  has_many :active_follows, class_name: "Follow", foreign_key: :follower_id, dependent: :destroy
  has_many :passive_follows, class_name: "Follow", foreign_key: :following_id, dependent: :destroy
  has_many :following, through: :active_follows, source: :following
  has_many :followers, through: :passive_follows, source: :follower
  has_many :likes, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :comments, dependent: :nullify
  has_many :notifications, dependent: :destroy
  has_many :play_sessions, dependent: :destroy

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :username, presence: true, uniqueness: true
  validates :display_name, presence: true
  validates :date_of_birth, presence: true
  validates :status, inclusion: { in: %w[active pending_deletion deleted] }
  validate :minimum_age

  scope :active, -> { where(status: "active") }

  def avatar_url
    avatar.attached? ? avatar.url : nil
  end

  def following_ids
    active_follows.pluck(:following_id)
  end

  def followers_count
    passive_follows.count
  end

  def following_count
    active_follows.count
  end

  private

  def minimum_age
    errors.add(:date_of_birth, "must be at least 16") if date_of_birth.present? && date_of_birth > 16.years.ago.to_date
  end
end
