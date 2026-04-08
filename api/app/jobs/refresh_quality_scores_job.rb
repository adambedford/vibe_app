class RefreshQualityScoresJob < ApplicationJob
  queue_as :default

  def perform
    App.where(status: "published").where("created_at > ?", 30.days.ago).find_each do |app|
      score = QualityScoreCalculator.compute(app)
      AppQualityScore.upsert(
        { app_id: app.id, **score, calculated_at: Time.current },
        unique_by: :app_id
      )
    end
  end
end
