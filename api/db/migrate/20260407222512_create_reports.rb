class CreateReports < ActiveRecord::Migration[8.1]
  def change
    create_table :reports do |t|
      t.references :reporter, foreign_key: { to_table: :users }
      t.references :app, null: false, foreign_key: true
      t.text :reason, null: false
      t.string :status, default: "pending", null: false

      t.timestamps
    end
  end
end
