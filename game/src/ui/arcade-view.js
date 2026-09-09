// Cadence — Arcade canvas renderer. Mirrors ARCHITECTURE.md §9.4 / §7.2.
// Draws falling words on a <canvas>; reads design tokens from CSS variables.

export class ArcadeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    this._tokens = readTokens();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  refreshTokens() {
    this._tokens = readTokens();
  }

  render(snap) {
    const ctx = this.ctx;
    const t = this._tokens;
    ctx.clearRect(0, 0, this.w, this.h);

    // floor danger zone
    const floorY = this.h - 6;
    ctx.fillStyle = t.hair;
    ctx.fillRect(0, floorY, this.w, 6);
    ctx.fillStyle = hexA(t.bad, 0.06);
    ctx.fillRect(0, this.h * 0.82, this.w, this.h * 0.18);

    ctx.font = '600 20px ' + t.mono;
    ctx.textBaseline = 'middle';

    for (const w of snap.words) {
      const px = w.x * this.w;
      const py = w.y * (this.h - 40) + 20;
      const isActive = w.id === snap.activeId;
      const textW = ctx.measureText(w.text).width;
      let x = px - textW / 2;
      x = Math.max(8, Math.min(this.w - textW - 8, x));

      // urgency tint as it approaches floor
      const urgency = Math.min(1, w.y / 0.85);
      const pending = mix(t.dim, t.bad, urgency * 0.6);

      // typed prefix
      const typed = w.text.slice(0, w.typed);
      const rest = w.text.slice(w.typed);
      if (isActive) {
        // subtle highlight box
        ctx.fillStyle = hexA(t.accent, 0.08);
        ctx.fillRect(x - 6, py - 16, textW + 12, 32);
      }
      ctx.fillStyle = t.good;
      ctx.fillText(typed, x, py);
      const tw = ctx.measureText(typed).width;
      ctx.fillStyle = isActive ? t.strong : pending;
      ctx.fillText(rest, x + tw, py);
    }
  }
}

function readTokens() {
  const s = getComputedStyle(document.documentElement);
  const g = (n) => s.getPropertyValue(n).trim();
  return {
    bg: g('--bg'), raised: g('--raised'), hair: g('--hair'),
    dim: g('--dim'), text: g('--text'), strong: g('--strong'),
    accent: g('--accent'), good: g('--good'), bad: g('--bad'),
    mono: g('--mono') || 'monospace',
  };
}

function hexA(hex, a) {
  const c = parseHex(hex);
  if (!c) return hex;
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
function mix(h1, h2, t) {
  const a = parseHex(h1), b = parseHex(h2);
  if (!a || !b) return h1;
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}
function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
