class UserPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      username: object.username,
      display_name: object.display_name,
      avatar_url: object.avatar_url,
      bio: object.bio,
      follower_count: object.followers_count,
      following_count: object.following_count,
      app_count: object.apps.where(status: "published").count,
      is_following: following?,
      created_at: fmt(object.created_at)
    }
  end

  def as_json_compact
    {
      id: object.id,
      username: object.username,
      display_name: object.display_name,
      avatar_url: object.avatar_url
    }
  end

  private

  def following?
    return nil unless current_user
    if options[:following_user_ids]
      options[:following_user_ids].include?(object.id)
    else
      Follow.exists?(follower_id: current_user.id, following_id: object.id)
    end
  end
end
