# OTB Property Command — Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`
Last updated: 2026-06-19.

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

## Marketing (CAD-derived)
- **CAD**: `C:\Users\adam\Downloads\Boulev_CLEAN.dxf` (+ .dwg) — AutoCAD R14, in FEET, the architect's layered plat. NOT in the repo yet.
- **Poster generator**: `C:\Users\adam\Downloads\poster.py` (reads the DXF + units.json/geometry.json). Outputs to Downloads; copied to `G:\My Drive\00 OTB\` as `OTB-Leasing-Poster.{svg,png,pdf}`. Bays color-coded by current tenancy; true north derived from plat bearings (−51.5° vs screen-up).
- **LLM export package**: `tools/export-package.mjs` → `export/` → copied to `G:\My Drive\00 OTB\OTB-LLM-Export\`. Re-run after any A-1/geometry change.

## OPEN — next session punch-list
### Poster edits (operator review, do before folding into repo)
1. **Remove tenant names from the unit boxes** (text doesn't fit; directory already lists them). Explore a SHORT enhanced-business-description / category tag instead (e.g. "SALON", "NAILS") only if it fits.
2. **Pylon sign placement is wrong** — move it to the **parking-lot ingress by Unit 101** (Johnston end), not the top-right corner.
3. **Johnston St label** — too high; bring it **down and center** it along the Johnston frontage.
4. **Dashed lines too bold** — reduce boundary dash stroke weight.
5. **Contact details are wrong** — fix with the Abdalla/OTB brand sheet (PENDING from operator; no brand skill installed). Codify as a reusable `otb-brand` skill/memory so every artifact auto-uses correct logo/colors/contact/entity names.

### Then: fold poster into the repo (re-runnable tool)
- Commit `Boulev_CLEAN.dxf` (~644 KB) into the repo (e.g. `cad/`), move `poster.py` → `tools/`, add `npm run poster`. So it regenerates whenever availability changes.

### Portability (operator goal: "moves with the app wherever")
- **Path A — APPROVED, do first**: link SOT files, leases, and the artifacts I created (poster, dossier, reconciliation memo) into K-1 Document Register as Drive URLs. Stays on operator's machine for now.
- **Path B — APPROVED to plan + implement**: hosted backend so the **shopping-center owners can open it** from any device. Supabase fits; the store + asset layers already have the swap-in seam. Carries state + files + images in one place. This is a real milestone — scope it.

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
