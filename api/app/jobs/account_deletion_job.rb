class AccountDeletionJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find(user_id)

    user.apps.find_each do |app|
      app.versions.each { |v| GcsClient.delete(v.bundle_url) }
      app.destroy!
    end

    user.active_follows.destroy_all
    user.passive_follows.destroy_all
    user.likes.destroy_all
    user.comments.update_all(body: "[deleted]", user_id: nil)
    user.bookmarks.destroy_all
    user.avatar.purge if user.avatar.attached?

    user.update_columns(
      display_name: "Deleted User",
      username: "deleted_#{user.id}",
      bio: nil,
      status: "deleted",
      password_digest: SecureRandom.hex(32)
    )
  end
end
