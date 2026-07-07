# OTB Property Command — Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`
Last updated: 2026-07-03.

## ELITE ROADMAP (started 2026-07-03) — see `docs/superpowers/specs` + `docs/superpowers/plans`
Vision: full owner/operator platform. Three threads on the live Supabase foundation:
- **Thread 1 · Secure Documents:** P1 Document Repository → P2 Owner Safe → P3 Vendor Portal
  (all = role-scoped file storage; extends the existing image asset seam / private bucket).
- **Thread 2 · AI Property Concierge:** P4 grounded text RAG → P5 realtime voice + avatar.
- **Thread 3 · Spatial & 2.5D:** **P6** (this thread, in progress).
**Substrate decision (operator):** ONE app — the repo is authoritative; harvest v9
(`~/OneDrive/Desktop/otbcommandv9kimi.html`, a dark Mapbox "spatial engine" concept)
IDEAS ONLY (Mapbox satellite map + global search). Plan-room = default palette; dark = optional
theme switch (SHIPPED, see below). Do NOT fork into two codebases.

### P1 · Document Repository — **SHIPPED + DEPLOYED 2026-07-03**
- Plan `docs/superpowers/plans/2026-07-03-p1-document-repository.md`. Any document row (K-1 register +
  unit-drawer docs) can carry a real uploaded file: **"📎 Attach file"** in the row's edit form uploads to the
  **private Supabase `documents` bucket** (25 MB cap; RLS cloned from `assets`: auth read / operator write —
  migration `documents_bucket_and_policies`) and sets the row's existing `link` to **`doc://<path>`**; rows
  render **"Open 📎"** which resolves a fresh signed URL on click. External Drive links unchanged. Local
  fallback = IndexedDB (`otb-docs`). Seam: `src/lib/docs.js` (mirrors assets.js; pure doc:// helpers unit-tested).
- Also fixed: `remote.js` now guards `import.meta.env` (was crashing `node --test`; Vite static replacement
  verified intact — URL still baked into the prod bundle).
- Verified: local round-trip (attach → save → Open 📎 → byte-exact) + prod bundle carries the feature.
  Remote signed-URL path: operator should attach one real PDF to a register row as the live smoke test.
- P2 Owner Safe / P3 Vendor Portal build on this (role-scoped buckets/policies; versioning; search — later).

### P2 · Owner Safe — **SHIPPED + DEPLOYED 2026-07-03**
- **S-1 "Owner Safe" sheet** (nav after P-1): vault for Proforma/Leases/Tax/Insurance/Banking/Other.
  Private **`safe` bucket** — read = `is_owner_or_operator()` (NEW fn; a future P3 vendor role is sealed out
  at the DB layer, unlike `documents` which is any-auth read), write = operator. 10-min signed URLs.
  **`safe_log` audit table**: every view/upload/delete recorded (who/when/what); "Recent access" panel =
  operator-only. Owners: read/open only (role-owner CSS + RLS). Migration `owner_safe_bucket_log_policies`.
  Seam `src/lib/safe.js` (pure helpers unit-tested → 23 tests total); view `src/views/safe.js`.
- Verified live: upload → list → byte-exact open → audit rows (view/upload) → delete; owner-mode hides all
  operator controls + log. Deployed; S-1 in prod HTML.

### P6 · 2.5D + Spatial — **P6a + P6b SHIPPED 2026-07-03**
- Spec `docs/superpowers/specs/2026-07-02-p6-2p5d-spatial-design.md`; plans `docs/superpowers/plans/2026-07-0{2-p6a-svg-isometric,3-p6b-webgl-3d-twin}.md`.
- **A-2 "Spatial" sheet LIVE** (nav D-1·A-1·**A-2**·R-1…) with an **Iso / 3D lens toggle**:
  - **Lens A (SVG isometric, P6a):** native-SVG, footprints extruded to **real CAD heights**
    (`npm run extract-heights` → `src/data/heights.json`, from DXF `BLD_HT`), block color = live status.
    Pure core `src/lib/iso.js` (unit-tested).
  - **Lens B (WebGL 3D twin, P6b):** Three.js (`three@0.185`), orbit controls, same footprints/heights/colors,
    raycast click → drawer. Loaded **lazily** (dynamic import → code-split `scene3d-*.js` chunk; `three` only
    loads when 3D opens). Pure layout `src/lib/scene3d-layout.js` (unit-tested); scene `src/lib/scene3d.js`.
    **Verified live in WebGL 2.0** (render + real heights + click→drawer + clean dispose on toggle-back).
  - Both: click → shared drawer, selection syncs across sheets. **`npm test`** = 15 tests (native node:test).
  - **Swappable geometry seam:** `buildBoxes()` in scene3d.js is isolated so **P6d's captured mesh drops in**.
- **Theme switch SHIPPED**: plan-room (DEFAULT) ↔ dark, toggle in sidebar foot, persisted `localStorage["otb-theme"]`,
  dark overrides `:root` vars under `[data-theme="dark"]`; the 3D scene reads the theme too.
- **Next in P6 (each its own plan):** **P6c satellite** (MapLibre + free Esri imagery, needs plat georeference
  → `georef.json`); **P6d Reality capture** — operator to do a **drone shoot → photogrammetry mesh + 3D
  Gaussian Splat**, clickability via georef-draped hit-areas over the swappable seam. Deferred: metric-height
  toggle, north/scale, static-SVG export of A-2, v9 global-search harvest.
- Height note (operator eyeball): 22/27 units = 16.4′ (real nearest-BLD_HT match, not fabricated); 103=23.6′,
  101=13.5′, 105/107/109=13.2′. Real skew, not a bug.

## Run / verify
- `npm run dev` (Vite) · preview via Claude_Preview (`otb-command-dev`, port 5173). Note: with `.env` present the app is **login-gated** (Path B); to view locally without login, move `.env` aside temporarily.
- **Generators (all re-runnable):** `npm run poster` (5 leasing posters) · `npm run pylon` (monument sign) · `npm run proforma` (owner Excel proforma) · `npm run export-package` (LLM export) · `npm run export-buyer` (no-financials buyer set) · `npm run extract-geometry` · `extract-hvac`/`extract-recoveries` (py).
- **Deploy (Path B):** `npx vercel deploy --prod --yes --scope adams-projects-0c52918e` — the Vercel CLI is
  **logged in on this machine as `orangeonyx`** (device-flow login 2026-07-03; no token needed).
  **IMPORTANT: local commits do NOT auto-deploy** (no git remote / no Vercel git integration) — run the deploy
  command after shipping, or the live site silently stays stale.
- Quality gate before delivery: `node --check` each module + `npm run build`. Console clean.

## What's built (8 sheets)
D-1 Dashboard · A-1 Site Plan (plat-exact + photo/overlay layers; **whole-center floor-plan overlay** registered to the unit envelope w/ unit-fill opacity slider; unit numbers uniform, tenant names off A-1) · R-1 Rent Roll (11 cols, PSF breakdown) ·
P-1 Financial (income composition + NOI worksheet) · C-1 Compliance · T-1 Critical Dates ·
W-1 Action Board (live kanban) · K-1 Directory (contacts + document register + site imagery).
- **Persisted state layers** (localStorage, write-through, in Export/Import JSON): comp, notes, actions, contacts, documents, financials.
- **Asset store**: images (photos / floor plans / roof-HVAC / signage) in **IndexedDB** behind a swappable backend seam (lib/assets.js). NOT yet in Export/Import — per-browser today (portability gap, see below).
- **Data**: src/data/{units,compliance,geometry,directory,hvac,recoveries}.json. Single-source rule: Base/Total PSF from units.json; recoveries.json only supplies CAM/Tax/Ins.
- Headline vs drawn convention (labeled, not bugs): GLA 62,883 headline / 62,810 demised; parking 324 legal (variance 99-11797) / 314 drawn.

## Marketing (CAD-derived) — FOLDED INTO REPO 2026-06-20
- **CAD**: `cad/Boulev_CLEAN.dxf` — AutoCAD R14, in FEET, the architect's layered plat. Now committed (~644 KB). (Source .dwg still only in Downloads.)
- **Poster generator**: `tools/poster.py` → `npm run poster`. Reads `cad/Boulev_CLEAN.dxf` + units.json/geometry.json, logos vendored in `tools/brand-assets/` (otb_logo.png + a white-knockout). Emits **5 style variants** to `marketing/` (gitignored, disposable): A brand · **B plan-room (CHOSEN)** · C standard · D editorial · E heritage. Bays color-coded by tenancy; true north −51.5°. Johnston label rides a center lane-stripe via textPath; pylon marker at the surveyor 'SIGN' coord (1075.8,321.1).
- **Pylon generator**: `tools/pylon.py` → `npm run pylon`. Emits `OTB-pylon-blank.svg` (scaled 14-panel template, matches the real sign) + `OTB-pylon-tenants.svg` (type stand-ins). Real-logo version is the operator's own image — drop logo files in `tools/brand-assets/` to swap.
- Generated SVG→PNG locally via headless Chrome (no cairosvg/rsvg in repo): wrap SVG in HTML, `chrome --headless --screenshot`.
- **Pylon real logos DONE 2026-06-20**: 25 tenant logos vendored to `tools/brand-assets/tenant-logos/` (from the updated SOT's LOGO sheet), embedded per panel; P13 Boulevard Nutrition → Upstream Rehabilitation.

## Export deliverables (all → `export*/`, gitignored; copied to `G:\My Drive\00 OTB\`)
- **LLM export** (`npm run export-package` → `export/`): dossier MD + data JSON + A-1 SVG/PNG/HTML. Full detail incl. financials.
- **Buyer overview** (`npm run export-buyer` → `export-buyer/`): same set with **all $ stripped** (roster only, financials → NDA note). For the prospective-buyer group. NOTE: still contains "Known anomalies" + "Marketing angles (LOI pending)" — operator may want those trimmed before sending externally.
- **Owner proforma** (`npm run proforma` → `export/OTB-Proforma.xlsx`): live Excel model — real in-place income (EGI $1,080,773/yr), yellow OpEx cells = seeded estimates the owner overrides, formula-driven NOI + cap-rate value. Pending option: add vacancy/credit-loss line + stabilized (lease-up 131/133) scenario.

## OPEN — next session punch-list
### Poster edits — DONE on B (2026-06-20)
All five original notes resolved on the chosen B variant: tenant DBAs off the boxes (number-only,
turned 90° CCW + centered both axes); pylon at the surveyor 'SIGN' coord by Unit 101 (no leader line);
Johnston label curves with the road, within the lane lines; boundary dashes thinned; OTB contact block
+ enlarged logo. **GLA LOCKED to audited 62,883 across ALL variants** (operator, 2026-06-20 — overrides
the brand's 70,000 marketing figure). Real pylon logos now embedded (see Export/Marketing). A/C/D/E
remain exploratory; only B is blessed.

## Brand (ingested 2026-06-20) — `~/.claude/skills/abdalla-brand-system`
Three skills installed: `abdalla-brand-system` (router → per-entity `references/*.md` + `assets/` logos), `abdalla-web-templates`, `adam-brand-context`. Auto-trigger on OTB / Orange Ocean / Belle Realty / brand keywords. DO NOT pull brand details from memory — read the entity doc.
**OTB public brand (tenant-facing marketing = leasing poster):**
- Palette: **strictly Boulevard Navy `#1C2D4F` + White/Off-White `#F5F5F5`. NO orange or gray accent bars.** (Conflicts with the app "plan-room" palette — two separate systems: app stays plan-room; public OTB marketing = navy/white.)
- Type: Helvetica/Arial (headers/marketing); Times New Roman (formal notices). NOT Big Shoulders/Plex.
- Logo: `assets/otb_logo.png` (use the file, not a typed wordmark).
- Contact block: Adam Anthony Abdalla, Property Manager · 101-149 Arnould Blvd., Lafayette, LA 70506 · **P 337-769-1554 · E info@ontheblvd.com · W ontheblvd.com**. Required attribution: **"Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."**
- Tone: welcoming/local; AVOID investment/legal/B2B jargon on public pieces (strip "variance 99-11797", "hard corner", etc.).
- **GLA figure conflict:** brand markets **"70,000 sq ft"**; our audit = 62,883 demised / 62,810 sum. **RESOLVED 2026-06-20: print audited 62,883 on all marketing (operator decision).**
- Audience question: tenant-facing leasing = OTB brand; broker/investor/sale = Orange Ocean B2B brand (`brand-orange-ocean.md`).

### Fold poster into the repo (re-runnable tool) — DONE 2026-06-20
- DXF committed to `cad/`; `poster.py` + `pylon.py` in `tools/`; `npm run poster` / `npm run pylon` wired; `marketing/` gitignored. Regenerates whenever availability changes.

### Portability (operator goal: "moves with the app wherever")
- **Path A — DONE 2026-06-20**: lease Drive URLs wired (clickable in unit drawers), floor-plan links + real tenant contacts seeded (from updated SOT `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` — sidecars `src/data/{lease,floorplan,logo}-links.json` + `contacts-info.json`), session artifacts in K-1 register. **Google Drive connector is CONNECTED** (file search/metadata works). Remaining: the 11 non-lease register docs (plat/variance/easements/title/HVAC/SOT-docx/meters) still have blank `link` — next step is to point at the Drive folder holding the recorded instruments and match URLs (keyword search hits node_modules noise). SOT workbook URL already on hand.
- **Path B — LIVE 2026-06-20** (`docs/path-b-supabase-scope.md`): hosted at **https://otb-command.vercel.app** (Vercel) + Supabase (project `kbhsghodquchkgfdzckc`). Magic-link auth; operator (adam@adamabdalla.com) edits, owners read-only + scoped sheets; state + images sync to Supabase. Deploy: `npx vercel deploy --prod --scope adams-projects-0c52918e` (needs a Vercel token). Deferred: B4 realtime, custom domain, per-sheet read RLS, custom SMTP.

### Visuals / 2.5D (next session)
- Operator wants state-of-the-art data viz + **2.5D / isometric renderings** of OTB. Inline viz capability exists (mcp__visualize__show_widget) + in-app views. Needs the inputs in `docs/visuals-input-checklist` (see below / chat).

### Other
- **Floor plans — A-1 overlay LIVE 2026-06-20**: whole-center plan (`public/floorplan-center.png`, processed from `G:\…\Floor Plan - Whole Center.jpg` — exterior/parking knocked transparent, largest-component crop, rotated 180° to match A-1) renders under the unit boxes via **A-1 → Overlay → Floor plan**, registered to the unit envelope (`FAC` box in `plan.js`), with a **Unit-fill opacity slider** (auto-fades boxes to 40% when the overlay is on; labels go dark+halo). Per-unit floor-plan **links** also live in each unit drawer. Tuning preview tool: composite floor plan + unit rects offline (see chat).
- **Still parked:** app logo thumbnails (drawer/directory; logos already vendored) · custom domain `command.ontheblvd.com` + custom SMTP for auth email · doc Drive URLs (above) · 2.5D/isometric viz (needs `docs/visuals-input-checklist`) · Magnolia (121) executed lease swap (Draft→Executed when provided).
- **Title check (P0) — CLOSED 2026-06-27**: street = **Arnould Blvd** (operator-confirmed);
  recorded subdivision of record = **"Arnold Heights Subd. Ext. No. 1"** (distinct legal
  name, deliberately "Arnold" — not a variant to reconcile). App already uses Arnould
  consistently; "do not fix" the subdivision name. See CLAUDE.md property facts.

## Locked decisions
- DoorLoop is OFF the roadmap (don't re-propose).
- Repo is authoritative; all exports are one-way/disposable.
- v7 baseline deleted (recoverable at git 81b1541).
- Audit-grade facts in CLAUDE.md must not be contradicted.
