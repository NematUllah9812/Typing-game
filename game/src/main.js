// Cadence — App entry / composition root. Mirrors ARCHITECTURE.md §16.1.
// Wires domain + application + UI. Web build of the portable core.

import './styles/app.css';
import { Modes, listModes } from './domain/modes.js';
import { KeyAction } from './domain/primitives.js';
import { perKeyStats } from './domain/scoring.js';
import { GameSession } from './app/session.js';
import { AudioEngine } from './app/audio.js';
import { Runs, PersonalBests, Settings, KeyModelStore } from './app/storage.js';
import { icon } from './ui/icons.js';
import { TypingSurface } from './ui/typing-surface.js';
import { renderResults } from './ui/results-view.js';

const app = document.getElementById('app');
const audio = new AudioEngine();

// --- app state ---
const state = {
  screen: 'home', // home | playing | results
  modeId: 'timed',
  config: { seconds: 30, count: 25, length: 'medium' },
  session: null,
  surface: null,
  streak: 0,
  bestStreak: 0,
  raf: 0,
  lastResult: null,
  lastPb: null,
  settings: Settings.get(),
};

applySettings();

function applySettings() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
  audio.setEnabled(state.settings.sound);
}

// ---------------------------------------------------------------- rendering
function render() {
  if (state.screen === 'playing') return; // playing screen is managed imperatively
  app.innerHTML = topbar() + (state.screen === 'results' ? resultsScreen() : homeScreen()) + footer();
  bindChrome();
  if (state.screen === 'home') bindHome();
  if (state.screen === 'results') bindResults();
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
    <div class="topbar-actions">
      <button class="btn ghost icon-only" data-act="toggle-sound" title="Sound">${icon(state.settings.sound ? 'volume' : 'mute')}</button>
      <button class="btn ghost icon-only" data-act="cycle-theme" title="Theme">${icon('gear')}</button>
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
      <button class="btn primary" data-act="start">${icon('play', 18)} Start</button>
    </div>
  </section>
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

function resultsScreen() {
  return renderResults(state.lastResult, state.lastPb);
}

function footer() {
  return `<div class="foot">Cadence v0.1.0 — web build of the portable domain core · vector icons only, no emoji</div>`;
}

// ---------------------------------------------------------------- bindings
function bindChrome() {
  app.querySelector('[data-act="toggle-sound"]').onclick = () => {
    state.settings = Settings.set({ sound: !state.settings.sound });
    applySettings();
    render();
  };
  app.querySelector('[data-act="cycle-theme"]').onclick = () => {
    const order = ['graphite', 'paper', 'nord', 'contrast'];
    const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
    state.settings = Settings.set({ theme: next });
    applySettings();
    render();
    toast(`Theme: ${next}`);
  };
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
  app.querySelector('[data-act="start"]').onclick = startRun;
}

function bindResults() {
  app.querySelector('[data-act="retry"]').onclick = () => startRun(state.lastResult.seed);
  app.querySelector('[data-act="new"]').onclick = () => startRun();
  app.querySelector('[data-act="home"]').onclick = () => {
    state.screen = 'home';
    render();
  };
}

// ---------------------------------------------------------------- gameplay
function startRun(seed) {
  const mode = Modes[state.modeId];
  const opts = {
    seed,
    seconds: state.config.seconds,
    count: state.config.count,
    length: state.config.length,
    weakKeys: new Set(KeyModelStore.weakestKeys(8)),
  };
  const plan = mode.createPlan(opts);
  state.session = new GameSession(plan);
  state.streak = 0;
  state.bestStreak = 0;
  state.screen = 'playing';
  renderPlaying(plan);
}

function renderPlaying(plan) {
  app.innerHTML =
    topbar() +
    `<div class="stage">
       <div id="surface"></div>
     </div>
     <div class="hud" id="hud"></div>
     <div class="hints"><kbd>Esc</kbd> quit &nbsp; <kbd>Tab</kbd> then <kbd>Enter</kbd> restart</div>`;
  bindChrome();

  const surfaceEl = app.querySelector('#surface');
  state.surface = new TypingSurface(surfaceEl);
  state.surface.render(state.session.snapshot());
  state.surface.setBlurred(true);

  // capture keys on the whole document while playing
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onWindowBlur);

  state.session.on('finish', ({ result }) => onFinish(result));

  // click anywhere on the stage focuses (starts audio context)
  surfaceEl.onclick = () => audio._ensure();

  startLoop();
  updateHud();
  // focus so the browser routes keystrokes (and remove blur once started)
  surfaceEl.tabIndex = 0;
  surfaceEl.focus();
  state.surface.setBlurred(false);
}

let tabHeld = false;
function onKeyDown(e) {
  if (state.screen !== 'playing') return;
  const s = state.session;

  if (e.key === 'Escape') {
    e.preventDefault();
    quitToHome();
    return;
  }
  // Tab then Enter restarts
  if (e.key === 'Tab') {
    e.preventDefault();
    tabHeld = true;
    return;
  }
  if (e.key === 'Enter' && tabHeld) {
    e.preventDefault();
    tabHeld = false;
    startRun(s.plan.seed);
    return;
  }
  tabHeld = false;

  const now = performance.now();
  let res = null;

  if (e.key === 'Backspace') {
    e.preventDefault();
    res = s.input({ action: KeyAction.Backspace }, now);
  } else if (e.key === ' ') {
    e.preventDefault();
    res = s.input({ action: KeyAction.WhitespaceAdvance }, now);
  } else if (e.key === 'Enter') {
    // Enter acts as whitespace for quotes with line breaks; else ignore
    res = s.input({ action: KeyAction.WhitespaceAdvance }, now);
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    res = s.input({ text: e.key }, now);
  } else {
    return;
  }

  if (res) {
    // audio + streak
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
  // Pause semantics: focus loss stops the run's forward progress visually.
  if (state.screen === 'playing' && state.surface) state.surface.setBlurred(true);
}

function startLoop() {
  cancelAnimationFrame(state.raf);
  const step = () => {
    if (state.screen !== 'playing') return;
    const now = performance.now();
    state.session.tick(now); // let timed modes expire
    if (state.session.plan.limitMs) updateHud();
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
  KeyModelStore.ingest(perKeyStats(state.session.engine.samples));

  state.lastResult = result;
  state.lastPb = pb;
  state.screen = 'results';
  render();
  if (pb.beaten) toast('New personal best', 'good');
}

function quitToHome() {
  cancelAnimationFrame(state.raf);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onWindowBlur);
  state.screen = 'home';
  render();
}

// ---------------------------------------------------------------- toast
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

// ---------------------------------------------------------------- boot
render();
