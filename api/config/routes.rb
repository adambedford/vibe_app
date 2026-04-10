Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth
      post   "auth/register",        to: "auth#register"
      post   "auth/login",           to: "auth#login"
      post   "auth/oauth",            to: "auth#oauth"
      post   "auth/refresh",         to: "auth#refresh"
      delete "auth/logout",          to: "auth#logout"

      # Current user
      resource :me, controller: "me", only: [ :show, :update, :destroy ] do
        get :creations
      end

      # Users
      resources :users, only: [ :show ] do
        member do
          get    :apps
          get    :remixes
          get    :saves
          get    :followers
          get    :following
          post   :follow
          delete :follow, action: :unfollow
        end
      end

      # Feed
      get "feed",           to: "feed#home"
      get "feed/explore",   to: "feed#explore"
      get "feed/following", to: "feed#following"

      # Apps
      resources :apps, only: [ :show ] do
        member do
          get    :bundle
          get    :lineage
          get    :versions
          get    :remixes
          post   :like
          delete :like,    action: :unlike
          get    :comments
          post   :comments, action: :create_comment
          post   :report
          post   :save
          delete :save,    action: :unsave
          post   :play
          post   :remix
          post   "revert/:version_id", action: :revert
        end
      end

      # Creation Sessions
      resources :creation_sessions, path: "create/sessions", only: [ :create, :show ] do
        member do
          post :message
          post :approve
          post :publish
        end
      end

      # Multiplayer
      resources :lobbies, controller: "multiplayer", only: [ :create, :show ] do
        member do
          post :join
        end
      end

      # Notifications
      resources :notifications, only: [ :index ] do
        member do
          patch :read
        end
        collection do
          post :read_all
        end
      end
    end
  end
end
