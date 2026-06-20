# Path B — Hosted Backend (Supabase) Scope

**Status:** APPROVED to plan + implement (operator). Drafted 2026-06-20.
**Goal:** the shopping-center **owners can open OTB Command from any device** — state, files,
and images carried in one place, not per-browser. Operator edits; owners view.

## Why Supabase
The app already has the two seams this needs:
- **State** — `src/store.js` is a single mutable state with `persist()` write-through and
  `exportJSON()/importJSON()`. Today the sink is `localStorage` (`otb-command-state-v1`).
  Swapping the sink to a remote is a contained change.
- **Assets** — images live in IndexedDB behind a **swappable backend seam** (`src/lib/assets.js`).
  Swapping IndexedDB → Supabase Storage is the seam's whole purpose.

Supabase gives Postgres + Auth + Storage + Row-Level Security in one project, free tier ample
for one property and a handful of users. No app rewrite; vanilla-JS `@supabase/supabase-js` drops in.

## Architecture (target)
```
Static front-end (Vite build → Vercel/Netlify)
        │  @supabase/supabase-js
        ▼
Supabase project
  ├─ Auth        email magic-link; roles: operator (rw) · owner (ro)
  ├─ Postgres    property_state (JSONB mirror) → later normalized tables
  └─ Storage     bucket per asset kind (photos / floor-plans / roof-hvac / signage)
```

## Phasing (forced sequence)
**B0 — Project setup (0.5 d).** Create Supabase project; env vars (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`); deploy current static build to Vercel as-is (still localStorage).

**B1 — State to Postgres, JSONB mirror (1–2 d).** One table `property_state(property_id,
layer, data jsonb, updated_at)` — layers = comp/notes/actions/contacts/documents/financials,
the exact shape `exportJSON()` already emits. Add a `remote` sink behind `store.persist()` /
load. `importJSON()` becomes the one-time seed. **Minimal, reversible, no schema churn.**

**B2 — Auth + RLS (1 d).** Magic-link login. `profiles.role`. RLS: operator rw, owner ro on
`property_state` and Storage. Read-only owners get the dashboard/site-plan/rent-roll without edit affordances.

**B3 — Assets to Storage (1 d).** Implement the Supabase backend in `lib/assets.js`; upload
script migrates existing IndexedDB blobs; A-1 overlays + unit drawer read signed URLs.
**This closes the portability gap flagged in HANDOFF** (images were per-browser).

**B4 — (optional) Realtime + normalize (1–2 d).** Supabase Realtime for live multi-user
updates; normalize the hot layers (documents, contacts, actions) into real tables if concurrent
editing becomes real. Defer until two people actually edit at once.

## Migration path (no data loss)
Operator's current browser → `Export JSON` → seed `property_state` (B1) → upload images (B3).
Repo stays authoritative for **seed/SOT** (units, geometry, directory seed); Supabase holds the
**mutable overlay** (what `store.js` persists today). Same split as now, just remote.

## Security
- RLS keyed on `property_id`; owners `select`-only, operator `select/insert/update`.
- Anon key is public (fine — RLS enforces); no service key in the client.
- Storage buckets private; signed URLs for owner viewing.

## Cost
Free tier (500 MB DB, 1 GB storage, 50k MAU) covers one property + a few users with headroom.

## Decisions — LOCKED 2026-06-20
1. **Owner access** — **magic-link per owner email** (operator deferred to recommendation).
2. **Owner scope** — **operator-configurable**; default D-1/A-1/R-1/P-1. ✅ Front-end shipped
   (`c3644fb`): sidebar "Owners can see…" picker + "Preview owner view" toggle (persisted/exported).
   B2 RLS will enforce it server-side.
3. **Host** — **Vercel**.
4. **Depth** — **B0→B3** this pass (B4 realtime deferred).
5. **Custom domain** — not yet chosen; start on a Vercel subdomain, add `command.ontheblvd.com` later.

## PROVISIONED 2026-06-20
- **Live (B0):** https://otb-command.vercel.app (Vercel, team `adams-projects-0c52918e`). Public, 24/7.
  Currently the localStorage build — shared login/sync is B1/B2 (in progress).
- **Supabase project:** `otb-command` ref `kbhsghodquchkgfdzckc` · url `https://kbhsghodquchkgfdzckc.supabase.co`
  (org `oamxhllxpegnybdyqgrw`). Keys in local `.env` (git-ignored); publishable key is client-safe.
- **DB done:** `profiles` (role operator/owner, auto-created on signup) · `property_state` (jsonb mirror,
  layers comp/notes/actions/contacts/documents/financials/ownerSheets) · RLS operator-write / authenticated-read ·
  private `assets` storage bucket (same rules) · security advisor clean.
- **Remaining B1/B2/B3:** front-end `remote.js` (auth gate + load/push state), `@supabase/supabase-js` added;
  set Vercel env `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; set Supabase Auth Site URL = the Vercel URL;
  redeploy; set Adam's profile role = 'operator'; migrate IndexedDB images → `assets` bucket.

## To start (operator action required — cloud accounts)
B0 needs accounts I can't create:
- **Supabase** — create a project; share the project URL + anon key (or authorize the Supabase
  integration so I can read them).
- **Vercel** — connect/authorize so I can deploy the static build + set env vars.
Once either is provided I wire `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, add the remote
store sink, and ship B0→B3.
