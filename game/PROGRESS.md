# Cadence — Progress Log

A version-wise record of what has been built. Newest version on top.
See `ISSUES.md` for problems and fixes, and `CHANGELOG.md` for the terse
release list. Versioning follows **SemVer** (MAJOR.MINOR.PATCH).

---

## v0.2.0 — Achievements, heatmap & custom text (2026-09-09)

**Status:** Complete and running. 19/19 tests passing. Live dev preview.

**Theme of this version:** deepen the single-run experience — reward progress,
visualise weaknesses, and let users bring their own text.

### Delivered
- `achievements.js` — 12 pure achievement rules (WPM tiers, flawless, steady,
  streaks, marathon, dedicated, scholar) with a pure `evaluate()` that returns
  only newly-unlocked items. Mirrors §11.2.
- `layout.js` — QWERTY rows + finger map (foundation for per-finger analytics
  and the heatmap). Mirrors §6.4 / §8.1.
- `ui/heatmap.js` — bespoke SVG keyboard heatmap, toggleable between accuracy
  and speed (latency), coloured from per-key stats. Mirrors §14.3.
- Results screen now shows: newly-unlocked achievements, the per-word chart, and
  the keyboard heatmap with a live accuracy/speed toggle.
- Achievements screen (new nav tab) showing all achievements locked/unlocked
  with a progress count.
- Custom-text mode UI: a textarea on the home screen feeds the Custom mode.
- Storage: `Achievements` and `CurriculumProgress` repositories added (ports for
  §11.2 and §7.1; curriculum consumed in v0.3).
- Navigation tabs (Play / Achievements) in the top bar.
- Tests: `test/achievements.test.js` (5 tests) — unlock logic, idempotency,
  threshold correctness, schema integrity.

### Not yet built (carried forward)
- Curriculum / lessons tree — §7.1 (storage port ready; v0.3)
- Arcade modes — §7.2 (v0.4 / v0.5)
- Localization framework — §17.2 (v1.0)

---

## v0.1.0 — Playable core (2026-09-09)

**Status:** Complete and running. 14/14 domain tests passing. Live dev preview.

**Theme of this version:** stand up the portable domain core from the
architecture and a playable web front-end around it.

### Delivered

**Domain core (pure, deterministic — portable to the .NET target later)**
- `primitives.js` — grapheme splitting (Intl.Segmenter), `CharState`,
  `KeyAction`, seeded PRNG (`mulberry32`). Mirrors ARCHITECTURE §5.1 / §5.5.
- `typing-engine.js` — full `TypingEngine`: cursor, per-char state, extras,
  backspace/whitespace/printable handling, error-modes (stop-on-error,
  carefree, confidence, require-full-word), keystroke sample log. Mirrors §5.
- `scoring.js` — net/raw WPM (5-char word), accuracy, consistency (1 − CV),
  per-word WPM series, per-key stats. Mirrors §6.
- `content.js` — embedded English word list + quotes (schema matches §15).
- `generator.js` — seeded word/quote generation with adaptive weak-key bias. §6.5
- `modes.js` — data-driven modes: Timed, Word-count, Quote, Zen, Custom. §7

**Application layer**
- `session.js` — `GameSession`: clock starts on first keystroke, timed-mode
  expiry, finish detection, result assembly. Mirrors §9.
- `storage.js` — localStorage adapters implementing the repository ports:
  Runs, PersonalBests, Settings, KeyModelStore (EWMA per-key model). §11
- `audio.js` — WebAudio synthesised SFX (no external samples). §10

**Presentation (UI)**
- `icons.js` — bespoke SVG icon set, **no emoji** (24×24 grid, currentColor). §12
- `styles/app.css` — hand-authored design system: tokens, 4 themes
  (Graphite / Paper / Nord / High-Contrast), components. §13
- `typing-surface.js` — live glyph renderer with sliding caret + current-word
  highlight + extras. §9.4
- `results-view.js` — results screen with a **hand-drawn SVG** per-word WPM
  chart (no chart library). §9.5 / §14.3
- `main.js` — composition root: screen routing (home / playing / results),
  game loop (`requestAnimationFrame`), keyboard capture, HUD, theme/sound
  toggles, history table, toasts. §16.1

**Tests**
- `test/domain.test.js` — 14 tests: grapheme handling, perfect/incorrect runs,
  backspace edge cases, extras cap, stop-on-error, confidence mode, scoring
  golden values, consistency, generator determinism (replay-exactness).

### Playable now
- Modes: Timed (15/30/60/120s), Words (10/25/50/100), Quote (short/medium/long),
  Zen, Custom.
- Live HUD: WPM, accuracy, time, streak.
- Results: net/raw WPM, accuracy, consistency, errors, per-word chart, PB flag.
- Persistence: run history + personal bests + adaptive key model survive reload.
- 4 switchable themes; sound on/off; reduced-motion honoured.

### Deviations from the architecture (documented on purpose)
- **Tech substitution:** the sandbox has **no .NET SDK**, so v0.1 is built in
  **JavaScript/Vite** instead of C#/Avalonia. The *domain core* is written as
  pure, framework-free modules that map 1:1 to the C# classes in the spec, so
  the logic ports cleanly when a .NET environment is available. UI/input/audio
  are the web equivalents of the spec's Avalonia/RawInput/MiniAudio adapters.
- **Input:** browser `keydown` replaces Win32 Raw Input (§8). Same abstraction
  boundary (an input source feeding the session), different platform adapter.
- **Persistence:** localStorage replaces SQLite (§11), behind the same port
  shapes (`Runs`, `PersonalBests`, `Settings`, `KeyModelStore`).

### Not yet built (planned)
- Arcade modes (Falling Words, Wave Survival, Ghost Race) — §7.2
- Curriculum / lessons tree with unlock thresholds — §7.1
- Keyboard heatmap control — §14.3
- Achievements — §11.2
- Custom-text input UI (mode exists; needs an entry field)
- Multiple keyboard-layout awareness — §8.1
- Localization framework — §17.2

### How to run
```bash
cd game
npm install
npm run dev      # live dev server (0.0.0.0:5173)
npm test         # node --test test/
npm run build    # production build to dist/
```

---

## Roadmap (next versions)

- **v0.2.0** — Custom-text UI + keyboard heatmap on results + achievements.
- **v0.3.0** — Curriculum/lessons tree with progression.
- **v0.4.0** — Arcade: Falling Words + Wave Survival.
- **v0.5.0** — Ghost Race (replay recording already deterministic-ready).
- **v1.0.0** — Accessibility pass, localization, packaging notes for the
  .NET/Avalonia port.
