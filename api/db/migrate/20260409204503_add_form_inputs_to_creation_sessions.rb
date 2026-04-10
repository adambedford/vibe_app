class AddFormInputsToCreationSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :creation_sessions, :form_inputs, :jsonb, default: {}
  end
end
