// Cadence — Game modes (data-driven). Mirrors ARCHITECTURE.md §7.
// Each mode supplies a RunPlan (target text + rules) and a finish decision.

import { generateWords, generateQuote } from './generator.js';
import { generateLessonText } from './curriculum.js';
import { words as wordPool } from './content.js';
import { randomSeed } from './primitives.js';

/**
 * @typedef {Object} RunPlan
 * @property {string} text
 * @property {object} rules        partial TypingRules
 * @property {number} seed
 * @property {string} modeId
 * @property {object} meta         mode-specific display info
 * @property {(ctx:FinishCtx)=>boolean} isFinished
 */

/**
 * @typedef {Object} FinishCtx
 * @property {number} elapsedMs
 * @property {number} wordsCompleted
 * @property {boolean} textComplete
 */

export const Modes = {
  timed: {
    id: 'timed',
    label: 'Timed Test',
    options: { seconds: [15, 30, 60, 120], default: 30 },
    createPlan(opts = {}) {
      const seconds = opts.seconds ?? this.options.default;
      const seed = opts.seed ?? randomSeed();
      // Generate generously; timer, not text length, ends the run.
      const text = generateWords(seed, Math.max(60, seconds * 3), {
        lang: opts.lang,
        weakKeys: opts.weakKeys,
      });
      return {
        text,
        rules: { allowBackspace: true, stopOnError: false },
        seed,
        modeId: 'timed',
        meta: { seconds, label: `timed · ${seconds}s` },
        limitMs: seconds * 1000,
        isFinished: (ctx) => ctx.elapsedMs >= seconds * 1000 || ctx.textComplete,
      };
    },
  },

  words: {
    id: 'words',
    label: 'Word Count',
    options: { counts: [10, 25, 50, 100], default: 25 },
    createPlan(opts = {}) {
      const count = opts.count ?? this.options.default;
      const seed = opts.seed ?? randomSeed();
      const text = generateWords(seed, count, { lang: opts.lang, weakKeys: opts.weakKeys });
      return {
        text,
        rules: { allowBackspace: true, stopOnError: false },
        seed,
        modeId: 'words',
        meta: { count, label: `${count} words` },
        limitMs: null,
        isFinished: (ctx) => ctx.textComplete,
      };
    },
  },

  quote: {
    id: 'quote',
    label: 'Quote',
    options: { lengths: ['short', 'medium', 'long'], default: 'medium' },
    createPlan(opts = {}) {
      const length = opts.length ?? this.options.default;
      const seed = opts.seed ?? randomSeed();
      const q = generateQuote(seed, { lang: opts.lang, length });
      return {
        text: q.text,
        rules: { allowBackspace: true, stopOnError: false },
        seed,
        modeId: 'quote',
        meta: { source: q.source, label: `quote · ${length}` },
        limitMs: null,
        isFinished: (ctx) => ctx.textComplete,
      };
    },
  },

  zen: {
    id: 'zen',
    label: 'Zen',
    options: {},
    createPlan(opts = {}) {
      const seed = opts.seed ?? randomSeed();
      const text = generateWords(seed, 80, { lang: opts.lang });
      return {
        text,
        rules: { allowBackspace: true, stopOnError: false },
        seed,
        modeId: 'zen',
        meta: { label: 'zen · endless' },
        limitMs: null,
        isFinished: () => false, // user ends it
      };
    },
  },

  lesson: {
    id: 'lesson',
    label: 'Lesson',
    options: {},
    createPlan(opts = {}) {
      const lesson = opts.lesson;
      const seed = opts.seed ?? randomSeed();
      const text = generateLessonText(lesson, seed, wordPool(opts.lang));
      return {
        text,
        rules: { allowBackspace: true, stopOnError: false },
        seed,
        modeId: 'lesson',
        meta: { label: `lesson · ${lesson.name}`, lessonId: lesson.id, goal: lesson.goal },
        limitMs: null,
        isFinished: (ctx) => ctx.textComplete,
      };
    },
  },

  custom: {
    id: 'custom',
    label: 'Custom Text',
    options: {},
    createPlan(opts = {}) {
      const text = (opts.text || '').trim() || 'type your own passage in settings';
      return {
        text,
        rules: { allowBackspace: true, stopOnError: false },
        seed: 0,
        modeId: 'custom',
        meta: { label: 'custom text' },
        limitMs: null,
        isFinished: (ctx) => ctx.textComplete,
      };
    },
  },
};

// Internal modes are not shown in the home mode-picker (reached via other UI).
const INTERNAL_MODES = new Set(['lesson']);

export function listModes() {
  return Object.values(Modes)
    .filter((m) => !INTERNAL_MODES.has(m.id))
    .map((m) => ({ id: m.id, label: m.label, options: m.options }));
}
