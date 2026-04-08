class GenerateAppJob < ApplicationJob
  queue_as :generation

  def perform(session_id)
    session = CreationSession.find(session_id)
    firebase = FirebaseClient.new

    # Layer 2: Prompt Enhancer
    firebase.update_status(session_id, status: "enhancing", progress: 10)
    enhanced = AI::PromptEnhancer.call(session.messages, session.source_app)

    if enhanced.rejected
      session.update!(status: "failed")
      firebase.update_status(session_id, status: "failed", error: "Content not allowed")
      return
    end

    session.update!(enhanced_prompt: enhanced.spec, status: "planning")

    # Layer 3: Planner
    firebase.update_status(session_id, status: "planning", progress: 20)
    plan = AI::Planner.call(enhanced.spec, session.messages)
    session.update!(plan: plan)
    firebase.update_status(session_id, status: "awaiting_approval", progress: 25, plan: plan)
  end
end
