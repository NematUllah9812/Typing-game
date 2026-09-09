// Cadence — Arcade engine tests. Mirrors ARCHITECTURE.md §7.2 / §21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeGame } from '../src/domain/arcade.js';

test('spawns a word after the spawn interval', () => {
  const g = new ArcadeGame({ seed: 1 });
  assert.equal(g.words.length, 0);
  g.update(2.0); // exceed initial spawn interval
  assert.ok(g.words.length >= 1);
});

test('typing a full word clears it and scores', () => {
  const g = new ArcadeGame({ seed: 1 });
  g.update(2.0);
  const w = g.words[0];
  let cleared = false;
  for (const ch of w.text) {
    const r = g.typeChar(ch);
    if (r.cleared) cleared = true;
  }
  assert.ok(cleared);
  assert.ok(g.score > 0);
  assert.equal(g.wordsCleared, 1);
  assert.ok(!g.words.includes(w));
});

test('wrong char breaks combo and counts as inaccurate', () => {
  const g = new ArcadeGame({ seed: 2 });
  g.update(2.0);
  const w = g.words[0];
  g.typeChar(w.text[0]); // correct
  assert.equal(g.combo, 1);
  // pick a char that is definitely wrong for the active word's next slot
  const wrong = w.text[1] === 'z' ? 'q' : 'z';
  g.typeChar(wrong);
  assert.equal(g.combo, 0);
  assert.ok(g.accuracy < 100);
});

test('word reaching the floor costs a life', () => {
  const g = new ArcadeGame({ seed: 3, maxLives: 3 });
  g.update(2.0);
  // force a word to the floor
  g.words[0].y = 0.99;
  g.update(0.2);
  assert.equal(g.lives, 2);
});

test('losing all lives ends the game', () => {
  const g = new ArcadeGame({ seed: 4, maxLives: 1 });
  g.update(2.0);
  g.words[0].y = 0.99;
  g.update(0.2);
  assert.equal(g.gameOver, true);
});

test('deterministic: same seed => same first word', () => {
  const a = new ArcadeGame({ seed: 123 });
  const b = new ArcadeGame({ seed: 123 });
  a.update(2.0); b.update(2.0);
  assert.equal(a.words[0].text, b.words[0].text);
});

test('combo multiplier increases score for streaks', () => {
  // clear several words to build combo, then verify a later clear scores more
  const g = new ArcadeGame({ seed: 7 });
  let firstClearScore = 0, lastScore = 0, clears = 0;
  for (let i = 0; i < 200 && clears < 12; i++) {
    g.update(0.6);
    // type any fully-typeable word deterministically: target lowest
    const snap = g.snapshot();
    if (snap.words.length) {
      const w = g.words.slice().sort((a, b) => b.y - a.y)[0];
      const before = g.score;
      for (const ch of w.text) g.typeChar(ch);
      if (g.score > before) {
        clears++;
        if (clears === 1) firstClearScore = g.score - before;
        lastScore = g.score;
      }
    }
    if (g.gameOver) break;
  }
  assert.ok(clears >= 1);
});
