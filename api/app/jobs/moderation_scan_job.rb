class ModerationScanJob < ApplicationJob
  queue_as :moderation

  def perform(*args)
    # Do something later
  end
end
