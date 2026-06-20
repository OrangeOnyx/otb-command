# OTB Property Command — Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`
Last updated: 2026-06-20.

## Run / verify
- `npm run dev` (Vite) · preview via Claude_Preview (launch.json: `otb-command-dev`, port 5173).
- Generators: `npm run extract-geometry` · `extract-hvac` (py) · `extract-recoveries` (py) · `npm run export-package`.
- Quality gate before delivery: `node --check` each module + `npm run build`. Console clean.

## What's built (8 sheets)
D-1 Dashboard · A-1 Site Plan (plat-exact + photo/overlay layers) · R-1 Rent Roll (11 cols, PSF breakdown) ·
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
- **LLM export package**: `tools/export-package.mjs` → `export/` → copied to `G:\My Drive\00 OTB\OTB-LLM-Export\`. Re-run after any A-1/geometry change.

## OPEN — next session punch-list
### Poster edits — DONE on B (2026-06-20)
All five original notes resolved on the chosen B variant: tenant DBAs off the boxes (number-only,
turned 90° CCW + centered both axes); pylon at the surveyor 'SIGN' coord by Unit 101 (no leader line);
Johnston label curves with the road, within the lane lines; boundary dashes thinned; OTB contact block
+ enlarged logo. **GLA LOCKED to audited 62,883 across ALL variants** (operator, 2026-06-20 — overrides
the brand's 70,000 marketing figure). **Still open:** (a) **Swap real tenant logos into the pylon** —
operator to drop logo files in `tools/brand-assets/`. (b) A/C/D/E are exploratory; only B is blessed.

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
- **Path A — DONE 2026-06-20**: lease Drive URLs wired (clickable in unit drawers), floor-plan links + real tenant contacts seeded, session artifacts in K-1 register. Non-lease doc URLs (plat/variance/easements/title/HVAC) still blank — operator to paste.
- **Path B — LIVE 2026-06-20** (`docs/path-b-supabase-scope.md`): hosted at **https://otb-command.vercel.app** (Vercel) + Supabase (project `kbhsghodquchkgfdzckc`). Magic-link auth; operator (adam@adamabdalla.com) edits, owners read-only + scoped sheets; state + images sync to Supabase. Deploy: `npx vercel deploy --prod --scope adams-projects-0c52918e` (needs a Vercel token). Deferred: B4 realtime, custom domain, per-sheet read RLS, custom SMTP.

### Visuals / 2.5D (next session)
- Operator wants state-of-the-art data viz + **2.5D / isometric renderings** of OTB. Inline viz capability exists (mcp__visualize__show_widget) + in-app views. Needs the inputs in `docs/visuals-input-checklist` (see below / chat).

### Other
- **Floor plans**: operator has a Floorplanner file (per-unit + whole-center; columns/benches/trash/water-shutoffs mapped). Usable TODAY via existing features — per-unit images → unit drawer Photos & Plans ("Floor plan" kind); whole-center → K-1 Site imagery or an A-1 facilities overlay. Needs the PNG/PDF export from operator. Interactive facilities layer = future build needing source data.
- **LLM export** re-run on 2026-06-19 to reflect the decluttered A-1 (tenant directory + zoomed plan).

## Locked decisions
- DoorLoop is OFF the roadmap (don't re-propose).
- Repo is authoritative; all exports are one-way/disposable.
- v7 baseline deleted (recoverable at git 81b1541).
- Audit-grade facts in CLAUDE.md must not be contradicted.
