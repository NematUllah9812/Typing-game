// Cadence — TypingEngine (pure, deterministic). Mirrors ARCHITECTURE.md §5.
// No clocks, no IO. Time (tick, in ms) is passed in as data so runs are
// reproducible and replay-exact.

import { CharState, KeyAction, toGraphemes } from './primitives.js';

/**
 * @typedef {Object} TypingRules
 * @property {boolean} allowBackspace
 * @property {boolean} stopOnError      // cannot pass a wrong char until fixed
 * @property {boolean} requireFullWord  // space only advances on a completed word
 * @property {number}  maxExtras        // cap on typed-past-word extras
 */

export const DefaultRules = Object.freeze({
  allowBackspace: true,
  stopOnError: false,
  requireFullWord: false,
  maxExtras: 12,
});

export class TypingEngine {
  /**
   * @param {string} targetText
   * @param {Partial<TypingRules>} [rules]
   */
  constructor(targetText, rules = {}) {
    this.rules = { ...DefaultRules, ...rules };
    this.target = toGraphemes(targetText);
    this.cursor = 0; // index of next expected grapheme
    this.states = new Array(this.target.length).fill(CharState.Pending);
    /** @type {string[][]} per-index list of extra graphemes typed past a slot */
    this.extras = Array.from({ length: this.target.length + 1 }, () => []);
    this.extraCount = 0;
    /** @type {Array<KeystrokeSample>} */
    this.samples = [];
    this.finished = false;
    this._lastTick = null;
  }

  get length() {
    return this.target.length;
  }

  /** Is the run complete? (cursor consumed all targets) */
  get isComplete() {
    return this.cursor >= this.target.length;
  }

  /**
   * Process one typed input.
   * @param {{text?: string, action?: string}} input  printable text OR an action
   * @param {number} tick  monotonic time in ms (caller-supplied)
   * @returns {KeystrokeResult}
   */
  process(input, tick) {
    if (this.finished) return this._result(CharState.Pending, false, false, false);

    const action = input.action || KeyAction.Type;
    let result;
    if (action === KeyAction.Backspace) {
      result = this._backspace(tick);
    } else if (action === KeyAction.WhitespaceAdvance) {
      result = this._whitespace(tick);
    } else {
      result = this._type(input.text ?? '', tick);
    }

    this._lastTick = tick;
    if (this.isComplete && !this.finished) {
      this.finished = true;
      result = { ...result, runCompleted: true };
    }
    return result;
  }

  // --- printable grapheme -------------------------------------------------
  _type(text, tick) {
    const graphemes = toGraphemes(text);
    let last = this._result(CharState.Pending, false, false, false);
    for (const g of graphemes) {
      // If the grapheme is whitespace, treat it as a whitespace advance.
      if (/^\s$/u.test(g)) {
        last = this._whitespace(tick);
        continue;
      }
      last = this._typeOne(g, tick);
    }
    return last;
  }

  _typeOne(g, tick) {
    // Past the end of the target: record as an Extra (bounded).
    if (this.cursor >= this.target.length) {
      if (this.extraCount < this.rules.maxExtras) {
        this.extras[this.cursor].push(g);
        this.extraCount++;
        this._sample(this.cursor, '', g, false, tick, KeyAction.Type);
      }
      return this._result(CharState.Extra, false, false, false);
    }

    const expected = this.target[this.cursor];
    const correct = g === expected;

    // Stop-on-error: block advance while current slot holds an error.
    if (!correct && this.rules.stopOnError) {
      this.states[this.cursor] = CharState.Incorrect;
      this._sample(this.cursor, expected, g, false, tick, KeyAction.Type);
      return this._result(CharState.Incorrect, false, false, false);
    }

    this.states[this.cursor] = correct ? CharState.Correct : CharState.Incorrect;
    this._sample(this.cursor, expected, g, correct, tick, KeyAction.Type);

    const wordCompleted = this._isWordBoundaryAt(this.cursor);
    this.cursor++;
    return this._result(
      correct ? CharState.Correct : CharState.Incorrect,
      true,
      wordCompleted,
      false
    );
  }

  // --- whitespace ---------------------------------------------------------
  _whitespace(tick) {
    if (this.cursor >= this.target.length) {
      return this._result(CharState.Pending, false, false, false);
    }
    const expected = this.target[this.cursor];

    // Expected a space here -> normal correct advance.
    if (/^\s$/u.test(expected)) {
      this.states[this.cursor] = CharState.Correct;
      this._sample(this.cursor, expected, ' ', true, tick, KeyAction.WhitespaceAdvance);
      this.cursor++;
      return this._result(CharState.Correct, true, true, false);
    }

    // Space pressed mid-word.
    if (this.rules.requireFullWord) {
      // Block: register nothing, don't advance.
      return this._result(CharState.Pending, false, false, false);
    }

    // Carefree word-skip: jump to the next space in the target, marking the
    // skipped remainder as incorrect (standard typing-test behaviour).
    let i = this.cursor;
    while (i < this.target.length && !/^\s$/u.test(this.target[i])) {
      if (this.states[i] === CharState.Pending) this.states[i] = CharState.Incorrect;
      i++;
    }
    this._sample(this.cursor, expected, ' ', false, tick, KeyAction.WhitespaceAdvance);
    // Consume the following space too, if present.
    if (i < this.target.length && /^\s$/u.test(this.target[i])) {
      this.states[i] = CharState.Correct;
      i++;
    }
    this.cursor = i;
    return this._result(CharState.Incorrect, true, true, false);
  }

  // --- backspace ----------------------------------------------------------
  _backspace(tick) {
    if (!this.rules.allowBackspace) {
      return this._result(CharState.Pending, false, false, false);
    }
    // 1) Remove an extra at the current slot first.
    if (this.extras[this.cursor] && this.extras[this.cursor].length > 0) {
      this.extras[this.cursor].pop();
      this.extraCount = Math.max(0, this.extraCount - 1);
      this._sample(this.cursor, '', '', true, tick, KeyAction.Backspace);
      return this._result(CharState.Corrected, false, false, false);
    }
    // 2) Step the cursor back over a committed target.
    if (this.cursor > 0) {
      this.cursor--;
      const prev = this.states[this.cursor];
      this.states[this.cursor] =
        prev === CharState.Incorrect ? CharState.Corrected : CharState.Pending;
      this._sample(this.cursor, this.target[this.cursor], '', true, tick, KeyAction.Backspace);
      return this._result(CharState.Corrected, false, false, false);
    }
    // At the start — nothing to do.
    return this._result(CharState.Pending, false, false, false);
  }

  // --- helpers ------------------------------------------------------------
  _isWordBoundaryAt(index) {
    const next = this.target[index + 1];
    return next === undefined || /^\s$/u.test(next);
  }

  _sample(targetIndex, expected, typed, correct, tick, action) {
    const latency = this._lastTick == null ? 0 : Math.max(0, tick - this._lastTick);
    this.samples.push({
      ordinal: this.samples.length,
      targetIndex,
      expected,
      typed,
      correct,
      tick,
      latencyMs: latency,
      action,
    });
  }

  _result(outcome, advancedCursor, wordCompleted, runCompleted) {
    return {
      outcome,
      advancedCursor,
      wordCompleted,
      runCompleted,
      cursorIndex: this.cursor,
    };
  }

  /** Immutable-ish snapshot for the UI. §5.2 */
  snapshot() {
    return {
      target: this.target,
      states: this.states.slice(),
      extras: this.extras.map((e) => e.slice()),
      cursor: this.cursor,
      isComplete: this.isComplete,
    };
  }
}

/**
 * @typedef {Object} KeystrokeSample
 * @property {number} ordinal
 * @property {number} targetIndex
 * @property {string} expected
 * @property {string} typed
 * @property {boolean} correct
 * @property {number} tick
 * @property {number} latencyMs
 * @property {string} action
 */

/**
 * @typedef {Object} KeystrokeResult
 * @property {string} outcome
 * @property {boolean} advancedCursor
 * @property {boolean} wordCompleted
 * @property {boolean} runCompleted
 * @property {number} cursorIndex
 */
