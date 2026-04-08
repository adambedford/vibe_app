class AddCurrentVersionToApps < ActiveRecord::Migration[8.1]
  def change
    add_reference :apps, :current_version, foreign_key: { to_table: :app_versions }
  end
end
