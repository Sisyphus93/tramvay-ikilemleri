# arena-verify — throwaway harness (not shipped)

`audio-engine.mjs` needs **nothing** but `esbuild` (already a devDependency): it
bundles `src/utils/audio.ts`, runs it against an instrumented mock Web Audio API
and a mock `localStorage`, and checks the gain graph, the three mute switches,
the outcome-group fade, the persistence keys and the `tramvay_volume` migration.
No new dependency, so it stays in the repo:

```bash
node arena-verify/audio-engine.mjs
```

`audio-e2e.mjs` runs the real app bundle inside jsdom against an instrumented
mock Web Audio API and a virtual clock. Chromium could not be downloaded in this
sandbox, so this stands in for "Playwright click-through": it exercises the
actual components and the actual audio module, but not real decoding or real
rendering.

It needs `jsdom` and `esbuild`. Both are devDependencies, so a plain `npm ci` in
the repository root is the whole setup — nothing outside the repo, no hard-coded
paths, and all three modes are wired into `package.json`:

```bash
npm run audio:e2e            # all three modes, in order

# or individually, from the repo root
node arena-verify/audio-e2e.mjs                  # normal flow
node arena-verify/audio-e2e.mjs . missing-json   # sfx.json served as index.html (SPA fallback)
node arena-verify/audio-e2e.mjs . missing-sprite # every sprite format 404/HTML
```

It makes no network request at runtime: `window.fetch` is replaced by a mock that
serves `public/audio/*` from disk, and jsdom is created without
`resources: 'usable'`, so it loads no external resource either. The exit code is
the number of failing checks — non-zero if any line says FAIL — so it works as a
gate. (It used to `process.exit(0)` unconditionally, which made every FAIL
cosmetic.)

What it proves: no AudioContext before the Start gesture, exactly one cue per
lever press, impact → stamp ordering (no stings any more), the verdict appearing
on the stamp (+12 ms), advancing sweeping up a still-ringing outcome voice, the
audio settings popover opening with its two rows and muting effects, the failure
paths staying silent with no uncaught errors, and M toggling once per press.

Two details worth knowing before reading the output:

- **Keys are dispatched on elements, not on `window`.** They go to the focused
  element and bubble, so `event.target` is real and App's target-based guards are
  actually exercised: a focused control owns Enter and Space, and every key except
  M is swallowed while focus is inside `.audio-settings`. Dispatching on `window`
  set the target to the window itself and skipped both. The one exception is the
  "effects switched off blocks game cues" check, which targets `document.body` on
  purpose — it is about the mute switch silencing a *game* cue, so it has to reach
  App's handler, and the popover guard is checked separately just before it.
- **In `missing-sprite` mode, silence is the pass condition.** Every sprite format
  is served as HTML there, `audio.ts` logs "Could not load the SFX sprite; effects
  will be silent", and the app must carry on without errors. Checks that expect a
  cue in normal mode report `PASS (silent, which is what this mode requires)`
  instead of FAIL. Five of them used to report FAIL, which made a passing mode look
  broken and would have hidden the opposite regression — a cue playing when nothing
  could have decoded.
