require "rails_helper"

RSpec.describe Report, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:reporter).class_name("User").optional }
    it { is_expected.to belong_to(:app) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:reason) }
    it { is_expected.to define_enum_for(:status).backed_by_column_of_type(:string).with_values(pending: "pending", reviewed: "reviewed", dismissed: "dismissed") }
  end
end
