class AddOauthToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :oauth_provider, :string
    add_column :users, :oauth_uid, :string
    add_index :users, [ :oauth_provider, :oauth_uid ], unique: true, where: "oauth_provider IS NOT NULL"

    # Allow password_digest to be nullable for OAuth users
    change_column_null :users, :password_digest, true
  end
end
