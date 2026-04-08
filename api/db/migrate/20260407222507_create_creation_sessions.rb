class CreateCreationSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :creation_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :app, null: false, foreign_key: true
      t.references :source_app, foreign_key: { to_table: :apps }
      t.string :status, default: "active", null: false
      t.jsonb :messages, default: []
      t.text :enhanced_prompt
      t.jsonb :plan
      t.boolean :plan_approved, default: false
      t.references :generated_version, foreign_key: { to_table: :app_versions }
      t.decimal :generation_cost, precision: 6, scale: 4
      t.jsonb :error_log
      t.integer :fix_passes, default: 0

      t.timestamps
    end
    add_index :creation_sessions, :status, where: "status = 'generating'"
  end
end
