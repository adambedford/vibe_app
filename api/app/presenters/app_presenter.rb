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
      is_liked: current_user ? Like.exists?(user_id: current_user.id, app_id: object.id) : nil,
      is_saved: current_user ? Bookmark.exists?(user_id: current_user.id, app_id: object.id) : nil,
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
      is_liked: current_user ? Like.exists?(user_id: current_user.id, app_id: object.id) : nil,
      is_saved: current_user ? Bookmark.exists?(user_id: current_user.id, app_id: object.id) : nil,
      created_at: fmt(object.created_at)
    }
  end
end
