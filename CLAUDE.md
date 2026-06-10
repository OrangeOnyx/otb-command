# OTB Property Command — Project Memory

## What this is
Full visual property-management program for **On The Boulevard Shopping Center**,
101–149 Arnould Blvd, Lafayette, LA 70506. Owner-operator: Adam — Managing Member,
Orange Ocean, LLC (manager of Belle Realty of Lafayette, LLC, the owning entity).
Baseline: `baseline/OTB_Command_v7.html` (Rev 4) — a blessed single-file visual
concept built in Claude.ai. This repo evolves it into the production tool.

## Operator's working style (follow strictly)
- Executive register. Working output first, explanation second. No filler.
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
  building back/service frontage). Authoritative spelling: **Arnould** (title
  check on Arnauld/Arnold variants pending, P0).
- Long building 101–133: backs Marie Antoinette, 101 at Johnston end, storefronts
  face the main field. Short building 135A/B (paired wing) + 137–149 vertical run;
  149 (Jason's Deli, anchor) at the Patricia × Arnould corner.
- Parking: Main Field (fills first) → **Lot 8** (±15 spaces, pocket at Patricia ×
  Marie Antoinette corner, butts 135A/B) → **Lot 7** (remote, Lot 7 Block M,
  110 Marie Antoinette St, parcel 6009649, ±14,375 SF, ±24 spaces, directly across
  Marie Antoinette from Lot 8).
- Assessor parcels (Belle): 6026783, 6026784, 6026785, 6026788, 6009649 (remote).
- Easements: Our Savior's Church $350/mo, 25-yr — **§3a liquor waiver survives
  termination** (restaurants OK within 175 ft; liquor line drawn on plat).
  JD Bank $250/mo to Belle + 13 spaces, expires 12/30/2034. JD Bank corner parcel
  is SOLD — never render it as Belle property; boundary shows a "NOT A PART" notch.
- Anchor: Jason's Deli (149) — §9.01 requires monthly HVAC PM contract with
  **Butcher Air Conditioning**; tenant maintains 100% of Unit 149 HVAC.
- Exclusive-use watch: HotWorx (129, Mar 2024) vs C. Wolf (135A, Nov 2024).
- Holdovers as of Jun 2026: 105, 109 (highest priority), 117.5, 119, 143.
  Vacant: 131 (LOI pending), 133. Owner-occupied: 135B.

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
   floor-plan viewer per unit, DoorLoop import, expiration alerting.

## Data sources of truth (Tier 1)
- 00_OTB_Master_SOT.docx v1.1 · OTBMasterTemplateSetSOTcorrected.xlsx (27×30 rent
  roll) · Rev_Belle_Realty_Arnould_Blvd_Property.xlsx (meters) · HVAC PDF (2021)
  · recorded plat (Montagnet & Domingue, 5/20/1994, last rev 7/19/2019).
- Known workbook anomalies (do not silently "fix"): 101 SF 6,877 vs 6,677;
  117.5 SF 1,769 vs 1,789; 135B #VALUE!; 145 term-months 1572; missing deposits
  107/137/143/149. Surface, don't guess.

## Conventions
- Validate before delivery: `node --check` each module / `npm run build`.
- Commit per logical change with imperative messages ("Add geometry.json trace").
- Rev label in the A-1 title block bumps on every geometry change.
