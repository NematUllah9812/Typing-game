// Cadence — Scoring & metrics (pure functions). Mirrors ARCHITECTURE.md §6.
// A "word" is standardised as 5 characters (industry convention).

import { KeyAction } from './primitives.js';

const CHARS_PER_WORD = 5;

/**
 * Compute a full RunResult from the engine's keystroke samples.
 * @param {import('./typing-engine.js').KeystrokeSample[]} samples
 * @param {number} elapsedMs  measured run duration
 * @returns {RunResult}
 */
export function computeResult(samples, elapsedMs) {
  const minutes = Math.max(elapsedMs, 1) / 60000;

  const typeStrokes = samples.filter(
    (s) => s.action === KeyAction.Type || s.action === KeyAction.WhitespaceAdvance
  );

  const correctChars = typeStrokes.filter((s) => s.correct).length;
  const totalTyped = typeStrokes.length;
  const errors = typeStrokes.filter((s) => !s.correct).length;
  const corrected = samples.filter((s) => s.action === KeyAction.Backspace).length;

  const netWpm = round1(correctChars / CHARS_PER_WORD / minutes);
  const rawWpm = round1(totalTyped / CHARS_PER_WORD / minutes);
  const accuracy = totalTyped === 0 ? 0 : round1((correctChars / totalTyped) * 100);

  const perWord = perWordWpm(typeStrokes);
  const consistency = consistencyFromSeries(perWord.map((w) => w.wpm));

  return {
    netWpm,
    rawWpm,
    accuracy,
    consistency,
    errors,
    corrected,
    charsTyped: totalTyped,
    correctChars,
    durationMs: Math.round(elapsedMs),
    perWord,
  };
}

/** Per-word WPM series, computed at each word boundary. §6.1 */
export function perWordWpm(typeStrokes) {
  const words = [];
  let wordChars = 0;
  let correctInWord = 0;
  let wordStartTick = null;

  for (const s of typeStrokes) {
    if (wordStartTick == null) wordStartTick = s.tick;
    const isSpace = s.action === KeyAction.WhitespaceAdvance;
    if (!isSpace) {
      wordChars++;
      if (s.correct) correctInWord++;
    }
    if (isSpace) {
      const dtMin = Math.max(s.tick - wordStartTick, 1) / 60000;
      if (wordChars > 0) {
        words.push({
          wpm: round1(correctInWord / CHARS_PER_WORD / dtMin),
          chars: wordChars,
          correct: correctInWord,
        });
      }
      wordChars = 0;
      correctInWord = 0;
      wordStartTick = s.tick;
    }
  }
  // Trailing word (no closing space).
  if (wordChars > 0 && wordStartTick != null) {
    const lastTick = typeStrokes[typeStrokes.length - 1].tick;
    const dtMin = Math.max(lastTick - wordStartTick, 1) / 60000;
    words.push({
      wpm: round1(correctInWord / CHARS_PER_WORD / dtMin),
      chars: wordChars,
      correct: correctInWord,
    });
  }
  return words;
}

/** Consistency = 100 * (1 - CV), clamped to [0,100]. §6.3 */
export function consistencyFromSeries(series) {
  const vals = series.filter((v) => Number.isFinite(v) && v > 0);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return 0;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const cv = Math.sqrt(variance) / mean;
  return clamp(round1(100 * (1 - cv)), 0, 100);
}

/** Per-key accuracy + median latency aggregation. §6.4 */
export function perKeyStats(samples) {
  const map = new Map();
  for (const s of samples) {
    if (s.action !== KeyAction.Type) continue;
    const key = (s.expected || s.typed || '').toLowerCase();
    if (!key || /^\s$/u.test(key)) continue;
    if (!map.has(key)) map.set(key, { key, total: 0, correct: 0, latencies: [] });
    const e = map.get(key);
    e.total++;
    if (s.correct) e.correct++;
    if (s.latencyMs > 0) e.latencies.push(s.latencyMs);
  }
  const out = [];
  for (const e of map.values()) {
    out.push({
      key: e.key,
      accuracy: e.total ? round1((e.correct / e.total) * 100) : 100,
      medianLatency: median(e.latencies),
      samples: e.total,
    });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy);
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
function round1(n) {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * @typedef {Object} RunResult
 * @property {number} netWpm
 * @property {number} rawWpm
 * @property {number} accuracy
 * @property {number} consistency
 * @property {number} errors
 * @property {number} corrected
 * @property {number} charsTyped
 * @property {number} correctChars
 * @property {number} durationMs
 * @property {{wpm:number,chars:number,correct:number}[]} perWord
 */
