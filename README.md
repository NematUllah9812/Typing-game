# Cadence — Typing Game Architecture

A complete, implementation-ready technical and design architecture for **Cadence**,
a typing trainer and typing arcade for **Windows PC** (Windows 10/11, x64 & ARM64).

Offline-first, instrument-precise, and deliberately hand-designed.

## Contents

| File | Description |
|------|-------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Full technical & design specification (26 sections) |
| [`architecture.html`](architecture.html) | Visual companion — diagrams, icon set, design tokens, wireframes (open in a browser) |

## Highlights

- **Stack:** C# 12 / .NET 8, Avalonia UI 11 + SkiaSharp, Win32 Raw Input, SQLite, MiniAudio.
- **Architecture:** layered + MVVM over a pure, deterministic domain core (dependency rule enforced by an architecture test).
- **Complete functionality:** typing engine, scoring/analytics, trainer + arcade modes, curriculum, low-latency input, game loop, audio, persistence, content pipeline, accessibility, localization, replays/ghost races, security, packaging & CI.
- **Design system:** human-authored, editorial visual language with a bespoke SVG icon set.

## Project rule

No emoji anywhere — UI, content, code, and docs use **vector icons / SVG only**.
This rule is enforced by an automated emoji-lint CI gate, not merely documented.

## Status

Architecture v1.0 — implementation-ready.
