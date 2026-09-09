// Cadence — Audio engine (WebAudio). Mirrors ARCHITECTURE.md §10 IAudioEngine.
// Synthesised clicks (no external samples) so the preview needs no network.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = 0.25;
  }
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  setEnabled(v) {
    this.enabled = v;
  }
  setMasterVolume(v) {
    this.master = v;
  }

  /** @param {'correct'|'error'|'word'|'complete'} event */
  play(event, gain = 1) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);

    const spec = {
      correct: { f: 220, type: 'triangle', dur: 0.03, vol: 0.5 },
      error: { f: 120, type: 'square', dur: 0.06, vol: 0.7 },
      word: { f: 330, type: 'sine', dur: 0.04, vol: 0.4 },
      complete: { f: 523, type: 'sine', dur: 0.18, vol: 0.9 },
    }[event] || { f: 200, type: 'sine', dur: 0.03, vol: 0.4 };

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.f, now);
    if (event === 'complete') osc.frequency.exponentialRampToValueAtTime(spec.f * 1.5, now + spec.dur);

    const peak = this.master * spec.vol * gain;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);

    osc.start(now);
    osc.stop(now + spec.dur + 0.02);
  }
}
