require "rails_helper"

RSpec.describe Comment, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:app) }
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:parent).class_name("Comment").optional }
    it { is_expected.to have_many(:replies).class_name("Comment").with_foreign_key(:parent_id).dependent(:destroy) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:body) }
  end

  describe "threading" do
    it "supports threaded replies" do
      comment = create(:comment)
      reply = create(:comment, parent: comment, app: comment.app)
      expect(comment.replies).to include(reply)
      expect(reply.parent).to eq(comment)
    end
  end
end
