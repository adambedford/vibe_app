class MultiplayerSession < ApplicationRecord
  belongs_to :app
  belongs_to :host_user, class_name: "User", optional: true

  has_many :multiplayer_players, dependent: :destroy
  has_many :players, through: :multiplayer_players, source: :user

  enum :status, { lobby: "lobby", active: "active", completed: "completed" }, default: :lobby

  validates :firebase_path, presence: true
  validates :max_players, numericality: { in: 2..8 }
end
