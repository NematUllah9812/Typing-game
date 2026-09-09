// Cadence — Results view + bespoke SVG line chart. Mirrors ARCHITECTURE.md §14.3.
// No third-party chart library (§9.5) — the per-word chart is drawn by hand.

import { icon } from './icons.js';
import { renderHeatmap } from './heatmap.js';

export function renderResults(result, pbInfo, perKey = [], newAchievements = []) {
  const chart = perWordChart(result.perWord);
  const pbBadge = pbInfo?.beaten
    ? `<span class="pb-flag">${icon('trophy', 16)} new personal best</span>`
    : '';

  const heatmap = perKey.length
    ? `<div class="chart-card">
         <div class="card-head">
           <h3>Key accuracy heatmap</h3>
           <div class="seg heatmap-toggle" data-seg="heatmode">
             <button class="active" data-val="accuracy">accuracy</button>
             <button data-val="latency">speed</button>
           </div>
         </div>
         <div id="heatmap-body">${renderHeatmap(perKey, 'accuracy')}</div>
       </div>`
    : '';

  const achievements = newAchievements.length
    ? `<div class="chart-card">
         <h3>Achievements unlocked</h3>
         <div class="ach-row">
           ${newAchievements.map((a) => `
             <div class="ach-badge">
               <span class="ach-ico">${icon(a.icon, 22)}</span>
               <div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div>
             </div>`).join('')}
         </div>
       </div>`
    : '';

  return `
  <section class="results">
    <div class="headline">
      <div class="big tnum">${result.netWpm}<span class="u"> wpm net</span></div>
      ${pbBadge}
    </div>
    <div class="sub-stats">
      <div class="s"><div class="v tnum">${result.rawWpm}</div><div class="l">raw wpm</div></div>
      <div class="s"><div class="v tnum">${result.accuracy}%</div><div class="l">accuracy</div></div>
      <div class="s"><div class="v tnum">${result.consistency}</div><div class="l">consistency</div></div>
      <div class="s"><div class="v tnum">${result.errors}</div><div class="l">errors</div></div>
      <div class="s"><div class="v tnum">${(result.durationMs / 1000).toFixed(1)}s</div><div class="l">time</div></div>
    </div>

    ${achievements}

    <div class="chart-card">
      <h3>Per-word WPM</h3>
      ${chart}
    </div>

    ${heatmap}

    <div class="actions">
      <button class="btn primary" data-act="retry">${icon('restart', 18)} Retry (same text)</button>
      <button class="btn" data-act="new">${icon('next', 18)} New run</button>
      <button class="btn ghost" data-act="home">${icon('home', 18)} Home</button>
    </div>
  </section>`;
}

function perWordChart(perWord) {
  const W = 860, H = 220, padL = 40, padB = 28, padT = 16, padR = 12;
  if (!perWord.length) {
    return `<div style="color:var(--dim);font-family:var(--mono);font-size:13px">Not enough data for a chart.</div>`;
  }
  const vals = perWord.map((w) => w.wpm);
  const max = Math.max(...vals, 10);
  const min = 0;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const x = (i) => padL + (perWord.length === 1 ? iw / 2 : (i / (perWord.length - 1)) * iw);
  const y = (v) => padT + ih - ((v - min) / (max - min)) * ih;

  const line = perWord.map((w, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(w.wpm).toFixed(1)}`).join(' ');
  const dots = perWord
    .map((w, i) => {
      const bad = w.correct < w.chars;
      return `<circle cx="${x(i).toFixed(1)}" cy="${y(w.wpm).toFixed(1)}" r="${bad ? 3.5 : 2.5}" fill="${bad ? 'var(--bad)' : 'var(--good)'}"/>`;
    })
    .join('');

  // gridlines
  const ticks = 4;
  let grid = '';
  for (let t = 0; t <= ticks; t++) {
    const v = (max / ticks) * t;
    const gy = y(v).toFixed(1);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--hair)" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${Number(gy) + 4}" text-anchor="end" fill="var(--dim)" font-family="var(--mono)" font-size="10">${Math.round(v)}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Per-word words-per-minute chart">
    ${grid}
    <path d="${line}" fill="none" stroke="var(--good)" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}
