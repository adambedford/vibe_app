require "rails_helper"

RSpec.describe MultiplayerSession, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
    it { is_expected.to belong_to(:host_user).class_name("User").optional }
    it { is_expected.to have_many(:multiplayer_players).dependent(:destroy) }
    it { is_expected.to have_many(:players).through(:multiplayer_players) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:firebase_path) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[lobby active completed]) }
  end
end
