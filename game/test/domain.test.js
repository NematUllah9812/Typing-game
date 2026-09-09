// Cadence — Domain unit tests. Mirrors ARCHITECTURE.md §21.
// Run with: node --test test/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TypingEngine } from '../src/domain/typing-engine.js';
import { KeyAction, toGraphemes, makeRng } from '../src/domain/primitives.js';
import { computeResult, consistencyFromSeries } from '../src/domain/scoring.js';
import { generateWords } from '../src/domain/generator.js';

// helper to type a string char-by-char with 100ms spacing
function typeString(engine, str, startTick = 0, step = 100) {
  let tick = startTick;
  for (const g of toGraphemes(str)) {
    tick += step;
    if (/^\s$/u.test(g)) engine.process({ action: KeyAction.WhitespaceAdvance }, tick);
    else engine.process({ text: g }, tick);
  }
  return tick;
}

test('grapheme split handles accents and combining marks', () => {
  assert.equal(toGraphemes('café').length, 4);
  assert.equal(toGraphemes('a\u0301').length, 1); // a + combining acute = 1 grapheme
});

test('perfect run: all correct, cursor consumes target, marked complete', () => {
  const e = new TypingEngine('the fox');
  typeString(e, 'the fox');
  const snap = e.snapshot();
  assert.equal(snap.isComplete, true);
  assert.ok(snap.states.every((s) => s === 'correct'));
});

test('incorrect char is flagged and does not equal expected', () => {
  const e = new TypingEngine('cat');
  e.process({ text: 'c' }, 100);
  e.process({ text: 'x' }, 200); // wrong (expected a)
  const snap = e.snapshot();
  assert.equal(snap.states[0], 'correct');
  assert.equal(snap.states[1], 'incorrect');
  assert.equal(snap.cursor, 2);
});

test('backspace steps back and marks corrected', () => {
  const e = new TypingEngine('cat');
  e.process({ text: 'c' }, 100);
  e.process({ text: 'x' }, 200); // wrong
  e.process({ action: KeyAction.Backspace }, 300);
  const snap = e.snapshot();
  assert.equal(snap.cursor, 1);
  // Per ARCHITECTURE.md §5.3: backspacing a previously-incorrect slot marks it
  // 'corrected' (distinct from an untouched 'pending' slot).
  assert.equal(snap.states[1], 'corrected');
});

test('backspace at start does nothing', () => {
  const e = new TypingEngine('cat');
  const r = e.process({ action: KeyAction.Backspace }, 100);
  assert.equal(r.cursorIndex, 0);
});

test('extras beyond word are bounded by maxExtras', () => {
  const e = new TypingEngine('hi', { maxExtras: 3 });
  typeString(e, 'hi'); // completes
  // now type extras past the end
  let tick = 1000;
  for (let i = 0; i < 10; i++) {
    tick += 50;
    e.process({ text: 'z' }, tick);
  }
  assert.ok(e.extraCount <= 3);
});

test('stopOnError blocks advance until corrected', () => {
  const e = new TypingEngine('ab', { stopOnError: true });
  e.process({ text: 'x' }, 100); // wrong, should not advance
  assert.equal(e.snapshot().cursor, 0);
  e.process({ text: 'a' }, 200); // correct now advances
  assert.equal(e.snapshot().cursor, 1);
});

test('confidence mode disables backspace', () => {
  const e = new TypingEngine('ab', { allowBackspace: false });
  e.process({ text: 'a' }, 100);
  e.process({ action: KeyAction.Backspace }, 200);
  assert.equal(e.snapshot().cursor, 1); // did not move back
});

test('scoring: known values (25 chars in 60s => 5 net wpm at 100% acc)', () => {
  const e = new TypingEngine('aaaa aaaa aaaa aaaa aaaa'); // 24 letters + 4 spaces
  // type it all correctly across exactly 60s
  const text = 'aaaa aaaa aaaa aaaa aaaa';
  const n = toGraphemes(text).length;
  const step = 60000 / n;
  typeString(e, text, 0, step);
  const res = computeResult(e.samples, 60000);
  assert.equal(res.accuracy, 100);
  // 24 correct chars / 5 chars-per-word / 1 minute = 4.8 net wpm (exact).
  assert.ok(res.netWpm >= 4.5 && res.netWpm <= 5.0);
});

test('scoring: accuracy counts errors correctly', () => {
  const e = new TypingEngine('abcd');
  e.process({ text: 'a' }, 100);
  e.process({ text: 'x' }, 200); // wrong
  e.process({ text: 'c' }, 300);
  e.process({ text: 'd' }, 400);
  const res = computeResult(e.samples, 400);
  assert.equal(res.errors, 1);
  assert.equal(res.correctChars, 3);
  assert.equal(res.accuracy, 75);
});

test('consistency: identical speeds => 100, no data => 0', () => {
  assert.equal(consistencyFromSeries([50, 50, 50, 50]), 100);
  assert.equal(consistencyFromSeries([]), 0);
  assert.ok(consistencyFromSeries([10, 90, 20, 80]) < 60);
});

test('generator is deterministic for a given seed (replay-exact)', () => {
  const a = generateWords(12345, 30);
  const b = generateWords(12345, 30);
  const c = generateWords(99999, 30);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('rng is deterministic', () => {
  const r1 = makeRng(7);
  const r2 = makeRng(7);
  assert.equal(r1(), r2());
  assert.equal(r1(), r2());
});

test('run completes exactly when last grapheme typed', () => {
  const e = new TypingEngine('go');
  let r = e.process({ text: 'g' }, 100);
  assert.equal(r.runCompleted, false);
  r = e.process({ text: 'o' }, 200);
  assert.equal(r.runCompleted, true);
});
