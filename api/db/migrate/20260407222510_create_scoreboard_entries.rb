class CreateScoreboardEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :scoreboard_entries do |t|
      t.references :app, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :score
      t.jsonb :metadata

      t.timestamps
    end
  end
end
