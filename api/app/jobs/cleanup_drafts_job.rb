class CleanupDraftsJob < ApplicationJob
  queue_as :default

  def perform
    App.drafts.where("updated_at < ?", 30.days.ago).find_each do |app|
      app.versions.each { |v| GcsClient.delete(v.bundle_url) }
      app.destroy!
    end
  end
end
