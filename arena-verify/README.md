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

It needs `jsdom` and `esbuild`; `esbuild` is already a devDependency,
`jsdom` is not, and this folder is **not** wired into `package.json`:

```bash
# one-off, outside the repo
mkdir -p /tmp/e2e && cd /tmp/e2e && npm i jsdom@24

# from the repo root
node arena-verify/audio-e2e.mjs                 # normal flow
node arena-verify/audio-e2e.mjs . missing-json   # sfx.json served as index.html (SPA fallback)
node arena-verify/audio-e2e.mjs . missing-sprite # every sprite format 404/HTML
```

What it proves: no AudioContext before the Start gesture, exactly one cue per
lever press, impact → stamp ordering (no stings any more), the verdict appearing
on the stamp (+12 ms), advancing sweeping up a still-ringing outcome voice, the
audio settings popover opening with its two rows and muting effects, the failure
paths staying silent with no uncaught errors, and M toggling once per press.
