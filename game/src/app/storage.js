// Cadence — Persistence adapter. Mirrors ARCHITECTURE.md §11 ports.
// The .NET target uses SQLite; the web build implements the same ports over
// localStorage so history / PBs / settings survive reloads.

const NS = 'cadence:v1';
const K = {
  runs: `${NS}:runs`,
  pbs: `${NS}:pbs`,
  settings: `${NS}:settings`,
  keymodel: `${NS}:keymodel`,
  achievements: `${NS}:achievements`,
  curriculum: `${NS}:curriculum`,
  arcade: `${NS}:arcade`,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage full / unavailable — degrade gracefully */
  }
}

/** IRunRepository */
export const Runs = {
  all() {
    return read(K.runs, []);
  },
  add(run) {
    const runs = read(K.runs, []);
    run.id = (runs.at(-1)?.id ?? 0) + 1;
    runs.push(run);
    // cap stored history to keep localStorage lean
    write(K.runs, runs.slice(-500));
    return run;
  },
  clear() {
    write(K.runs, []);
  },
};

/** IPersonalBestRepository — keyed by mode+config. */
export const PersonalBests = {
  all() {
    return read(K.pbs, {});
  },
  key(run) {
    const m = run.meta || {};
    const tag = m.seconds ?? m.count ?? m.source ?? m.label ?? '';
    return `${run.modeId}:${tag}`;
  },
  consider(run) {
    const pbs = read(K.pbs, {});
    const key = this.key(run);
    const prev = pbs[key];
    const beaten = !prev || run.netWpm > prev.netWpm;
    if (beaten) {
      pbs[key] = { netWpm: run.netWpm, accuracy: run.accuracy, at: run.startedUtc };
      write(K.pbs, pbs);
    }
    return { beaten, previous: prev || null };
  },
};

/** ISettingsStore */
export const Settings = {
  defaults: {
    theme: 'graphite',
    sound: true,
    caret: 'bar',
    reducedMotion: false,
  },
  get() {
    return { ...this.defaults, ...read(K.settings, {}) };
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    write(K.settings, next);
    return next;
  },
};

/** IKeyModelStore — persists rolling per-key stats. §6.4 */
export const KeyModelStore = {
  get() {
    return read(K.keymodel, { keys: {} });
  },
  ingest(perKey) {
    const model = read(K.keymodel, { keys: {} });
    const HALF = 5; // decay: recent runs dominate (EWMA-ish)
    const alpha = 1 - Math.pow(0.5, 1 / HALF);
    for (const k of perKey) {
      const prev = model.keys[k.key] || { accuracy: k.accuracy, latency: k.medianLatency, n: 0 };
      model.keys[k.key] = {
        accuracy: round1(prev.accuracy + alpha * (k.accuracy - prev.accuracy)),
        latency: Math.round(prev.latency + alpha * (k.medianLatency - prev.latency)),
        n: prev.n + k.samples,
      };
    }
    write(K.keymodel, model);
    return model;
  },
  weakestKeys(n = 10) {
    const model = read(K.keymodel, { keys: {} });
    return Object.entries(model.keys)
      .filter(([, v]) => v.n >= 3)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .slice(0, n)
      .map(([k]) => k);
  },
};

/** IAchievementRepository */
export const Achievements = {
  unlocked() {
    return new Set(read(K.achievements, []));
  },
  add(ids) {
    const set = this.unlocked();
    for (const id of ids) set.add(id);
    write(K.achievements, [...set]);
    return set;
  },
};

/** Curriculum progress — highest lesson index cleared per unit. §7.1 */
export const CurriculumProgress = {
  get() {
    return read(K.curriculum, { cleared: {} });
  },
  clear(lessonId, result) {
    const p = read(K.curriculum, { cleared: {} });
    const prev = p.cleared[lessonId];
    if (!prev || result.netWpm > prev.netWpm) {
      p.cleared[lessonId] = { netWpm: result.netWpm, accuracy: result.accuracy, at: result.startedUtc };
      write(K.curriculum, p);
    }
    return p;
  },
  isCleared(lessonId) {
    return !!read(K.curriculum, { cleared: {} }).cleared[lessonId];
  },
};

/** Arcade high scores per arcade mode. */
export const ArcadeScores = {
  all() {
    return read(K.arcade, {});
  },
  best(mode) {
    return read(K.arcade, {})[mode] || null;
  },
  consider(mode, entry) {
    const all = read(K.arcade, {});
    const prev = all[mode];
    const beaten = !prev || entry.score > prev.score;
    if (beaten) {
      all[mode] = entry;
      write(K.arcade, all);
    }
    return { beaten, previous: prev || null };
  },
};

function round1(n) {
  return Math.round(n * 10) / 10;
}
