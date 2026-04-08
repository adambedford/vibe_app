class CreateAppQualityScores < ActiveRecord::Migration[8.1]
  def change
    create_table :app_quality_scores do |t|
      t.references :app, null: false, foreign_key: true, index: { unique: true }
      t.float :play_duration_norm, default: 0
      t.float :like_ratio_norm, default: 0
      t.float :remix_rate_norm, default: 0
      t.float :replay_rate_norm, default: 0
      t.float :share_rate_norm, default: 0
      t.float :composite_score, default: 0
      t.bigint :play_count, default: 0
      t.datetime :calculated_at, null: false

      t.timestamps
    end
    add_index :app_quality_scores, :composite_score
  end
end
