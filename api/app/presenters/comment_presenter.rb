class CommentPresenter < ApplicationPresenter
  def as_json
    {
      id: object.id,
      body: object.body,
      user: UserPresenter.new(object.user, options).as_json_compact,
      parent_id: object.parent_id,
      created_at: fmt(object.created_at)
    }
  end
end
