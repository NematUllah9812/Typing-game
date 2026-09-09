// Cadence — Replay recording & playback. Mirrors ARCHITECTURE.md §18.
// Because the engine is deterministic, a run is fully reproduced by its seed +
// the timeline of (relative tick, action). A "ghost" is the cursor position of
// a past run interpolated over time.

/**
 * Build a compact replay record from a finished session.
 * @param {object} params { modeId, seed, meta, samples, durationMs, netWpm }
 * @returns {Replay}
 */
export function recordReplay({ modeId, seed, meta, samples, durationMs, netWpm, text }) {
  // Store only what's needed to reproduce the caret over time.
  const events = samples.map((s) => ({
    t: Math.round(s.tick),        // run-relative ms
    a: s.action,                  // action code
    i: s.targetIndex,             // target index at the time
  }));
  return {
    version: 1,
    modeId,
    seed,
    meta,
    text,
    durationMs: Math.round(durationMs),
    netWpm,
    events,
  };
}

/**
 * A GhostPlayer yields the ghost's cursor index for a given elapsed time by
 * scanning its recorded cursor timeline. Built from a Replay.
 */
export class GhostPlayer {
  /** @param {Replay} replay */
  constructor(replay) {
    this.replay = replay;
    // Build a monotonic (time -> cursorIndex) timeline from events. The engine's
    // sample cursorIndex isn't stored, so we reconstruct advancement: each Type
    // or WhitespaceAdvance that advanced counts as +1 cursor; we approximate by
    // the max targetIndex seen up to time t (backspaces reduce it).
    this.timeline = buildCursorTimeline(replay.events);
    this._i = 0;
  }

  /** Ghost cursor index at elapsed ms (monotonic queries recommended). */
  cursorAt(elapsedMs) {
    const tl = this.timeline;
    // advance pointer
    while (this._i < tl.length - 1 && tl[this._i + 1].t <= elapsedMs) this._i++;
    // if before first event
    if (elapsedMs < tl[0]?.t) return 0;
    return tl[this._i]?.cursor ?? 0;
  }

  reset() {
    this._i = 0;
  }

  get finalCursor() {
    return this.timeline.length ? this.timeline[this.timeline.length - 1].cursor : 0;
  }
  get durationMs() {
    return this.replay.durationMs;
  }
}

function buildCursorTimeline(events) {
  const out = [{ t: 0, cursor: 0 }];
  let cursor = 0;
  for (const e of events) {
    if (e.a === 'backspace') cursor = Math.max(0, cursor - 1);
    else if (e.a === 'type' || e.a === 'whitespace') cursor = Math.max(cursor, e.i + 1);
    out.push({ t: e.t, cursor });
  }
  return out;
}

/**
 * @typedef {Object} Replay
 * @property {number} version
 * @property {string} modeId
 * @property {number} seed
 * @property {object} meta
 * @property {string} text
 * @property {number} durationMs
 * @property {number} netWpm
 * @property {{t:number,a:string,i:number}[]} events
 */
