class QualityScoreCalculator
  WEIGHTS = {
    play_duration: 0.35,
    like_ratio: 0.25,
    remix_rate: 0.20,
    replay_rate: 0.10,
    share_rate: 0.10
  }.freeze

  def self.compute(app)
    play_duration_norm = normalized_play_duration(app)
    like_ratio_norm = like_to_play_ratio(app)
    remix_rate_norm = remix_to_play_ratio(app)
    replay_rate_norm = replay_ratio(app)
    share_rate_norm = 0.0 # share tracking deferred to V1.1

    composite = (play_duration_norm * WEIGHTS[:play_duration]) +
                (like_ratio_norm * WEIGHTS[:like_ratio]) +
                (remix_rate_norm * WEIGHTS[:remix_rate]) +
                (replay_rate_norm * WEIGHTS[:replay_rate]) +
                (share_rate_norm * WEIGHTS[:share_rate])

    {
      play_duration_norm: play_duration_norm,
      like_ratio_norm: like_ratio_norm,
      remix_rate_norm: remix_rate_norm,
      replay_rate_norm: replay_rate_norm,
      share_rate_norm: share_rate_norm,
      composite_score: composite,
      play_count: app.play_count
    }
  end

  def self.bounce_rate(app)
    total = app.play_sessions.count
    return 0.0 if total < 5
    app.play_sessions.where("duration_seconds < 3").count.to_f / total
  end

  private_class_method def self.normalized_play_duration(app)
    median = median_play_duration(app)
    return 0.0 if median.zero?

    category_medians = App.where(status: "published", category: app.category)
                          .where("apps.created_at > ?", 30.days.ago)
                          .joins(:play_sessions)
                          .group("apps.id")
                          .pluck(Arel.sql("PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY play_sessions.duration_seconds)"))

    percentile_rank(median, category_medians)
  end

  private_class_method def self.like_to_play_ratio(app)
    return 0.0 if app.play_count.zero?
    [ app.like_count.to_f / app.play_count, 1.0 ].min
  end

  private_class_method def self.remix_to_play_ratio(app)
    return 0.0 if app.play_count.zero?
    [ app.remix_count.to_f / app.play_count, 1.0 ].min
  end

  private_class_method def self.replay_ratio(app)
    total = app.play_sessions.count
    return 0.0 if total < 2
    returning_users = app.play_sessions.select("user_id").group(:user_id).having("count(*) > 1").count.size
    total_users = app.play_sessions.distinct.count(:user_id)
    return 0.0 if total_users.zero?
    returning_users.to_f / total_users
  end

  private_class_method def self.median_play_duration(app)
    durations = app.play_sessions.pluck(:duration_seconds).sort
    return 0.0 if durations.empty?
    mid = durations.length / 2
    durations.length.odd? ? durations[mid].to_f : (durations[mid - 1] + durations[mid]) / 2.0
  end

  private_class_method def self.percentile_rank(value, all_values)
    return 0.5 if all_values.empty?
    below = all_values.count { |v| v < value }
    below.to_f / all_values.length
  end
end
