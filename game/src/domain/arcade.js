// Cadence — Arcade engine (Falling Words + Wave Survival). Pure simulation,
// no DOM. Mirrors ARCHITECTURE.md §7.2 / §7.3. Time & randomness injected so it
// is deterministic and testable; the renderer just draws the state.

import { makeRng } from './primitives.js';
import { words as wordPool } from './content.js';

/**
 * @typedef {Object} FallingWord
 * @property {number} id
 * @property {string} text
 * @property {number} typed      chars matched so far
 * @property {number} x          0..1 horizontal position
 * @property {number} y          0..1 vertical position (1 = floor)
 * @property {number} speed      units per second (of y)
 * @property {boolean} active    currently being typed
 */

export class ArcadeGame {
  /**
   * @param {object} opts { seed, lang, mode: 'falling'|'survival', maxLives, difficulty }
   */
  constructor(opts = {}) {
    this.seed = opts.seed ?? 1;
    this.rng = makeRng(this.seed);
    this.pool = wordPool(opts.lang || 'en').filter((w) => w.length >= 2 && w.length <= 8);
    this.mode = opts.mode || 'falling';

    this.words = [];
    this.nextId = 1;
    this.spawnTimer = 0;
    this.elapsed = 0;
    this.lives = opts.maxLives ?? 5;
    this.maxLives = opts.maxLives ?? 5;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.wordsCleared = 0;
    this.charsTyped = 0;
    this.charsCorrect = 0;
    this.wave = 1;
    this.gameOver = false;
    this.activeId = null;

    // difficulty curve params
    this.baseSpawn = 1.6;   // seconds between spawns at start
    this.baseSpeed = 0.055; // y units/sec at start
  }

  get spawnInterval() {
    // spawns get faster as waves rise, floored so it never becomes impossible
    return Math.max(0.55, this.baseSpawn - this.wave * 0.12);
  }
  get fallSpeed() {
    return this.baseSpeed + this.wave * 0.012;
  }

  /** Advance the simulation by dt seconds. */
  update(dt) {
    if (this.gameOver) return;
    this.elapsed += dt;
    // wave every 20 seconds
    this.wave = 1 + Math.floor(this.elapsed / 20);

    // spawn
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.words.length < 8) {
      this.spawn();
      this.spawnTimer = this.spawnInterval;
    }

    // move + floor collisions
    for (const w of this.words) {
      w.y += w.speed * dt;
      if (w.y >= 1) {
        w.hitFloor = true;
      }
    }
    const hit = this.words.filter((w) => w.hitFloor);
    if (hit.length) {
      this.lives -= hit.length;
      this.combo = 0;
      if (this.activeId && hit.some((w) => w.id === this.activeId)) this.activeId = null;
      this.words = this.words.filter((w) => !w.hitFloor);
      if (this.lives <= 0) {
        this.lives = 0;
        this.gameOver = true;
      }
    }
  }

  spawn() {
    const text = this.pool[Math.floor(this.rng() * this.pool.length)];
    this.words.push({
      id: this.nextId++,
      text,
      typed: 0,
      x: 0.08 + this.rng() * 0.84,
      y: 0,
      speed: this.fallSpeed * (0.85 + this.rng() * 0.4),
      hitFloor: false,
    });
  }

  /**
   * Handle a typed character. Targets the active word, or picks a new target
   * whose next needed char matches. Returns {hit, cleared, wrong}.
   */
  typeChar(ch) {
    if (this.gameOver) return { hit: false, cleared: false, wrong: false };
    this.charsTyped++;

    // find active word
    let active = this.activeId ? this.words.find((w) => w.id === this.activeId) : null;

    if (!active) {
      // choose the lowest word whose next char matches (most urgent)
      const candidates = this.words
        .filter((w) => w.text[w.typed] === ch)
        .sort((a, b) => b.y - a.y);
      active = candidates[0] || null;
      if (active) this.activeId = active.id;
    }

    if (!active) {
      this.combo = 0;
      return { hit: false, cleared: false, wrong: true };
    }

    if (active.text[active.typed] === ch) {
      active.typed++;
      this.charsCorrect++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (active.typed >= active.text.length) {
        // cleared
        const mult = 1 + Math.floor(this.combo / 10);
        this.score += active.text.length * 10 * mult;
        this.wordsCleared++;
        this.words = this.words.filter((w) => w.id !== active.id);
        this.activeId = null;
        return { hit: true, cleared: true, wrong: false };
      }
      return { hit: true, cleared: false, wrong: false };
    }

    // wrong char for the active word — break combo, keep the word active
    this.combo = 0;
    return { hit: false, cleared: false, wrong: true };
  }

  get accuracy() {
    return this.charsTyped ? Math.round((this.charsCorrect / this.charsTyped) * 100) : 100;
  }

  snapshot() {
    return {
      words: this.words.map((w) => ({ ...w })),
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      combo: this.combo,
      wave: this.wave,
      wordsCleared: this.wordsCleared,
      accuracy: this.accuracy,
      elapsed: this.elapsed,
      gameOver: this.gameOver,
      activeId: this.activeId,
    };
  }
}
