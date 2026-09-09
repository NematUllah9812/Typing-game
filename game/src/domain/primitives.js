// Cadence — Domain primitives (pure, no DOM/IO). Mirrors ARCHITECTURE.md §5.1.

/** Per-target character state. */
export const CharState = Object.freeze({
  Pending: 'pending',
  Correct: 'correct',
  Incorrect: 'incorrect',
  Extra: 'extra',
  Corrected: 'corrected',
});

/** The action a keystroke represents. */
export const KeyAction = Object.freeze({
  Type: 'type',
  Backspace: 'backspace',
  WhitespaceAdvance: 'whitespace',
  Undo: 'undo',
});

/**
 * Split a string into grapheme clusters (user-perceived characters).
 * Uses Intl.Segmenter when available (handles accents, combining marks, CJK,
 * ZWJ), with a code-point fallback. See ARCHITECTURE.md §5.1.
 * @param {string} text
 * @returns {string[]}
 */
export function toGraphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  // Fallback: split by code points (still better than UTF-16 units).
  return Array.from(text);
}

/** A seeded, deterministic PRNG (mulberry32). Replaces IRandomSource. §5.5 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random 32-bit seed (only used when a caller wants a fresh run). */
export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
