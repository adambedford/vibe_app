class CreateMultiplayerSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :multiplayer_sessions do |t|
      t.references :app, null: false, foreign_key: true
      t.references :host_user, foreign_key: { to_table: :users }
      t.string :status, default: "lobby", null: false
      t.integer :max_players, default: 8
      t.string :firebase_path, null: false
      t.datetime :expires_at

      t.timestamps
    end
  end
end
