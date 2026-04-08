# Vibe Originals — seed creator accounts (from 08-Seed-Content-Launch-Strategy.md)
#
# Run with: bin/rails db:seed

ORIGINALS = [
  { username: "pixelwitch",  display_name: "Pixel Witch",   bio: "Retro pixel art games & arcade vibes" },
  { username: "neonlabs",    display_name: "Neon Labs",     bio: "Neon-drenched action & art tools" },
  { username: "storyweaver", display_name: "Story Weaver",  bio: "Interactive stories & visual novels" },
  { username: "minimalcraft", display_name: "Minimal Craft", bio: "Clean utilities & productivity tools" },
  { username: "kawaiiworld", display_name: "Kawaii World",  bio: "Cute casual games & pastel art" },
  { username: "wildcard",    display_name: "Wildcard",      bio: "Expect the unexpected" },
  { username: "partymode",   display_name: "Party Mode",    bio: "Multiplayer party games for everyone" },
  { username: "quizmaster",  display_name: "Quiz Master",   bio: "Trivia, quizzes & brain teasers" }
].freeze

puts "Seeding Vibe Originals accounts..."

ORIGINALS.each do |attrs|
  user = User.find_or_initialize_by(username: attrs[:username])
  user.assign_attributes(
    email: "#{attrs[:username]}@originals.vibe.app",
    password: SecureRandom.hex(16),
    display_name: attrs[:display_name],
    bio: attrs[:bio],
    date_of_birth: Date.new(2000, 1, 1)
  )
  user.save!
  puts "  Created @#{user.username}"
end

# Create sparse social graph between Originals
originals = User.where(username: ORIGINALS.map { |a| a[:username] })
originals.each do |user|
  targets = originals.where.not(id: user.id).sample(3)
  targets.each do |target|
    Follow.find_or_create_by!(follower: user, following: target)
  end
end

puts "Done! #{originals.count} Vibe Originals created with social graph."
