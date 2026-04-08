class CreateApps < ActiveRecord::Migration[8.1]
  def change
    create_table :apps do |t|
      t.references :creator, null: false, foreign_key: { to_table: :users }
      t.string :title, null: false
      t.text :description
      t.references :parent, foreign_key: { to_table: :apps }
      t.references :root, foreign_key: { to_table: :apps }
      t.boolean :is_multiplayer, default: false
      t.integer :max_players, default: 1
      t.string :category
      t.bigint :play_count, default: 0, null: false
      t.bigint :like_count, default: 0, null: false
      t.bigint :remix_count, default: 0, null: false
      t.bigint :comment_count, default: 0, null: false
      t.string :status, default: "draft", null: false

      t.timestamps
    end
    add_index :apps, :created_at
    add_index :apps, :status, where: "status = 'published'"
  end
end
