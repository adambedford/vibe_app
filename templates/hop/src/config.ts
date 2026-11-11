/**
 * Knobs for Hop. Change these first: they are the safest way to make a new game from
 * this template. Distances are in logical pixels (the game is 360×640); speeds are per
 * tick (60 ticks a second).
 */
export const CONFIG = {
  title: "Hop",
  gravity: 0.9,
  jumpVelocity: -15.5,
  doubleJump: true,
  doubleJumpVelocity: -13,
  startSpeed: 5,
  speedPerPoint: 0.12,
  maxSpeed: 11.5,
  /** Gap between obstacles, in ticks of travel at the current speed. */
  gapTicksMin: 34,
  gapTicksMax: 62,
  obstacleWidth: [26, 44] as [number, number],
  obstacleHeight: [28, 66] as [number, number],
  /** After this score, some obstacles are wide. */
  wideAfter: 6,
  wideChance: 0.25,
  wideWidth: [62, 92] as [number, number],
};

/** Colors and shapes. Hex numbers, as Phaser expects. */
export const THEME = {
  skyTop: 0x7fd3ff,
  skyBottom: 0xd9f4ff,
  hillFar: 0xa7e3b4,
  hillNear: 0x6cc47f,
  ground: 0x7a5a3a,
  groundTop: 0x5bb85e,
  player: 0xff7a59,
  playerDark: 0xc44d33,
  eye: 0x1d1d1d,
  obstacle: 0x5b4b8a,
  obstacleTop: 0x8b7bc4,
  dust: 0xf5e6c8,
  text: "#ffffff",
  textStroke: "#3a2b5c",
  font: "ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};
