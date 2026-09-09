// Cadence — GameSession orchestration. Mirrors ARCHITECTURE.md §9 (loop/clock)
// and §5 (drives the pure engine). Clock starts on first keystroke.

import { TypingEngine } from '../domain/typing-engine.js';
import { KeyAction } from '../domain/primitives.js';
import { computeResult } from '../domain/scoring.js';

export class GameSession {
  /** @param {import('../domain/modes.js').RunPlan} plan */
  constructor(plan) {
    this.plan = plan;
    this.engine = new TypingEngine(plan.text, plan.rules);
    this.startTick = null; // set on first keystroke
    this.endTick = null;
    this.wordsCompleted = 0;
    this.finished = false;
    this._listeners = { update: [], finish: [] };
  }

  on(evt, fn) {
    (this._listeners[evt] ||= []).push(fn);
    return this;
  }
  _emit(evt, payload) {
    for (const fn of this._listeners[evt] || []) fn(payload);
  }

  get started() {
    return this.startTick != null;
  }

  /** Elapsed ms using a supplied "now" (monotonic, e.g. performance.now()). */
  elapsedMs(now) {
    if (this.startTick == null) return 0;
    return (this.endTick ?? now) - this.startTick;
  }

  /** Remaining ms for timed modes, else null. */
  remainingMs(now) {
    if (!this.plan.limitMs) return null;
    return Math.max(0, this.plan.limitMs - this.elapsedMs(now));
  }

  /**
   * Feed one input. `now` is monotonic ms (performance.now()).
   * @returns {import('../domain/typing-engine.js').KeystrokeResult}
   */
  input(inputObj, now) {
    if (this.finished) return null;
    if (this.startTick == null) this.startTick = now;

    const tick = now - this.startTick; // engine sees run-relative ms
    const res = this.engine.process(inputObj, tick);

    if (res.wordCompleted) this.wordsCompleted++;

    this._checkFinish(now);
    this._emit('update', { result: res, session: this, now });
    return res;
  }

  /** Called by the loop each tick so timed modes can expire without input. */
  tick(now) {
    if (this.finished || this.startTick == null) return;
    this._checkFinish(now);
  }

  _checkFinish(now) {
    const ctx = {
      elapsedMs: this.elapsedMs(now),
      wordsCompleted: this.wordsCompleted,
      textComplete: this.engine.isComplete,
    };
    if (this.plan.isFinished(ctx)) this.finish(now);
  }

  finish(now) {
    if (this.finished) return;
    this.finished = true;
    this.endTick = now;
    const result = this.buildResult();
    this._emit('finish', { result, session: this });
  }

  buildResult() {
    const elapsed = this.elapsedMs(this.endTick ?? this.startTick ?? 0);
    const base = computeResult(this.engine.samples, elapsed);
    return {
      ...base,
      modeId: this.plan.modeId,
      seed: this.plan.seed,
      meta: this.plan.meta,
      startedUtc: new Date().toISOString(),
    };
  }

  snapshot() {
    return this.engine.snapshot();
  }
}

export { KeyAction };
