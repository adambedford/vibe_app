class CreateAppVersions < ActiveRecord::Migration[8.1]
  def change
    create_table :app_versions do |t|
      t.references :app, null: false, foreign_key: true
      t.string :bundle_url, null: false
      t.string :thumbnail_url
      t.string :source, null: false

      t.timestamps
    end
    add_index :app_versions, [ :app_id, :created_at ]
  end
end
