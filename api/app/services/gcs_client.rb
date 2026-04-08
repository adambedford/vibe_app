class GcsClient
  def self.storage
    @storage ||= Google::Cloud::Storage.new(
      project_id: ENV["GCS_PROJECT_ID"],
      credentials: ENV["GCS_CREDENTIALS_JSON"] ? JSON.parse(ENV["GCS_CREDENTIALS_JSON"]) : nil
    )
  end

  def self.upload_bundle(app_id, html, timestamp:)
    bucket = storage.bucket(ENV.fetch("GCS_BUCKET_BUNDLES", "vibe-app-bundles"))
    key = "#{app_id}/#{timestamp}.html"
    file = bucket.create_file(StringIO.new(html), key, content_type: "text/html",
      cache_control: "public, max-age=31536000, immutable")
    file.public_url
  end

  def self.upload_thumbnail(app_id, image_base64, timestamp:)
    bucket = storage.bucket(ENV.fetch("GCS_BUCKET_THUMBNAILS", "vibe-thumbnails"))
    key = "#{app_id}/#{timestamp}.png"
    file = bucket.create_file(StringIO.new(Base64.decode64(image_base64)), key,
      content_type: "image/png", cache_control: "public, max-age=86400")
    file.public_url
  end

  def self.delete(url)
    return unless url.present?
    uri = URI.parse(url)
    bucket_name = uri.host.split(".").first
    key = uri.path.sub(%r{^/}, "")
    bucket = storage.bucket(bucket_name)
    file = bucket.file(key)
    file&.delete
  end
end
