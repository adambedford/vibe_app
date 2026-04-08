class CreateNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.string :notification_type, null: false
      t.references :actor, foreign_key: { to_table: :users }
      t.references :app, foreign_key: true
      t.boolean :read, default: false, null: false

      t.timestamps
    end
    add_index :notifications, [ :user_id, :created_at ]
    add_index :notifications, :user_id, where: "read = false", name: "idx_notifications_unread"
  end
end
