class ApplicationPresenter
  attr_reader :object, :options

  def initialize(object, options = {})
    @object = object
    @options = options
  end

  def as_json
    raise NotImplementedError, "#{self.class}#as_json must be implemented"
  end

  def as_json_card
    as_json
  end

  def to_response
    { data: as_json }
  end

  private

  def fmt(time)
    time&.iso8601
  end

  def current_user
    options[:current_user]
  end

  def include?(key)
    options[:include]&.include?(key.to_s)
  end
end
