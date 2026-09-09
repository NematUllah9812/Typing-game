# Changelog

All notable changes to Cadence are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); this project
adheres to [Semantic Versioning](https://semver.org/).

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

[0.2.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.2.0
[0.1.0]: https://github.com/NematUllah9812/Typing-game/releases/tag/v0.1.0
