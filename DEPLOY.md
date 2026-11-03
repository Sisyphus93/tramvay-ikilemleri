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
- If you later add server-side Gemini API calls (see `metadata.json`), you will
  need a **Web Service** (Node/Express) instead of a static site, and set the
  `GEMINI_API_KEY` environment variable in the Render dashboard
  (**Environment** tab) — never commit real keys to the repo.
