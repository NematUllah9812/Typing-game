# Changelog

All notable changes to Cadence are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); this project
adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-09-09
### Added
- Settings screen: theme, language, sound, reduced motion, caret style, and data
  controls (export all / clear all).
- Statistics screen: best/avg WPM, accuracy, totals, a WPM-trend sparkline, and
  "keys to practise" from the key model.
- Localization framework (keyed strings, English + partial Spanish, fallback,
  RTL handling).
- Zen mode explicit End control; caret-style applied to the typing surface.
- `tools/emoji-lint.mjs` no-emoji gate + `npm run check`; GitHub Actions CI
  (emoji-lint + tests + build).
- 6 i18n unit tests (43 total).

### Fixed
- Gear button now opens Settings instead of cycling themes (ISSUE-1.0.0-1).
- i18n tests run headless via a document shim (ISSUE-1.0.0-2).
- Caret-style setting now takes effect (ISSUE-1.0.0-3).

### Changed
- The no-emoji vector-icon policy is now enforced automatically in CI, not by
  convention (ISSUE-1.0.0-4).

## [0.5.0] — 2026-09-09
### Added
- Replay recording (seed + event timeline) and a GhostPlayer that reconstructs
  a cursor-over-time timeline.
- Ghost Race: race a translucent caret of your best run over the identical
  (seed-reproduced) text; win/lose feedback.
- Ghost caret in the typing surface; "Race ghost" button on the home screen.
- Replay storage (best per mode).
- 5 replay/ghost unit tests (37 total).

### Fixed
- Start/New buttons no longer leak the click event into the seed argument
  (ISSUE-0.5.0-1, latent since v0.1).
- Monotonic ghost timeline reconstruction (ISSUE-0.5.0-2).
- Ghost races reuse the ghost's seed so text matches exactly (ISSUE-0.5.0-3).

## [0.4.0] — 2026-09-09
### Added
- Arcade mode "Falling Words": pure deterministic simulation + canvas renderer,
  wave-based difficulty, combo multiplier, lives, scoring.
- Arcade tab, menu with high scores, in-game HUD, and game-over screen.
- Per-mode arcade high-score storage.
- 7 arcade unit tests (32 total).

### Fixed
- Clamped the arcade frame delta to prevent floor teleporting on stalls
  (ISSUE-0.4.0-1).
- Replaced dot characters with SVG life pips per the no-emoji policy
  (ISSUE-0.4.0-2).
- DPI-aware crisp canvas rendering (ISSUE-0.4.0-3).

## [0.3.0] — 2026-09-09
### Added
- Curriculum: a 6-unit, 15-lesson learn-to-type course with per-lesson WPM +
  accuracy goals and linear unlocking.
- Learn tab with a lessons tree (cleared / open / locked states, goals & bests).
- Internal `lesson` game mode with deterministic key-set-based text generation.
- Lesson pass/fail banner on the results screen; progress persisted.
- 6 curriculum unit tests (25 total).

### Fixed
- Lesson text now strictly respects the lesson's key set (ISSUE-0.3.0-1).
- Excluded the internal lesson mode from the Play mode-picker (ISSUE-0.3.0-2).
- Lesson-aware Retry/New/Home actions on the results screen (ISSUE-0.3.0-3).

## [0.2.0] — 2026-09-09
### Added
- Achievements system: 12 achievements, an unlock engine, an Achievements screen,
  and unlock toasts + a results-screen summary.
- Keyboard heatmap on the results screen (accuracy / speed toggle), drawn as
  bespoke SVG.
- Custom-text mode UI (textarea on the home screen).
- Keyboard layout + finger map module.
- Storage ports for achievements and curriculum progress.
- Navigation tabs (Play / Achievements).
- 5 achievement unit tests (19 total).

### Fixed
- Hardened achievement predicates against malformed runs (ISSUE-0.2.0-1).
- Retained per-key stats for the heatmap toggle (ISSUE-0.2.0-2).
- Escaped custom-text input to avoid HTML injection (ISSUE-0.2.0-3).

## [0.1.0] — 2026-09-09
### Added
- Portable, deterministic domain core: `TypingEngine`, scoring, seeded text
  generator, content pack, and data-driven game modes.
- Application layer: `GameSession` (clock, finish detection), storage adapters
  (runs, personal bests, settings, adaptive key model), WebAudio SFX engine.
- Playable web UI: home/setup, live typing surface with sliding caret, HUD
  (WPM / accuracy / time / streak), results screen with a hand-drawn per-word
  WPM chart, run-history table.
- Modes: Timed (15/30/60/120s), Word-count (10/25/50/100), Quote
  (short/medium/long), Zen, Custom.
- Bespoke SVG icon set (no emoji) and a hand-authored design system with four
  themes (Graphite, Paper, Nord, High-Contrast).
- 14 domain unit tests (grapheme handling, engine edge cases, scoring golden
  values, generator determinism).

### Fixed
- Corrected two test expectations to match the spec's exact behaviour
  (see ISSUES.md ISSUE-0.1.0-2).
- Vite configured for the preview proxy host (ISSUE-0.1.0-3).
- Prevented browser default actions for Tab / Space / Backspace during play
  (ISSUE-0.1.0-5, ISSUE-0.1.0-6).

### Notes
- Built in JavaScript/Vite because the environment has no .NET SDK; the domain
  core maps 1:1 to the architecture's C#/Avalonia design for a later port
  (ISSUE-0.1.0-1).

[1.0.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v1.0.0
[0.5.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.5.0
[0.4.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.4.0
[0.3.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.3.0
[0.2.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.2.0
[0.1.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.1.0
