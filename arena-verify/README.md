# arena-verify — throwaway harness (not shipped)

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
lever press, impact → stamp → sting ordering, the verdict appearing on the stamp
(+12 ms), the failure paths staying silent with no uncaught errors, and M
toggling once per press.
