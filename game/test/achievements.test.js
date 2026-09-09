// Cadence — Achievements tests. Mirrors ARCHITECTURE.md §21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, ACHIEVEMENTS } from '../src/domain/achievements.js';

const base = { netWpm: 0, accuracy: 100, consistency: 0, errors: 0, charsTyped: 0, durationMs: 0, modeId: 'timed', bestStreak: 0 };

test('first run unlocks first-run', () => {
  const newly = evaluate({ run: { ...base, charsTyped: 30 }, totalRuns: 1, bestWpmEver: 0 }, new Set());
  assert.ok(newly.some((a) => a.id === 'first-run'));
});

test('60 wpm unlocks wpm-40 and wpm-60 but not wpm-80', () => {
  const newly = evaluate({ run: { ...base, netWpm: 65, charsTyped: 100 }, totalRuns: 3, bestWpmEver: 65 }, new Set());
  const ids = newly.map((a) => a.id);
  assert.ok(ids.includes('wpm-40'));
  assert.ok(ids.includes('wpm-60'));
  assert.ok(!ids.includes('wpm-80'));
});

test('already-unlocked achievements are not re-returned', () => {
  const unlocked = new Set(['first-run']);
  const newly = evaluate({ run: { ...base, charsTyped: 30 }, totalRuns: 5, bestWpmEver: 0 }, unlocked);
  assert.ok(!newly.some((a) => a.id === 'first-run'));
});

test('flawless requires 100% accuracy and enough chars', () => {
  const a = evaluate({ run: { ...base, accuracy: 100, charsTyped: 30 }, totalRuns: 1, bestWpmEver: 0 }, new Set());
  assert.ok(a.some((x) => x.id === 'flawless'));
  const b = evaluate({ run: { ...base, accuracy: 100, charsTyped: 5 }, totalRuns: 1, bestWpmEver: 0 }, new Set());
  assert.ok(!b.some((x) => x.id === 'flawless'));
});

test('every achievement has required fields', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.title && a.desc && a.icon && typeof a.test === 'function');
  }
});
