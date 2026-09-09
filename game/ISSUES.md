# Cadence — Issues & Fixes Log

Every problem hit during development, its root cause, and how it was fixed —
organised by version. Newest version on top. Each issue has a stable ID
(`ISSUE-<version>-<n>`) so it can be referenced from commits and PROGRESS.md.

Severity: **blocker** (stops build/run) · **bug** (wrong behaviour) ·
**minor** (polish) · **note** (decision/caveat).

---

## v1.0.0

### ISSUE-1.0.0-1 — Gear button did double duty (theme cycle vs. settings)
- **Severity:** minor
- **Symptom:** the top-bar gear cycled themes in earlier versions; adding a full
  Settings screen made that surprising and hid the new screen.
- **Root cause:** overloaded control.
- **Fix:** the gear now opens Settings (a `data-nav` target); theme selection
  lives in Settings as a proper segmented control. Removed the old
  `cycle-theme` handler; guarded `toggle-sound`/`toggle` handlers with null
  checks since the gameplay top bar omits some of them.
- **Status:** resolved.

### ISSUE-1.0.0-2 — Locale switch needed a DOM document in unit tests
- **Severity:** bug (test env)
- **Symptom:** `setLocale()` sets `document.documentElement.lang/dir`; under
  `node --test` there is no `document`, so i18n tests threw.
- **Root cause:** the framework touches the DOM for direction/lang, which is
  unavailable in Node.
- **Fix:** added a minimal `globalThis.document` shim in the i18n test; the
  module itself remains DOM-touching only in `setLocale`, which is acceptable for
  a UI concern. (In the native port this maps to setting culture + flow
  direction.)
- **Status:** resolved.

### ISSUE-1.0.0-3 — Caret-style setting had no effect
- **Severity:** bug
- **Symptom:** choosing block/underline caret in Settings did nothing.
- **Root cause:** the surface only ever drew a bar caret; no style hook.
- **Fix:** added `setCaretStyle()` on `TypingSurface` + CSS variants
  (`caret-bar/block/underline`); `renderPlaying()` applies the saved style.
- **Status:** resolved.

### ISSUE-1.0.0-4 — Making the no-emoji rule real, not aspirational
- **Severity:** note (policy hardening)
- **Symptom:** the rule was verified manually each version; a 1.0 needs it
  automated so a future contributor can't slip an emoji in.
- **Root cause:** no committed enforcement.
- **Fix:** added `tools/emoji-lint.mjs` (fails on emoji code points, allows plain
  technical arrows), an `npm run check` script, and a GitHub Actions workflow
  that runs emoji-lint + tests + build on every push. This is the §12.2/§16.5
  gate from the architecture, now executable.
- **Status:** resolved.

---

## v0.5.0

### ISSUE-0.5.0-1 — Start button passed the click Event as the run seed
- **Severity:** bug (latent since v0.1, found while adding ghost racing)
- **Symptom:** `onclick = startRun` wired the DOM click handler directly, so the
  browser called `startRun(event)`. `event` coerced through `?? randomSeed()`
  logic to a truthy object, and in some paths to `0`, which meant "New run"
  could reuse the same seed / text instead of a fresh random one.
- **Root cause:** passing a function reference as an event handler leaks the
  event object into the first parameter.
- **Fix:** wrapped as `onclick = () => startRun()` (and `() => startLesson(...)`),
  so no seed is passed and a fresh random seed is generated. Ghost race passes an
  explicit seed on purpose.
- **Status:** resolved.
- **Lesson:** never bind a multi-arg domain function directly as an event handler.

### ISSUE-0.5.0-2 — Ghost timeline had no stored cursor index
- **Severity:** bug
- **Symptom:** replays store `targetIndex` per sample, not the resulting cursor,
  so naively reading it produced a jittery / non-monotonic ghost.
- **Root cause:** the engine's sample records the index acted on, and backspaces
  move the cursor backward, so raw indices aren't monotonic.
- **Fix:** `buildCursorTimeline()` reconstructs cursor position by rule (type/
  whitespace advance to `max(cursor, i+1)`, backspace decrements), producing a
  clean monotonic-forward timeline that still reflects corrections. Verified by
  the monotonic-advancement and backspace replay tests.
- **Status:** resolved.

### ISSUE-0.5.0-3 — Ghost seed must match the live run's text
- **Severity:** bug
- **Symptom:** a ghost recorded on one random text would visually race over a
  *different* freshly-generated text, making the race meaningless.
- **Root cause:** generated modes pick a new seed unless one is supplied.
- **Fix:** `startRun()` uses the ghost replay's `seed` as the effective seed, so
  the deterministic generator reproduces the identical passage. This is the same
  determinism guarantee the architecture relies on for verification (§18).
- **Status:** resolved.

---

## v0.4.0

### ISSUE-0.4.0-1 — Frame-time spikes teleported words through the floor
- **Severity:** bug
- **Symptom:** after a tab stall / alt-tab, the next animation frame had a huge
  `dt`, moving falling words a large distance in one step — sometimes straight
  past the floor, costing multiple lives unfairly (and skipping the collision
  band).
- **Root cause:** using the raw `requestAnimationFrame` delta with no clamp.
- **Fix:** clamp `dt` to 0.05s per step in `arcadeLoop()` (matches the fixed-step
  spirit of ARCHITECTURE §9.2). The simulation stays stable across stalls.
- **Status:** resolved.

### ISSUE-0.4.0-2 — Avoiding emoji for lives/combo indicators
- **Severity:** note (policy)
- **Symptom:** the quick way to show "lives" is filled/empty dots, and the first
  draft used the ● / ○ characters.
- **Root cause:** those are convenient but risk drifting toward emoji-like glyphs
  and depend on font rendering; the project rule is vector SVG only.
- **Fix:** replaced the character pips with inline SVG circle icons (filled =
  life remaining, outline = lost). Consistent with §12 and the no-emoji policy.
- **Status:** resolved by design.

### ISSUE-0.4.0-3 — Canvas blurry on high-DPI displays
- **Severity:** minor
- **Symptom:** canvas text looked soft on high-DPI screens.
- **Root cause:** drawing at CSS pixel size without accounting for
  devicePixelRatio.
- **Fix:** `ArcadeRenderer` sizes the backing store by `dpr` (capped at 2) and
  scales the context transform; re-runs on resize. Crisp text per §20.
- **Status:** resolved.

---

## v0.3.0

### ISSUE-0.3.0-1 — Lesson key-set purity vs. real-word sprinkling
- **Severity:** bug
- **Symptom:** early lesson generator sometimes injected small real words (e.g.
  "the") into a lesson whose key set didn't include those letters, so the
  home-row lesson could show characters the user hadn't learned. The purity test
  caught it.
- **Root cause:** the "sprinkle a real word for rhythm" branch didn't verify the
  word's letters were all within the lesson's key set.
- **Fix:** the sprinkle branch now only picks a small word when *every* letter is
  in `keys` (`[...w].every((c) => keys.includes(c))`). Verified by
  `curriculum.test.js` "home-row lesson text only uses its key set".
- **Status:** resolved.

### ISSUE-0.3.0-2 — `lesson` mode leaked into the home mode picker
- **Severity:** minor
- **Symptom:** adding the internal `lesson` mode to the `Modes` map made it
  appear as a selectable tile on the Play screen, which is wrong — lessons are
  launched from the Learn tree.
- **Root cause:** `listModes()` enumerated every entry in `Modes`.
- **Fix:** introduced an `INTERNAL_MODES` set and filtered it out of
  `listModes()`. The mode still works when invoked directly by the curriculum UI.
- **Status:** resolved.

### ISSUE-0.3.0-3 — Retry/Home ambiguity between lessons and free play
- **Severity:** bug
- **Symptom:** after a lesson, "Retry"/"New" would start a free-play run and
  "Home" would go to the Play screen, losing the user's place in the course.
- **Root cause:** the results actions assumed a single (free-play) flow.
- **Fix:** tracked `state.lastLesson`; results actions now branch — Retry/New
  restart the *lesson*, and Home returns to the *Learn* tree when the finished
  run was a lesson.
- **Status:** resolved.

---

## v0.2.0

### ISSUE-0.2.0-1 — Achievement predicates could crash a run on bad input
- **Severity:** bug (defensive)
- **Symptom:** a malformed run object passed to an achievement `test()` would
  throw, and (without guarding) could break the whole finish/results flow.
- **Root cause:** predicates read nested fields (e.g. `bestStreak`) that might be
  undefined for older stored runs.
- **Fix:** wrapped each predicate call in `evaluate()` in try/catch, and used
  nullish fallbacks (`c.run.bestStreak ?? 0`) in the rules. A bad predicate now
  silently skips rather than aborting the run.
- **Status:** resolved.

### ISSUE-0.2.0-2 — Heatmap needed run data that survives finish
- **Severity:** minor
- **Symptom:** the results heatmap toggle (accuracy/speed) re-rendered from
  per-key stats, but those were computed once and discarded.
- **Root cause:** per-key stats were only used to update the persisted key model,
  not retained for the results UI.
- **Fix:** store the finished run's `perKey` array in app state (`lastPerKey`) so
  the toggle can re-render either view without recomputation.
- **Status:** resolved.

### ISSUE-0.2.0-3 — Custom-text HTML injection risk
- **Severity:** bug (safety)
- **Symptom:** user-supplied custom text rendered into the textarea value could
  break out of the attribute/markup.
- **Root cause:** interpolating raw user text into HTML.
- **Fix:** added `escapeHtml()` for the textarea content; the typing surface
  already renders text as DOM `textContent`, not HTML, so the play view was safe.
- **Status:** resolved.

---

## v0.1.0

### ISSUE-0.1.0-1 — No .NET SDK in the build environment
- **Severity:** blocker (for the spec's chosen stack)
- **Symptom:** `dotnet` not installed; the architecture targets C#/.NET 8 +
  Avalonia, which cannot compile, run, or preview here.
- **Root cause:** the sandbox provides Node.js/Python only, no .NET toolchain.
- **Fix:** built v0.1 as a **JavaScript/Vite** app while keeping the **domain
  core pure and framework-free**, mapping 1:1 to the spec's C# types. This
  yields a live, playable, previewable game now, and the core logic ports to
  the .NET target unchanged. Recorded as an intentional deviation in
  PROGRESS.md (v0.1.0 "Deviations").
- **Status:** resolved (by substitution). Revisit when a .NET env is available.

### ISSUE-0.1.0-2 — Two domain tests failed on first run
- **Severity:** bug (in the tests, not the engine)
- **Symptom:** `node --test` reported 12/14 pass; failures in
  "backspace steps back and marks corrected" and the scoring golden-value test.
- **Root cause:** the **test expectations were wrong**, not the engine:
  1. Backspacing a previously-*incorrect* slot is spec'd (§5.3) to mark it
     `corrected`, but the test asserted `pending`.
  2. 24 correct chars / 5 / 1 min = **4.8 wpm** (exact), but the test asserted a
     5–6 wpm range.
- **Investigation:** ran the engine directly and confirmed it produced the
  spec-correct values (`corrected`; netWpm 4.8, acc 100).
- **Fix:** corrected both assertions to match the specified behaviour
  (`corrected`; netWpm in 4.5–5.0). Kept the engine untouched — it was right.
- **Status:** resolved. 14/14 passing.
- **Lesson:** golden-value tests must be computed by hand from the spec's exact
  formula, not from a rough guess.

### ISSUE-0.1.0-3 — Vite dev server behind the preview proxy host
- **Severity:** blocker (for the live preview)
- **Symptom:** the in-app preview is served via a proxy host
  (`{port}-{id}.e2b.app`); a default Vite config can reject unknown hosts and
  HMR can try the wrong websocket port.
- **Root cause:** Vite's host allow-list and HMR client-port defaults assume
  direct localhost access.
- **Fix:** in `vite.config.js` set `server.host = '0.0.0.0'`,
  `allowedHosts: true`, and `hmr.clientPort = 443` so the proxied preview loads
  and hot-reload connects. Server binds to 0.0.0.0 for external visibility.
- **Status:** resolved. Server responds 200 for index, `main.js`, and modules.

### ISSUE-0.1.0-4 — Sandboxed preview blocks external fonts (note)
- **Severity:** note
- **Symptom:** the workspace file-preview iframe has no network, so web fonts
  (JetBrains Mono / Inter) would not load there.
- **Root cause:** `sandbox="allow-scripts"` iframe with no external network.
- **Decision:** the CSS uses a **font stack that falls back** to system
  monospace/sans (`Consolas`, `Segoe UI`, `system-ui`), so typography degrades
  gracefully with no layout break. The live dev-server preview (a real browser
  tab) is unaffected. No web-font `@import` was added, avoiding a broken-resource
  request entirely.
- **Status:** accepted by design.

### ISSUE-0.1.0-5 — Tab key would move focus out of the game
- **Severity:** bug
- **Symptom:** pressing Tab (used for the "Tab then Enter = restart" shortcut)
  risked shifting browser focus away from the capture surface.
- **Root cause:** Tab is the browser's default focus-traversal key.
- **Fix:** `keydown` handler calls `preventDefault()` on Tab and tracks a
  `tabHeld` flag; Enter-after-Tab restarts the run with the same seed.
- **Status:** resolved.

### ISSUE-0.1.0-6 — Space and Backspace triggering browser actions
- **Severity:** bug
- **Symptom:** Space scrolls the page / Backspace can navigate back in some
  setups, corrupting gameplay.
- **Root cause:** default browser key behaviour on Space/Backspace.
- **Fix:** `preventDefault()` for Space, Backspace, and single printable keys
  while on the playing screen; capture handler registered with `capture: true`.
- **Status:** resolved.

---

## Template for future entries

```
### ISSUE-<version>-<n> — <short title>
- **Severity:** blocker | bug | minor | note
- **Symptom:** what was observed
- **Root cause:** why it happened
- **Fix:** what changed (files/functions)
- **Status:** resolved | open | accepted by design
- **Lesson:** (optional) what to remember
```
