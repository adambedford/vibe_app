class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :display_name, null: false
      t.string :username, null: false
      t.text :bio
      t.date :date_of_birth, null: false
      t.string :status, default: "active", null: false

      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :username, unique: true
  end
end
