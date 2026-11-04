# Deploying on Render

This project is a Vite + React single-page app with no backend calls in the
current code, so it deploys as a **Render Static Site** (free tier works).

## Option A — Blueprint (recommended, automatic)

1. Push this branch to GitHub (the `render.yaml` at the repo root is included).
2. Go to https://dashboard.render.com → **New** → **Blueprint**.
3. Connect the `Sisyphus93/tramvay-ikilemleri` repository and pick the branch
   that contains `render.yaml` (normally `main`).
4. Click **Apply**. Render runs `npm ci && npm run build` and publishes `dist/`.
5. Every push to that branch triggers a redeploy automatically.

`render.yaml` declares the static site as `type: web` with `runtime: static` —
Render does **not** support `type: static`. It intentionally omits `repo` and
`branch` so the service follows the repository and branch selected in the
Blueprint form. If you change the Blueprint's branch later, edit the Blueprint
in the Render dashboard rather than hard-coding an old branch here.

### Node version

Vite 8 requires Node `^20.19.0 || >=22.12.0`. The floor is declared in three
places so a build-image change cannot silently break the deploy:

- `render.yaml` → `nodeVersion: 22.12.0`
- `.node-version` → `22.12.0`
- `package.json` → `engines.node`

`engines` alone only warns (`engine-strict` is not set), so it documents the
requirement without breaking `npm ci` on an older local Node.

### Cache headers

`render.yaml` sets them in three tiers, and the tiers matter for correctness, not
just speed:

| Path | `Cache-Control` | Why |
|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | Vite content-hashes these, so a new build means new URLs |
| `/`, `/index.html` | `no-cache` | A stale document would point at assets Render has purged |
| `/audio/*` | `public, max-age=300, must-revalidate` | **Not** fingerprinted, and `audio.ts` fetches with `cache: 'force-cache'` |

The `/audio/*` tier is the one to be careful with. `sfx.json` (the sprite map) and
`sfx.ogg` / `sfx.m4a` (the audio it indexes) are separate un-versioned URLs, so a
long TTL can serve a new sprite map against an old audio file and play the wrong
slices. Five minutes bounds that window. The alternative — appending a shared
build hash to every audio URL — removes it entirely but needs a build-time
injection step; it is not implemented.

`X-Content-Type-Options: nosniff` and `Referrer-Policy` are set globally.
`X-Frame-Options` is deliberately **not** set: the game is aimed at streamers who
may embed it, and the page holds no authenticated state for clickjacking to
exploit.

## Option B — Manual static site

1. In the Render dashboard: **New** → **Static Site**.
2. Connect the GitHub repo and choose the branch.
3. Settings:
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. Add a rewrite rule so client-side routing works: `/*` → `/index.html`.
5. **Create Static Site**.

## Notes

- `package-lock.json` is committed, so `npm ci` gives a reproducible build.
- The app is entirely client-side: it needs no environment variables, no API
  keys and no server process. All 27 dilemmas, audio and state live in the
  browser bundle.
