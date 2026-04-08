class MultiplayerPlayer < ApplicationRecord
  belongs_to :multiplayer_session
  belongs_to :user

  validates :user_id, uniqueness: { scope: :multiplayer_session_id }
end
