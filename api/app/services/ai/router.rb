module AI
  class Router
    EDIT_PATTERNS = [
      /change.*color/i, /make.*bigger/i, /make.*smaller/i,
      /speed up/i, /slow down/i, /fix.*alignment/i,
      /change.*text/i, /change.*title/i, /change.*font/i,
      /change.*background/i, /change.*size/i, /make.*faster/i,
      /make.*slower/i, /change.*to/i
    ].freeze

    FULL_GEN_PATTERNS = [
      /add.*multiplayer/i, /add.*new level/i, /completely redesign/i,
      /make it.*different/i, /add.*mode/i, /change.*type/i,
      /add.*screen/i, /restructure/i
    ].freeze

    def self.route(session, message)
      return :full_generation if session.generated_version_id.blank?

      return :full_generation if FULL_GEN_PATTERNS.any? { |p| message.match?(p) }
      return :edit if EDIT_PATTERNS.any? { |p| message.match?(p) }

      # Default: treat short messages as edits, long as full generation
      message.length < 100 ? :edit : :full_generation
    end
  end
end
