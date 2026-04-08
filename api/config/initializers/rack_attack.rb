Rack::Attack.throttle("api/ip", limit: 300, period: 5.minutes) { |req| req.ip }

Rack::Attack.throttle("api/user", limit: 60, period: 1.minute) do |req|
  req.env.dig("jwt.user_id") if req.path.start_with?("/api/")
end

Rack::Attack.throttle("creation/user", limit: 10, period: 1.hour) do |req|
  req.env.dig("jwt.user_id") if req.path.start_with?("/api/v1/create/sessions") && req.post?
end
