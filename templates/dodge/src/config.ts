/**
 * Knobs for Dodge. The game is 360×640 logical pixels at 60 ticks a second.
 */
export const CONFIG = {
  title: "Dodge",
  /** Max pixels per tick the player moves toward your finger. */
  playerSpeed: 13,
  /** Ticks between spawns at the start and at full difficulty. */
  spawnStart: 34,
  spawnEnd: 11,
  /** Seconds until full difficulty. */
  rampSeconds: 60,
  /** Fall speed range (px/tick) at the start; multiplied up to (1 + speedRamp) by full difficulty. */
  fallSpeed: [3.2, 5.2] as [number, number],
  speedRamp: 0.9,
  rockRadius: [13, 27] as [number, number],
  starChance: 0.16,
  starValue: 5,
};

export const THEME = {
  bgTop: 0x0b1030,
  bgBottom: 0x2a1b5c,
  player: 0x63f5ff,
  playerGlow: 0x2fb7ff,
  rock: 0xff5d73,
  rockDark: 0xb83a4f,
  star: 0xffd84d,
  spark: 0xfff3a0,
  text: "#ffffff",
  textStroke: "#1b1440",
  font: "ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};
