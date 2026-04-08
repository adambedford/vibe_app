# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_04_07_223736) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "app_quality_scores", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "calculated_at", null: false
    t.float "composite_score", default: 0.0
    t.datetime "created_at", null: false
    t.float "like_ratio_norm", default: 0.0
    t.bigint "play_count", default: 0
    t.float "play_duration_norm", default: 0.0
    t.float "remix_rate_norm", default: 0.0
    t.float "replay_rate_norm", default: 0.0
    t.float "share_rate_norm", default: 0.0
    t.datetime "updated_at", null: false
    t.index ["app_id"], name: "index_app_quality_scores_on_app_id", unique: true
    t.index ["composite_score"], name: "index_app_quality_scores_on_composite_score"
  end

  create_table "app_versions", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.string "bundle_url", null: false
    t.datetime "created_at", null: false
    t.string "source", null: false
    t.string "thumbnail_url"
    t.datetime "updated_at", null: false
    t.index ["app_id", "created_at"], name: "index_app_versions_on_app_id_and_created_at"
    t.index ["app_id"], name: "index_app_versions_on_app_id"
  end

  create_table "apps", force: :cascade do |t|
    t.string "category"
    t.bigint "comment_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.bigint "creator_id", null: false
    t.bigint "current_version_id"
    t.text "description"
    t.boolean "is_multiplayer", default: false
    t.bigint "like_count", default: 0, null: false
    t.integer "max_players", default: 1
    t.bigint "parent_id"
    t.bigint "play_count", default: 0, null: false
    t.bigint "remix_count", default: 0, null: false
    t.bigint "root_id"
    t.string "status", default: "draft", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_apps_on_created_at"
    t.index ["creator_id"], name: "index_apps_on_creator_id"
    t.index ["current_version_id"], name: "index_apps_on_current_version_id"
    t.index ["parent_id"], name: "index_apps_on_parent_id"
    t.index ["root_id"], name: "index_apps_on_root_id"
    t.index ["status"], name: "index_apps_on_status", where: "((status)::text = 'published'::text)"
  end

  create_table "bookmarks", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id"], name: "index_bookmarks_on_app_id"
    t.index ["user_id", "app_id"], name: "index_bookmarks_on_user_id_and_app_id", unique: true
    t.index ["user_id", "created_at"], name: "index_bookmarks_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_bookmarks_on_user_id"
  end

  create_table "comments", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.bigint "parent_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id", "created_at"], name: "index_comments_on_app_id_and_created_at"
    t.index ["app_id"], name: "index_comments_on_app_id"
    t.index ["parent_id"], name: "index_comments_on_parent_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "creation_sessions", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.text "enhanced_prompt"
    t.jsonb "error_log"
    t.integer "fix_passes", default: 0
    t.bigint "generated_version_id"
    t.decimal "generation_cost", precision: 6, scale: 4
    t.jsonb "messages", default: []
    t.jsonb "plan"
    t.boolean "plan_approved", default: false
    t.bigint "source_app_id"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id"], name: "index_creation_sessions_on_app_id"
    t.index ["generated_version_id"], name: "index_creation_sessions_on_generated_version_id"
    t.index ["source_app_id"], name: "index_creation_sessions_on_source_app_id"
    t.index ["status"], name: "index_creation_sessions_on_status", where: "((status)::text = 'generating'::text)"
    t.index ["user_id"], name: "index_creation_sessions_on_user_id"
  end

  create_table "follows", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "follower_id", null: false
    t.bigint "following_id", null: false
    t.datetime "updated_at", null: false
    t.index ["follower_id", "following_id"], name: "index_follows_on_follower_id_and_following_id", unique: true
    t.index ["follower_id"], name: "index_follows_on_follower_id"
    t.index ["following_id"], name: "index_follows_on_following_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp"
    t.string "jti"
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti"
  end

  create_table "likes", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id"], name: "index_likes_on_app_id"
    t.index ["user_id", "app_id"], name: "index_likes_on_user_id_and_app_id", unique: true
    t.index ["user_id"], name: "index_likes_on_user_id"
  end

  create_table "multiplayer_players", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_host"
    t.bigint "multiplayer_session_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["multiplayer_session_id"], name: "index_multiplayer_players_on_multiplayer_session_id"
    t.index ["user_id"], name: "index_multiplayer_players_on_user_id"
  end

  create_table "multiplayer_sessions", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.string "firebase_path", null: false
    t.bigint "host_user_id"
    t.integer "max_players", default: 8
    t.string "status", default: "lobby", null: false
    t.datetime "updated_at", null: false
    t.index ["app_id"], name: "index_multiplayer_sessions_on_app_id"
    t.index ["host_user_id"], name: "index_multiplayer_sessions_on_host_user_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "actor_id"
    t.bigint "app_id"
    t.datetime "created_at", null: false
    t.string "notification_type", null: false
    t.boolean "read", default: false, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["actor_id"], name: "index_notifications_on_actor_id"
    t.index ["app_id"], name: "index_notifications_on_app_id"
    t.index ["user_id", "created_at"], name: "index_notifications_on_user_id_and_created_at"
    t.index ["user_id"], name: "idx_notifications_unread", where: "(read = false)"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "play_sessions", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.integer "duration_seconds", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id"], name: "index_play_sessions_on_app_id"
    t.index ["user_id", "app_id"], name: "index_play_sessions_on_user_id_and_app_id"
    t.index ["user_id"], name: "index_play_sessions_on_user_id"
  end

  create_table "reports", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.text "reason", null: false
    t.bigint "reporter_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["app_id"], name: "index_reports_on_app_id"
    t.index ["reporter_id"], name: "index_reports_on_reporter_id"
  end

  create_table "scoreboard_entries", force: :cascade do |t|
    t.bigint "app_id", null: false
    t.datetime "created_at", null: false
    t.jsonb "metadata"
    t.integer "score"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["app_id"], name: "index_scoreboard_entries_on_app_id"
    t.index ["user_id"], name: "index_scoreboard_entries_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.text "bio"
    t.datetime "created_at", null: false
    t.date "date_of_birth", null: false
    t.string "display_name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "app_quality_scores", "apps"
  add_foreign_key "app_versions", "apps"
  add_foreign_key "apps", "app_versions", column: "current_version_id"
  add_foreign_key "apps", "apps", column: "parent_id"
  add_foreign_key "apps", "apps", column: "root_id"
  add_foreign_key "apps", "users", column: "creator_id"
  add_foreign_key "bookmarks", "apps"
  add_foreign_key "bookmarks", "users"
  add_foreign_key "comments", "apps"
  add_foreign_key "comments", "comments", column: "parent_id"
  add_foreign_key "comments", "users"
  add_foreign_key "creation_sessions", "app_versions", column: "generated_version_id"
  add_foreign_key "creation_sessions", "apps"
  add_foreign_key "creation_sessions", "apps", column: "source_app_id"
  add_foreign_key "creation_sessions", "users"
  add_foreign_key "follows", "users", column: "follower_id"
  add_foreign_key "follows", "users", column: "following_id"
  add_foreign_key "likes", "apps"
  add_foreign_key "likes", "users"
  add_foreign_key "multiplayer_players", "multiplayer_sessions"
  add_foreign_key "multiplayer_players", "users"
  add_foreign_key "multiplayer_sessions", "apps"
  add_foreign_key "multiplayer_sessions", "users", column: "host_user_id"
  add_foreign_key "notifications", "apps"
  add_foreign_key "notifications", "users"
  add_foreign_key "notifications", "users", column: "actor_id"
  add_foreign_key "play_sessions", "apps"
  add_foreign_key "play_sessions", "users"
  add_foreign_key "reports", "apps"
  add_foreign_key "reports", "users", column: "reporter_id"
  add_foreign_key "scoreboard_entries", "apps"
  add_foreign_key "scoreboard_entries", "users"
end
