namespace :seed do
  desc "Generate seed apps using the AI pipeline (requires Bedrock credentials)"
  task apps: :environment do
    SEED_PROMPTS = [
      # Games (8)
      { prompt: "make a classic snake game with neon visuals", creator: "pixelwitch", category: "game" },
      { prompt: "create a breakout/brick-breaker game with retro pixel art", creator: "pixelwitch", category: "game" },
      { prompt: "make a simple idle clicker game about building a space station", creator: "neonlabs", category: "game" },
      { prompt: "build a 2048 puzzle game with a clean minimal design", creator: "minimalcraft", category: "game" },
      { prompt: "make a cute platformer game where a cat collects fish", creator: "kawaiiworld", category: "game" },
      { prompt: "create a word search puzzle game about animals", creator: "quizmaster", category: "game" },
      { prompt: "make a two-player competitive tic tac toe game", creator: "partymode", category: "game" },
      { prompt: "build a fast-paced space shooter with neon graphics and power-ups", creator: "neonlabs", category: "game" },

      # Stories (4)
      { prompt: "create a choose-your-own-adventure fantasy story about a young wizard", creator: "storyweaver", category: "story" },
      { prompt: "make an interactive mystery story where you're a detective solving a museum heist", creator: "storyweaver", category: "story" },
      { prompt: "build a sci-fi branching narrative about first contact with aliens", creator: "wildcard", category: "story" },
      { prompt: "create a short horror story with choices set in an abandoned lighthouse", creator: "storyweaver", category: "story" },

      # Art Tools (4)
      { prompt: "make a pixel art drawing tool with a color palette and eraser", creator: "pixelwitch", category: "art_tool" },
      { prompt: "create a generative art toy where tapping creates colorful patterns", creator: "neonlabs", category: "art_tool" },
      { prompt: "build a simple drum machine with 8 pads and different sounds", creator: "wildcard", category: "art_tool" },
      { prompt: "make a drawing canvas with brush sizes and colors", creator: "kawaiiworld", category: "art_tool" },

      # Utilities (4)
      { prompt: "create a pomodoro timer with a clean minimal design", creator: "minimalcraft", category: "utility" },
      { prompt: "make a trivia quiz about world geography with 15 questions", creator: "quizmaster", category: "utility" },
      { prompt: "build a would-you-rather game with funny questions", creator: "partymode", category: "utility" },
      { prompt: "create a habit tracker where you check off daily goals", creator: "minimalcraft", category: "utility" },

      # Multiplayer (2)
      { prompt: "make a collaborative drawing canvas where multiple people can draw", creator: "partymode", category: "art_tool" },
      { prompt: "build a trivia battle game for 2-4 players", creator: "quizmaster", category: "game" },
    ].freeze

    puts "Generating #{SEED_PROMPTS.length} seed apps..."
    puts "NOTE: Requires AWS Bedrock credentials and running Validator sidecar."
    puts ""

    SEED_PROMPTS.each_with_index do |seed, i|
      creator = User.find_by!(username: seed[:creator])
      puts "[#{i + 1}/#{SEED_PROMPTS.length}] #{seed[:prompt]} (by @#{seed[:creator]})"

      begin
        app = App.create!(
          creator: creator,
          title: "Generating...",
          status: "draft",
          category: seed[:category]
        )

        session = CreationSession.create!(
          user: creator,
          app: app,
          status: "active",
          messages: [ { "role" => "user", "content" => seed[:prompt] } ]
        )

        # Run the pipeline synchronously
        GenerateAppJob.perform_now(session.id)
        session.reload

        if session.plan.present?
          session.update!(plan_approved: true)
          GenerateFromPlanJob.perform_now(session.id)
          session.reload
        end

        if session.status == "completed" && app.reload.current_version_id.present?
          app.update!(status: "published")
          puts "  -> Published: #{app.title}"
        else
          puts "  -> Failed: #{session.status}"
        end
      rescue => e
        puts "  -> Error: #{e.message}"
      end

      puts ""
    end

    published = App.published.count
    puts "Done! #{published} seed apps published."
  end
end
