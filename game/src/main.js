// Cadence — App entry / composition root. Mirrors ARCHITECTURE.md §16.1.
// Wires domain + application + UI. Web build of the portable core.

import './styles/app.css';
import { Modes, listModes } from './domain/modes.js';
import { KeyAction } from './domain/primitives.js';
import { perKeyStats } from './domain/scoring.js';
import { ACHIEVEMENTS, evaluate as evalAchievements } from './domain/achievements.js';
import { CURRICULUM, flatLessons, isUnlocked } from './domain/curriculum.js';
import { GameSession } from './app/session.js';
import { AudioEngine } from './app/audio.js';
import { Runs, PersonalBests, Settings, KeyModelStore, Achievements, CurriculumProgress } from './app/storage.js';
import { icon } from './ui/icons.js';
import { TypingSurface } from './ui/typing-surface.js';
import { renderResults } from './ui/results-view.js';
import { renderHeatmap } from './ui/heatmap.js';

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
}

// ---------------------------------------------------------------- rendering
function render() {
  if (state.screen === 'playing') return;
  let body = '';
  if (state.screen === 'results') body = resultsScreen();
  else if (state.screen === 'achievements') body = achievementsScreen();
  else if (state.screen === 'learn') body = learnScreen();
  else body = homeScreen();
  app.innerHTML = topbar() + body + footer();
  bindChrome();
  if (state.screen === 'home') bindHome();
  if (state.screen === 'results') bindResults();
  if (state.screen === 'learn') bindLearn();
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
      <button data-nav="home" class="${state.screen === 'home' ? 'active' : ''}">Play</button>
      <button data-nav="learn" class="${state.screen === 'learn' ? 'active' : ''}">Learn</button>
      <button data-nav="achievements" class="${state.screen === 'achievements' ? 'active' : ''}">Achievements</button>
    </nav>
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
      <button class="btn primary" data-act="start">${icon('play', 18)} Start</button>
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

function resultsScreen() {
  return renderResults(state.lastResult, state.lastPb, state.lastPerKey, state.lastNewAch, state.lastLessonPass);
}

function footer() {
  return `<div class="foot">Cadence v0.3.0 — web build of the portable domain core · vector icons only, no emoji</div>`;
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
  app.querySelector('[data-act="start"]').onclick = startRun;
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
function startRun(seed) {
  const mode = Modes[state.modeId];
  const opts = {
    seed,
    seconds: state.config.seconds,
    count: state.config.count,
    length: state.config.length,
    text: state.config.customText,
    weakKeys: new Set(KeyModelStore.weakestKeys(8)),
  };
  const plan = mode.createPlan(opts);
  state.session = new GameSession(plan);
  state.currentLesson = null;
  state.streak = 0;
  state.bestStreak = 0;
  state.screen = 'playing';
  renderPlaying(plan);
}

function renderPlaying(plan) {
  app.innerHTML =
    topbar() +
    `<div class="stage"><div id="surface"></div></div>
     <div class="hud" id="hud"></div>
     <div class="hints"><kbd>Esc</kbd> quit &nbsp; <kbd>Tab</kbd> then <kbd>Enter</kbd> restart</div>`;
  bindChrome();

  const surfaceEl = app.querySelector('#surface');
  state.surface = new TypingSurface(surfaceEl);
  state.surface.render(state.session.snapshot());

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
  render();
  if (pb.beaten) toast('New personal best', 'good');
  if (state.lastLessonPass?.passed) toast('Lesson cleared', 'good');
  newly.forEach((a, i) => setTimeout(() => toast(`Unlocked: ${a.title}`, 'good'), 300 * (i + 1)));
}

function quitToHome() {
  cancelAnimationFrame(state.raf);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onWindowBlur);
  state.screen = 'home';
  render();
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
