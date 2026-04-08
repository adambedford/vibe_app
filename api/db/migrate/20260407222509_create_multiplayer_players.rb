class CreateMultiplayerPlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :multiplayer_players do |t|
      t.references :multiplayer_session, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.boolean :is_host

      t.timestamps
    end
  end
end
