// Cadence — Replay & ghost tests. Mirrors ARCHITECTURE.md §18 / §21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TypingEngine } from '../src/domain/typing-engine.js';
import { KeyAction, toGraphemes } from '../src/domain/primitives.js';
import { recordReplay, GhostPlayer } from '../src/domain/replay.js';

function playRun(text, step = 100) {
  const e = new TypingEngine(text);
  let tick = 0;
  for (const g of toGraphemes(text)) {
    tick += step;
    if (/^\s$/u.test(g)) e.process({ action: KeyAction.WhitespaceAdvance }, tick);
    else e.process({ text: g }, tick);
  }
  return { engine: e, durationMs: tick };
}

test('replay records one event per keystroke', () => {
  const { engine, durationMs } = playRun('the fox');
  const replay = recordReplay({ modeId: 'words', seed: 5, meta: {}, samples: engine.samples, durationMs, netWpm: 40, text: 'the fox' });
  assert.equal(replay.events.length, engine.samples.length);
  assert.equal(replay.seed, 5);
});

test('ghost cursor advances monotonically over time', () => {
  const { engine, durationMs } = playRun('hello world');
  const replay = recordReplay({ modeId: 'words', seed: 1, meta: {}, samples: engine.samples, durationMs, netWpm: 30, text: 'hello world' });
  const ghost = new GhostPlayer(replay);
  let last = -1;
  for (let t = 0; t <= durationMs; t += 50) {
    const c = ghost.cursorAt(t);
    assert.ok(c >= last, `cursor went backwards at t=${t}`);
    last = c;
  }
});

test('ghost reaches final cursor by end of run', () => {
  const text = 'quick brown fox';
  const { engine, durationMs } = playRun(text);
  const replay = recordReplay({ modeId: 'words', seed: 2, meta: {}, samples: engine.samples, durationMs, netWpm: 35, text });
  const ghost = new GhostPlayer(replay);
  assert.equal(ghost.cursorAt(durationMs + 1000), toGraphemes(text).length);
});

test('ghost at t=0 is at start', () => {
  const { engine, durationMs } = playRun('abc');
  const replay = recordReplay({ modeId: 'words', seed: 3, meta: {}, samples: engine.samples, durationMs, netWpm: 20, text: 'abc' });
  const ghost = new GhostPlayer(replay);
  assert.equal(ghost.cursorAt(0), 0);
});

test('backspaces reduce ghost cursor in the timeline', () => {
  const e = new TypingEngine('cat');
  e.process({ text: 'c' }, 100);
  e.process({ text: 'x' }, 200); // wrong -> cursor 2
  e.process({ action: KeyAction.Backspace }, 300); // cursor back to 1
  const replay = recordReplay({ modeId: 'words', seed: 9, meta: {}, samples: e.samples, durationMs: 300, netWpm: 10, text: 'cat' });
  const ghost = new GhostPlayer(replay);
  assert.equal(ghost.cursorAt(200), 2);
  assert.equal(ghost.cursorAt(300), 1);
});
