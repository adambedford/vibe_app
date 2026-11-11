/**
 * Dodge renderer: draws logic state with Phaser and wires the platform lifecycle.
 * Rules live in logic.ts; knobs in config.ts.
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
  private player!: Phaser.GameObjects.Container;
  private objs = new Map<number, Phaser.GameObjects.Image>();
  private starfield!: Phaser.GameObjects.TileSprite;
  private starfield2!: Phaser.GameObjects.TileSprite;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;

  constructor() {
    super("play");
  }

  create() {
    this.makeTextures();
    const bg = this.add.graphics();
    bg.fillGradientStyle(THEME.bgTop, THEME.bgTop, THEME.bgBottom, THEME.bgBottom, 1);
    bg.fillRect(0, 0, L.W, L.H);
    this.starfield = this.add.tileSprite(0, 0, L.W, L.H, "stars").setOrigin(0, 0).setAlpha(0.5);
    this.starfield2 = this.add.tileSprite(0, 0, L.W, L.H, "stars").setOrigin(0, 0).setAlpha(0.9).setScale(1.6);

    this.trail = this.add.particles(0, 0, "dot", {
      speed: { min: 10, max: 40 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 360,
      frequency: 30,
      tint: THEME.playerGlow,
      emitting: false,
    });
    const glow = this.add.image(0, 0, "glow").setTint(THEME.playerGlow).setAlpha(0.55);
    const core = this.add.image(0, 0, "ship");
    this.player = this.add.container(L.W / 2, L.PLAYER_Y, [glow, core]).setDepth(5);
    this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.trail.startFollow(this.player, 0, 14);
    this.trail.start();

    this.burst = this.add.particles(0, 0, "dot", {
      speed: { min: 100, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0 },
      lifespan: 750,
      tint: [THEME.player, THEME.rock, 0xffffff],
      emitting: false,
    });
    this.sparkle = this.add.particles(0, 0, "dot", {
      speed: { min: 60, max: 180 },
      scale: { start: 0.6, end: 0 },
      lifespan: 420,
      tint: THEME.spark,
      emitting: false,
    });
    for (const e of [this.trail, this.burst, this.sparkle]) e.setDepth(6);

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
    this.scoreText = text(80, 64, "0");
    this.bestText = text(130, 18);
    this.hint = text(330, 22, "Drag to move\nDodge the rocks, grab the stars");
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const onPointer = (p: Phaser.Input.Pointer) => {
      sfx.unlock();
      if (this.attract) return;
      if (this.s.phase === "over") {
        if (p.isDown && performance.now() - this.overAt > 700) this.reset(false);
        return;
      }
      if (p.isDown || this.s.phase === "play") this.apply({ type: "point", x: p.worldX });
    };
    this.input.on("pointerdown", onPointer);
    this.input.on("pointermove", onPointer);

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
    g.fillStyle(0xffffff).fillCircle(6, 6, 6);
    g.generateTexture("dot", 12, 12);
    g.clear();

    g.fillStyle(0xffffff, 0.25).fillCircle(32, 32, 32).fillStyle(0xffffff, 0.5).fillCircle(32, 32, 22);
    g.generateTexture("glow", 64, 64);
    g.clear();

    const R = L.PLAYER_R;
    g.fillStyle(THEME.playerGlow).fillCircle(R, R, R);
    g.fillStyle(THEME.player).fillCircle(R, R - 2, R - 4);
    g.fillStyle(0xffffff, 0.9).fillCircle(R - 5, R - 7, 4);
    g.generateTexture("ship", R * 2, R * 2);
    g.clear();

    // Rocks: a few irregular shapes at radius 32, scaled per rock.
    for (let k = 0; k < 3; k++) {
      const pts: Phaser.Math.Vector2[] = [];
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 26 + ((i * 7 + k * 5) % 6);
        pts.push(new Phaser.Math.Vector2(32 + Math.cos(a) * r, 32 + Math.sin(a) * r));
      }
      g.fillStyle(THEME.rockDark).fillPoints(pts, true);
      g.fillStyle(THEME.rock).fillPoints(
        pts.map((p) => new Phaser.Math.Vector2(32 + (p.x - 32) * 0.82 - 2, 32 + (p.y - 32) * 0.82 - 3)),
        true,
      );
      g.generateTexture(`rock${k}`, 64, 64);
      g.clear();
    }

    const star: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 15 : 6.5;
      star.push(new Phaser.Math.Vector2(16 + Math.cos(a) * r, 16 + Math.sin(a) * r));
    }
    g.fillStyle(THEME.star).fillPoints(star, true);
    g.generateTexture("star", 32, 32);
    g.clear();

    // Starfield tile
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.7).fillCircle(r() * 180, r() * 320, r() < 0.15 ? 1.6 : 0.9);
    g.generateTexture("stars", 180, 320);
    g.destroy();
  }

  reset(attract: boolean) {
    this.attract = attract;
    this.s = L.init(attract ? `attract-${Math.floor(Math.random() * 1e9)}` : vibe.newSeed());
    for (const o of this.objs.values()) o.destroy();
    this.objs.clear();
    this.acc = 0;
    this.lastScore = 0;
    this.player.setVisible(true).setPosition(this.s.x, L.PLAYER_Y);
    this.scoreText.setText("0");
    this.hint.setVisible(!attract).setAlpha(1);
    this.showBest();
  }

  private showBest() {
    this.bestText.setText(this.best > 0 && !this.attract ? `Best ${this.best}` : "");
  }

  private playSfx(name: Parameters<Sfx["play"]>[0]) {
    if (!this.attract) sfx.play(name);
  }

  private apply(a: L.Action) {
    this.s = L.step(this.s, a);
    for (const ev of this.s.events) {
      switch (ev) {
        case "start":
          if (!this.attract) {
            vibe.start();
            this.playSfx("start");
            this.tweens.add({ targets: this.hint, alpha: 0, duration: 200, onComplete: () => this.hint.setVisible(false) });
          }
          break;
        case "spawn": {
          const o = this.s.objs[this.s.objs.length - 1]!;
          const img =
            o.kind === "star"
              ? this.add.image(o.x, o.y, "star")
              : this.add.image(o.x, o.y, `rock${o.id % 3}`).setScale((o.r * 2) / 56);
          img.setDepth(4).setAngle((o.id * 37) % 360);
          this.objs.set(o.id, img);
          break;
        }
        case "star":
          this.playSfx("star");
          this.sparkle.explode(14, this.s.x, L.PLAYER_Y - 10);
          this.floatText(`+${CONFIG.starValue}`, this.s.x, L.PLAYER_Y - 40);
          break;
        case "die":
          this.playSfx("die");
          this.burst.explode(40, this.s.x, L.PLAYER_Y);
          this.player.setVisible(false);
          this.cameras.main.shake(300, 0.014);
          this.cameras.main.flash(140, 255, 120, 140);
          this.overAt = performance.now();
          if (this.attract) this.time.delayedCall(1200, () => this.attract && this.reset(true));
          else this.finish();
          break;
      }
    }
  }

  private floatText(s: string, x: number, y: number) {
    const t = this.add
      .text(x, y, s, { fontFamily: THEME.font, fontSize: "24px", fontStyle: "bold", color: "#ffe680", stroke: THEME.textStroke, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(11);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }

  private finish() {
    const score = this.s.score;
    vibe.end({ outcome: "lose", score });
    vibe.events.track("level_end", { score, stars: this.s.stars });
    if (score > this.best) {
      this.best = score;
      vibe.saves.set("best", score).catch(() => {});
    }
    vibe.scores.submit(score).catch(() => {});
    this.showBest();
  }

  update(_time: number, delta: number) {
    if (!this.sentFirstFrame) {
      this.sentFirstFrame = true;
      vibe.firstFrame();
      vibe.ready();
      if (vibe.paused) this.game.pause();
    }
    this.acc += Math.min(delta, 100);
    while (this.acc >= L.TICK_MS) {
      if (this.attract) {
        if (this.s.phase === "ready" || (this.s.phase === "play" && this.s.tick % 4 === 0)) {
          this.apply({ type: "point", x: L.botTarget(this.s) });
        }
        if (this.s.tick > 60 * 25) this.reset(true);
      }
      this.apply({ type: "tick" });
      this.acc -= L.TICK_MS;
    }
    const speed = this.s.phase === "play" ? 1 + L.difficulty(this.s) * CONFIG.speedRamp : 0.3;
    this.starfield.tilePositionY -= 0.4 * speed;
    this.starfield2.tilePositionY -= 0.9 * speed;
    if (this.s.phase !== "over") this.player.setPosition(this.s.x, L.PLAYER_Y);
    for (const o of this.s.objs) {
      const img = this.objs.get(o.id);
      if (!img) continue;
      img.setPosition(o.x, o.y);
      img.angle += o.kind === "star" ? 2 : 0.6;
    }
    for (const [id, img] of this.objs) {
      if (!this.s.objs.some((o) => o.id === id)) {
        img.destroy();
        this.objs.delete(id);
      }
    }
    if (this.s.score !== this.lastScore) {
      this.lastScore = this.s.score;
      this.scoreText.setText(String(this.s.score));
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
    backgroundColor: "#140f36",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Play],
    banner: false,
    audio: { noAudio: true },
  });
  vibe.onPause(() => game.pause());
  vibe.onResume(() => game.resume());
}

boot();
