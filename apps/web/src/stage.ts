/**
 * One game's slot in the UI: poster, live frame, the tap layer that turns a tap into
 * "focus", and the host's end card. Used by the feed (many stages) and the play page (one).
 */
import { GameFrame, perGamePlayerId, type CatalogEntry, type FrameEvent } from "@vibe/host";
import { dayKey } from "@vibe/protocol";
import { formatScore, prefs, services, shareLink, toast, track, userKey } from "./session.ts";

export interface StageOptions {
  entry: CatalogEntry;
  mode: "feed" | "focus" | "test";
  challenge?: { score: number; seed: string };
  onNext?: () => void;
  onFocusChange?: (stage: Stage, focused: boolean) => void;
  onFrameEvent?: (stage: Stage, e: FrameEvent) => void;
}

const OUTCOME_TITLE: Record<string, string> = {
  win: "You win!",
  lose: "Game over",
  complete: "Done!",
  quit: "Thanks for playing",
};

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

export class Stage {
  readonly el = h("section", "stage");
  frame: GameFrame | null = null;
  focused = false;
  private poster = h("img", "poster");
  private slot = h("div", "slot");
  private tap = h("button", "tap-layer");
  private endCard = h("div", "end-card");
  private focusStartedAt = 0;
  private currentSince = 0;

  constructor(readonly opts: StageOptions) {
    const { entry } = opts;
    this.el.dataset.game = entry.gameId;
    this.poster.alt = "";
    this.poster.decoding = "async";
    if (entry.poster) {
      this.poster.src = entry.poster;
      this.poster.onerror = () => this.poster.classList.add("missing");
    }
    const fallback = h("div", "poster-fallback", entry.manifest.title);

    this.tap.setAttribute("aria-label", `Play ${entry.manifest.title}`);
    this.tap.append(h("span", "tap-cta", "Tap to play"));
    this.tap.addEventListener("click", () => this.enterFocus());

    const meta = h("div", "meta");
    meta.append(h("div", "meta-title", entry.manifest.title), h("div", "meta-desc", entry.manifest.description));
    if (entry.manifest.daily) meta.prepend(h("span", "badge", "Daily"));
    if (opts.challenge) {
      const best = formatScore(opts.challenge.score, entry.manifest.boards?.default);
      meta.prepend(h("span", "badge challenge", `Challenge: beat ${best}`));
    }

    this.endCard.hidden = true;
    this.el.append(fallback, this.poster, this.slot, this.tap, meta, this.endCard);
  }

  get gameId() {
    return this.opts.entry.gameId;
  }

  /** Create the live frame (if absent). Neighbours in the feed mount paused. */
  mount(paused: boolean) {
    if (this.frame) return;
    const { entry, mode, challenge } = this.opts;
    this.frame = new GameFrame({
      entry,
      container: this.slot,
      services,
      userKey,
      mode,
      challenge,
      initial: { paused, audio: false, focused: false },
      onEvent: (e) => this.onEvent(e),
    });
  }

  unmount() {
    if (!this.frame) return;
    if (this.focused) this.exitFocus();
    this.frame.destroy();
    this.frame = null;
    this.el.classList.remove("live");
    this.endCard.hidden = true;
  }

  /** This stage is now the one on screen. */
  activate() {
    this.mount(false);
    this.frame!.resume();
    this.currentSince = performance.now();
    track("impression", this.ids());
  }

  deactivate() {
    if (!this.frame) return;
    const shownMs = Math.round(performance.now() - this.currentSince);
    track("swipe_away", { ...this.ids(), shownMs, focused: this.focused, quick: shownMs < 3000 && !this.focused });
    if (this.focused) this.exitFocus();
    this.frame.pause();
  }

  enterFocus() {
    if (!this.frame || this.focused) return;
    this.focused = true;
    this.el.classList.add("focused");
    this.endCard.hidden = true;
    this.frame.setFocus(true);
    this.frame.setAudio(!prefs.muted);
    this.frame.resume();
    this.focusStartedAt = performance.now();
    track("focus_start", this.ids());
    this.opts.onFocusChange?.(this, true);
  }

  exitFocus() {
    if (!this.focused) return;
    this.focused = false;
    this.el.classList.remove("focused");
    this.frame?.setFocus(false);
    this.frame?.setAudio(false);
    track("focus_end", { ...this.ids(), focusedMs: Math.round(performance.now() - this.focusStartedAt) });
    this.opts.onFocusChange?.(this, false);
  }

  /** "Play again": hide the end card, restart the game, and lock the feed again. */
  restart() {
    this.endCard.hidden = true;
    this.frame?.restart();
    if (!this.focused) this.enterFocus();
    else this.opts.onFocusChange?.(this, true);
  }

  setAudio(on: boolean) {
    if (this.focused) this.frame?.setAudio(on);
  }

  private ids() {
    return { gameId: this.opts.entry.gameId, versionId: this.opts.entry.versionId };
  }

  private onEvent(e: FrameEvent) {
    this.opts.onFrameEvent?.(this, e);
    switch (e.type) {
      case "firstFrame":
        this.el.classList.add("live");
        track("first_frame", { ...this.ids(), ms: e.ms });
        break;
      case "ready":
        track("ready", { ...this.ids(), ms: e.ms });
        break;
      case "start":
        this.endCard.hidden = true;
        track("run_start", this.ids());
        break;
      case "end":
        track("run_end", { ...this.ids(), outcome: e.outcome, score: e.score, runMs: e.runMs });
        if (this.focused) this.showEnd(e);
        this.opts.onFocusChange?.(this, false); // let the feed scroll again
        break;
      case "share":
        this.share(e.score);
        break;
      case "scores.show":
        void this.showLeaderboard(e.board ?? "default");
        break;
      case "track":
        track(`game:${e.name}`, { ...this.ids(), props: e.props });
        break;
      case "error":
        track("game_error", { ...this.ids(), message: e.message });
        console.warn(`[${this.gameId}] game error:`, e.message);
        break;
      case "violation":
        track("violation", { ...this.ids(), reason: e.reason });
        console.warn(`[${this.gameId}] protocol violation:`, e.reason);
        break;
    }
  }

  private challengeUrl(score?: number) {
    const u = new URL("/play.html", location.origin);
    u.searchParams.set("game", this.gameId);
    if (score !== undefined) {
      const seed = Math.random().toString(36).slice(2, 10);
      u.searchParams.set("challenge", `${score}.${seed}`);
    }
    return u.toString();
  }

  private share(score?: number) {
    const m = this.opts.entry.manifest;
    const board = m.boards?.default;
    const text =
      score !== undefined
        ? m.daily
          ? `I solved today's ${m.title} in ${formatScore(score, board)}. Can you beat me?`
          : `I scored ${formatScore(score, board)} in ${m.title}. Beat that!`
        : `Play ${m.title}`;
    void shareLink(m.title, text, this.challengeUrl(m.daily ? undefined : score));
  }

  private async showEnd(e: Extract<FrameEvent, { type: "end" }>) {
    const m = this.opts.entry.manifest;
    const board = m.boards?.default;
    const card = this.endCard;
    card.replaceChildren();
    const close = h("button", "end-close", "✕");
    close.setAttribute("aria-label", "close");
    close.onclick = () => (card.hidden = true);
    const title = h("div", "end-title", m.daily && e.outcome === "complete" ? "Solved!" : OUTCOME_TITLE[e.outcome]);
    const score = h("div", "end-score", formatScore(e.score, board));
    const sub = h("div", "end-sub");
    const ch = this.opts.challenge;
    if (ch && e.score !== undefined && board) {
      const beat = board.order === "desc" ? e.score > ch.score : e.score < ch.score;
      sub.textContent = beat ? `You beat ${formatScore(ch.score, board)}!` : `${formatScore(ch.score, board)} to beat`;
    }
    const actions = h("div", "end-actions");
    if (!m.daily) {
      const again = h("button", "btn primary", "Play again");
      again.onclick = () => this.restart();
      actions.append(again);
    }
    const challenge = h("button", "btn", m.daily ? "Share" : "Challenge a friend");
    challenge.onclick = () => this.share(e.score);
    actions.append(challenge);
    if (this.opts.onNext) {
      const next = h("button", "btn", "Next game ↓");
      next.onclick = () => this.opts.onNext?.();
      actions.append(next);
    }
    card.append(close, title, score, sub, actions);
    card.hidden = false;

    // The game submits its score right after `end`; read back the player's best.
    if (board) {
      setTimeout(async () => {
        try {
          const playerId = await perGamePlayerId(userKey, this.gameId);
          const top = await services.scoresTop({
            gameId: this.gameId,
            board: "default",
            config: board,
            playerId,
            day: dayKey(),
            limit: 50,
          });
          const mine = top.find((t) => t.self);
          if (mine && !sub.textContent) {
            sub.textContent = `${board.period === "day" ? "Today's best" : "Your best"}: ${formatScore(mine.value, board)}`;
          }
        } catch {
          /* leaderboard unavailable */
        }
      }, 300);
    }
  }

  private async showLeaderboard(board: string) {
    const cfg = this.opts.entry.manifest.boards?.[board];
    if (!cfg) return;
    const top = await services.scoresTop({
      gameId: this.gameId,
      board,
      config: cfg,
      playerId: await perGamePlayerId(userKey, this.gameId),
      day: dayKey(),
      limit: 10,
    });
    toast(top.length ? top.map((t) => `${t.rank}. ${formatScore(t.value, cfg)}${t.self ? " (you)" : ""}`).join("  ·  ") : "No scores yet");
  }
}
