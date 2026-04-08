require "rails_helper"

RSpec.describe Report, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:reporter).class_name("User") }
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:reason) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[pending reviewed dismissed]) }
  end
end
