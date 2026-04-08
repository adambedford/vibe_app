require "rails_helper"

RSpec.describe AccountDeletionJob, type: :job do
  let(:user) { create(:user) }

  it "anonymizes the user profile" do
    allow(GcsClient).to receive(:delete)

    described_class.perform_now(user.id)

    user.reload
    expect(user.display_name).to eq("Deleted User")
    expect(user.status).to eq("deleted")
    expect(user.bio).to be_nil
  end

  it "destroys the user's apps" do
    app = create(:app, creator: user)
    allow(GcsClient).to receive(:delete)

    described_class.perform_now(user.id)

    expect(App.exists?(app.id)).to be false
  end

  it "destroys follows" do
    create(:follow, follower: user)
    create(:follow, following: user)
    allow(GcsClient).to receive(:delete)

    expect { described_class.perform_now(user.id) }
      .to change(Follow, :count).by(-2)
  end
end
