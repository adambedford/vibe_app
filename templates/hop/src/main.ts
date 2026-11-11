/**
 * Hop renderer: draws logic state with Phaser and wires the platform lifecycle.
 * Rules live in logic.ts; knobs in config.ts. Everything here is presentation and "juice".
 */
import { CONFIG, THEME } from "./config.ts";
import * as L from "./logic.ts";
import { Sfx } from "./sfx.ts";

const sfx = new Sfx();

class Play extends Phaser.Scene {
  private s!: L.State;
  private attract = true;
  private acc = 0;
  private best = 0;
  private overAt = 0;
  private sentFirstFrame = false;
  private player!: Phaser.GameObjects.Image;
  private obstacles = new Map<number, Phaser.GameObjects.Container>();
  private hillsFar!: Phaser.GameObjects.TileSprite;
  private hillsNear!: Phaser.GameObjects.TileSprite;
  private groundTop!: Phaser.GameObjects.TileSprite;
  private clouds: Phaser.GameObjects.Image[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("play");
  }

  create() {
    this.makeTextures();
    const sky = this.add.graphics();
    sky.fillGradientStyle(THEME.skyTop, THEME.skyTop, THEME.skyBottom, THEME.skyBottom, 1);
    sky.fillRect(0, 0, L.W, L.H);
    for (let i = 0; i < 3; i++) {
      this.clouds.push(this.add.image(60 + i * 130, 140 + (i % 2) * 70, "cloud").setAlpha(0.9));
    }
    this.hillsFar = this.add.tileSprite(0, L.GROUND - 160, L.W, 160, "hillFar").setOrigin(0, 0);
    this.hillsNear = this.add.tileSprite(0, L.GROUND - 100, L.W, 100, "hillNear").setOrigin(0, 0);
    this.add.rectangle(0, L.GROUND, L.W, L.H - L.GROUND, THEME.ground).setOrigin(0, 0);
    this.groundTop = this.add.tileSprite(0, L.GROUND, L.W, 16, "groundTop").setOrigin(0, 0);
    this.player = this.add.image(L.PLAYER_X + L.PLAYER_SIZE / 2, L.GROUND, "player").setOrigin(0.5, 1).setDepth(5);

    this.dust = this.add.particles(0, 0, "dot", {
      speed: { min: 20, max: 90 },
      angle: { min: 190, max: 350 },
      scale: { start: 0.7, end: 0 },
      lifespan: 380,
      tint: THEME.dust,
      emitting: false,
    });
    this.burst = this.add.particles(0, 0, "dot", {
      speed: { min: 90, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0 },
      lifespan: 700,
      tint: [THEME.player, THEME.playerDark, 0xffffff],
      emitting: false,
    });
    this.sparkle = this.add.particles(0, 0, "dot", {
      speed: { min: 40, max: 140 },
      scale: { start: 0.55, end: 0 },
      lifespan: 420,
      tint: 0xfff3a0,
      emitting: false,
    });
    for (const e of [this.dust, this.burst, this.sparkle]) e.setDepth(6);

    const text = (y: number, size: number, s = "") =>
      this.add
        .text(L.W / 2, y, s, {
          fontFamily: THEME.font,
          fontSize: `${size}px`,
          fontStyle: "bold",
          color: THEME.text,
          stroke: THEME.textStroke,
          strokeThickness: Math.max(4, size / 9),
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(10);
    this.scoreText = text(96, 72, "0");
    this.bestText = text(150, 18);
    this.hint = text(300, 22, "Tap to jump\nTap again mid-air\nto double jump");
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.input.on("pointerdown", () => this.onTap());
    this.input.keyboard?.on("keydown-SPACE", () => this.onTap());

    vibe.onFocus((f) => {
      if (f && this.attract) this.reset(false);
      else if (!f && !this.attract) this.reset(true);
    });
    vibe.onRestart(() => this.reset(false));
    vibe.saves
      .get("best")
      .then((b) => {
        if (typeof b === "number") this.best = b;
        this.showBest();
      })
      .catch(() => {});

    this.reset(!vibe.focused);
  }

  private makeTextures() {
    const g = this.add.graphics();
    const S = L.PLAYER_SIZE;
    g.fillStyle(THEME.playerDark).fillRoundedRect(0, 4, S, S - 4, 10);
    g.fillStyle(THEME.player).fillRoundedRect(0, 0, S, S - 6, 10);
    g.fillStyle(0xffffff).fillCircle(21, 12, 6).fillCircle(31, 12, 5);
    g.fillStyle(THEME.eye).fillCircle(23, 13, 3).fillCircle(32, 13, 2.5);
    g.generateTexture("player", S, S);
    g.clear();

    g.fillStyle(0xffffff).fillCircle(6, 6, 6);
    g.generateTexture("dot", 12, 12);
    g.clear();

    g.fillStyle(THEME.groundTop).fillRect(0, 0, 32, 16);
    g.fillStyle(0x000000, 0.12).fillRect(0, 10, 16, 6);
    g.generateTexture("groundTop", 32, 16);
    g.clear();

    const hills = (key: string, h: number, color: number, bumps: number[]) => {
      g.fillStyle(color);
      g.fillRect(0, h * 0.6, L.W, h * 0.4);
      bumps.forEach((r, i) => g.fillCircle((i * L.W) / (bumps.length - 1), h * 0.6 + r * 0.25, r));
      g.generateTexture(key, L.W, h);
      g.clear();
    };
    hills("hillFar", 160, THEME.hillFar, [80, 110, 70, 100, 80]);
    hills("hillNear", 100, THEME.hillNear, [50, 70, 45, 65, 55, 50]);

    g.fillStyle(0xffffff).fillCircle(30, 26, 20).fillCircle(55, 20, 24).fillCircle(80, 28, 18).fillRect(30, 28, 50, 18);
    g.generateTexture("cloud", 100, 50);
    g.destroy();
  }

  reset(attract: boolean) {
    this.attract = attract;
    this.s = L.init(attract ? `attract-${Math.floor(Math.random() * 1e9)}` : vibe.newSeed());
    for (const o of this.obstacles.values()) o.destroy();
    this.obstacles.clear();
    this.acc = 0;
    this.player.setVisible(true).setAngle(0).setScale(1);
    this.scoreText.setText("0");
    this.hint.setVisible(!attract);
    this.showBest();
  }

  private showBest() {
    this.bestText.setText(this.best > 0 && !this.attract ? `Best ${this.best}` : "");
  }

  private onTap() {
    sfx.unlock();
    if (this.attract) return;
    if (this.s.phase === "over") {
      if (performance.now() - this.overAt > 700) this.reset(false);
      return;
    }
    this.apply({ type: "tap" });
  }

  private apply(a: L.Action) {
    this.s = L.step(this.s, a);
    const px = this.player.x;
    for (const ev of this.s.events) {
      switch (ev) {
        case "start":
          if (!this.attract) {
            vibe.start();
            this.tweens.add({ targets: this.hint, alpha: 0, duration: 200, onComplete: () => this.hint.setVisible(false) });
          }
          break;
        case "jump":
          this.playSfx("jump");
          this.dust.explode(8, px, L.GROUND);
          this.player.setScale(0.8, 1.25);
          this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 200, ease: "Back.Out" });
          break;
        case "double":
          this.playSfx("double");
          this.sparkle.explode(10, px, this.s.y);
          this.tweens.add({ targets: this.player, angle: this.player.angle + 360, duration: 420 });
          break;
        case "land":
          this.playSfx("land");
          this.dust.explode(10, px, L.GROUND);
          this.player.setAngle(0).setScale(1.3, 0.75);
          this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 220, ease: "Back.Out" });
          break;
        case "score":
          this.playSfx("score");
          this.scoreText.setText(String(this.s.score)).setScale(1.3);
          this.tweens.add({ targets: this.scoreText, scale: 1, duration: 200, ease: "Back.Out" });
          break;
        case "spawn": {
          const o = this.s.obstacles[this.s.obstacles.length - 1]!;
          const body = this.add.rectangle(0, 0, o.w, o.h, THEME.obstacle).setOrigin(0, 1);
          const top = this.add.rectangle(0, -o.h, o.w, 8, THEME.obstacleTop).setOrigin(0, 0);
          this.obstacles.set(o.id, this.add.container(o.x, L.GROUND, [body, top]).setDepth(4));
          break;
        }
        case "die":
          this.playSfx("die");
          this.burst.explode(36, px, this.s.y - L.PLAYER_SIZE / 2);
          this.player.setVisible(false);
          this.cameras.main.shake(260, 0.012);
          this.cameras.main.flash(120, 255, 255, 255);
          this.overAt = performance.now();
          if (this.attract) this.time.delayedCall(1200, () => this.attract && this.reset(true));
          else this.finish();
          break;
      }
    }
    if (a.type === "tick" && this.s.phase === "play") {
      this.hillsFar.tilePositionX += this.s.speed * 0.15;
      this.hillsNear.tilePositionX += this.s.speed * 0.4;
      this.groundTop.tilePositionX += this.s.speed;
    }
  }

  private playSfx(name: Parameters<Sfx["play"]>[0]) {
    if (!this.attract) sfx.play(name);
  }

  private finish() {
    const score = this.s.score;
    vibe.end({ outcome: "lose", score });
    vibe.events.track("level_end", { score });
    if (score > this.best) {
      this.best = score;
      vibe.saves.set("best", score).catch(() => {});
    }
    vibe.scores.submit(score).catch(() => {});
    this.showBest();
  }

  update(time: number, delta: number) {
    if (!this.sentFirstFrame) {
      this.sentFirstFrame = true;
      vibe.firstFrame();
      vibe.ready();
      if (vibe.paused) this.game.pause();
    }
    this.acc += Math.min(delta, 100);
    while (this.acc >= L.TICK_MS) {
      if (this.attract && L.botShouldTap(this.s)) this.apply({ type: "tap" });
      this.apply({ type: "tick" });
      if (this.attract && this.s.score >= 15) this.reset(true);
      this.acc -= L.TICK_MS;
    }
    // Draw
    if (this.s.phase === "ready") this.player.y = L.GROUND - Math.abs(Math.sin(time / 180)) * 8;
    else if (this.s.phase === "play") this.player.y = this.s.y;
    for (const o of this.s.obstacles) this.obstacles.get(o.id)?.setX(o.x);
    for (const [id, c] of this.obstacles) {
      if (!this.s.obstacles.some((o) => o.id === id)) {
        c.destroy();
        this.obstacles.delete(id);
      }
    }
    for (const c of this.clouds) {
      c.x -= delta * 0.008;
      if (c.x < -60) c.x = L.W + 60;
    }
  }
}

async function boot() {
  vibe.loading(0.1);
  const info = await vibe.connect();
  sfx.setEnabled(info.state.audio);
  vibe.onAudio((on) => sfx.setEnabled(on));
  document.title = CONFIG.title;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: L.W,
    height: L.H,
    backgroundColor: "#d9f4ff",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Play],
    banner: false,
    audio: { noAudio: true },
  });
  vibe.onPause(() => game.pause());
  vibe.onResume(() => game.resume());
}

boot();
