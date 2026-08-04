# OTB Property Command — Project Memory

> **PRODUCT NAME (operator-locked 2026-07-26): "Orange Ocean Atlas."** The
> platform is Orange Ocean Atlas; OTB is its flagship deployment. Always the
> full composite in market-facing output — never naked "Atlas" (crowded
> genus: Saunders Atlas / AtlasX / Atlas RE / VISION-ATLAS). Repo/infra names
> (otb-command, vercel project) unchanged. Module-naming concept available:
> Atlas (spatial) · Almanac (dates) · Ledger · Desk · Register.

> **New session: read `HANDOFF.md` for live state + the open punch-list.**
> Current build = **13 sheets** (D-1 Dashboard · A-1 Site Plan · A-2 Spatial ·
> R-1 Rent Roll · P-1 Financial · C-1 Compliance · T-1 Critical Dates ·
> W-1 Action Board · K-1 Directory · M-1 Maintenance · S-1 Owner Safe ·
> AI-1 Concierge · V-1 Vendor Portal) — nav single-source: `src/lib/pages.js`.
> Roles: operator · owner · vendor (V-1 only) · **tenant (M-1 only, unit-scoped
> via tenant_contacts)** · pending. Persisted layers
> (registry `src/lib/layers.js`): comp, notes, actions, contacts, documents,
> financials, ownerSheets, features, cameras (localStorage + Supabase
> property_state + Export/Import). Images/docs in IndexedDB↔Supabase buckets
> behind seams. Marketing poster generated from the architect's CAD
> (`Boulev_CLEAN.dxf`, in feet) via `poster.py`. Path B (hosted backend) is
> LIVE at otb-command.vercel.app. Brand sheet PENDING.
> **System extraction:** `transfer-package/` (2026-07-22) = full portable spec
> (features/data/rules/screens/architecture + 10 JSONs); Supabase migration DDL
> exported to `supabase/migrations/`.

## What this is
Full visual property-management program for **On The Boulevard Shopping Center**,
101–149 Arnould Blvd, Lafayette, LA 70506. Owner-operator: Adam — Managing Member,
Orange Ocean, LLC (manager of Belle Realty of Lafayette, LLC, the owning entity).
Baseline was `baseline/OTB_Command_v7.html` (Rev 4) — a blessed single-file
visual concept built in Claude.ai. The modular Vite app has long superseded it;
the file was removed (recoverable from git at commit 81b1541) so the repo isn't
carrying a second full copy of the tool. This repo IS the authoritative version;
all exported HTML/JSON/SVG are one-way, disposable snapshots.

## Operator's working style (follow strictly)
- Executive register. Working output first, explanation second. No unnecessary
  or way-off-topic filler. Contribution opportunities (small code/judgment
  decisions offered to the operator) are acceptable and desired (2026-07-16).
- Forced rankings when presenting options; he picks by number/letter.
- Never relitigate confirmed decisions. Target only what changed on iterations.
- Quality gate: `node --check` (or build + typecheck) before every delivery.

## Property facts (audit-grade — do not contradict)
- GLA 62,883 SF · 27 demised units · 2 buildings · 4.84 ac · zoned CH.
- **Parking variance Entry 99-11797: 324 provided / 344 required.** Floor space
  "limited to available parking spaces." Central constraint for every leasing,
  licensing, or stall-removal decision. Zoning also requires 20% green area.
- Streets: Arnould Blvd (80' R/W concrete, address frontage, E), Johnston St /
  US 167 (±100', S), Patricia St (50', N), Marie Antoinette St (40', W — long
  building back/service frontage). Authoritative spelling: **Arnould** (street).
  TITLE CHECK CLOSED 2026-06-27 (operator-confirmed): the street is **Arnould
  Blvd**; the recorded **subdivision** of record is **"Arnold Heights Subd. Ext.
  No. 1"** — a distinct legal proper noun, NOT a misspelling. Keep both; do not
  "correct" the subdivision name to Arnould.
- Long building 101–133: backs Marie Antoinette (rear face 18.73' off the R/W
  per plat — NOT 10'), 101 at Johnston end, storefronts face the main field.
  Short building 135–149 along Patricia; the 37.4' M.A.-end section splits at
  mid-depth into two ~square 1,580 SF units — 135A (C. Wolf, breezeway side)
  and 135B (Belle office, Patricia side), both fronting M.A.;
  149 (Jason's Deli, anchor) at the Patricia × Arnould corner.
- Parking (plat-verified REV 9): Main Field (fills first) → **Lot 8** (19 spaces
  = 10+5+4, pocket at Patricia × Marie Antoinette corner, butts 135A/B) →
  **Lot 7** (remote, Lot 7 Block M, 110 Marie Antoinette St, parcel 6009649,
  ±14,375 SF, 32 spaces = 6+8+10+8, directly across Marie Antoinette from Lot 8).
  Also: rear M.A. parallel row 18 · Johnston strip 10 · JD Bank easement 13.
  **Plat striping totals 314 vs variance "324 provided" — Δ −10 unreconciled**
  (docs/parking-reconciliation-memo.md; cite 324 legally, plan ops on 314).
- Assessor parcels (Belle): 6026783, 6026784, 6026785, 6026788, 6009649 (remote).
- Easements: Our Savior's Church $350/mo, 25-yr — **§3a liquor waiver survives
  termination** (restaurants OK within 175 ft; liquor line drawn on plat).
  JD Bank $250/mo to Belle + 13 spaces, expires 12/30/2034. JD Bank corner parcel
  is SOLD — never render it as Belle property; boundary shows a "NOT A PART" notch.
- Anchor: Jason's Deli (149) — §9.01 requires monthly HVAC PM contract with
  **Butcher Air Conditioning**; tenant maintains 100% of Unit 149 HVAC.
- Exclusive-use watch: HotWorx (129, Mar 2024) vs C. Wolf (135A, Nov 2024).
- **NO holdovers as of Jul 2026** — all five (105, 109, 117.5, 119, 143) RENEWED per the
  owner-corrected signed rent roll (docs/sot-2026-07/, reconciled 2026-07-16; see
  docs/sot-reconciliation-2026-07.md for new expirations). Upstream (145) signed at
  $19.95/SF total. Vacant: 131 (LOI pending), 133. Owner-occupied: 135B.

## Locked design system ("plan room" aesthetic — do not drift)
- Palette: paper #EDEFE8 / card #F6F7F1 / ink #1C2B26 / brass #A87E2F /
  green #2F6B4F / anchor #1E4F3C / brick (holdover) #C25E33 / slate #5F6E64.
  Vacant = white diagonal hatch.
- Type: Big Shoulders Display (display), Public Sans (body), IBM Plex Mono (data).
- Vernacular: drawing-set sheet index nav (D-1, A-1, R-1, C-1, T-1), title block,
  general notes, north arrow (plan rotated — true north at right / Patricia).
- Site plan is native SVG, plat-proportioned (≈2.27:1), schematic = recorded plat
  rotated so Marie Antoinette is top, Arnould bottom, Johnston left, Patricia right.

## Architecture targets
1. **Phase 1 — Modularize.** Split baseline into Vite vanilla-JS (or lit) app:
   `/src/data` (units.json, compliance.json, geometry.json), `/src/views`
   (dashboard, plan, rentroll, compliance, dates), `/src/lib` (format, colors,
   svg helpers). No framework lock-in without asking.
2. **Phase 2 — Persistence.** Compliance states, notes, and edits persist:
   localStorage + JSON export/import first; optional tiny Node/Express + SQLite
   later. Every mutation must survive reload.
3. **Phase 3 — Plat-exact geometry.** Trace `reference/` plat PDF/PNGs for exact
   boundary bearings, liquor-line course, stall counts per zone. Geometry lives in
   geometry.json, never hard-coded in render functions.
4. Later: photo-overlay layers per view (Roof/HVAC, Signage pylon panels),
   floor-plan viewer per unit, expiration alerting, financial rollup.
   **DoorLoop import is OFF the roadmap (operator decision, Jun 2026) — do
   not re-propose it.** SOT stays the workbook + manual edits via the store.

## Data sources of truth (Tier 1)
- **Rent roll / lease economics: `docs/sot-2026-07/` (owner-corrected signed rent
  roll, adopted 2026-07-16) — supersedes the workbook for tenant/economics/expirations.**
  Carries its own authority ranking + validation rules; DoorLoop dates never authoritative.
- 00_OTB_Master_SOT.docx v1.1 · OTBMasterTemplateSetSOTcorrected.xlsx (27×30 rent
  roll) · Rev_Belle_Realty_Arnould_Blvd_Property.xlsx (meters) · HVAC PDF (2021)
  · recorded plat (Montagnet & Domingue, 5/20/1994, last rev 7/19/2019).
- Workbook anomalies MOSTLY CLOSED 2026-07-16 by the owner-corrected signed rent roll
  (docs/sot-2026-07/): 101 SF = 6,877 CONFIRMED; 117.5 SF = 1,769 CONFIRMED; 135B =
  owner-occupied $0 (the #VALUE! is moot); 145 re-signed (old term-months moot); unit
  103 corrected 3,051→3,054. STILL OPEN: missing deposits 107/137/143/149. New
  owner-accepted stated-rent exceptions (do not "fix" to formula): Pink Paisley 101-103
  stated $16,008.90/mo (−$4.84 vs formula); Cat Clinic 119.5 $0.01 rounding.

## Conventions
- **Exports go to Google Drive (operator rule, 2026-08-03):** any generated
  export/package for the operator is ALSO copied to `G:\My Drive\00 OTB\`
  (property LLM package → `OTB-LLM-Export\` + refresh `OTB-LLM-Export.zip`).
  Chat/file delivery alone is not done.
- **Repo backup:** Scheduled Task `OTB-Repo-Backup` (daily 03:00,
  `tools/gdrive-backup.ps1 -Register` to re-register) bundles full git
  history → `G:\My Drive\00 OTB\repo-backups\` (keep 10, verify logged).
  Uncommitted work is NOT captured — commit anything that matters.
- **Rent presentation (operator, 2026-07-17):** any bare monthly amount in owner/
  tenant-facing output = TOTAL rent (base + additional). Component economics
  appear only as an explicit PSF breakdown chart: Base · CAM · Tax · Ins →
  Total PSF → Total $/mo. (Base/Total PSF from the rent roll; CAM/Tax/Ins from
  recoveries.json — single-source rule.)
- Validate before delivery: `node --check` each module / `npm run build`.
- Commit per logical change with imperative messages ("Add geometry.json trace").
- Rev label in the A-1 title block bumps on every geometry change.

## Paths (canonical as of 2026-08-01)

- **Repo root:** `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`
  Moved from `C:\Users\adam\Downloads\` on 2026-08-01. Any reference to the old
  Downloads path is stale â€” correct it rather than following it.
- **Capture data:** `E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\` (external drive).
  Never commit capture frames, drone footage, or other large binaries to this repo.
- **Remote:** `https://github.com/OrangeOnyx/otb-command` (private).

Save generated documentation and reports under `docs/` so they are versioned.
Throwaway scratch output belongs outside the repo entirely.
