# Cadence — Typing Game

A typing trainer **and** typing arcade. This is the runnable **web build** of the
portable, deterministic domain core described in the repository's
[`ARCHITECTURE.md`](../ARCHITECTURE.md) (a Windows C#/Avalonia design). The core
logic here is written framework-free so it ports to the native target unchanged.

**Version 1.0.0** — feature-complete web build.

## Features

- **Trainer modes:** Timed (15/30/60/120s), Word-count (10/25/50/100), Quote
  (short/medium/long), Zen (endless), Custom text.
- **Curriculum:** a 6-unit, 15-lesson learn-to-type course with WPM+accuracy
  goals and linear unlocking.
- **Arcade:** Falling Words — canvas-rendered, wave-based difficulty, combos,
  lives, high scores.
- **Ghost Race:** race a translucent replay of your best run over identical,
  seed-reproduced text.
- **Analytics:** net/raw WPM, accuracy, consistency, per-word chart, keyboard
  heatmap (accuracy/speed), a stats dashboard with a WPM trend and "keys to
  practise".
- **Achievements:** 12 unlockable goals.
- **Personalisation:** four hand-authored themes (Graphite, Paper, Nord,
  High-Contrast), caret styles, sound on/off, reduced motion.
- **Localization:** keyed i18n framework (English + partial Spanish), RTL-ready.
- **Data ownership:** export all data to JSON; clear all data.
- **Offline & private:** everything runs locally (localStorage); no account.

## No-emoji policy

The project uses **vector SVG icons only — no emoji anywhere**. This is enforced
by `tools/emoji-lint.mjs`, wired into `npm run check` and CI.

## Run it

```bash
cd game
npm install
npm run dev       # live dev server on 0.0.0.0:5173
npm run build     # production build -> dist/
npm run preview   # serve the production build
npm test          # 43 unit tests (node --test)
npm run check     # emoji-lint + tests
npm run lint:emoji
```

## Project structure

```
game/
├─ src/
│  ├─ domain/        # pure, deterministic core (portable to .NET)
│  │   ├─ primitives.js      # graphemes, seeded RNG, enums
│  │   ├─ typing-engine.js   # the typing engine
│  │   ├─ scoring.js         # WPM / accuracy / consistency / per-key
│  │   ├─ generator.js       # seeded text generation
│  │   ├─ content.js         # word list + quotes
│  │   ├─ modes.js           # data-driven game modes
│  │   ├─ curriculum.js      # lessons + progression
│  │   ├─ achievements.js    # achievement rules
│  │   ├─ arcade.js          # falling-words simulation
│  │   ├─ replay.js          # replay record + ghost player
│  │   └─ layout.js          # keyboard + finger map
│  ├─ app/           # orchestration + adapters (ports)
│  │   ├─ session.js         # game session + clock
│  │   ├─ storage.js         # localStorage repositories
│  │   ├─ audio.js           # WebAudio SFX
│  │   └─ i18n.js            # localization
│  ├─ ui/            # presentation
│  │   ├─ icons.js           # SVG icon set (no emoji)
│  │   ├─ typing-surface.js  # glyph renderer + carets
│  │   ├─ results-view.js    # results + per-word chart
│  │   ├─ heatmap.js         # keyboard heatmap
│  │   └─ arcade-view.js     # canvas renderer
│  ├─ styles/app.css # design system + themes
│  └─ main.js        # composition root / routing
├─ test/             # unit tests
├─ tools/emoji-lint.mjs
└─ .github/workflows/ci.yml
```

## Tracking

- [`PROGRESS.md`](PROGRESS.md) — version-by-version build log
- [`ISSUES.md`](ISSUES.md) — every issue, root cause, and fix
- [`CHANGELOG.md`](CHANGELOG.md) — Keep-a-Changelog / SemVer

## Deferred to the native port

The environment used to build this had no .NET SDK, so Win32 Raw Input, SQLite,
MiniAudio/WASAPI, MSIX/Inno packaging + code signing, and scancode-level
multi-layout support are specified in `ARCHITECTURE.md` and left for the native
build. The domain core is designed to move over unchanged.
