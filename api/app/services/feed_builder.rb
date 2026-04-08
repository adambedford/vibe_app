class FeedBuilder
  CANDIDATE_LIMITS = {
    following: 80,
    social_proof: 40,
    trending: 40,
    new_creator: 20,
    category_backfill: 20
  }.freeze

  def self.home(user, cursor: nil, per_page: 20)
    candidates = fetch_candidates(user)
    scored = candidates.map { |app| [ app, feed_score(app, user) ] }
    ranked = scored.sort_by { |_, score| -score }.map(&:first)
    diversified = apply_diversity(ranked)

    paginate_results(diversified, cursor: cursor, per_page: per_page)
  end

  def self.explore(cursor: nil, per_page: 20)
    candidates = App.published
                    .where("apps.created_at > ?", 48.hours.ago)
                    .where("apps.play_count >= ?", 5)
                    .includes(:creator, :current_version, :quality_score)

    scored = candidates.map { |app| [ app, quality_score(app) * freshness_multiplier(app) ] }
    ranked = scored.sort_by { |_, score| -score }.map(&:first)
    diversified = apply_category_diversity(ranked)

    paginate_results(diversified, cursor: cursor, per_page: per_page)
  end

  def self.feed_score(app, user)
    quality_score(app) *
    freshness_multiplier(app) *
    social_multiplier(app, user) *
    cold_start_boost(app)
  end

  def self.quality_score(app)
    qs = app.quality_score
    return 0.5 unless qs

    qs.composite_score
  end

  def self.freshness_multiplier(app)
    hours = (Time.current - app.created_at) / 1.hour
    [ 2.0 / (1.0 + (hours / 24.0)), 0.1 ].max
  end

  def self.social_multiplier(app, user)
    if user.following_ids.include?(app.creator_id)
      1.5
    elsif socially_endorsed?(app, user)
      1.2
    else
      1.0
    end
  end

  def self.socially_endorsed?(app, user)
    following_ids = user.following_ids
    return false if following_ids.empty?

    Like.where(app_id: app.id, user_id: following_ids).exists? ||
      App.where(parent_id: app.id, creator_id: following_ids).exists?
  end

  def self.cold_start_boost(app)
    return 1.0 if app.play_count >= 10
    return 1.0 if app.created_at < 6.hours.ago

    # Early bounce penalty — if first plays show <5s median, kill the boost
    if app.play_count >= 3
      median_duration = app.play_sessions.order(:created_at).limit(10).pluck(:duration_seconds).sort
      mid = median_duration.length / 2
      median = median_duration.length.odd? ? median_duration[mid] : (median_duration[mid - 1].to_f + median_duration[mid].to_f) / 2
      return 0.5 if median < 5
    end

    2.0
  end

  def self.fetch_candidates(user)
    following_ids = user.following_ids
    candidates = {}

    # Source 1: Following — apps by creators the user follows (last 7 days)
    candidates[:following] = App.published
      .where(creator_id: following_ids)
      .where("apps.created_at > ?", 7.days.ago)
      .includes(:creator, :current_version, :quality_score)
      .limit(CANDIDATE_LIMITS[:following])
      .to_a

    # Source 2: Social proof — apps liked or remixed by people the user follows (last 3 days)
    liked_app_ids = Like.where(user_id: following_ids)
      .where("created_at > ?", 3.days.ago)
      .pluck(:app_id)
    remixed_app_ids = App.published
      .where(creator_id: following_ids)
      .where.not(parent_id: nil)
      .where("apps.created_at > ?", 3.days.ago)
      .pluck(:parent_id)
    social_proof_ids = (liked_app_ids + remixed_app_ids).uniq
    candidates[:social_proof] = App.published
      .where(id: social_proof_ids)
      .includes(:creator, :current_version, :quality_score)
      .limit(CANDIDATE_LIMITS[:social_proof])
      .to_a

    # Source 3: Trending — top apps by quality score globally (last 48 hours)
    candidates[:trending] = App.published
      .where("apps.created_at > ?", 48.hours.ago)
      .joins("LEFT JOIN app_quality_scores ON app_quality_scores.app_id = apps.id")
      .order("app_quality_scores.composite_score DESC NULLS LAST")
      .includes(:creator, :current_version, :quality_score)
      .limit(CANDIDATE_LIMITS[:trending])
      .to_a

    # Source 4: New creator boost — apps by creators with <100 total plays (last 24 hours)
    candidates[:new_creator] = App.published
      .where("apps.created_at > ?", 24.hours.ago)
      .joins(:creator)
      .where("(SELECT COALESCE(SUM(play_count), 0) FROM apps a2 WHERE a2.creator_id = apps.creator_id) < 100")
      .includes(:creator, :current_version, :quality_score)
      .limit(CANDIDATE_LIMITS[:new_creator])
      .to_a

    # Source 5: Category backfill — apps from categories the user has played most (last 7 days)
    top_categories = PlaySession.where(user_id: user.id)
      .joins(:app)
      .where("play_sessions.created_at > ?", 30.days.ago)
      .group("apps.category")
      .order(Arel.sql("count(*) DESC"))
      .limit(3)
      .pluck(Arel.sql("apps.category"))
      .compact
    if top_categories.any?
      candidates[:category_backfill] = App.published
        .where(category: top_categories)
        .where("apps.created_at > ?", 7.days.ago)
        .includes(:creator, :current_version, :quality_score)
        .limit(CANDIDATE_LIMITS[:category_backfill])
        .to_a
    end

    # Union and deduplicate
    all = candidates.values.flatten
    all.uniq(&:id).first(200)
  end

  def self.apply_diversity(ranked_apps)
    result = []
    recent_creators = []
    recent_categories = []

    ranked_apps.each do |app|
      next if recent_creators.last(20)&.count(app.creator_id).to_i >= 2

      if recent_categories.last(3)&.all? { |c| c == app.category } && recent_categories.length >= 3
        next
      end

      result << app
      recent_creators << app.creator_id
      recent_categories << app.category
      break if result.size >= 50
    end

    result
  end

  def self.apply_category_diversity(apps)
    apply_diversity(apps)
  end

  def self.paginate_results(apps, cursor: nil, per_page: 20)
    if cursor.present?
      cursor_time = Time.iso8601(cursor)
      apps = apps.select { |a| a.created_at < cursor_time }
    end

    has_more = apps.size > per_page
    records = apps.first(per_page)

    {
      records: records,
      meta: {
        per_page: per_page,
        has_more: has_more,
        next_cursor: has_more ? records.last.created_at.iso8601(6) : nil
      }
    }
  end
end
