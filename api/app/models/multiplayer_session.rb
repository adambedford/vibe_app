class MultiplayerSession < ApplicationRecord
  belongs_to :app
  belongs_to :host_user, class_name: "User", optional: true

  has_many :multiplayer_players, dependent: :destroy
  has_many :players, through: :multiplayer_players, source: :user

  validates :firebase_path, presence: true
  validates :status, inclusion: { in: %w[lobby active completed] }
  validates :max_players, numericality: { in: 2..8 }
end
