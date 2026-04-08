class Like < ApplicationRecord
  belongs_to :user
  belongs_to :app, counter_cache: :like_count

  validates :user_id, uniqueness: { scope: :app_id }
end
