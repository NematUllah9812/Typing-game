// Cadence — App entry / composition root. Mirrors ARCHITECTURE.md §16.1.
// Wires domain + application + UI. Web build of the portable core.

import './styles/app.css';
import { Modes, listModes } from './domain/modes.js';
import { KeyAction } from './domain/primitives.js';
import { perKeyStats } from './domain/scoring.js';
import { ACHIEVEMENTS, evaluate as evalAchievements } from './domain/achievements.js';
import { CURRICULUM, flatLessons, isUnlocked } from './domain/curriculum.js';
import { ArcadeGame } from './domain/arcade.js';
import { randomSeed } from './domain/primitives.js';
import { recordReplay, GhostPlayer } from './domain/replay.js';
import { GameSession } from './app/session.js';
import { AudioEngine } from './app/audio.js';
import { Runs, PersonalBests, Settings, KeyModelStore, Achievements, CurriculumProgress, ArcadeScores, Replays, DataOps } from './app/storage.js';
import { setLocale, availableLocales, t, currentLocale } from './app/i18n.js';
import { icon } from './ui/icons.js';
import { TypingSurface } from './ui/typing-surface.js';
import { renderResults } from './ui/results-view.js';
import { renderHeatmap } from './ui/heatmap.js';
import { ArcadeRenderer } from './ui/arcade-view.js';

const app = document.getElementById('app');
const audio = new AudioEngine();

const state = {
  screen: 'home', // home | playing | results | achievements
  modeId: 'timed',
  config: { seconds: 30, count: 25, length: 'medium', customText: '' },
  session: null,
  surface: null,
  streak: 0,
  bestStreak: 0,
  raf: 0,
  lastResult: null,
  lastPb: null,
  lastPerKey: [],
  lastNewAch: [],
  lastLesson: null,     // the lesson object if the finished run was a lesson
  lastLessonPass: null, // {passed, goal}
  settings: Settings.get(),
};

applySettings();

function applySettings() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
  audio.setEnabled(state.settings.sound);
  audio.setMasterVolume(state.settings.soundVolume ?? 0.25);
  setLocale(state.settings.language || 'en');
}

// ---------------------------------------------------------------- rendering
function render() {
  if (state.screen === 'playing') return;
  let body = '';
  if (state.screen === 'results') body = resultsScreen();
  else if (state.screen === 'achievements') body = achievementsScreen();
  else if (state.screen === 'learn') body = learnScreen();
  else if (state.screen === 'arcade') body = arcadeMenuScreen();
  else if (state.screen === 'arcade-over') body = arcadeOverScreen();
  else if (state.screen === 'stats') body = statsScreen();
  else if (state.screen === 'settings') body = settingsScreen();
  else body = homeScreen();
  app.innerHTML = topbar() + body + footer();
  bindChrome();
  if (state.screen === 'home') bindHome();
  if (state.screen === 'results') bindResults();
  if (state.screen === 'learn') bindLearn();
  if (state.screen === 'arcade') bindArcadeMenu();
  if (state.screen === 'arcade-over') bindArcadeOver();
  if (state.screen === 'settings') bindSettings();
}

function topbar() {
  const label = state.session ? state.session.plan.meta.label : modeLabel();
  return `
  <header class="topbar">
    <div class="brand">
      ${brandMark()}
      <span class="name">Cadence</span>
      <span class="mode-label">${label}</span>
    </div>
    <nav class="nav">
      <button data-nav="home" class="${state.screen === 'home' ? 'active' : ''}">${t('nav.play')}</button>
      <button data-nav="learn" class="${state.screen === 'learn' ? 'active' : ''}">${t('nav.learn')}</button>
      <button data-nav="arcade" class="${state.screen === 'arcade' || state.screen === 'arcade-over' ? 'active' : ''}">${t('nav.arcade')}</button>
      <button data-nav="stats" class="${state.screen === 'stats' ? 'active' : ''}">${t('nav.stats')}</button>
      <button data-nav="achievements" class="${state.screen === 'achievements' ? 'active' : ''}">${t('nav.achievements')}</button>
    </nav>
    <div class="topbar-actions">
      <button class="btn ghost icon-only" data-act="toggle-sound" title="Sound">${icon(state.settings.sound ? 'volume' : 'mute')}</button>
      <button class="btn ghost icon-only" data-nav="settings" title="Settings">${icon('gear')}</button>
    </div>
  </header>`;
}

function brandMark() {
  return `<svg width="26" height="26" viewBox="0 0 56 56" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 38 L23 18 L31 38" stroke="var(--strong)"/><path d="M18 31 L28 31" stroke="var(--strong)"/>
    <rect x="37" y="19" width="3.4" height="20" rx="1.4" fill="var(--accent)" stroke="none"/>
    <path d="M14 45 L42 45" stroke="var(--accent)"/></svg>`;
}

function modeLabel() {
  const m = Modes[state.modeId];
  if (state.modeId === 'timed') return `timed · ${state.config.seconds}s`;
  if (state.modeId === 'words') return `${state.config.count} words`;
  if (state.modeId === 'quote') return `quote · ${state.config.length}`;
  return m.label.toLowerCase();
}

function homeScreen() {
  const modeBtns = listModes()
    .map((m) => `<button class="seg-mode btn ${m.id === state.modeId ? 'primary' : ''}" data-mode="${m.id}">${modeIcon(m.id)} ${m.label}</button>`)
    .join('');

  const customPanel = state.modeId === 'custom'
    ? `<div class="panel" style="padding-top:0">
         <label style="font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)">Your text</label>
         <textarea id="custom-text" placeholder="Paste or type the passage you want to practise...">${escapeHtml(state.config.customText)}</textarea>
       </div>`
    : '';

  return `
  <section class="setup">
    <div class="group">
      <label>Mode</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${modeBtns}</div>
    </div>
    <div class="group">
      <label>Options</label>
      <div>${optionControls()}</div>
    </div>
    <div class="group" style="margin-left:auto">
      <label>&nbsp;</label>
      <div style="display:flex;gap:8px">
        ${ghostAvailable() ? `<button class="btn" data-act="ghost">${icon('ghost', 18)} Race ghost</button>` : ''}
        <button class="btn primary" data-act="start">${icon('play', 18)} Start</button>
      </div>
    </div>
  </section>
  ${customPanel}
  <div class="stage">
    <div style="text-align:center;color:var(--dim);font-family:var(--mono);max-width:560px">
      <div style="font-size:15px;line-height:1.7">Pick a mode and press Start. The clock begins on your first keystroke.
      Every run is measured for net WPM, accuracy and consistency, and feeds a per-key model that powers adaptive practice.</div>
    </div>
  </div>
  ${historyTable()}`;
}

function optionControls() {
  if (state.modeId === 'timed') {
    return seg(Modes.timed.options.seconds.map((s) => ({ v: s, label: `${s}s` })), state.config.seconds, 'seconds');
  }
  if (state.modeId === 'words') {
    return seg(Modes.words.options.counts.map((c) => ({ v: c, label: `${c}` })), state.config.count, 'count');
  }
  if (state.modeId === 'quote') {
    return seg(Modes.quote.options.lengths.map((l) => ({ v: l, label: l })), state.config.length, 'length');
  }
  return `<span style="color:var(--dim);font-family:var(--mono);font-size:13px">no options</span>`;
}

function seg(items, active, key) {
  return `<div class="seg" data-seg="${key}">${items
    .map((it) => `<button class="${it.v === active ? 'active' : ''}" data-val="${it.v}">${it.label}</button>`)
    .join('')}</div>`;
}

function modeIcon(id) {
  return icon({ timed: 'timer', words: 'words', quote: 'quote', zen: 'zen', custom: 'keyboard' }[id] || 'play', 16);
}

function historyTable() {
  const runs = Runs.all().slice(-8).reverse();
  if (!runs.length) return `<div class="history"><h3>History</h3><p style="color:var(--dim);font-family:var(--mono);font-size:13px">No runs yet — your results will appear here.</p></div>`;
  const rows = runs
    .map(
      (r) => `<tr>
      <td>${r.modeId}</td>
      <td class="num">${r.netWpm}</td>
      <td class="num">${r.accuracy}%</td>
      <td class="num">${r.consistency}</td>
      <td class="num">${(r.durationMs / 1000).toFixed(0)}s</td>
      <td style="color:var(--dim)">${new Date(r.startedUtc).toLocaleString()}</td>
    </tr>`
    )
    .join('');
  return `<div class="history"><h3>Recent runs</h3>
    <table class="runs"><thead><tr><th>Mode</th><th>Net WPM</th><th>Acc</th><th>Cons</th><th>Time</th><th>When</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function achievementsScreen() {
  const unlocked = Achievements.unlocked();
  const cards = ACHIEVEMENTS.map((a) => {
    const has = unlocked.has(a.id);
    return `<div class="ach-card ${has ? '' : 'locked'}">
      <span class="ach-ico">${icon(has ? a.icon : 'close', 22)}</span>
      <div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div>
    </div>`;
  }).join('');
  const count = unlocked.size;
  return `<div class="panel">
    <h2>Achievements <span style="color:var(--dim);font-family:var(--mono);font-size:14px">${count} / ${ACHIEVEMENTS.length}</span></h2>
    <div class="ach-grid">${cards}</div>
  </div>`;
}

function learnScreen() {
  const cleared = new Set(Object.keys(CurriculumProgress.get().cleared));
  const units = CURRICULUM.units.map((unit) => {
    const lessons = unit.lessons.map((lesson) => {
      const done = cleared.has(lesson.id);
      const open = isUnlocked(lesson.id, cleared);
      const cls = done ? 'cleared' : open ? '' : 'locked';
      const iconName = done ? 'check' : open ? 'play' : 'close';
      const best = CurriculumProgress.get().cleared[lesson.id];
      const bestLine = best ? `best ${best.netWpm} wpm · ${best.accuracy}%` : `goal ${lesson.goal.wpm} wpm · ${lesson.goal.acc}%`;
      return `<button class="lesson ${cls}" data-lesson="${lesson.id}" ${open ? '' : 'disabled'}>
        <div class="lname">${icon(iconName, 16)} ${lesson.name}</div>
        <div class="lgoal">${bestLine}</div>
      </button>`;
    }).join('');
    return `<div class="unit"><h3>${unit.title}</h3><div class="lessons">${lessons}</div></div>`;
  }).join('');

  const clearedCount = cleared.size;
  const total = flatLessons().length;
  return `<div class="units">
    <div><h2 style="color:var(--strong);margin:0">Curriculum <span style="color:var(--dim);font-family:var(--mono);font-size:14px">${clearedCount} / ${total} lessons</span></h2>
    <p style="color:var(--dim);font-family:var(--mono);font-size:13px;margin-top:6px">Clear a lesson by meeting its WPM and accuracy goal to unlock the next.</p></div>
    ${units}
  </div>`;
}

function arcadeMenuScreen() {
  const best = ArcadeScores.best('falling');
  const bestLine = best
    ? `Best: ${best.score} pts · wave ${best.wave} · ${best.wordsCleared} words`
    : 'No score yet — set the first one.';
  return `<div class="panel">
    <h2>Arcade</h2>
    <p style="color:var(--dim);font-family:var(--mono);font-size:13px;margin-top:-8px">Type the falling words before they reach the floor. Waves get faster. Combo raises your multiplier.</p>
    <div class="ach-grid" style="margin-top:16px">
      <div class="ach-card" style="flex-direction:column;align-items:flex-start;gap:10px;cursor:pointer" data-arcade="falling">
        <div class="ach-title" style="display:flex;align-items:center;gap:10px">${icon('wave', 22)} Falling Words</div>
        <div class="ach-desc">Clear descending words. Five lives. Endless waves.</div>
        <div class="lgoal" style="font-family:var(--mono);color:var(--accent)">${bestLine}</div>
        <button class="btn primary" data-arcade-start="falling">${icon('play', 18)} Play</button>
      </div>
    </div>
  </div>`;
}

function bindArcadeMenu() {
  app.querySelectorAll('[data-arcade-start]').forEach((b) => {
    b.onclick = () => startArcade(b.dataset.arcadeStart);
  });
}

function arcadeOverScreen() {
  const s = state.lastArcade;
  const pb = state.lastArcadePb;
  const pbBadge = pb?.beaten ? `<span class="pb-flag">${icon('trophy', 16)} new high score</span>` : '';
  return `<section class="results">
    <div class="headline">
      <div class="big tnum" style="color:var(--accent)">${s.score}<span class="u"> points</span></div>
      ${pbBadge}
    </div>
    <div class="sub-stats">
      <div class="s"><div class="v tnum">${s.wave}</div><div class="l">wave reached</div></div>
      <div class="s"><div class="v tnum">${s.wordsCleared}</div><div class="l">words cleared</div></div>
      <div class="s"><div class="v tnum">${s.bestCombo}</div><div class="l">best combo</div></div>
      <div class="s"><div class="v tnum">${s.accuracy}%</div><div class="l">accuracy</div></div>
      <div class="s"><div class="v tnum">${(s.elapsed).toFixed(0)}s</div><div class="l">survived</div></div>
    </div>
    <div class="actions">
      <button class="btn primary" data-act="again">${icon('restart', 18)} Play again</button>
      <button class="btn ghost" data-act="arcade-menu">${icon('home', 18)} Arcade menu</button>
    </div>
  </section>`;
}

function bindArcadeOver() {
  app.querySelector('[data-act="again"]').onclick = () => startArcade('falling');
  app.querySelector('[data-act="arcade-menu"]').onclick = () => { state.screen = 'arcade'; render(); };
}

function statsScreen() {
  const runs = Runs.all();
  if (!runs.length) {
    return `<div class="panel"><h2>${t('stats.title')}</h2>
      <p style="color:var(--dim);font-family:var(--mono);font-size:13px">No runs yet. Complete a run to build your statistics.</p></div>`;
  }
  const typing = runs.filter((r) => ['timed', 'words', 'quote', 'zen', 'custom', 'lesson'].includes(r.modeId));
  const avg = (arr, f) => arr.length ? Math.round((arr.reduce((a, b) => a + f(b), 0) / arr.length) * 10) / 10 : 0;
  const best = Math.max(...typing.map((r) => r.netWpm), 0);
  const avgWpm = avg(typing, (r) => r.netWpm);
  const avgAcc = avg(typing, (r) => r.accuracy);
  const totalChars = typing.reduce((a, b) => a + (b.charsTyped || 0), 0);
  const totalTime = typing.reduce((a, b) => a + (b.durationMs || 0), 0) / 60000;

  // wpm trend over last 20 runs (bespoke sparkline)
  const last = typing.slice(-20).map((r) => r.netWpm);
  const spark = sparkline(last);

  // weakest keys from the model
  const weak = KeyModelStore.weakestKeys(8);
  const weakChips = weak.length
    ? weak.map((k) => `<span class="chip-key">${k === ' ' ? 'space' : k}</span>`).join('')
    : '<span style="color:var(--dim);font-family:var(--mono);font-size:13px">not enough data yet</span>';

  return `<div class="panel">
    <h2>${t('stats.title')}</h2>
    <div class="sub-stats" style="margin-bottom:24px">
      <div class="s"><div class="v tnum">${best}</div><div class="l">best wpm</div></div>
      <div class="s"><div class="v tnum">${avgWpm}</div><div class="l">avg wpm</div></div>
      <div class="s"><div class="v tnum">${avgAcc}%</div><div class="l">avg accuracy</div></div>
      <div class="s"><div class="v tnum">${typing.length}</div><div class="l">runs</div></div>
      <div class="s"><div class="v tnum">${totalChars.toLocaleString()}</div><div class="l">chars typed</div></div>
      <div class="s"><div class="v tnum">${totalTime.toFixed(0)}m</div><div class="l">time typing</div></div>
    </div>
    <div class="chart-card"><h3>WPM trend (last ${last.length})</h3>${spark}</div>
    <div class="chart-card"><h3>Keys to practise</h3><div class="key-chips">${weakChips}</div></div>
  </div>`;
}

function sparkline(values) {
  if (values.length < 2) return `<div style="color:var(--dim);font-family:var(--mono);font-size:13px">Need more runs.</div>`;
  const W = 860, H = 120, pad = 10;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const x = (i) => pad + (i / (values.length - 1)) * (W - 2 * pad);
  const y = (v) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dots = values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="WPM trend">
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>${dots}</svg>`;
}

function settingsScreen() {
  const s = state.settings;
  const themes = [['graphite', 'Graphite'], ['paper', 'Paper'], ['nord', 'Nord'], ['contrast', 'High contrast']];
  const carets = [['bar', 'Bar'], ['block', 'Block'], ['underline', 'Underline']];
  const langs = availableLocales();
  return `<div class="panel">
    <h2>${t('settings.title')}</h2>

    <div class="setting-row">
      <label>${t('settings.theme')}</label>
      <div class="seg" data-set="theme">${themes.map(([v, l]) => `<button class="${s.theme === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('')}</div>
    </div>

    <div class="setting-row">
      <label>${t('settings.language')}</label>
      <div class="seg" data-set="language">${langs.map((l) => `<button class="${s.language === l ? 'active' : ''}" data-val="${l}">${l.toUpperCase()}</button>`).join('')}</div>
    </div>

    <div class="setting-row">
      <label>${t('settings.sound')}</label>
      <div class="seg" data-set="sound">
        <button class="${s.sound ? 'active' : ''}" data-val="on">${t('common.on')}</button>
        <button class="${!s.sound ? 'active' : ''}" data-val="off">${t('common.off')}</button>
      </div>
    </div>

    <div class="setting-row">
      <label>${t('settings.motion')}</label>
      <div class="seg" data-set="reducedMotion">
        <button class="${s.reducedMotion ? 'active' : ''}" data-val="on">${t('common.on')}</button>
        <button class="${!s.reducedMotion ? 'active' : ''}" data-val="off">${t('common.off')}</button>
      </div>
    </div>

    <div class="setting-row">
      <label>${t('settings.caret')}</label>
      <div class="seg" data-set="caret">${carets.map(([v, l]) => `<button class="${s.caret === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('')}</div>
    </div>

    <div class="setting-row">
      <label>${t('settings.data')}</label>
      <div style="display:flex;gap:8px">
        <button class="btn" data-act="export">${icon('chart', 16)} ${t('settings.exportData')}</button>
        <button class="btn ghost" data-act="clear">${icon('close', 16)} ${t('settings.clearData')}</button>
      </div>
    </div>
  </div>`;
}

function bindSettings() {
  app.querySelectorAll('[data-set]').forEach((seg) => {
    const key = seg.dataset.set;
    seg.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        let val = b.dataset.val;
        if (key === 'sound' || key === 'reducedMotion') val = val === 'on';
        state.settings = Settings.set({ [key]: val });
        applySettings();
        render();
      };
    });
  });
  const exp = app.querySelector('[data-act="export"]');
  if (exp) exp.onclick = () => {
    const blob = new Blob([JSON.stringify(DataOps.exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cadence-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported', 'good');
  };
  const clr = app.querySelector('[data-act="clear"]');
  if (clr) clr.onclick = () => {
    if (confirm('Clear all runs, bests, achievements and progress? This cannot be undone.')) {
      DataOps.clearAll();
      state.settings = Settings.get();
      applySettings();
      toast('All data cleared');
      render();
    }
  };
}

function resultsScreen() {
  return renderResults(state.lastResult, state.lastPb, state.lastPerKey, state.lastNewAch, state.lastLessonPass);
}

function footer() {
  return `<div class="foot">Cadence v1.0.0 — web build of the portable domain core · vector icons only, no emoji</div>`;
}

// ---------------------------------------------------------------- bindings
function bindChrome() {
  const snd = app.querySelector('[data-act="toggle-sound"]');
  if (snd) snd.onclick = () => {
    state.settings = Settings.set({ sound: !state.settings.sound });
    applySettings();
    render();
  };
  app.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => {
      state.screen = b.dataset.nav;
      render();
    };
  });
}

function bindHome() {
  app.querySelectorAll('.seg-mode').forEach((b) => {
    b.onclick = () => {
      state.modeId = b.dataset.mode;
      render();
    };
  });
  const segEl = app.querySelector('[data-seg]');
  if (segEl) {
    const key = segEl.dataset.seg;
    segEl.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        const raw = b.dataset.val;
        state.config[key] = key === 'length' ? raw : Number(raw);
        render();
      };
    });
  }
  const ta = app.querySelector('#custom-text');
  if (ta) ta.oninput = () => { state.config.customText = ta.value; };
  app.querySelector('[data-act="start"]').onclick = () => startRun();
  const ghostBtn = app.querySelector('[data-act="ghost"]');
  if (ghostBtn) ghostBtn.onclick = startGhostRace;
}

function ghostAvailable() {
  return ['timed', 'words', 'quote'].includes(state.modeId) && !!Replays.bestFor(state.modeId, currentMeta());
}

function bindLearn() {
  app.querySelectorAll('.lesson:not([disabled])').forEach((b) => {
    b.onclick = () => {
      const lesson = flatLessons().find((l) => l.id === b.dataset.lesson);
      if (lesson) startLesson(lesson);
    };
  });
}

function startLesson(lesson, seed) {
  const plan = Modes.lesson.createPlan({ lesson, seed, lang: 'en' });
  state.session = new GameSession(plan);
  state.modeId = 'lesson';
  state.currentLesson = lesson;
  state.streak = 0;
  state.bestStreak = 0;
  state.screen = 'playing';
  renderPlaying(plan);
}

function bindResults() {
  app.querySelector('[data-act="retry"]').onclick = () => {
    if (state.lastLesson) startLesson(state.lastLesson, state.lastResult.seed);
    else startRun(state.lastResult.seed);
  };
  app.querySelector('[data-act="new"]').onclick = () => {
    if (state.lastLesson) startLesson(state.lastLesson);
    else startRun();
  };
  app.querySelector('[data-act="home"]').onclick = () => {
    state.screen = state.lastLesson ? 'learn' : 'home';
    render();
  };
  // heatmap toggle
  const toggle = app.querySelector('[data-seg="heatmode"]');
  if (toggle) {
    toggle.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        toggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        const body = app.querySelector('#heatmap-body');
        if (body) body.innerHTML = renderHeatmap(state.lastPerKey, b.dataset.val);
      };
    });
  }
}

// ---------------------------------------------------------------- gameplay
function startRun(seed, ghostReplay = null) {
  const mode = Modes[state.modeId];
  // A ghost race must reuse the ghost's seed so the text matches exactly.
  const effectiveSeed = ghostReplay ? ghostReplay.seed : seed;
  const opts = {
    seed: effectiveSeed,
    seconds: state.config.seconds,
    count: state.config.count,
    length: state.config.length,
    text: state.config.customText,
    weakKeys: new Set(KeyModelStore.weakestKeys(8)),
  };
  const plan = mode.createPlan(opts);
  state.session = new GameSession(plan);
  state.currentLesson = null;
  state.ghost = ghostReplay ? new GhostPlayer(ghostReplay) : null;
  state.ghostReplay = ghostReplay;
  state.streak = 0;
  state.bestStreak = 0;
  state.screen = 'playing';
  renderPlaying(plan);
}

function startGhostRace() {
  const replay = Replays.bestFor(state.modeId, currentMeta());
  if (!replay) {
    toast('No ghost yet — finish a run first');
    return;
  }
  startRun(replay.seed, replay);
}

function currentMeta() {
  if (state.modeId === 'timed') return { seconds: state.config.seconds };
  if (state.modeId === 'words') return { count: state.config.count };
  if (state.modeId === 'quote') return { length: state.config.length };
  return {};
}

function renderPlaying(plan) {
  const ghostBanner = state.ghost
    ? `<span class="ghost-banner">${icon('ghost', 14)} racing your ghost · ${state.ghostReplay.netWpm} wpm</span>`
    : '';
  app.innerHTML =
    topbar() +
    `<div class="stage">
       <div style="text-align:center;min-height:20px">${ghostBanner}</div>
       <div id="surface"></div>
     </div>
     <div class="hud" id="hud"></div>
     <div class="hints">
       <kbd>Esc</kbd> quit &nbsp; <kbd>Tab</kbd> then <kbd>Enter</kbd> restart
       ${state.modeId === 'zen' ? ' &nbsp; <button class="btn" data-act="end-zen" style="padding:4px 12px">' + icon('check', 14) + ' End</button>' : ''}
     </div>`;
  bindChrome();

  const surfaceEl = app.querySelector('#surface');
  state.surface = new TypingSurface(surfaceEl);
  state.surface.setCaretStyle(state.settings.caret);
  state.surface.render(state.session.snapshot());
  if (state.ghost) state.surface.setGhost(0);
  const endBtn = app.querySelector('[data-act="end-zen"]');
  if (endBtn) endBtn.onclick = () => state.session.finish(performance.now());

  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onWindowBlur);
  state.session.on('finish', ({ result }) => onFinish(result));
  surfaceEl.onclick = () => audio._ensure();

  startLoop();
  updateHud();
  surfaceEl.tabIndex = 0;
  surfaceEl.focus();
  state.surface.setBlurred(false);
}

let tabHeld = false;
function onKeyDown(e) {
  if (state.screen !== 'playing') return;
  const s = state.session;

  if (e.key === 'Escape') { e.preventDefault(); quitToHome(); return; }
  if (e.key === 'Tab') { e.preventDefault(); tabHeld = true; return; }
  if (e.key === 'Enter' && tabHeld) { e.preventDefault(); tabHeld = false; startRun(s.plan.seed); return; }
  tabHeld = false;

  const now = performance.now();
  let res = null;

  if (e.key === 'Backspace') { e.preventDefault(); res = s.input({ action: KeyAction.Backspace }, now); }
  else if (e.key === ' ') { e.preventDefault(); res = s.input({ action: KeyAction.WhitespaceAdvance }, now); }
  else if (e.key === 'Enter') { res = s.input({ action: KeyAction.WhitespaceAdvance }, now); }
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); res = s.input({ text: e.key }, now); }
  else return;

  if (res) {
    if (res.outcome === 'correct') {
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      audio.play('correct');
    } else if (res.outcome === 'incorrect' || res.outcome === 'extra') {
      state.streak = 0;
      audio.play('error');
    }
    if (res.wordCompleted) audio.play('word', 0.6);
    if (res.runCompleted) audio.play('complete');
    state.surface.render(s.snapshot());
    updateHud();
  }
}

function onWindowBlur() {
  if (state.screen === 'playing' && state.surface) state.surface.setBlurred(true);
}

function startLoop() {
  cancelAnimationFrame(state.raf);
  const step = () => {
    if (state.screen !== 'playing') return;
    const now = performance.now();
    state.session.tick(now);
    if (state.session.plan.limitMs) updateHud();
    // animate ghost only once the run clock has started
    if (state.ghost && state.session.started) {
      const elapsed = state.session.elapsedMs(now);
      state.surface.setGhost(state.ghost.cursorAt(elapsed));
    }
    state.raf = requestAnimationFrame(step);
  };
  state.raf = requestAnimationFrame(step);
}

function updateHud() {
  const hud = app.querySelector('#hud');
  if (!hud) return;
  const s = state.session;
  const now = performance.now();
  const elapsed = s.elapsedMs(now);
  const partial = partialResult(s, elapsed);
  const remaining = s.remainingMs(now);

  const timeCell =
    remaining != null
      ? `<div class="stat time"><span class="val tnum">${(remaining / 1000).toFixed(0)}</span><span class="lab">left</span></div>`
      : `<div class="stat time"><span class="val tnum">${(elapsed / 1000).toFixed(0)}</span><span class="lab">sec</span></div>`;

  hud.innerHTML = `
    <div class="stat wpm"><span class="val tnum">${partial.wpm}</span><span class="lab">wpm</span></div>
    <div class="stat acc"><span class="val tnum">${partial.acc}%</span><span class="lab">acc</span></div>
    ${timeCell}
    <div class="stat streak"><span class="val tnum">${state.streak}</span><span class="lab">streak</span></div>`;
}

function partialResult(s, elapsed) {
  const samples = s.engine.samples.filter((x) => x.action !== KeyAction.Backspace);
  const correct = samples.filter((x) => x.correct).length;
  const total = samples.length;
  const minutes = Math.max(elapsed, 1) / 60000;
  return {
    wpm: Math.round(correct / 5 / minutes) || 0,
    acc: total ? Math.round((correct / total) * 100) : 100,
  };
}

function onFinish(result) {
  cancelAnimationFrame(state.raf);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onWindowBlur);

  result.bestStreak = state.bestStreak;
  Runs.add(result);
  const pb = PersonalBests.consider(result);
  const perKey = perKeyStats(state.session.engine.samples);
  KeyModelStore.ingest(perKey);

  // record a replay for ghost racing (best-per-mode). Skip zen/custom (no seed).
  if (['timed', 'words', 'quote'].includes(result.modeId) && result.charsTyped > 5) {
    const replay = recordReplay({
      modeId: result.modeId,
      seed: result.seed,
      meta: result.meta,
      samples: state.session.engine.samples,
      durationMs: result.durationMs,
      netWpm: result.netWpm,
      text: state.session.plan.text,
    });
    Replays.consider(replay);
  }

  // ghost race outcome
  state.lastGhostWin = null;
  if (state.ghostReplay) {
    state.lastGhostWin = result.netWpm >= state.ghostReplay.netWpm;
  }

  // achievements
  const ctx = {
    run: result,
    totalRuns: Runs.all().length,
    bestWpmEver: Math.max(...Runs.all().map((r) => r.netWpm), 0),
  };
  const newly = evalAchievements(ctx, Achievements.unlocked());
  if (newly.length) Achievements.add(newly.map((a) => a.id));

  // lesson pass/fail
  state.lastLesson = state.currentLesson;
  state.lastLessonPass = null;
  if (state.currentLesson) {
    const goal = state.currentLesson.goal;
    const passed = result.netWpm >= goal.wpm && result.accuracy >= goal.acc;
    state.lastLessonPass = { passed, goal };
    if (passed) CurriculumProgress.clear(state.currentLesson.id, result);
  }

  state.lastResult = result;
  state.lastPb = pb;
  state.lastPerKey = perKey;
  state.lastNewAch = newly;
  state.screen = 'results';
  const wasGhostRace = !!state.ghostReplay;
  const ghostWin = state.lastGhostWin;
  state.ghost = null;
  state.ghostReplay = null;
  render();
  if (pb.beaten) toast('New personal best', 'good');
  if (state.lastLessonPass?.passed) toast('Lesson cleared', 'good');
  if (wasGhostRace) toast(ghostWin ? 'You beat your ghost' : 'Ghost won this time', ghostWin ? 'good' : '');
  newly.forEach((a, i) => setTimeout(() => toast(`Unlocked: ${a.title}`, 'good'), 300 * (i + 1)));
}

function quitToHome() {
  cancelAnimationFrame(state.raf);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onWindowBlur);
  state.screen = 'home';
  render();
}

// ---------------------------------------------------------------- arcade
function startArcade(mode) {
  state.arcade = new ArcadeGame({ seed: randomSeed(), mode });
  state.arcadeMode = mode;
  state.screen = 'arcade-play';
  renderArcadePlaying();
}

function renderArcadePlaying() {
  app.innerHTML =
    topbar() +
    `<div class="arcade-stage">
       <canvas id="arcade-canvas"></canvas>
       <div class="arcade-hud" id="arcade-hud"></div>
     </div>
     <div class="hints"><kbd>Esc</kbd> quit &nbsp; type the falling words</div>`;
  bindChrome();

  const canvas = app.querySelector('#arcade-canvas');
  state.arcadeRenderer = new ArcadeRenderer(canvas);
  audio._ensure();

  document.addEventListener('keydown', onArcadeKey, true);
  window.addEventListener('resize', onArcadeResize);

  state.arcadeLastTs = performance.now();
  arcadeLoop();
}

function onArcadeResize() {
  if (state.arcadeRenderer) state.arcadeRenderer.resize();
}

function onArcadeKey(e) {
  if (state.screen !== 'arcade-play') return;
  if (e.key === 'Escape') { e.preventDefault(); endArcade(); return; }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const r = state.arcade.typeChar(e.key);
    if (r.cleared) audio.play('complete');
    else if (r.hit) audio.play('correct');
    else if (r.wrong) audio.play('error');
  }
}

function arcadeLoop() {
  if (state.screen !== 'arcade-play') return;
  const now = performance.now();
  let dt = (now - state.arcadeLastTs) / 1000;
  state.arcadeLastTs = now;
  dt = Math.min(dt, 0.05); // clamp to avoid huge steps after a stall

  state.arcade.update(dt);
  const snap = state.arcade.snapshot();
  state.arcadeRenderer.render(snap);
  updateArcadeHud(snap);

  if (snap.gameOver) { endArcade(); return; }
  state.raf = requestAnimationFrame(arcadeLoop);
}

function updateArcadeHud(snap) {
  const hud = app.querySelector('#arcade-hud');
  if (!hud) return;
  let pips = '';
  for (let i = 0; i < snap.maxLives; i++) {
    const filled = i < snap.lives;
    pips += `<span class="life-pip"><svg width="14" height="14" viewBox="0 0 24 24" fill="${filled ? 'var(--bad)' : 'none'}" stroke="var(--bad)" stroke-width="2"><circle cx="12" cy="12" r="7"/></svg></span>`;
  }
  hud.innerHTML = `
    <div class="stat"><span class="val tnum" style="color:var(--accent)">${snap.score}</span><span class="lab">score</span></div>
    <div class="stat"><span class="val tnum">W${snap.wave}</span><span class="lab">wave</span></div>
    <div class="stat"><span class="val tnum" style="color:var(--cool)">${snap.combo}x</span><span class="lab">combo</span></div>
    <div class="stat"><span class="val" style="display:inline-flex;gap:3px;align-items:center">${pips}</span><span class="lab">lives</span></div>`;
}

function endArcade() {
  cancelAnimationFrame(state.raf);
  document.removeEventListener('keydown', onArcadeKey, true);
  window.removeEventListener('resize', onArcadeResize);
  const snap = state.arcade.snapshot();
  snap.bestCombo = state.arcade.bestCombo;
  const entry = {
    score: snap.score, wave: snap.wave, wordsCleared: snap.wordsCleared,
    bestCombo: snap.bestCombo, accuracy: snap.accuracy, at: new Date().toISOString(),
  };
  const pb = ArcadeScores.consider(state.arcadeMode, entry);
  state.lastArcade = snap;
  state.lastArcadePb = pb;
  state.screen = 'arcade-over';
  render();
  if (pb.beaten) toast('New high score', 'good');
}

// ---------------------------------------------------------------- helpers
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function toast(msg, kind = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = `${icon(kind === 'good' ? 'check' : 'info', 16)} <span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

render();
