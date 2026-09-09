# CADENCE — Technical & Design Architecture

**Product:** Cadence — a typing trainer and typing arcade for Windows PC
**Platform:** Windows 10 (1809+) and Windows 11, x64 and ARM64
**Type:** Single-player desktop application (offline-first; optional online later)
**Document status:** Complete v1.0 architecture (implementation-ready)

> **Iconography rule (enforced project-wide):** The product and every artifact
> use **vector icons / SVG** only. **Emojis are forbidden** in UI, code, content
> packs, marketing, and documentation. See §12 "Iconography & Asset Rules" and
> the lint gate in §16.5.

---

## 0. Table of Contents

1. Product Overview & Design Pillars
2. Technology Stack & Rationale
3. High-Level System Architecture
4. Solution / Project Layout
5. Domain Core — The Typing Engine
6. Scoring, Metrics & Analytics
7. Game Modes (Complete Functional Spec)
8. Input Subsystem (Low-latency keyboard)
9. Game Loop, Timing & Rendering Pipeline
10. Audio Subsystem
11. Persistence & Data Model
12. Iconography & Asset Rules (No-Emoji Policy)
13. Design System (Human-authored, anti-generic)
14. Screen Flow, Wireframes & Component Library
15. Content Pipeline (word lists, quotes, lessons)
16. Cross-cutting: DI, Config, Logging, Events, Errors
17. Accessibility & Localization
18. Anti-cheat, Replays & Ghost Races
19. Security, Privacy & Telemetry
20. Non-Functional Requirements & Budgets
21. Testing Strategy
22. Build, Packaging, Signing & Updates
23. Milestone Roadmap
24. Thorough Review — element-by-element verification
25. Risk Register
26. Glossary

---

## 1. Product Overview & Design Pillars

Cadence is two products fused into one shell:

- A **serious typing trainer** (curriculum, drills, adaptive weak-key practice,
  deep analytics) comparable to a keyboarding course.
- A **typing arcade** (timed tests, quote races, falling-words survival, ghost
  races against your own past runs).

### 1.1 Design pillars

| Pillar | Meaning | Consequence for architecture |
|--------|---------|------------------------------|
| **Instant & honest** | Zero perceptible input lag; metrics never lie | Raw input path, fixed-step timing, deterministic engine |
| **Legible first** | Reading the text must be effortless | Skia sub-pixel text, tuned typography, no decorative clutter |
| **Progress you can feel** | Every session improves a visible model of the user | Per-key model, adaptive generator, history charts |
| **Offline by default** | Full product with no account, no network | SQLite local store, no mandatory login |
| **Bespoke, not templated** | Looks hand-built, not machine-generated | Human design tokens (§13), custom SVG icon set, no emoji |

### 1.2 Non-goals (v1)

- No web/mobile client (Windows desktop only).
- No always-online DRM.
- No microtransactions.
- Online multiplayer is designed-for but **out of scope for v1** (hooks left in §18).

---

## 2. Technology Stack & Rationale

A typing game is **95% precise text rendering + input + timing** and **5% game
physics**. The stack is chosen for crisp vector text, low input latency, strong
tooling, and clean packaging on Windows.

| Concern | Choice | Why |
|--------|--------|-----|
| Language / runtime | **C# 12 on .NET 8 (LTS)** | Fast, memory-safe, first-class on Windows, single-file self-contained publish |
| UI framework | **Avalonia UI 11** | Skia-backed, XAML+MVVM, styles/theming, vector-native, renders SVG paths crisply |
| 2D drawing / effects | **SkiaSharp** (via Avalonia + a custom `DrawingContext` control) | GPU-accelerated canvas for the typing surface, caret, particles, charts |
| Vector icons | **SVG → baked** at build time (Svg.Skia) + runtime `Path` geometry | Crisp at any DPI; enforces no-emoji policy |
| Input | **Win32 Raw Input (`WM_INPUT`) + keyboard hook fallback** via P/Invoke | Sub-frame latency, accurate scancodes, layout-independent capture |
| Audio | **MiniAudio** (native) via a thin P/Invoke wrapper, or **NAudio/WASAPI** | Low-latency keystroke SFX, shared-mode WASAPI |
| Storage | **SQLite** via **Microsoft.Data.Sqlite + Dapper** | Zero-config embedded DB, fast, transactional |
| Serialization | **System.Text.Json** (settings/content), SQLite (results) | AOT-friendly, no reflection surprises |
| DI / hosting | **Microsoft.Extensions.Hosting / DependencyInjection** | Standard composition root, options, logging |
| Logging | **Serilog** → rolling file + in-app console | Structured logs, crash diagnostics |
| Charts | **Custom SkiaSharp renderer** (no third-party chart lib) | Full control of look; avoids generic chart aesthetics |
| Tests | **xUnit + FluentAssertions + Verify** (snapshot) | Deterministic engine is highly unit-testable |
| Packaging | **MSIX** (primary) + **Inno Setup** (side-load / portable) | Store-ready + traditional installer |
| CI | **GitHub Actions** (windows-latest) | Build, test, sign, publish artifacts |

### 2.1 Why not alternatives

- **Electron/web:** heavier memory, harder to guarantee input latency and native
  raw-input accuracy; harder to escape "generic web" look.
- **Unity/Unreal:** overkill for a text app; poor crisp-text/UX ergonomics; large
  runtime; slow iteration for UI.
- **WPF:** Windows-only is fine, but Avalonia gives the same MVVM comfort with a
  modern Skia pipeline and a cleaner custom-drawing story. (WPF is an acceptable
  drop-in alternative if the team prefers it — the layered design below is
  UI-framework-agnostic below the Presentation layer.)

---

## 3. High-Level System Architecture

Cadence uses a **layered + MVVM** architecture with a **pure, deterministic
domain core** that has no dependency on UI, IO, or platform.

```
+---------------------------------------------------------------+
|                       PRESENTATION                            |
|  Avalonia Views (XAML) + ViewModels (MVVM) + Design System    |
|  Custom SkiaSharp controls: TypingSurface, Heatmap, Charts    |
+------------------------------△--------------------------------+
                              │ commands / observable state
+------------------------------▽--------------------------------+
|                       APPLICATION                             |
|  Session orchestration, Game-mode controllers, State machines |
|  Use-cases: StartTest, SubmitKeystroke, FinishRun, SavePB     |
+------------------------------△--------------------------------+
             │ interfaces (ports)                │
+------------▽------------+          +------------▽-------------+
|      DOMAIN CORE        |          |     INFRASTRUCTURE      |
|  (pure, no IO)          |          |  Adapters (implement    |
|  TypingEngine           |          |  domain ports)          |
|  ScoringService         |          |  SqliteRepositories     |
|  TextGenerator          |          |  RawInputSource         |
|  KeyModel/Adaptive      |          |  MiniAudioEngine        |
|  Models & value types   |          |  ContentPackLoader      |
+-------------------------+          |  FileConfigStore        |
                                     |  SerilogLogger          |
                                     +-------------------------+

Cross-cutting: DI container, EventBus, Clock, Config, Localization, Logging
```

**Dependency rule:** dependencies point **inward**. Presentation → Application →
Domain. Infrastructure implements interfaces defined by Domain/Application and is
wired at the composition root. The Domain Core never references Avalonia, SQLite,
or Win32.

### 3.1 Data & control flow of a single keystroke (the hot path)

```
Physical key
  → Win32 Raw Input (WM_INPUT)                     [Infrastructure]
  → RawInputSource maps scancode → logical key      (layout-aware)
  → InputEvent{key, downTick, hwTimestamp}          (enqueued lock-free)
  → GameLoop.Update() drains queue (fixed step)      [Application]
  → TypingEngine.ProcessKeystroke(ev)                [Domain, pure]
      • compares against target grapheme
      • updates cursor, error map, timing samples
      • returns KeystrokeResult (correct/incorrect/extra/backspace)
  → Session updates live metrics; raises events
  → TypingSurfaceViewModel observes → invalidates control
  → TypingSurface (Skia) repaints changed glyph runs + caret
  → AudioEngine plays SFX for result (if enabled)
```

Target end-to-end latency budget: **< 16 ms** (see §20).

---

## 4. Solution / Project Layout

```
Cadence.sln
├─ src/
│  ├─ Cadence.Domain/            # pure C#, no deps beyond BCL
│  │   ├─ Typing/                # TypingEngine, Cursor, GraphemeBuffer
│  │   ├─ Scoring/               # WPM, accuracy, consistency
│  │   ├─ Modeling/              # KeyModel, WeaknessDetector, Adaptive
│  │   ├─ Generation/            # TextGenerator, quote/word selection
│  │   ├─ Modes/                 # mode rules (interfaces + rule objects)
│  │   └─ Primitives/            # value types, Result<T>, Grapheme
│  │
│  ├─ Cadence.Application/       # orchestration, use-cases, ports
│  │   ├─ Sessions/              # GameSession, RunController
│  │   ├─ Ports/                 # IResultRepository, IInputSource, IAudio...
│  │   ├─ UseCases/              # StartRun, RecordKeystroke, CompleteRun...
│  │   └─ State/                 # AppStateMachine, ScreenRouter
│  │
│  ├─ Cadence.Infrastructure/    # adapters implementing ports
│  │   ├─ Persistence/           # SQLite, Dapper repos, migrations
│  │   ├─ Input/                 # RawInputSource (Win32 P/Invoke)
│  │   ├─ Audio/                 # MiniAudio wrapper
│  │   ├─ Content/               # pack loader, validators
│  │   ├─ Platform/              # Win32 helpers, DPI, high-res clock
│  │   └─ Config/                # JSON settings store
│  │
│  ├─ Cadence.UI/                # Avalonia app (Presentation)
│  │   ├─ App.axaml              # composition root + DI
│  │   ├─ Design/                # tokens, brushes, typography, motion
│  │   ├─ Icons/                 # SVG geometry resources (NO emoji)
│  │   ├─ Controls/              # TypingSurface, Heatmap, LineChart, Caret
│  │   ├─ Views/                 # Screens (XAML)
│  │   ├─ ViewModels/            # MVVM
│  │   └─ Assets/                # fonts, sounds, packed content
│  │
│  └─ Cadence.Bootstrap/         # entry point, single-file publish target
│
├─ content/                      # source content packs (authored)
│  ├─ words/en.words.json
│  ├─ quotes/en.quotes.json
│  └─ lessons/en.curriculum.json
│
├─ tools/
│  ├─ Cadence.ContentTool/       # validates + bakes content packs
│  └─ Cadence.IconBaker/         # SVG → geometry/atlas, emoji-lint
│
├─ tests/
│  ├─ Cadence.Domain.Tests/
│  ├─ Cadence.Application.Tests/
│  └─ Cadence.Infrastructure.Tests/
│
├─ build/                        # CI scripts, installer, signing
└─ docs/                         # this file + ADRs
```

**Compile-direction check:** `Domain` references nothing internal; `Application`
references `Domain`; `Infrastructure` references `Application`+`Domain`; `UI`
references all three and wires them. Enforced by an architecture test
(NetArchTest) in CI (§21).

---

## 5. Domain Core — The Typing Engine

The engine is **pure and deterministic**: same inputs → same outputs, no clocks
or IO inside. Time is passed in as data (ticks) so runs are reproducible and
testable, and replays are exact.

### 5.1 Text representation — grapheme clusters, not chars

Typing correctness must be judged on **user-perceived characters** (grapheme
clusters), not UTF-16 code units. "é", "ñ", combining marks, and CJK must count
as single targets. The engine uses a `GraphemeBuffer` built with
`System.Globalization.StringInfo`/`TextElementEnumerator`.

```csharp
public readonly record struct Grapheme(string Value, int Index);

public sealed class GraphemeBuffer
{
    private readonly Grapheme[] _items;
    public int Length => _items.Length;
    public Grapheme this[int i] => _items[i];
    public static GraphemeBuffer From(string text); // splits by text elements
}
```

### 5.2 Engine state

```csharp
public sealed class TypingEngine
{
    private readonly GraphemeBuffer _target;
    private int _cursor;                      // index of next expected grapheme
    private readonly List<CharState> _states; // per-target state
    private readonly List<KeystrokeSample> _samples; // timing + correctness log
    private int _extraCount;                  // typed-past-word extras
    private readonly TypingRules _rules;      // from active mode

    public EngineSnapshot Snapshot { get; }   // immutable view for the UI
}

public enum CharState { Pending, Correct, Incorrect, Extra, Corrected }

public readonly record struct KeystrokeSample(
    int TargetIndex,
    Grapheme Expected,
    string Typed,
    bool Correct,
    long Tick,          // high-res tick supplied by caller
    KeyAction Action);  // Type, Backspace, Space, Word-Advance

public enum KeyAction { Type, Backspace, WhitespaceAdvance, Undo }
```

### 5.3 Core operation

```csharp
public KeystrokeResult ProcessKeystroke(TypedInput input, long tick)
```

Algorithm (handles every edge case explicitly):

1. **Backspace** →
   - If in "stop-on-error" mode and cursor is on an error: clear the error,
     move cursor back, mark `Corrected`.
   - If extras exist for current word: remove last extra.
   - Else if `AllowBackspace`: step cursor back, set target back to `Pending`.
   - Never move before the run's committed start (or word start, per rule).
2. **Whitespace (space/enter)** →
   - If at expected word boundary: advance to next word, commit the completed
     word (record per-word WPM sample). 
   - If word incomplete and `RequireFullWord`: register error / block advance
     (mode-dependent).
   - Trailing/leading whitespace normalized by generator, not engine.
3. **Printable grapheme** →
   - If cursor past end: record as `Extra` (bounded by `MaxExtras`), do not
     advance target.
   - Else compare typed grapheme vs expected (respect layout + optional
     smart-quote normalization). Set `Correct`/`Incorrect`.
   - In "stop-on-error" mode, an incorrect char blocks advance until corrected.
   - Advance cursor on correct (and, per mode, on incorrect too — "carefree").
4. Append `KeystrokeSample`. Update running counters. Return `KeystrokeResult`.

`KeystrokeResult` tells the Application layer what happened so it can drive
audio, effects, and completion detection:

```csharp
public readonly record struct KeystrokeResult(
    CharState Outcome,
    bool AdvancedCursor,
    bool WordCompleted,
    bool RunCompleted,
    int CursorIndex);
```

### 5.4 Error-handling modes (rules)

| Rule | Behavior |
|------|----------|
| `StopOnError` | Cannot proceed past a wrong char until fixed (drill-friendly) |
| `Carefree` | Wrong chars are marked but you keep going (test-friendly) |
| `Confidence` | Backspace disabled entirely; commit to what you type |
| `RequireFullWord` | Must complete a word before space advances |

These are values in `TypingRules`, supplied by the active `IGameMode`. The engine
reads rules; it does not know which mode is running.

### 5.5 Determinism & purity guarantees

- No `DateTime.Now`, no `Random` without an injected seed, no file/thread access.
- All randomness flows through `IRandomSource` (seeded per run; the seed is
  stored so any run can be regenerated for replay/verification).
- This makes the entire engine snapshot-testable and replay-exact.

---

## 6. Scoring, Metrics & Analytics

All metrics are computed by pure functions in `Cadence.Domain/Scoring`, from the
`KeystrokeSample` log. Definitions are stated exactly to avoid the ambiguity that
plagues typing apps.

### 6.1 Speed

- **Gross/Net WPM** = `(correctChars / 5) / minutes`. A "word" is standardized as
  **5 characters** (industry convention). Uses only correct chars at run end.
- **Raw WPM** = `(allTypedChars / 5) / minutes` (includes errors) — measures
  finger speed independent of accuracy.
- **Per-word WPM series** = computed at each word-commit; drives the live chart
  and consistency.

### 6.2 Accuracy

- **Accuracy %** = `correctKeystrokes / totalKeystrokes * 100`
  (a char typed wrong then fixed counts against accuracy but not against final
  net WPM — both numbers are shown so the user understands the trade-off).
- **Error count**, **corrected count**, **uncorrected count** shown separately.

### 6.3 Consistency

- **Consistency** = `100 * (1 - CV)`, where `CV` = stddev/mean of the per-word
  WPM series (coefficient of variation, clamped to [0,100]). High = steady pace.

### 6.4 Per-key & per-finger model

For every keystroke we know: expected key, correctness, and **latency**
(tick delta from previous keystroke). Aggregated into:

- **Per-key accuracy** and **median latency** (a rolling model, decayed over
  time so recent performance dominates — EWMA with configurable half-life).
- **Per-finger stats** via a **finger map** derived from the active keyboard
  layout (which finger "owns" each key in touch-typing).
- **Bigram/trigram latency** for common sequences (find slow transitions like
  "th", "ing").

```csharp
public sealed class KeyModel  // persisted per profile
{
    // key → rolling accuracy + median latency (EWMA)
    IReadOnlyDictionary<LogicalKey, KeyStat> Keys { get; }
    IReadOnlyDictionary<string, BigramStat> Bigrams { get; }
    public IEnumerable<LogicalKey> WeakestKeys(int n);
    public void Ingest(IReadOnlyList<KeystrokeSample> run, double halfLifeRuns);
}
```

### 6.5 Adaptive difficulty & weak-key practice

The `TextGenerator` can bias generated text toward the user's weak keys/bigrams
(higher sampling weight), producing targeted-but-natural practice text. Weighting
is capped so text stays readable (never degenerates into "jjj kkk").

### 6.6 Outputs

Every finished run yields a `RunResult` (see §11.2) persisted to SQLite and fed
into the `KeyModel`, achievements engine, and history charts.

---

## 7. Game Modes (Complete Functional Spec)

Every mode implements `IGameMode`, which supplies: the target text (or a
generator), `TypingRules`, the win/lose/finish condition, the live HUD spec, and
the result summary spec. Modes are data-driven and registered in a `ModeCatalog`.

```csharp
public interface IGameMode
{
    ModeId Id { get; }
    TypingRules Rules { get; }
    RunPlan CreatePlan(RunOptions options, IRandomSource rng);
    FinishDecision Evaluate(EngineSnapshot snap, RunClock clock);
    HudSpec Hud { get; }
}
```

### 7.1 Trainer modes

| Mode | Description | Finish condition |
|------|-------------|------------------|
| **Timed Test** | Type generated words for 15/30/60/120 s | Timer expiry |
| **Word Count** | Type N words (10/25/50/100) | N words committed |
| **Quote** | Type a real quote (short/medium/long/xl) | End of quote |
| **Custom Text** | Paste your own passage | End of passage |
| **Curriculum / Lessons** | Structured course: home row → top → bottom → numbers → symbols → capitals → punctuation → full text. Each lesson has pass thresholds (WPM+accuracy) that unlock the next | Lesson goal met |
| **Drill** | Focused practice: specific keys, a bigram set, or "my weakest 10 keys" (adaptive) | Reps or time |
| **Weak-Words** | Generator biased to historically slow words | N words |
| **Zen** | Endless, no timer, no fail, calm styling | User ends |

### 7.2 Arcade modes

| Mode | Description | Lose condition |
|------|-------------|----------------|
| **Falling Words** | Words descend; type a word to destroy it before it reaches the floor. Speed/spawn-rate ramps by wave | A word hits the floor N times |
| **Wave Survival** | Timed waves; combo multiplier for streaks; power-ups (slow-time, clear-screen) earned by accuracy | Health depleted |
| **Ghost Race** | Race a translucent "ghost" caret replaying your PB (or a rival's exported replay) over the same text/seed | Text end (win = beat ghost) |
| **Sprint Ladder** | Escalating difficulty; each cleared stage raises WPM target; miss target → out | Miss stage target |

### 7.3 Shared mechanics

- **Combo / streak** counter (consecutive correct chars) with a multiplier used
  in arcade scoring only (never pollutes trainer WPM).
- **Restart/skip** (Tab+Enter to restart, Esc to bail) — configurable.
- **Practice-this-again** button after any run.
- **Seeded runs** so a "share this run" feature reproduces exact text.

---

## 8. Input Subsystem (Low-latency keyboard)

Accurate typing measurement demands input that is (a) low-latency, (b) reports
correct physical keys regardless of layout, and (c) has trustworthy timestamps.

### 8.1 Capture strategy

- **Primary:** Win32 **Raw Input** (`RegisterRawInputDevices` for keyboards,
  handle `WM_INPUT`). Gives scancodes + make/break with minimal overhead and no
  reliance on the focused control's text pipeline.
- **Translation:** scancode → **logical key** via `MapVirtualKeyEx` +
  `ToUnicodeEx` against the **active keyboard layout** (so Dvorak/Colemak/AZERTY
  and non-US layouts produce the correct target graphemes).
- **Timestamps:** the Raw Input message time plus a `QueryPerformanceCounter`
  read at drain time; we store both and use QPC deltas for latency math.
- **IME/dead keys:** dead-key sequences (e.g. `^` + `e` → `ê`) are composed via
  `ToUnicodeEx` state; full IME composition (CJK) is captured via `WM_IME_*`
  and only the committed string is fed to the engine. Typing games in CJK score
  on committed graphemes.

### 8.2 Why not just handle key events in Avalonia?

Framework key events are fine for menus but add a variable dispatch delay and
can drop/coalesce under load. The gameplay screen uses the raw path; menus use
normal framework input. Both are abstracted behind `IInputSource`:

```csharp
public interface IInputSource
{
    void Start(IntPtr windowHandle);
    bool TryDequeue(out InputEvent ev);   // lock-free MPSC ring buffer
    void Stop();
}

public readonly record struct InputEvent(
    LogicalKey Key, string? Text, bool IsDown, long QpcTick, KeyModifiers Mods);
```

### 8.3 Anti-jitter & correctness

- **Autorepeat** from held keys is filtered (we act on make, ignore synthetic
  repeats during gameplay).
- **N-key rollover** limitations are the keyboard's, not ours; we process events
  in arrival order.
- **Focus loss** pauses the run and the clock (§9.3) so alt-tab doesn't inflate
  or deflate stats.

---

## 9. Game Loop, Timing & Rendering Pipeline

### 9.1 Clock

A single `IClock` backed by `Stopwatch`/QPC provides high-resolution ticks.
`RunClock` wraps it with pause/resume and start-on-first-keystroke semantics
(the timer starts when the user types the first character, not when the screen
appears — standard for typing tests).

### 9.2 Loop model

The typing surface runs a **fixed-timestep update, decoupled render**:

```
accumulator += frameDelta
while (accumulator >= FIXED_DT):        // e.g. 4 ms
    session.Update(FIXED_DT)            # drain input, advance mode logic, timers
    accumulator -= FIXED_DT
render(interpolation = accumulator / FIXED_DT)   # caret blink, particles, tweens
```

- Update is deterministic and independent of frame rate.
- Render is driven by Avalonia's compositor at display refresh (60/120/144 Hz),
  using `TopLevel.RequestAnimationFrame`.
- Trainer screens can idle at low CPU when nothing changes (repaint only on
  keystroke + caret blink); arcade screens animate continuously.

### 9.3 Pause / focus rules

- Losing window focus → pause `RunClock`, stop accepting input, dim screen.
- Regaining focus → show a 3-2-1 resume countdown (arcade) or resume instantly
  in trainer modes (configurable).

### 9.4 Rendering pipeline (TypingSurface control)

The core custom control draws the passage with SkiaSharp:

1. **Layout pass (cached):** shape the target text into glyph runs and lines
   using the chosen font; compute per-grapheme rectangles. Recomputed only on
   text/size/font/DPI change, not per frame.
2. **Paint pass (per invalidation):**
   - Draw glyph runs colored by `CharState` (pending / correct / incorrect /
     extra / corrected) using design tokens.
   - Draw **caret** (block/underline/outline/bar) with smooth interpolated
     motion between grapheme rects and a blink curve.
   - Draw **effects layer** (particles on combo, subtle shake on error) — all
     respecting "reduced motion" accessibility.
3. **Dirty-region** repaint where possible; whole-line repaint on scroll.
4. **DPI-aware:** all metrics in DIPs; Skia surface scaled by render scaling for
   crisp text on 125–200% displays.

### 9.5 Charts & heatmap controls

`LineChart`, `Sparkline`, and `KeyboardHeatmap` are custom SkiaSharp controls (no
third-party chart library) so the visual language matches the design system
exactly (§13) rather than looking like a stock dashboard.

---

## 10. Audio Subsystem

- **Engine:** MiniAudio (native) behind `IAudioEngine`, using WASAPI shared mode;
  target added latency < 20 ms. Pre-decoded PCM buffers for instant playback.
- **Events:** keystroke (correct), error, word-complete, run-complete,
  achievement, UI clicks. Each is a short sample; a small voice pool prevents
  clipping under fast typing.
- **Sound packs:** swappable (e.g. "Mechanical", "Soft", "Off"), authored as
  sample sets in an audio pack manifest. Per-event volume + master volume.
- **Music:** optional low-key ambient loop for arcade; ducked during SFX.
- **No audio required:** everything works silent (accessibility + shared spaces).

```csharp
public interface IAudioEngine
{
    void Preload(SoundPack pack);
    void Play(SoundEvent ev, float gain = 1f);
    void SetMasterVolume(float v);
}
```

---

## 11. Persistence & Data Model

### 11.1 Storage

- **SQLite** database at `%LOCALAPPDATA%\Cadence\cadence.db` (per Windows user).
- **Settings** and **key model snapshots** in JSON under the same folder for easy
  export/backup; the DB is the source of truth for run history.
- **Migrations:** versioned SQL scripts applied on startup (schema_version table).
- **WAL mode** for concurrent read while writing results.

### 11.2 Core schema (abridged)

```sql
CREATE TABLE Profile (
    Id            INTEGER PRIMARY KEY,
    DisplayName   TEXT NOT NULL,
    CreatedUtc    TEXT NOT NULL,
    LayoutId      TEXT NOT NULL DEFAULT 'qwerty-us',
    AvatarIconId  TEXT NOT NULL DEFAULT 'icon.user'   -- SVG icon id, never emoji
);

CREATE TABLE Run (
    Id            INTEGER PRIMARY KEY,
    ProfileId     INTEGER NOT NULL REFERENCES Profile(Id),
    ModeId        TEXT NOT NULL,
    StartedUtc    TEXT NOT NULL,
    DurationMs    INTEGER NOT NULL,
    Seed          INTEGER NOT NULL,            -- reproduces the exact text
    LanguageId    TEXT NOT NULL,
    NetWpm        REAL NOT NULL,
    RawWpm        REAL NOT NULL,
    Accuracy      REAL NOT NULL,
    Consistency   REAL NOT NULL,
    Errors        INTEGER NOT NULL,
    Corrected     INTEGER NOT NULL,
    CharsTyped    INTEGER NOT NULL,
    Valid         INTEGER NOT NULL DEFAULT 1   -- anti-cheat flag (§18)
);

CREATE TABLE KeystrokeSample (      -- optional detailed log (opt-in / capped)
    RunId    INTEGER NOT NULL REFERENCES Run(Id),
    Ordinal  INTEGER NOT NULL,
    KeyId    TEXT NOT NULL,
    Correct  INTEGER NOT NULL,
    LatencyMs INTEGER NOT NULL,
    Action   INTEGER NOT NULL,
    PRIMARY KEY (RunId, Ordinal)
);

CREATE TABLE PersonalBest (
    ProfileId INTEGER NOT NULL,
    ModeKey   TEXT NOT NULL,        -- e.g. 'timed:60:en'
    RunId     INTEGER NOT NULL REFERENCES Run(Id),
    NetWpm    REAL NOT NULL,
    PRIMARY KEY (ProfileId, ModeKey)
);

CREATE TABLE Achievement (
    ProfileId    INTEGER NOT NULL,
    AchievementId TEXT NOT NULL,
    UnlockedUtc  TEXT,
    Progress     REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (ProfileId, AchievementId)
);

CREATE TABLE KeyModelSnapshot (
    ProfileId INTEGER PRIMARY KEY,
    JsonBlob  TEXT NOT NULL,        -- serialized KeyModel (EWMA stats)
    UpdatedUtc TEXT NOT NULL
);

CREATE TABLE Setting (Key TEXT PRIMARY KEY, JsonValue TEXT NOT NULL);
CREATE TABLE Replay (RunId INTEGER PRIMARY KEY, Blob BLOB NOT NULL); -- compressed
```

### 11.3 Repositories (ports → adapters)

`IProfileRepository`, `IRunRepository`, `IPersonalBestRepository`,
`IAchievementRepository`, `IKeyModelStore`, `ISettingsStore`, `IReplayStore` are
defined in Application; Dapper-based implementations live in Infrastructure.

### 11.4 Import / export

- **Export profile** → a single `.cadence` zip (DB rows for the profile + settings
  + key model) for backup/transfer.
- **Export run** → shareable JSON (mode, seed, language, metrics, optional replay)
  enabling ghost races between friends without a server.

---

## 12. Iconography & Asset Rules (No-Emoji Policy)

> **Hard rule:** No emoji anywhere — UI, content packs, achievements, code
> comments, commit messages, docs, or store assets. All symbolic imagery is
> **vector SVG** from the Cadence icon set.

### 12.1 Icon system

- A curated **SVG icon set** authored on a **24×24 grid, 1.75 px stroke,
  rounded joins**, single-path where possible, `currentColor` for theming.
- Icons are compiled by `Cadence.IconBaker` into Avalonia `StreamGeometry`
  resources keyed by id (`icon.play`, `icon.target`, `icon.flame`,
  `icon.keyboard`, `icon.chart`, `icon.trophy`, `icon.gear`, `icon.user`,
  `icon.backspace`, `icon.timer`, `icon.wave`, `icon.ghost`).
- Rendered as `Path`/`Geometry` (crisp at any DPI), colored by design tokens.

### 12.2 Enforcement (automated)

- **Emoji lint** (`Cadence.IconBaker --lint`) scans source, XAML, JSON content,
  and string resources for any code point in Unicode **Emoji** property ranges
  (and variation selector U+FE0F, ZWJ sequences, regional indicators). Any hit
  **fails CI**. Runs as a pre-commit hook and a CI gate (§16.5, §21).
- Content-pack validator rejects packs containing emoji or non-vector image refs
  where an icon id is expected.

### 12.3 Other assets

- **Fonts:** licensed OpenType with a monospace display face for the typing
  surface and a humanist sans for chrome (see §13.2). Fonts embedded/redistributable
  per license.
- **Sounds:** original or properly licensed samples, listed in `CREDITS`.
- **Illustration:** any decorative art is hand-authored SVG/vector consistent
  with the design system — never AI-stock-looking gradients.

---

## 13. Design System (Human-authored, anti-generic)

The visual language is deliberately **editorial and instrument-like** — think a
precision tool or a well-set book, not a bright SaaS dashboard. This is the
concrete antidote to "looks AI-generated."

### 13.1 Principles that keep it from looking machine-made

1. **One restrained accent**, not rainbow gradients. Color carries meaning
   (correct/incorrect/pending), never decoration.
2. **Real typographic hierarchy** via size/weight/spacing — not boxes and
   drop-shadows everywhere.
3. **Hairline rules and generous negative space** instead of heavy cards.
4. **Asymmetry & a baseline grid** — intentional composition, not centered
   everything.
5. **Purposeful motion** — short, eased, physical; nothing floaty or looping for
   no reason.
6. **Tactile detail** — subtle key-cap depth on the on-screen keyboard, ink-like
   caret, paper/graphite surfaces.

### 13.2 Tokens

**Typography**
- Display / typing surface: a clean monospace (e.g. "IBM Plex Mono" or "JetBrains
  Mono") for perfect character alignment while reading.
- Chrome / UI: a humanist sans (e.g. "Inter" or "IBM Plex Sans").
- Scale (modular, 1.25): 12 / 14 / 16 / 20 / 25 / 31 / 39 px. Numerals tabular.

**Color — "Graphite" dark theme (default)**
| Token | Hex | Use |
|-------|-----|-----|
| `bg.base` | `#14161A` | app background (near-black, slightly warm) |
| `bg.raised` | `#1C1F25` | panels |
| `line.hair` | `#2A2E36` | 1px rules |
| `text.dim` | `#6B7280` | pending/untyped glyphs |
| `text.base` | `#C7CDD6` | primary text |
| `text.strong`| `#EDF1F6` | headings, active glyph |
| `accent` | `#E0A340` | single amber accent (caret, focus, key highlights) |
| `good` | `#5FB98E` | correct char |
| `bad` | `#D96C6C` | incorrect char |
| `warn` | `#D9A441` | extras |

**Color — "Paper" light theme**
| Token | Hex |
|-------|-----|
| `bg.base` | `#F4F1EA` (warm paper) |
| `text.base` | `#2B2A28` |
| `accent` | `#B5761F` |
| `good` | `#2F7D57` |
| `bad` | `#B23A3A` |

Additional bundled themes: "Nord-ish cool", "High-Contrast", "Solar" — all
hand-tuned, all meeting contrast targets (§17).

**Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (px). Layout on an **8px
baseline grid**.

**Radius:** 6px default, 2px on inputs (crisp, not pill-shaped everywhere).
**Elevation:** at most two shadow levels, low-opacity, short offset.

**Motion:** durations 90/140/220 ms; easing `cubic-bezier(0.2, 0, 0, 1)`
(decelerate). Caret blink is a soft sine, not a hard on/off.

### 13.3 The typing surface look

- Untyped text at `text.dim`; the **current word** slightly brighter to guide the
  eye; correct chars `good`, wrong chars `bad` with a thin underline, extras
  `warn` struck subtly.
- Caret is a thin `accent` bar (default) that **slides** to the next glyph — the
  "cadence" of the name is expressed in this motion.
- Optional focus mode fades everything except the active line.

---

## 14. Screen Flow, Wireframes & Component Library

### 14.1 Screen map

```
                         ┌──────────────┐
                         │  Splash/Load  │
                         └──────┬───────┘
                                │
        ┌───────────────────────▼───────────────────────┐
        │                    HOME / HUB                    │
        │  quick-start test, mode grid, resume, PB strip   │
        └─┬───────┬───────────┬───────────┬───────────┬──┘
          │       │           │           │           │
     ┌────▼──┐ ┌──▼─────┐ ┌───▼────┐ ┌────▼─────┐ ┌───▼────┐
     │ Play  │ │Curric. │ │ Arcade │ │  Stats   │ │Settings│
     │(mode  │ │lessons │ │ modes  │ │ history  │ │themes/ │
     │ setup)│ │ tree   │ │ menu   │ │ heatmap  │ │input.. │
     └───┬───┘ └───┬────┘ └───┬────┘ └──────────┘ └────────┘
         │         │          │
         └─────────┴────┬─────┘
                        ▼
                 ┌────────────┐        ┌──────────────┐
                 │  GAMEPLAY   │──────▶│  RESULTS      │
                 │ TypingSurf. │ finish │ metrics/chart │
                 └────────────┘        │ retry / next  │
                                       └──────────────┘
   Profiles switcher + Achievements accessible from Home top bar.
```

### 14.2 Gameplay screen wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────┐
│ [icon.keyboard] Cadence      timed · 60s · english   [icon.gear] │  top bar (hairline under)
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│        the quick brown fox jumps over the lazy dog and          │  typing surface
│        then it ▌runs back across the frozen river before        │  (caret = accent bar)
│        the sun rises over the distant hills once more           │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  42 wpm      98% acc      0:37 left      streak 21               │  live HUD (tabular nums)
└────────────────────────────────────────────────────────────────┘
     Esc quit   Tab+Enter restart            (hints, dimmed)
```

### 14.3 Results screen

- Big **Net WPM** numeral, with Raw WPM, Accuracy, Consistency beneath.
- **Per-word WPM line chart** + error markers (custom Skia chart).
- **Keyboard heatmap** of this run (accuracy/latency toggle).
- Deltas vs PB and vs your 7-day average.
- Actions: **Retry (same seed)**, **New (fresh seed)**, **Practice weak words**,
  **Save/Share**. All buttons use SVG icons + text labels.

### 14.4 Component library (Presentation)

Primitives (all themable via tokens, all icon-based, zero emoji):

- `PrimaryButton`, `GhostButton`, `IconButton` (SVG geometry + tooltip)
- `SegmentedControl` (duration/word-count/error-mode selectors)
- `StatTile` (label + tabular numeral + trend sparkline)
- `Toggle`, `Slider`, `Dropdown`, `SearchField`
- `Panel` / `HairlineDivider`
- `Toast` / `InlineBanner` (uses `icon.info`, `icon.warning`, `icon.check`)
- `KeyCap` (on-screen keyboard key with subtle depth)
- Custom draws: `TypingSurface`, `LineChart`, `Sparkline`, `KeyboardHeatmap`,
  `ProgressRing`

Each component has: default/hover/focus/pressed/disabled states, keyboard focus
ring (accent), and a documented token mapping.

---

## 15. Content Pipeline (word lists, quotes, lessons)

### 15.1 Formats (authored JSON, then baked)

**Word list** (`en.words.json`)
```json
{
  "id": "en", "name": "English", "version": 3,
  "words": ["the","of","and","..."],
  "punctuationPack": ["...","..."],
  "numbersPack": true
}
```

**Quotes** (`en.quotes.json`)
```json
{
  "id": "en", "version": 2,
  "quotes": [
    { "id": 1, "text": "...", "source": "…", "length": "medium" }
  ]
}
```

**Curriculum** (`en.curriculum.json`)
```json
{
  "id": "en", "units": [
    { "id":"home-row", "lessons":[
      { "id":"asdf", "generator":"keys:asdf", "goal":{ "wpm":20, "acc":95 } }
    ]}
  ]
}
```

### 15.2 Tooling & validation

`Cadence.ContentTool` validates and **bakes** packs at build time:

- Schema validation; **emoji/no-vector lint** (§12.2); profanity screen on quote
  imports (configurable); dedupe; length classification for quotes; source
  attribution required.
- Bakes to a compact binary pack + a manifest with hashes for integrity.
- Packs are versioned and hot-swappable so new languages/quotes ship without a
  full app update.

### 15.3 Custom & community content

- Users can add **custom text** and **custom word lists** in-app (validated the
  same way). Community packs are plain files dropped into
  `%LOCALAPPDATA%\Cadence\packs\` and verified on load (hash + lint).

---

## 16. Cross-cutting Concerns

### 16.1 Dependency Injection / composition root
`Cadence.Bootstrap` builds a `Host`, registers Domain services (stateless),
Application controllers, and Infrastructure adapters against their ports, then
launches the Avalonia app. All wiring is in one place; no service locator.

### 16.2 Configuration & settings
Strongly-typed `Options` bound from `settings.json`. Live settings changes raise
`SettingChanged` events; the UI reacts without restart (theme, sound, caret,
behavior). Defaults are code-defined; user file overrides.

### 16.3 Eventing
An in-process `IEventBus` (simple pub/sub) decouples systems: `RunCompleted`,
`AchievementUnlocked`, `PersonalBestBeaten`, `SettingChanged`, `FocusLost`. No
event crosses process boundaries.

### 16.4 Logging & diagnostics
Serilog → rolling files in `%LOCALAPPDATA%\Cadence\logs`, plus an in-app
diagnostics panel (frame time, input latency histogram, dropped events). Log
levels configurable; PII-free.

### 16.5 Error handling
- Domain uses `Result<T>`/exceptions-for-bugs discipline; user-facing failures
  become friendly `InlineBanner`s with an `icon.warning`.
- Global exception handler → logs, shows a recoverable dialog, offers to open the
  log folder; the current run is auto-saved as "incomplete" where possible.
- **Emoji lint** is wired here as a build-time invariant, not runtime.

---

## 17. Accessibility & Localization

### 17.1 Accessibility (first-class)

- **Reduced motion** setting: disables particles/shake/caret slide.
- **Colorblind-safe** palettes; correctness also conveyed by **shape/underline**,
  not color alone.
- **High-contrast** theme meeting WCAG AA (4.5:1 body, 3:1 large) — verified in CI
  with a contrast test over tokens.
- **Dyslexia-friendly font** option and adjustable letter/line spacing.
- **Font scaling** (90–160%) without breaking layout (baseline grid holds).
- **Full keyboard navigation** with a visible accent focus ring; **UIA**
  (Windows automation) properties on all controls for screen readers; the typing
  surface exposes progress and current word to assistive tech.
- **Remappable controls**; **one-handed layouts** supported via layout packs.
- **Caption/announce** run results for screen-reader users.

### 17.2 Localization

- All UI strings in `.resx`/JSON resource catalogs, keyed, no concatenation;
  supports RTL layout mirroring.
- Word lists/quotes/curricula are per-language content packs (§15).
- Number/date formatting via `CultureInfo`. Keyboard-layout awareness (§8) makes
  non-US layouts first-class for typing accuracy.
- Ships **English** at v1; the pipeline supports adding languages without code
  changes.

---

## 18. Anti-cheat, Replays & Ghost Races

### 18.1 Replay recording

Every run records the keystroke timeline (key, action, QPC-relative tick) plus
the run **seed**, language, mode, and layout. Compressed and stored in `Replay`.
Because the engine is deterministic, replaying the timeline through the engine
reproduces the run **exactly** — enabling:

- **Ghost race:** replay the PB's caret alongside a live run.
- **Verification:** re-simulate a submitted run and confirm the metrics match.

### 18.2 Result validation (for future leaderboards)

Even though v1 is offline, results carry a validity flag computed by sanity
checks so leaderboards can be added safely later:

- Impossibly low inter-key latencies / superhuman consistency flags.
- Timeline must reproduce the reported metrics deterministically.
- Seed + layout + content-pack hash must be internally consistent.
- Paste-detection: a burst of committed text with no per-key events is rejected
  for competitive modes (allowed in Zen/Custom).

Flagged runs still save to personal history (marked `Valid=0`) but are excluded
from PBs/competitive contexts.

### 18.3 Online hooks (v2, designed-for, not built)

Ports (`ILeaderboardClient`, `IMatchmaker`) are defined but unimplemented in v1;
replay/seed format is already server-verifiable, so online play is an additive
change, not a rewrite.

---

## 19. Security, Privacy & Telemetry

- **Offline-first, no account required.** No data leaves the machine unless the
  user opts into (future) online features.
- **Telemetry is opt-in**, anonymous, aggregate (e.g. crash counts, feature use);
  contents shown before enabling; stored locally and only sent if enabled.
- **No PII**; display name is local-only and user-chosen.
- Content packs verified by hash; custom packs sandboxed to data only (no code
  execution — packs are data, never scripts).
- App is **code-signed** (§22); updates verified by signature.
- Local DB is the user's; export/delete-all provided (privacy control).

---

## 20. Non-Functional Requirements & Budgets

| Attribute | Target |
|-----------|--------|
| Input→visual latency | < 16 ms typical, < 33 ms worst-case |
| Frame rate | Matches display (60/120/144 Hz); no dropped frames while typing |
| Update step | 4 ms fixed; jitter < 1 ms |
| Cold start | < 2.0 s to Home on a mid-range 2020 laptop |
| Idle CPU (trainer) | < 2% (repaint only on activity) |
| Memory | < 250 MB typical working set |
| DB write (finish run) | < 20 ms, off the UI thread |
| Crash-free sessions | > 99.9% |
| Min spec | Win10 1809 x64/ARM64, 4 GB RAM, DX11-capable GPU (software fallback OK) |

Budgets are asserted where possible by perf tests and an in-app latency
histogram (§16.4).

---

## 21. Testing Strategy

| Layer | Approach |
|-------|----------|
| **Domain** | Extensive unit tests (xUnit + FluentAssertions). The pure engine is exhaustively tested: every rule, backspace edge case, grapheme handling, extras, word-commit, scoring formulas. **Property-based tests** (FsCheck) assert invariants (accuracy in [0,100], WPM monotonic w.r.t. correct chars, replay determinism). **Snapshot tests** (Verify) lock engine snapshots for sample runs. |
| **Scoring** | Golden-value tests against hand-computed WPM/accuracy/consistency fixtures. |
| **Application** | Use-case tests with in-memory fakes for all ports; state-machine transition tests. |
| **Infrastructure** | SQLite repo tests against a temp DB (real SQLite, migrations applied); content-pack validator tests incl. an **emoji-detection test suite** with tricky ZWJ/variation-selector cases. |
| **Input** | Deterministic tests feed synthetic `InputEvent` streams (raw path abstracted); manual latency measurement rig documented. |
| **UI** | ViewModel unit tests; Avalonia headless render tests for key controls (TypingSurface layout, chart geometry). |
| **Architecture** | **NetArchTest** enforces the dependency rule (Domain references nothing internal, etc.). |
| **Accessibility** | Automated contrast checks over theme tokens; keyboard-navigation smoke tests; UIA property presence tests. |
| **No-emoji gate** | CI job runs `IconBaker --lint` over src + content + resources; any emoji code point fails the build. |
| **Performance** | Micro-benchmarks (BenchmarkDotNet) for engine hot path; startup-time and input-latency budget checks. |

Coverage target: Domain ≥ 90% line/branch; overall ≥ 75%.

---

## 22. Build, Packaging, Signing & Updates

- **Publish:** `dotnet publish -r win-x64 (and win-arm64) --self-contained` →
  single-file, trimmed where safe (Skia/native excluded from trim). ReadyToRun
  images for fast startup.
- **Installers:**
  - **MSIX** (Store + sideload) — clean install/uninstall, auto-update via Store.
  - **Inno Setup** EXE — traditional installer + a **portable ZIP** (no install).
- **Code signing:** Authenticode sign the EXE/MSIX with an EV/OV cert in CI;
  timestamped. Updates verified by signature before applying.
- **Updates:** MSIX handles Store updates; the sideload build uses an in-app
  updater that checks a signed manifest (opt-in), downloads, verifies hash+sig,
  and swaps on restart. Content packs update independently of the app binary.
- **Versioning:** SemVer; `schema_version` in DB gates migrations; content packs
  carry their own versions.
- **CI pipeline (GitHub Actions, windows-latest):** restore → build → unit tests
  → architecture test → **emoji lint** → accessibility/contrast test → publish →
  sign → package (MSIX + Inno + ZIP) → upload artifacts.

---

## 23. Milestone Roadmap

1. **M0 — Skeleton:** solution, DI, window, design tokens, TypingSurface renders
   static text with caret. No-emoji lint in CI from day one.
2. **M1 — Core loop:** raw input path, TypingEngine + scoring, Timed & Word-count
   modes, results screen, SQLite persistence.
3. **M2 — Depth:** Quote/Custom/Zen modes, settings/themes, sound, history charts,
   keyboard heatmap, key model + adaptive weak-key drills.
4. **M3 — Curriculum:** lessons tree, progression/unlocks, achievements.
5. **M4 — Arcade:** Falling Words, Wave Survival, Ghost Race (replays).
6. **M5 — Polish & ship:** accessibility pass, localization framework, MSIX/Inno,
   signing, updater, perf-budget verification, store assets (vector only).
7. **v2 (post-launch):** online leaderboards & ghost sharing via existing hooks.

---

## 24. THOROUGH REVIEW — element-by-element verification

Each subsystem is checked for **completeness**, **edge cases**, and
**correctness of the design**. `[OK]` = specified and coherent; notes call out
residual risks and how they're handled.

### 24.1 Domain / Typing Engine
- `[OK]` Grapheme-based comparison — handles accents, combining marks, CJK.
- `[OK]` Purity/determinism — no clock/IO/unseeded random; enables replays & tests.
- `[OK]` Backspace edge cases: at start, across word boundary, on extras, in
  confidence mode (disabled) — all enumerated in §5.3.
- `[OK]` Extras bounded by `MaxExtras` (prevents unbounded growth on key-mashing).
- `[OK]` Word-commit sampling drives per-word WPM & consistency.
- **Edge:** paste into custom text — handled at input layer, not engine; engine
  only sees committed graphemes.
- **Edge:** empty/whitespace-only target — generator guarantees non-empty plans;
  engine guards against zero-length target (returns immediate finish).
- **Risk:** exotic ZWJ emoji as *content* — impossible by policy; emoji lint
  blocks them from ever entering content (§12.2).

### 24.2 Scoring & Metrics
- `[OK]` Net vs Raw WPM defined precisely (5-char word standard).
- `[OK]` Accuracy counts corrections against accuracy but not net WPM — both
  surfaced so users aren't misled.
- `[OK]` Consistency = 1−CV, clamped; guards divide-by-zero (mean=0 ⇒ 0).
- `[OK]` Latency math uses QPC deltas, not wall clock.
- **Edge:** sub-second runs — minutes computed from QPC; no integer-second
  rounding error.
- **Edge:** zero correct chars ⇒ WPM 0, accuracy 0, no NaNs (explicit guards).

### 24.3 Game Modes
- `[OK]` All trainer + arcade modes specified with finish/lose conditions (§7).
- `[OK]` Unified `IGameMode` contract; data-driven catalog; rules injected into
  engine (separation intact).
- `[OK]` Combo/multiplier isolated to arcade scoring; never contaminates WPM.
- `[OK]` Seeded runs → reproducible/shareable; underpins ghost & verification.
- **Edge:** Falling Words with faster typing than spawn — spawn/ramp curve keeps
  pressure; empty-screen handled (waves gate spawns).
- **Edge:** Ghost race where user quits early — ghost continues; run marked
  incomplete, no PB.

### 24.4 Input Subsystem
- `[OK]` Raw Input primary + framework input for menus; both behind `IInputSource`.
- `[OK]` Layout-aware translation (Dvorak/Colemak/AZERTY/non-US) via `ToUnicodeEx`.
- `[OK]` Dead keys & IME composition handled; only committed text scored.
- `[OK]` Autorepeat filtered; focus loss pauses clock+input.
- **Edge:** keyboard NKRO limits — acknowledged as hardware; events processed in
  order.
- **Edge:** global hook permission/AV concerns — Raw Input (not a low-level hook)
  is used for gameplay to avoid AV false positives; hook is fallback only.
- **Risk:** timestamp source drift — single QPC source used for all deltas.

### 24.5 Game Loop, Timing, Rendering
- `[OK]` Fixed-step update + decoupled render → frame-rate-independent logic.
- `[OK]` Clock starts on first keystroke; pause/resume with countdown.
- `[OK]` Layout pass cached; paint pass dirty-region; DPI-aware crisp text.
- `[OK]` Reduced-motion respected in effects.
- **Edge:** very long custom text — line layout virtualized/scrolled; only
  visible lines painted.
- **Edge:** display hot-swap / DPI change mid-run — layout invalidated & rebuilt;
  run continues (timing unaffected).

### 24.6 Audio
- `[OK]` Low-latency WASAPI via MiniAudio; pre-decoded buffers; voice pool.
- `[OK]` Fully optional; swappable sound packs; per-event volume.
- **Edge:** no output device / device change — engine no-ops gracefully; device
  change re-initializes without crashing gameplay.

### 24.7 Persistence & Data Model
- `[OK]` SQLite + WAL + versioned migrations; per-user LOCALAPPDATA location.
- `[OK]` Schema covers profiles, runs, samples, PBs, achievements, key model,
  settings, replays.
- `[OK]` Detailed keystroke log is opt-in/capped (storage control).
- `[OK]` Import/export for backup & sharing (run + optional replay).
- **Edge:** DB corruption — integrity check on startup; auto-backup before
  migration; recovery path documented.
- **Edge:** multiple app instances — WAL + single-writer discipline; second
  instance detected and focuses the first.

### 24.8 Iconography / No-Emoji Policy
- `[OK]` SVG icon set on a strict grid; baked to geometry; themed by tokens.
- `[OK]` **Automated emoji lint** across src/content/resources fails CI; pre-commit
  hook; content validator rejects emoji — the rule is enforced, not just stated.
- `[OK]` Avatars/achievements/UI all use icon ids, never emoji (schema uses
  `AvatarIconId`).
- **Edge:** tricky emoji encodings (ZWJ, VS16, regional indicators, skin-tone
  modifiers) — lint covers full Emoji property + modifiers, with a test suite.

### 24.9 Design System
- `[OK]` Explicit tokens: type scale, color themes, spacing, radius, elevation,
  motion — concrete values given, not vibes.
- `[OK]` Anti-generic principles codified (single accent, hairlines, negative
  space, asymmetry, purposeful motion, tactile detail).
- `[OK]` Correctness colors double-encoded with shape/underline for colorblind
  users.
- **Risk:** "looks AI-made" — mitigated by human design tokens, editorial layout,
  bespoke Skia charts (no stock chart library), and custom icon set. A design
  review checklist is part of DoD.

### 24.10 Screens & Components
- `[OK]` Full screen map + gameplay/results wireframes.
- `[OK]` Component library enumerated with states and token mappings.
- `[OK]` Custom-drawn TypingSurface/charts/heatmap match design language.
- **Edge:** ultrawide / small windows — responsive grid; min window size defined;
  typing surface reflows.

### 24.11 Content Pipeline
- `[OK]` JSON schemas for words/quotes/curriculum; build-time bake + validation.
- `[OK]` Emoji/vector lint, dedupe, attribution, profanity screen in tooling.
- `[OK]` Hot-swappable versioned packs; custom & community packs sandboxed to data.
- **Edge:** malformed community pack — validator rejects with a clear banner;
  never crashes load.

### 24.12 Cross-cutting
- `[OK]` DI composition root single-source; typed config with live reload;
  in-process event bus; structured logging + diagnostics panel; global error
  handler with recovery.
- **Edge:** unhandled exception during a run — auto-save incomplete, log, offer
  log folder, return to Home safely.

### 24.13 Accessibility & Localization
- `[OK]` Reduced motion, colorblind palettes, high-contrast (WCAG AA, CI-checked),
  dyslexia font, scaling, full keyboard nav, UIA for screen readers, remapping,
  one-handed layouts.
- `[OK]` Resource-based strings, RTL mirroring, culture formatting, per-language
  content; English at v1 with a code-free path to add languages.
- **Edge:** RTL + monospace typing surface — layout mirrors chrome; typing surface
  direction follows content language.

### 24.14 Anti-cheat, Replays, Ghosts
- `[OK]` Deterministic replay from seed+timeline; ghost race; server-verifiable
  format for future online.
- `[OK]` Validity checks (latency sanity, timeline↔metrics match, paste detection)
  with `Valid` flag; flagged runs kept in history, excluded from PBs.
- **Edge:** clock/QPC anomalies — bounded/validated; anomalous runs flagged.

### 24.15 Security & Privacy
- `[OK]` Offline-first, no account, opt-in anonymous telemetry, no PII, hash-verified
  packs, no code execution in packs, code signing, export/delete-all.

### 24.16 Non-functional & Testing & Build
- `[OK]` Concrete budgets (latency/fps/startup/memory) with in-app verification.
- `[OK]` Deep test pyramid; architecture test enforces layering; emoji + contrast
  gates in CI; perf micro-benchmarks.
- `[OK]` Self-contained publish; MSIX + Inno + portable ZIP; Authenticode signing;
  signed updates; SemVer + DB/content versioning.

### 24.17 Traceability — "complete functionality" checklist
Every commonly-expected typing-game capability is present:

| Capability | Where |
|-----------|-------|
| Timed / word-count / quote / custom / zen | §7.1 |
| Learn-to-type curriculum with progression | §7.1 |
| Adaptive weak-key & weak-word practice | §6.5, §7.1 |
| Arcade (falling words, survival, ghost, ladder) | §7.2 |
| Live WPM/raw/accuracy/consistency/streak HUD | §6, §14.2 |
| Per-key/per-finger/bigram analytics + heatmap | §6.4, §14.3 |
| History charts & personal bests | §11.2, §14.3 |
| Achievements | §11.2, §7 |
| Multiple profiles | §11.2 |
| Themes & full settings | §13, §16.2 |
| Multiple keyboard layouts | §8.1 |
| Sound packs (optional) | §10 |
| Accessibility suite | §17.1 |
| Localization framework + content packs | §15, §17.2 |
| Replays / ghost / shareable seeds | §18 |
| Import/export/backup | §11.4 |
| Offline, private, signed, updatable | §19, §22 |

**Conclusion of review:** the architecture is internally consistent (dependency
rule holds), functionally complete for a shipping v1, edge cases are enumerated
with mitigations, the no-emoji/vector-icon rule is *enforced* (not merely
stated), and the design system is concrete and deliberately human-authored to
avoid a generic/AI appearance. Open risks are tracked in §25.

---

## 25. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Input latency exceeds budget on low-end GPUs | Med | High | Raw input path, dirty-region paint, software-render fallback, latency histogram gate |
| R2 | Crisp text across DPI/themes is fiddly | Med | Med | Skia sub-pixel text, cached layout, DPI tests, snapshot render tests |
| R3 | Global hook triggers AV false-positive | Low | High | Use Raw Input (not LL hook) for gameplay; hook only as opt-in fallback; signed binary |
| R4 | Trimming breaks Skia/native deps | Med | Med | Exclude native from trim; smoke-test published artifact in CI |
| R5 | "Looks AI-generated" critique | Med | Med | Human design tokens, editorial layout, bespoke icons/charts, design-review DoD |
| R6 | Content licensing (fonts/quotes/sounds) | Med | Med | Track licenses in CREDITS; prefer OFL/permissive; attribution required by tooling |
| R7 | Scope creep into online too early | Med | Med | v1 offline; online behind existing ports only in v2 |
| R8 | ARM64 native lib availability | Low | Med | Verify SkiaSharp/MiniAudio ARM64 builds early; x64 emulation fallback |

---

## 26. Glossary

- **Grapheme cluster:** a user-perceived character (may be multiple code points).
- **Net/Raw WPM:** speed counting only correct / all typed chars (5-char word).
- **Consistency:** steadiness of per-word speed (1 − coefficient of variation).
- **EWMA:** exponentially weighted moving average (recency-biased key model).
- **QPC:** QueryPerformanceCounter — Windows high-resolution timer.
- **Raw Input:** Win32 API delivering low-level device input with low overhead.
- **Ghost:** a translucent replay of a past run raced against live.
- **Seed:** RNG seed that reproduces a run's generated text exactly.
- **Port/Adapter:** interface (Domain/Application) implemented in Infrastructure.

---

*End of architecture. This document is implementation-ready: every subsystem has
a contract, a data shape, and an enforced rule set — including the vector-icon /
no-emoji policy, which is validated automatically in CI rather than left to
convention.*
