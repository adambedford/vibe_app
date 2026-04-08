class AppPresenter < ApplicationPresenter
  def as_json
    version = object.current_version
    {
      id: object.id,
      title: object.title,
      description: object.description,
      category: object.category,
      thumbnail_url: version&.thumbnail_url,
      bundle_url: version&.bundle_url,
      is_multiplayer: object.is_multiplayer,
      max_players: object.max_players,
      play_count: object.play_count,
      like_count: object.like_count,
      remix_count: object.remix_count,
      comment_count: object.comment_count,
      creator: UserPresenter.new(object.creator, options).as_json_compact,
      parent: object.parent ? { id: object.parent_id, title: object.parent.title } : nil,
      is_liked: liked?,
      is_saved: saved?,
      is_mine: current_user&.id == object.creator_id,
      status: object.status,
      version_id: object.current_version_id,
      created_at: fmt(object.created_at),
      updated_at: fmt(object.updated_at)
    }
  end

  def as_json_card
    version = object.current_version
    {
      id: object.id,
      title: object.title,
      category: object.category,
      thumbnail_url: version&.thumbnail_url,
      is_multiplayer: object.is_multiplayer,
      play_count: object.play_count,
      like_count: object.like_count,
      remix_count: object.remix_count,
      creator: UserPresenter.new(object.creator, options).as_json_compact,
      is_liked: liked?,
      is_saved: saved?,
      created_at: fmt(object.created_at)
    }
  end

  private

  # Use batch-loaded sets from Renderable if available, fall back to query
  def liked?
    return nil unless current_user
    if options[:liked_app_ids]
      options[:liked_app_ids].include?(object.id)
    else
      Like.exists?(user_id: current_user.id, app_id: object.id)
    end
  end

  def saved?
    return nil unless current_user
    if options[:saved_app_ids]
      options[:saved_app_ids].include?(object.id)
    else
      Bookmark.exists?(user_id: current_user.id, app_id: object.id)
    end
  end
end
