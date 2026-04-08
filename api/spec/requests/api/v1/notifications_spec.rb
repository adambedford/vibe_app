require "rails_helper"

RSpec.describe "Api::V1::Notifications", type: :request do
  let(:user) { create(:user) }

  describe "GET /api/v1/notifications" do
    it "returns user notifications" do
      create(:notification, user: user, notification_type: "follow")
      create(:notification, user: user, notification_type: "like")

      get "/api/v1/notifications", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["data"].length).to eq(2)
    end

    it "requires authentication" do
      get "/api/v1/notifications"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PATCH /api/v1/notifications/:id/read" do
    it "marks notification as read" do
      notification = create(:notification, user: user, read: false)
      patch "/api/v1/notifications/#{notification.id}/read", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(notification.reload.read).to be true
    end
  end

  describe "POST /api/v1/notifications/read_all" do
    it "marks all notifications as read" do
      create(:notification, user: user, read: false)
      create(:notification, user: user, read: false)

      post "/api/v1/notifications/read_all", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      expect(user.notifications.unread.count).to eq(0)
    end
  end
end
