require "rails_helper"

RSpec.describe JwtDenylist, type: :model do
  describe "validations" do
    it { is_expected.to validate_presence_of(:jti) }
  end

  describe ".revoked?" do
    it "returns true if jti exists" do
      create(:jwt_denylist, jti: "abc-123")
      expect(JwtDenylist.revoked?("abc-123")).to be true
    end

    it "returns false if jti does not exist" do
      expect(JwtDenylist.revoked?("nonexistent")).to be false
    end
  end
end
