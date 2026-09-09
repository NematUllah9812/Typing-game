// Cadence — Curriculum tests. Mirrors ARCHITECTURE.md §7.1 / §21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, flatLessons, isUnlocked, generateLessonText } from '../src/domain/curriculum.js';
import { toGraphemes } from '../src/domain/primitives.js';

test('flatLessons returns all lessons with unit refs', () => {
  const all = flatLessons();
  assert.ok(all.length >= 10);
  assert.ok(all.every((l) => l.id && l.name && l.goal && l.unitId));
});

test('first lesson always unlocked; later locked until prior cleared', () => {
  const all = flatLessons();
  const cleared = new Set();
  assert.equal(isUnlocked(all[0].id, cleared), true);
  assert.equal(isUnlocked(all[1].id, cleared), false);
  cleared.add(all[0].id);
  assert.equal(isUnlocked(all[1].id, cleared), true);
});

test('home-row lesson text only uses its key set', () => {
  const lesson = CURRICULUM.units[0].lessons[0]; // asdf
  const text = generateLessonText(lesson, 42, []);
  const letters = text.replace(/[^a-z]/gi, '').toLowerCase();
  // small real words allowed contain only asdf? asdf has no vowels except a — SMALL_WORDS filter requires all letters in set
  for (const ch of letters) {
    assert.ok('asdf'.includes(ch), `unexpected char ${ch} in "${text}"`);
  }
});

test('lesson text is deterministic per seed', () => {
  const lesson = CURRICULUM.units[0].lessons[0];
  assert.equal(generateLessonText(lesson, 7, []), generateLessonText(lesson, 7, []));
  assert.notEqual(generateLessonText(lesson, 7, []), generateLessonText(lesson, 8, []));
});

test('number lesson produces digits', () => {
  const lesson = CURRICULUM.units.find((u) => u.id === 'numbers').lessons[0];
  const text = generateLessonText(lesson, 3, []);
  assert.ok(/[0-9]/.test(text));
});

test('lesson text is non-empty and has multiple words', () => {
  for (const l of flatLessons()) {
    const text = generateLessonText(l, 5, ['the', 'and', 'code', 'type', 'word', 'quick']);
    assert.ok(toGraphemes(text).length > 5);
    assert.ok(text.includes(' '));
  }
});
