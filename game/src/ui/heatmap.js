// Cadence — Keyboard heatmap (bespoke SVG). Mirrors ARCHITECTURE.md §14.3.
// Colours each key by accuracy from the current run's per-key stats.

import { QWERTY_ROWS, indexKeyStats } from '../domain/layout.js';

/**
 * @param {import('../domain/scoring.js').RunResult['perWord'] extends any ? any : any} perKey
 * perKey is the array from perKeyStats(): {key, accuracy, medianLatency, samples}
 */
export function renderHeatmap(perKey, mode = 'accuracy') {
  const stats = indexKeyStats(perKey);
  const keyW = 40, keyH = 40, gap = 6;
  const rowIndent = [0, 20, 50];
  const W = 10 * (keyW + gap) + 10;
  const H = QWERTY_ROWS.length * (keyH + gap) + 20;

  let keys = '';
  QWERTY_ROWS.forEach((row, r) => {
    row.forEach((k, i) => {
      const x = 5 + rowIndent[r] + i * (keyW + gap);
      const y = 8 + r * (keyH + gap);
      const s = stats.get(k);
      const { fill, text } = colorFor(s, mode);
      keys += `
        <g>
          <rect x="${x}" y="${y}" width="${keyW}" height="${keyH}" rx="6"
                fill="${fill}" stroke="var(--hair)" stroke-width="1"/>
          <text x="${x + keyW / 2}" y="${y + keyH / 2 + 5}" text-anchor="middle"
                font-family="var(--mono)" font-size="14" fill="${text}">${k.toUpperCase()}</text>
        </g>`;
    });
  });

  const legend = mode === 'accuracy'
    ? legendRow([['var(--good)', 'strong'], ['var(--warn)', 'watch'], ['var(--bad)', 'weak'], ['var(--raised)', 'untyped']])
    : legendRow([['var(--good)', 'fast'], ['var(--warn)', 'medium'], ['var(--bad)', 'slow'], ['var(--raised)', 'untyped']]);

  return `<svg viewBox="0 0 ${W} ${H + 26}" width="100%" role="img" aria-label="Per-key ${mode} heatmap">
    ${keys}
    ${legend(H + 4)}
  </svg>`;
}

function colorFor(s, mode) {
  if (!s || s.samples === 0) return { fill: 'var(--raised)', text: 'var(--dim)' };
  if (mode === 'accuracy') {
    const a = s.accuracy;
    if (a >= 97) return { fill: 'var(--good)', text: '#0d130f' };
    if (a >= 90) return { fill: 'var(--warn)', text: '#161206' };
    return { fill: 'var(--bad)', text: '#160b0b' };
  }
  // latency: lower is better
  const l = s.medianLatency;
  if (l > 0 && l <= 180) return { fill: 'var(--good)', text: '#0d130f' };
  if (l <= 320) return { fill: 'var(--warn)', text: '#161206' };
  return { fill: 'var(--bad)', text: '#160b0b' };
}

function legendRow(items) {
  return (y) => {
    let x = 5;
    let out = '';
    for (const [fill, label] of items) {
      out += `<rect x="${x}" y="${y}" width="14" height="14" rx="3" fill="${fill}" stroke="var(--hair)"/>`;
      out += `<text x="${x + 20}" y="${y + 11}" font-family="var(--mono)" font-size="11" fill="var(--dim)">${label}</text>`;
      x += 20 + label.length * 7 + 22;
    }
    return out;
  };
}
