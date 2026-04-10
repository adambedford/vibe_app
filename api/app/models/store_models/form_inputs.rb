module StoreModels
  class FormInputs
    include StoreModel::Model

    attribute :category, :string
    attribute :visual_theme, :string
    attribute :content_theme, :string
    attribute :details, :string
    attribute :wizard_version, :integer, default: 1

    CATEGORIES = ["Game", "Story", "Art Tool", "Utility", "Surprise Me"].freeze

    validates :category, inclusion: { in: CATEGORIES }, allow_nil: true
  end
end
