class CreatePlaySessions < ActiveRecord::Migration[8.1]
  def change
    create_table :play_sessions do |t|
      t.references :app, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :duration_seconds, null: false

      t.timestamps
    end
    add_index :play_sessions, [ :user_id, :app_id ]
  end
end
