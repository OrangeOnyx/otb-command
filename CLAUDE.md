# Cypress Command (OTB deployment) — Project Memory

> **PRODUCT NAME (operator-locked 2026-09-11): "Cypress Command."** Supersedes
> "Orange Ocean Atlas" (locked 2026-07-26, retired). The platform is Cypress
> Command; OTB is its flagship deployment (otb.cypresscommand.com). Always the
> full composite in market-facing output — never naked "Cypress" or "Command".
> Brand assets = release **04C v1.0.1** (approved 2026-09-06) in
> `public/brand/cypress/` (lockups primary/reverse, mark, favicon, app icon,
> fonts), byte-verified against the private `OrangeOnyx/cypress-command-brand-system`
> repo — provenance + usage rules in `docs/cypress-command-brand-provenance.md`
> (no retyping the wordmark, horizontal lockup ≥ 260px wide uncropped, reverse
> art on Cypress/Charcoal only). Brand palette: Cypress #1E4D3A · Moss #2F6B4E
> · Amber #D97706 · Charcoal #0A1F16 · Bone #F3EDE0; brand type Fraunces /
> Inter / JetBrains Mono. **The app shell keeps the locked plan-room design
> system below** — the brand shows as the lockup (masthead + sign-in), favicon,
> and the product name in titles / print footers / exports. Repo/infra names
> (otb-command, vercel project) unchanged. Module-naming concept still
> available: Atlas (spatial) · Almanac (dates) · Ledger · Desk · Register.

> **New session: read `HANDOFF.md` for live state + the open punch-list.**
> Current build = **13 sheets** (D-1 Dashboard · A-1 Site Plan · A-2 Spatial [property
> workspace since 2026-09-11: plat-based model + suite inspector + evidence/owner-brief
> flow + dated ledger strip; iso/3D/satellite/reality under "Capture & legacy views"] ·
> R-1 Rent Roll · P-1 Financial · C-1 Compliance · T-1 Critical Dates ·
> W-1 Action Board · K-1 Directory · M-1 Maintenance · S-1 Owner Safe ·
> AI-1 Concierge · V-1 Vendor Portal) — nav single-source: `src/lib/pages.js`.
> Roles: operator · owner · vendor (V-1 only) · **tenant (M-1 only, unit-scoped
> via tenant_contacts)** · pending. Persisted layers
> (registry `src/lib/layers.js`): comp, notes, actions, contacts, documents,
> financials, ownerSheets, features, cameras — **7 TYPED Supabase tables since
> 2026-08-04 (purge #7: comp_state · unit_notes · board_state ·
> directory_state · site_features · camera_overrides · layer_settings;
> per-row diff sync via src/lib/statesync.js + realtime channel via
> src/lib/realtime.js; property_state DROPPED)** + localStorage +
> Export/Import (snapshot shape unchanged). Images/docs in IndexedDB↔Supabase buckets
> behind seams. Marketing poster generated from the architect's CAD
> (`Boulev_CLEAN.dxf`, in feet) via `poster.py`. Path B (hosted backend) is
> LIVE at otb-command.vercel.app / orangeoceanatlas.com — **production deploys
> from `.github/workflows/deploy.yml` on every push to master (repo secret
> `VERCEL_TOKEN`; cloud sessions trigger it by merging a PR — they cannot
> dispatch workflows). Brand sheet = 04C v1.0.1, adopted 2026-09-11.**
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
  ±14,375 SF, 32 spaces = 6+8+10+8, directly across Marie Antoinette from Lot 8; under mature oaks — invisible in aerials, operator-confirmed 2026-09-06, do not re-question from imagery).
  Also: rear M.A. parallel row 18 · Johnston strip 10 · JD Bank easement 13.
  **Plat striping totals 314 vs variance "324 provided" — Δ −10 unreconciled**
  (docs/parking-reconciliation-memo.md; cite 324 legally, plan ops on 314).
  CANDIDATE RESOLUTION 2026-09-05 (REV 13): the architect CAD stripes an unlabeled
  10-stall head-in row on the Johnston frontage south of the pylon sign → 314 + 10
  = 324. Pending ground confirmation; do not retire the 314 ops figure yet.
- **Access (A-1 REV 13, docs/site-access-inventory-2026-09.md):** 8 Belle curb
  cuts — Arnould Driveway A (31' throat, two-way, the only full-movement cut:
  55' median opening) and Driveway B (40', two-way, shared with JD Bank);
  Johnston drive (30', two-way, immediately south of the bank notch); Patricia ×3
  (149 service drive 37', 135B/137 rear pad 23', Lot 8 21'); Marie Antoinette ×2
  (Lot 8 25', breezeway apron 10' pedestrian). Rear M.A. row = 5 curbed bays
  straight off the street. All aisles two-way per plat arrows. JD Bank parcel is
  reached through Driveway B + the Johnston drive (reciprocal servitude Entry
  2004-00057697 — exhibit not yet pulled; servitude area NOT drawn).
- Assessor parcels (Belle): 6026783, 6026784, 6026785, 6026788, 6009649 (remote).
- Easements: Our Savior's Church $350/mo, 25-yr — **§3a liquor waiver survives
  termination** (restaurants OK within 175 ft; liquor line drawn on plat).
  JD Bank $250/mo to Belle + 13 spaces, expires 12/30/2034. JD Bank corner parcel
  is SOLD — never render it as Belle property; boundary shows a "NOT A PART" notch.
- Anchor: Jason's Deli (149) — §9.01 requires monthly HVAC PM contract with
  **Butcher Air Conditioning**; tenant maintains 100% of Unit 149 HVAC.
- Exclusive-use watch: HotWorx (129, Mar 2024) vs C. Wolf (135A, Nov 2024).
- **Lease terms — Tier-1 is the September 2026 lease review (operator ruling
  2026-09-11): `docs/lease-population-2026-09-10.md` + per-suite `leaseEvidence`
  in `src/data/units.json` supersede `docs/sot-2026-07/` for every suite they
  name.** Scheduled monthly total **$88,070.71** (was $90,291.23). 143 1st Franklin:
  signed amendment 12/22/2025 → **$3,354.75/mo ($21.00/SF total)**, 2/1/2026–
  1/31/2031. 145 Upstream: executed lease, base-rent abatement Jul–Dec 2026 at
  **$798.75/mo** (additional only), $3,035.25/mo from 1/2027; contractual
  commencement/expiry UNRESOLVED (`end` blank). 119 OUPAC/Daco: signed-document
  date conflict → current term UNRESOLVED (`end` blank), $2,890.42 retained.
  139/141 Fast Pass: prior term ended 7/31/2026; tenant-signed 3-yr renewal
  8/1/2026–7/31/2029 at $6,150.38 combined, LANDLORD SIGNATURE PENDING (`end`
  blank; NOT a holdover; proposed rent not yet in the schedule). Owner-confirmed
  renewals, signed copies pending: 105 → 3/31/2029 · 117.5 → 2/28/2029 (HVAC
  split pending) · 119.5 → 2/28/2029 · 121 → 12/31/2031. 109: ownership-change
  consent executed 8/31/2026, rent/term unchanged. HVAC caps 117.5 / 119.5 =
  "Pending verification". Blank-`end` suites drop out of T-1 and W-1 renewal
  triggers BY DESIGN until resolved (P-1 shows "Term unresolved"). No holdovers.
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
   floor-plan viewer per unit, expiration alerting, financial rollup.
   **DoorLoop import is OFF the roadmap (operator decision, Jun 2026) — do
   not re-propose it.** SOT stays the workbook + manual edits via the store.

## Data sources of truth (Tier 1)
- **Rent roll / lease economics:** `docs/lease-population-2026-09-10.md` +
  `units.json` `leaseEvidence` (owner confirmations 2026-09-09/10, Belle emails,
  OTB Master Lease Package 2026-08-01; adopted 2026-09-11) for the suites it
  names → otherwise `docs/sot-2026-07/` (owner-corrected signed rent roll,
  adopted 2026-07-16) → workbook. Supersession memo:
  `docs/sot-supersession-2026-09-11.md`. DoorLoop dates never authoritative.
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
- **Cypress preview (2026-09):** `VERCEL_ENV=preview` deployments run against the
  isolated Supabase branch `hefexnqkigirmzpmeggj` (`tools/check-preview-isolation.mjs`
  aborts build + every function if the prod ref or a listed secret is present in
  Preview env). `otb.cypresscommand.com` is bound to that preview. NEVER promote a
  preview deployment to production. `/api/atlas-numbers` (dated 2026-09-09
  production-ledger extract, committed under `api/`) serves only when the
  configured project ref equals the extract's source ref.
- **Browser state (2026-09):** scoped keys `otb-command-state-v2:<mode>:…`;
  authenticated boot is remote-required (never reads local); on load failure the
  operator gets a READ-ONLY "last saved copy" path (store scope null → nothing
  persists or syncs). Import JSON accepts legacy scope-less exports; rejects
  exports bound to another account/property.
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
