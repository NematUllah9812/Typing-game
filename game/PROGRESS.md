# Cadence — Progress Log

A version-wise record of what has been built. Newest version on top.
See `ISSUES.md` for problems and fixes, and `CHANGELOG.md` for the terse
release list. Versioning follows **SemVer** (MAJOR.MINOR.PATCH).

---

## v1.0.0 — 1.0 hardening: settings, stats, localization, CI (2026-09-09)

**Status:** Complete and running. 43/43 tests passing. Emoji-lint gate green.
Production build verified. Live dev preview.

**Theme of this version:** turn the feature-complete game into a 1.0 — full
settings, a statistics dashboard, a localization framework, data ownership, and
an automated no-emoji gate wired into CI.

### Delivered
- `app/i18n.js` — keyed localization framework (no string concatenation), with
  English + a partial Spanish catalog to prove the pattern, English fallback,
  RTL direction handling, and a code-free path to add languages. Mirrors §17.2.
- **Settings** screen: theme (4), language, sound on/off, reduced motion, caret
  style (bar/block/underline), and data controls. Live-applied, persisted.
- **Stats** screen: best/avg WPM, avg accuracy, run count, total chars, time
  typing, a bespoke WPM-trend sparkline, and "keys to practise" from the key
  model. Mirrors §6 / §14.3.
- Data ownership (privacy §19 / backup §11.4): export-all to JSON download and
  clear-all with confirmation, via a `DataOps` store helper.
- Zen mode now has an explicit **End** control (it never auto-finishes).
- Caret-style setting applied to the typing surface.
- `tools/emoji-lint.mjs` — the enforcement the architecture promised (§12.2 /
  §16.5): scans all source/content/docs and fails the build on any emoji code
  point (allowing plain technical arrows). Wired as `npm run lint:emoji` and
  `npm run check`.
- `.github/workflows/ci.yml` — CI: install, emoji-lint, tests, build.
- Accessibility: reduced-motion, high-contrast theme, colour + shape/underline
  double-encoding, visible focus rings, RTL support, semantic labels on SVG
  charts. Mirrors §17.1.
- Tests: `test/i18n.test.js` (6 tests) — translation, fallback, unknown key/
  locale, catalog availability.

### Complete vs. the architecture (v1.0 web build)
Implemented: typing engine, scoring/analytics, per-key model + adaptive drills,
timed/words/quote/zen/custom modes, curriculum with progression, achievements,
keyboard heatmap, arcade (Falling Words), ghost race + replays, history + stats,
personal bests, four themes, settings, localization framework, data export/wipe,
sound, accessibility pass, and an enforced no-emoji vector-icon policy.

Intentionally deferred to the native port (need a .NET environment; see
ISSUE-0.1.0-1): Win32 Raw Input, SQLite persistence, MiniAudio/WASAPI, MSIX/Inno
packaging + code signing, and multi-keyboard-layout scancode mapping. The domain
core is written to port unchanged.

---

## v0.5.0 — Ghost Race & replays (2026-09-09)

**Status:** Complete and running. 37/37 tests passing. Live dev preview.

**Theme of this version:** realise the payoff of the deterministic engine —
record runs and race a translucent ghost of your best.

### Delivered
- `replay.js` — `recordReplay()` (compact seed + event timeline) and
  `GhostPlayer` (reconstructs a monotonic cursor-over-time timeline and answers
  "where was the ghost at elapsed ms?"). Mirrors §18.
- `Replays` storage port — best replay per mode key, for ghost racing your PB.
- Ghost caret in `TypingSurface` (second, cool-coloured caret) with generalised
  `_place()` positioning and a `setGhost()` API.
- Ghost race flow: a "Race ghost" button on the home screen (shown when a ghost
  exists for the current mode) reuses the ghost's seed so the text matches
  exactly; the ghost caret animates during the run; a win/lose toast on finish.
- Replays are recorded automatically after eligible runs (timed/words/quote).
- Tests: `test/replay.test.js` (5 tests) — event count, monotonic advancement,
  final-cursor arrival, start position, backspace handling.

### Notes
- With this version the roadmap's arcade + ghost goals are complete; v1.0 is the
  hardening/accessibility/localization/packaging pass.

---

## v0.4.0 — Arcade: Falling Words (2026-09-09)

**Status:** Complete and running. 32/32 tests passing. Live dev preview.

**Theme of this version:** add the arcade half of the product — a real-time,
canvas-rendered typing game distinct from the measured trainer.

### Delivered
- `arcade.js` — pure, deterministic `ArcadeGame` simulation: word spawning,
  gravity, floor collisions, lives, wave-based difficulty ramp, combo multiplier,
  scoring, accuracy. Time (`dt`) and randomness injected for testability.
  Mirrors §7.2 / §7.3.
- `ui/arcade-view.js` — `<canvas>` renderer reading design tokens from CSS
  variables: falling words with typed-prefix colouring, active-word highlight,
  urgency tint near the floor, DPR-aware crisp text, floor danger zone.
  Mirrors §9.4.
- **Arcade** nav tab + menu (with high-score display) + in-game HUD (score,
  wave, combo, SVG life pips) + game-over screen with stats and high-score flag.
- `ArcadeScores` storage port (per-mode high scores).
- Real-time loop via `requestAnimationFrame` with a clamped `dt` so a stalled
  tab can't teleport words through the floor.
- Tests: `test/arcade.test.js` (7 tests) — spawning, clearing/scoring, combo
  break, floor life-loss, game-over, determinism.

### Not yet built (carried forward)
- Wave Survival variant (falling-words foundation covers most of it) — §7.2
- Ghost Race + replay recording/playback — §7.2 / §18 (v0.5)
- Localization framework, accessibility polish, packaging notes — §17 / §22 (v1.0)

---

## v0.3.0 — Curriculum & lessons tree (2026-09-09)

**Status:** Complete and running. 25/25 tests passing. Live dev preview.

**Theme of this version:** turn Cadence into a real learn-to-type course, not
just a test — structured lessons with progression gates.

### Delivered
- `curriculum.js` — a 6-unit course (Home Row → Top → Bottom → Numbers →
  Punctuation/Capitals → Fluency) with 15 lessons, each with a WPM+accuracy
  goal. Deterministic per-lesson text generation from key sets (focused but
  readable; sprinkles tiny real words for rhythm). Mirrors §7.1.
- `flatLessons()` + `isUnlocked()` — linear unlock: the next lesson opens when
  the previous is cleared.
- New internal `lesson` mode in `modes.js` (excluded from the home mode-picker).
- **Learn** nav tab with a full lessons tree: cleared / open / locked states,
  per-lesson goal or personal best shown, unit grouping.
- Results screen now shows a lesson pass/fail banner and, on pass, records the
  clear via `CurriculumProgress` and unlocks the next lesson. Retry/New/Home are
  lesson-aware.
- Tests: `test/curriculum.test.js` (6 tests) — unlock logic, key-set purity,
  determinism, digit lessons, non-empty output.

### Not yet built (carried forward)
- Arcade modes: Falling Words, Wave Survival — §7.2 (v0.4)
- Ghost Race + replays — §7.2 / §18 (v0.5)
- Localization framework, accessibility polish, packaging notes — §17 / §22 (v1.0)

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
