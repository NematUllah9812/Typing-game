// Cadence — TypingSurface renderer. Mirrors ARCHITECTURE.md §9.4.
// DOM-based glyph rendering with a sliding caret. State-driven from snapshots.

import { CharState } from '../domain/primitives.js';

export class TypingSurface {
  constructor(root) {
    this.root = root;
    this.root.classList.add('surface');
    this.glyphLayer = document.createElement('div');
    this.caret = document.createElement('div');
    this.caret.className = 'caret';
    this.ghostCaret = document.createElement('div');
    this.ghostCaret.className = 'caret ghost-caret';
    this.ghostCaret.style.display = 'none';
    this.hint = document.createElement('div');
    this.hint.className = 'focus-hint';
    this.hint.textContent = 'click here and start typing';
    this.root.append(this.glyphLayer, this.ghostCaret, this.caret, this.hint);
    this._spans = [];
    this._built = '';
  }

  setBlurred(blurred) {
    this.root.classList.toggle('blurred', blurred);
  }

  /** Build glyph spans once per new text. */
  build(target) {
    const key = target.join('\u0000');
    if (key === this._built) return;
    this._built = key;
    this.glyphLayer.innerHTML = '';
    this._spans = target.map((g, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = g === ' ' ? '\u00A0' : g;
      span.dataset.i = String(i);
      this.glyphLayer.appendChild(span);
      return span;
    });
  }

  /** Render a snapshot (state colours, extras, current word, caret). */
  render(snapshot) {
    this.build(snapshot.target);
    const { states, cursor, target, extras } = snapshot;

    // current-word range
    let wStart = cursor, wEnd = cursor;
    while (wStart > 0 && !/^\s$/u.test(target[wStart - 1])) wStart--;
    while (wEnd < target.length && !/^\s$/u.test(target[wEnd])) wEnd++;

    for (let i = 0; i < this._spans.length; i++) {
      const span = this._spans[i];
      let cls = 'ch ' + states[i];
      if (i >= wStart && i < wEnd) cls += ' current-word';
      if (span.className !== cls) span.className = cls;
      // render extras appended after slot i
      const ex = extras[i];
      if (ex && ex.length) {
        if (!span.dataset.exlen || Number(span.dataset.exlen) !== ex.length) {
          span._extra = span._extra || document.createElement('span');
          span._extra.className = 'ch extra';
          span._extra.textContent = ex.join('');
          if (!span._extra.isConnected) span.after(span._extra);
          span.dataset.exlen = String(ex.length);
        }
      } else if (span._extra && span._extra.isConnected) {
        span._extra.remove();
        span.dataset.exlen = '0';
      }
    }
    this._moveCaret(cursor);
  }

  _moveCaret(cursor) {
    this._place(this.caret, cursor);
  }

  /** Position the ghost caret at a given index (or hide it). */
  setGhost(index) {
    if (index == null) {
      this.ghostCaret.style.display = 'none';
      return;
    }
    this.ghostCaret.style.display = 'block';
    this._place(this.ghostCaret, index);
  }

  _place(el, cursor) {
    const rootRect = this.root.getBoundingClientRect();
    const target = this._spans[cursor];
    if (target) {
      const r = target.getBoundingClientRect();
      el.style.left = `${r.left - rootRect.left}px`;
      el.style.top = `${r.top - rootRect.top + 2}px`;
      el.style.height = `${r.height - 4}px`;
    } else if (this._spans.length) {
      const last = this._spans[this._spans.length - 1].getBoundingClientRect();
      el.style.left = `${last.right - rootRect.left}px`;
      el.style.top = `${last.top - rootRect.top + 2}px`;
      el.style.height = `${last.height - 4}px`;
    }
  }
}
