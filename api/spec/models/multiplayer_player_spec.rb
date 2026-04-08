require "rails_helper"

RSpec.describe MultiplayerPlayer, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:multiplayer_session) }
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    subject { create(:multiplayer_player) }
    it { is_expected.to validate_uniqueness_of(:user_id).scoped_to(:multiplayer_session_id) }
  end
end
