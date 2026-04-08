class AddMissingIndexes < ActiveRecord::Migration[8.1]
  def change
    # Apps: common query for creator's published apps
    add_index :apps, [ :creator_id, :status ]

    # Apps: category filtering
    add_index :apps, [ :category, :status ]

    # Scoreboard: leaderboard queries
    add_index :scoreboard_entries, [ :app_id, :score, :created_at ], order: { score: :desc }, name: "idx_scoreboard_leaderboard"

    # Multiplayer players: unique constraint (model validates but DB didn't enforce)
    add_index :multiplayer_players, [ :multiplayer_session_id, :user_id ], unique: true, name: "idx_multiplayer_players_unique"

    # Play sessions: app analytics over time
    add_index :play_sessions, [ :app_id, :created_at ]

    # Likes: recent likes for social proof queries
    add_index :likes, [ :app_id, :created_at ]
  end
end
