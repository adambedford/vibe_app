class JwtDenylist < ApplicationRecord
  validates :jti, presence: true

  def self.revoked?(jti)
    exists?(jti: jti)
  end
end
