// Cadence — Curriculum / lessons. Mirrors ARCHITECTURE.md §7.1.
// A structured course: home row -> top -> bottom -> numbers -> symbols ->
// capitals -> punctuation -> full text. Each lesson has a pass threshold that
// unlocks the next. Lesson text is generated deterministically from key sets.

import { makeRng } from './primitives.js';

/**
 * Lesson generators operate on a "key spec": a set of characters to drill.
 * A lesson generates pseudo-words from its key set so practice is focused but
 * still varied (never "jjj kkk"). Weighting keeps it readable.
 */
export const CURRICULUM = {
  id: 'en',
  units: [
    {
      id: 'home-row', title: 'Home Row',
      lessons: [
        { id: 'hr-asdf', name: 'a s d f', keys: 'asdf', goal: { wpm: 15, acc: 92 } },
        { id: 'hr-jkl', name: 'j k l ;', keys: 'jkl;', goal: { wpm: 15, acc: 92 } },
        { id: 'hr-all', name: 'home row', keys: 'asdfjkl;', goal: { wpm: 20, acc: 93 } },
        { id: 'hr-gh', name: 'g h', keys: 'asdfghjkl;', goal: { wpm: 22, acc: 93 } },
      ],
    },
    {
      id: 'top-row', title: 'Top Row',
      lessons: [
        { id: 'tr-qwer', name: 'q w e r t', keys: 'qwert', goal: { wpm: 20, acc: 92 } },
        { id: 'tr-yuiop', name: 'y u i o p', keys: 'yuiop', goal: { wpm: 20, acc: 92 } },
        { id: 'tr-mix', name: 'top + home', keys: 'asdfjkl;qwertyuiop', goal: { wpm: 25, acc: 93 } },
      ],
    },
    {
      id: 'bottom-row', title: 'Bottom Row',
      lessons: [
        { id: 'br-zxcv', name: 'z x c v b', keys: 'zxcvb', goal: { wpm: 20, acc: 92 } },
        { id: 'br-nm', name: 'n m', keys: 'nm', goal: { wpm: 20, acc: 92 } },
        { id: 'br-all', name: 'all letters', keys: 'abcdefghijklmnopqrstuvwxyz', goal: { wpm: 28, acc: 93 } },
      ],
    },
    {
      id: 'numbers', title: 'Numbers',
      lessons: [
        { id: 'num-row', name: 'number row', keys: '0123456789', goal: { wpm: 18, acc: 90 }, numbers: true },
      ],
    },
    {
      id: 'punctuation', title: 'Punctuation & Capitals',
      lessons: [
        { id: 'punct', name: 'punctuation', keys: 'abcdefghijklmnopqrstuvwxyz', goal: { wpm: 25, acc: 92 }, punctuation: true },
        { id: 'caps', name: 'capitals', keys: 'abcdefghijklmnopqrstuvwxyz', goal: { wpm: 25, acc: 92 }, capitals: true },
      ],
    },
    {
      id: 'fluency', title: 'Fluency',
      lessons: [
        { id: 'flow-1', name: 'full words', keys: 'words', goal: { wpm: 30, acc: 94 }, realWords: true },
        { id: 'flow-2', name: 'sentences', keys: 'words', goal: { wpm: 35, acc: 95 }, realWords: true, punctuation: true, capitals: true },
      ],
    },
  ],
};

/** Flat ordered list of lessons with a back-reference to their unit. */
export function flatLessons() {
  const out = [];
  for (const unit of CURRICULUM.units) {
    for (const lesson of unit.lessons) out.push({ ...lesson, unitId: unit.id, unitTitle: unit.title });
  }
  return out;
}

/** Is a lesson unlocked given the set of cleared lesson ids? First is always open. */
export function isUnlocked(lessonId, clearedIds) {
  const all = flatLessons();
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return clearedIds.has(all[idx - 1].id);
}

const SMALL_WORDS = ['and', 'the', 'a', 'to', 'is', 'it', 'in', 'of', 'we', 'he', 'she', 'do', 'go', 'so', 'no', 'on', 'at', 'as', 'by', 'up'];

/**
 * Generate lesson text from a lesson spec + seed.
 * @returns {string}
 */
export function generateLessonText(lesson, seed, realWordPool = []) {
  const rng = makeRng(seed || 1);
  const wordCount = 30;

  if (lesson.realWords && realWordPool.length) {
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      let w = realWordPool[Math.floor(rng() * realWordPool.length)];
      if (lesson.capitals && rng() < 0.25) w = w[0].toUpperCase() + w.slice(1);
      if (lesson.punctuation && rng() < 0.15) w += pick(rng, [',', '.', ';', '!']);
      words.push(w);
    }
    let t = words.join(' ');
    if (lesson.capitals) t = t[0].toUpperCase() + t.slice(1);
    return t;
  }

  // Synthesise pseudo-words from the key set.
  const keys = lesson.numbers ? lesson.keys : lesson.keys.replace(/[^a-z]/g, '') || 'asdf';
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    // Occasionally sprinkle a tiny real word for rhythm if its letters are in set.
    if (!lesson.numbers && rng() < 0.2) {
      const cand = SMALL_WORDS.find((w) => [...w].every((c) => keys.includes(c)) && rng() < 0.5);
      if (cand) { words.push(cand); continue; }
    }
    const len = 2 + Math.floor(rng() * 4);
    let w = '';
    for (let j = 0; j < len; j++) {
      let ch = lesson.numbers
        ? String(Math.floor(rng() * 10))
        : keys[Math.floor(rng() * keys.length)];
      if (lesson.capitals && rng() < 0.3) ch = ch.toUpperCase();
      w += ch;
    }
    if (lesson.punctuation && rng() < 0.15) w += pick(rng, [',', '.', ';']);
    words.push(w);
  }
  let text = words.join(' ');
  if (lesson.capitals) text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
