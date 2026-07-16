# CSP / Security-Header Smoke Checklist

**Why this exists:** both production apps broke on CSP changes within one week —
OTB Command 2026-07-10 (`script-src` lacked `'wasm-unsafe-eval'` → GaussianSplats3D's
WASM sorter blocked → 🎥 Reality lens hung forever at "Processing splats…"; dev sends
no CSP header so it ONLY broke in prod) and belle-realty-pwa 2026-07-14 (`connect-src`
path-matching → login dead). The lesson: **a CSP change is a full-surface change.
Smoke every surface class below after ANY edit to `vercel.json` headers — not just
the login page.**

## After every CSP/header change (run against a prod-exact header, before + after deploy)

1. **Login / auth boot** — magic-link page renders, Supabase boot call succeeds
   (`connect-src` covers the Supabase origin *including path form*).
2. **One authed API round-trip** — ask AI-1 a question (covers `connect-src` to
   `/api/*`, streaming response).
3. **WASM surfaces** — open A-2 → 🎥 Reality once; splat must finish processing
   (needs `'wasm-unsafe-eval'` in `script-src`). This is the surface dev never exercises.
4. **Workers** — any lens using web workers (splat sorter, MapLibre) — check the
   console for `worker-src` violations.
5. **Fonts** — Big Shoulders / Public Sans / Plex Mono load (`font-src`, `style-src`).
6. **Images/media from storage** — open one signed-URL asset from a private bucket
   (`img-src`/`connect-src` for the storage origin).
7. **Third-party tiles** — 🛰 Satellite lens once (Esri tile origins in `img-src`/`connect-src`).
8. **Console sweep** — zero CSP violation reports across all of the above.

## How to test locally against the prod header
Serve `dist/` with the exact `vercel.json` header attached (the 07-13 fix was
A/B-verified this way) — dev mode sends NO CSP and will happily lie to you.

## Deploy-hygiene reminder
Prod deploys are CLI-only (`npx vercel deploy --prod --yes --scope adams-projects-0c52918e`).
The splat (16 MB) + mesh (3 MB) are gitignored and ride via `.vercelignore` — if git
auto-deploy is ever enabled BEFORE moving those assets to Supabase storage, prod
ships without the Reality lens. Move assets first, then automate.
