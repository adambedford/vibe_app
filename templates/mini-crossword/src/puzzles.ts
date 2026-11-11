import type { Puzzle } from "./logic.ts";

/**
 * The puzzle pack. One is shown per day, cycling (see puzzleForDay in logic.ts).
 * Grids come from tools/fill.ts; clues are written by hand or by the agent.
 * Every answer must be a common word, and the checks verify each grid parses.
 */
export const PUZZLES: Puzzle[] = [
  {
    id: "p01",
    rows: ["#HAND", "SOLAR", "PRIME", "ASKEW", "NEED#"],
    clues: {
      across: {
        1: "Give a ___ (help out)",
        5: "Kind of panel on a sunny roof",
        6: "Like 2, 3, 5 and 7",
        7: "Crooked, like a picture frame after a door slam",
        8: "Want badly",
      },
      down: {
        1: "Animal measured in hands",
        2: "Like two peas in a pod",
        3: "Called, as a new puppy",
        4: "Sketched",
        5: "Bridge's length, or attention ___",
      },
    },
  },
  {
    id: "p02",
    rows: ["#NOW#", "HOPES", "IDEAL", "MERRY", "#SAY#"],
    clues: {
      across: {
        1: "This very moment",
        4: "Fingers-crossed wishes",
        6: "Picture-perfect",
        7: "Full of festive cheer",
        8: "Have a ___ (get a vote)",
      },
      down: {
        1: "Points where branches meet",
        2: "Night out at La Scala",
        3: "Bone-tired",
        4: "Not her",
        5: "Crafty, like a fox",
      },
    },
  },
  {
    id: "p03",
    rows: ["VICE#", "ADULT", "NERVE", "SAVES", "#LEST"],
    clues: {
      across: {
        1: "___ versa",
        5: "Grown-up",
        7: "Courage, or cheek",
        8: "Goalkeeper's stat",
        9: "For fear that",
      },
      down: {
        1: "Moving-day rentals",
        2: "Best possible",
        3: "Bend in the road",
        4: "Workshop helpers at the North Pole",
        6: "Pop quiz, for one",
      },
    },
  },
  {
    id: "p04",
    rows: ["#WHOM", "SHARE", "HOLDS", "ELVES", "DEER#"],
    clues: {
      across: {
        1: "To ___ it may concern",
        5: "Split fairly",
        6: "Wrestling moves, or waits on the phone",
        7: "Tiny shoemakers in a fairy tale",
        8: "Antlered forest animals",
      },
      down: {
        1: "Entire",
        2: "Cut down the middle",
        3: "\"Ready to ___?\" (waiter's question)",
        4: "Teenager's bedroom, stereotypically",
        5: "Garden storage hut",
      },
    },
  },
  {
    id: "p05",
    rows: ["GAP##", "EVER#", "TODAY", "#WAKE", "##LET"],
    clues: {
      across: {
        1: "Mind the ___ (Underground warning)",
        4: "Happily ___ after",
        6: "When this puzzle is for",
        8: "Stop snoozing",
        9: "Allow",
      },
      down: {
        1: "Understand, informally",
        2: "Declare openly",
        3: "Bike part you push",
        5: "Leaf-gathering tool",
        7: "So far",
      },
    },
  },
  {
    id: "p06",
    rows: ["YES##", "OATH#", "USUAL", "#ENVY", "##SEE"],
    clues: {
      across: {
        1: "Opposite of no",
        4: "Solemn promise",
        6: "\"The ___?\" (barista's question to a regular)",
        8: "Green-eyed feeling",
        9: "Look at",
      },
      down: {
        1: "The person reading this",
        2: "Comfort",
        3: "Leaves speechless",
        5: "Own",
        7: "Soap-making chemical",
      },
    },
  },
  {
    id: "p07",
    rows: ["FUN##", "USED#", "REVUE", "#RELY", "##RYE"],
    clues: {
      across: {
        1: "What games are for",
        4: "Secondhand",
        6: "Variety show",
        8: "Count (on)",
        9: "Bread often baked with caraway",
      },
      down: {
        1: "Cat's coat",
        2: "Person on an app",
        3: "Not once",
        5: "As expected; properly",
        7: "Calm center of a hurricane",
      },
    },
  },
  {
    id: "p08",
    rows: ["ICE##", "TRAY#", "SITES", "#BETA", "##NIT"],
    clues: {
      across: {
        1: "Rink surface",
        4: "Breakfast-in-bed carrier",
        6: "Places on the web",
        8: "Test version of an app",
        9: "Tiny thing to pick",
      },
      down: {
        1: "\"___ a deal!\"",
        2: "Baby's bed",
        3: "Gobbled up",
        5: "Abominable snowman",
        7: "Took a seat",
      },
    },
  },
  {
    id: "p09",
    rows: ["#TOP#", "RIFLE", "EATEN", "DREAD", "#AND#"],
    clues: {
      across: {
        1: "Spinning toy",
        4: "Rummage (through)",
        6: "Consumed",
        7: "Fear of what's coming",
        8: "Plus",
      },
      down: {
        1: "Pageant crown",
        2: "Many times",
        3: "Beg",
        4: "Color of a stop sign",
        5: "Finish",
      },
    },
  },
  {
    id: "p10",
    rows: ["#MADE", "SOLID", "OWING", "LEVEE", "ODES#"],
    clues: {
      across: {
        1: "Built",
        5: "Neither liquid nor gas",
        6: "Still to be paid",
        7: "Riverbank wall against floods",
        8: "Poems of praise",
      },
      down: {
        1: "Cut, as a lawn",
        2: "Breathing",
        3: "Eats in the evening",
        4: "Cliff's rim",
        5: "Performance for one",
      },
    },
  },
  {
    id: "p11",
    rows: ["TWO##", "HARM#", "ENDED", "#DENY", "##RUE"],
    clues: {
      across: {
        1: "Pair",
        4: "Damage",
        6: "Finished",
        8: "Say it isn't so",
        9: "Regret",
      },
      down: {
        1: "Most common word in English",
        2: "Magician's stick",
        3: "Tidiness",
        5: "List of dishes",
        7: "Hair color product",
      },
    },
  },
  {
    id: "p12",
    rows: ["#ALL#", "PLAIN", "LINGO", "YACHT", "#SET#"],
    clues: {
      across: {
        1: "Every last one",
        4: "Unadorned",
        6: "Jargon",
        7: "Luxury boat",
        8: "Ready, ___, go!",
      },
      down: {
        1: "Spy's assumed name",
        2: "Knight's long weapon",
        3: "Not heavy",
        4: "Layer of tissue paper",
        5: "\"Is ___!\" (playground comeback)",
      },
    },
  },
  {
    id: "p13",
    rows: ["PAGE#", "AURAL", "IRATE", "RAVEN", "#SEND"],
    clues: {
      across: {
        1: "Leaf of a book",
        5: "Relating to hearing",
        7: "Fuming",
        8: "Poe's \"nevermore\" bird",
        9: "Hit the email button",
      },
      down: {
        1: "Two of a kind",
        2: "Glowing vibes",
        3: "Serious",
        4: "Had for dinner",
        6: "Let borrow",
      },
    },
  },
];
