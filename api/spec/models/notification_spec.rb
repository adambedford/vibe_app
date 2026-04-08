require "rails_helper"

RSpec.describe Notification, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:actor).class_name("User").optional }
    it { is_expected.to belong_to(:app).optional }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:notification_type) }
  end

  describe "scopes" do
    it ".unread returns only unread notifications" do
      unread = create(:notification, read: false)
      create(:notification, read: true)
      expect(Notification.unread).to eq([ unread ])
    end
  end
end
