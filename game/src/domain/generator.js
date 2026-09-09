// Cadence — TextGenerator (pure, seeded). Mirrors ARCHITECTURE.md §5.5 / §6.5.
// Given a seed, always produces the same text (enables replay & sharing).

import { makeRng } from './primitives.js';
import { words, quotes } from './content.js';

/**
 * Generate a stream of random words.
 * @param {number} seed
 * @param {number} count
 * @param {object} [opts] { lang, punctuation, numbers, weakKeys }
 * @returns {string}
 */
export function generateWords(seed, count, opts = {}) {
  const { lang = 'en', punctuation = false, numbers = false, weakKeys = null } = opts;
  const rng = makeRng(seed);
  const pool = words(lang);

  const pick = () => {
    // Adaptive weak-key bias: over-sample words containing weak keys (§6.5),
    // capped so text stays readable.
    if (weakKeys && weakKeys.size > 0 && rng() < 0.4) {
      for (let tries = 0; tries < 6; tries++) {
        const w = pool[Math.floor(rng() * pool.length)];
        if ([...w].some((c) => weakKeys.has(c))) return w;
      }
    }
    return pool[Math.floor(rng() * pool.length)];
  };

  const out = [];
  for (let i = 0; i < count; i++) {
    let w = pick();
    if (numbers && rng() < 0.12) {
      w = String(Math.floor(rng() * 1000));
    }
    if (punctuation && rng() < 0.15) {
      w += pickFrom(rng, [',', '.', ';', '!', '?']);
    }
    out.push(w);
  }
  let text = out.join(' ');
  if (punctuation) text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

/** Deterministically pick a quote by seed. */
export function generateQuote(seed, opts = {}) {
  const { lang = 'en', length = null } = opts;
  const rng = makeRng(seed);
  const pool = quotes(lang, length);
  const q = pool[Math.floor(rng() * pool.length)];
  return { text: q.text, source: q.source, id: q.id };
}

function pickFrom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
