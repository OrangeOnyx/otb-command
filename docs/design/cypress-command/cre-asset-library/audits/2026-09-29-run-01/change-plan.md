# Change plan · run 2026-09-29-01

## A. Executed in this run (safe, additive, local)

Nothing here is pushed or deployed. None of it touches canonical data, production IDs, the database or the nav.

| # | Change | Validation | Rollback |
|---|---|---|---|
| A1 | Added the package at `docs/design/cypress-command/cre-asset-library/`, as delivered | Package validator PASS | `git rm -r` |
| A2 | Added `tools/cre-library/otb-slice.mjs` and `build-otb-slice.mjs`, a read-only adapter | `node --check`; 7/7 unit tests; `npm test` 943/943; `npm run build` OK | delete |
| A3 | Generated the OTB slice under `properties/on-the-boulevard/`: 55 records, 3 SVGs, 2 derived geometry files and an isolated preview | `validate_examples.py --repo-root` PASS, with SHA-256 checks; browser QA in light/dark, with overlay and keyboard | rerun the builder / delete |
| A4 | Wrote the audit reports in this folder | — | delete |

## B. Needs explicit approval (in priority order)

1. **B1 · Brand tokens for the library (decision).** Pick one of:
   - (a) Map `.cc-cre` onto the 04C brand: Cypress/Moss/Amber, Fraunces/Inter/JetBrains Mono. This is recommended, because 04C is the approved release and ships its font files.
   - (b) Keep the package tokens as delivered (Terra/Olive, Besley/Archivo). These fonts are not bundled.
   - (c) Map onto the plan-room app palette.

   Whichever you pick, this adds one mapping file and does not touch global styles.
2. **B2 · Fix pylon vs monument naming.** `pylon.json` names the sign "Monument sign". Confirm "pylon" and edit `sign.name`, which is a canonical data edit.
3. **B3 · P13 conflict.** The installed panel reads "Boulevard Nutrition", but the tenant of record for 145 is Upstream Rehabilitation. This is an operations decision: re-skin the panel or update the register.
4. **B4 · site-register adapter (mm-06).** Emit asset records for the 270 items. Remove the HVAC cost caps from `rtu.sub`. Map `cat:panel` to the utilities asset type. This is additive, but approve before any sheet reads it.
5. **B5 · Rerun `extract-heights.py` so it flags annotated vs. defaulted heights.** This regenerates canonical `heights.json`. It resolves the 16.4 ft question for 22 of 27 units.
6. **B6 · Preview as an app sheet (mm-09).** Add one entry to `src/lib/pages.js`, gated like A-3. Push to master **deploys to production**.
7. **B7 · Market-facing brand strings (mm-11).** Change the 19 naked "Cypress Command" strings to "Cypress Command Platform". Legal-entity "Orange Ocean" uses stay (31 rows).
8. **B8 · Canonical data corrections.** "Arnould Heights" → "Arnold Heights" in the geometry.json transcription (C14); the `tour.html` favicon 404 (mm-12).
9. **B9 · Repo hygiene.** Remove `marketing$name.png` and `marketing$n.pdf` (mm-10). Pick one pylon renderer (mm-08).

## C. Blocked on evidence (operator or field)

- **Foot definition.** International vs US survey foot, for the plat and the CAD (C03).
- **CAD vs plat length for the long building.** 528.93 ft vs 522.31 ft (C08).
- **Native plat PDF and the 1999 Guidry Beazley sign sheet (PA1.01).** Both are on Drive and are not in the repo. The sign sheet is the only dimensioned pylon drawing found.
- **Parking reconciliation.** 314 counted vs 324 claimed; needs a ground count (C01).
- **LiDAR frame labelling.** The LiDAR is labelled EPSG:26915 but the twin frame is EPSG:6344 (C11). Also, the `public/elevation` hillshade is gitignored and therefore absent from production builds.
- **`.cache/twin-*` PLY files.** These may be the only copies. Do not clean them.

## D. Operator decisions 2026-09-29 (second pass) — executed

| # | Decision | Executed |
|---|---|---|
| B1 | **1b**: keep the package tokens as delivered | Kept as-is; no remap into the app |
| B3 | Re-skin P13 when the new pylon sign is installed | `pylon.json` P13 note; the overlay shows "Scheduled: re-skin…" |
| B2 | It is a pylon sign | `pylon.json` `sign.name`, the site-register label (source script + JSON), the directory entry, and the `pylonsvg.js` fallback |
| B4 | Extend the tool to the site register | 270 items → 21 layer files with library IDs, an alias table and a site-plan vector. HVAC cost caps are stripped. Utility layers are operator-only |
| B5 | Roof heights | New `tools/measure-roof-heights.py` (USGS 3DEP 2017 LiDAR) replaces the CAD label matching; see the table below. `heights.json` keeps its shape; evidence is in `src/data/heights-provenance.json` |
| B6 | Preview as an app sheet | A-6 Asset Library (`src/lib/pages.js`, `index.html`, `src/views/asset-library.js`, shared `src/lib/cre-library-view.js`). It is lazy-loaded and uses live store units |
| — | House style vocabulary | `shared/style-vocabulary.md`. Elevations are restyled as Architectural Leasing Asset Illustrations; the pylon is a Directory Sign Vector Render with editable tenant slots |

### Roofline heights (LiDAR, feet above the parking field)

| Section | Height | Attested vs measured |
|---|---|---|
| Typical roofline (all remaining units) | 18.5 | matches |
| 105 | 15.2 | lower, matches |
| 101 end cap | 25.8 | taller, matches |
| 149 (Jason's), raised section | 23.5 | taller, matches; main deck 18.6 |
| Bell tower at the 133/135 junction | 28.5 median, 32.1 peak | recorded as a feature |
| **103** | **21.7** | **CONFLICT: you said typical.** The LiDAR shows a ~30 ft roof section at 21.7 ft between 105 and the 101 end cap. The value stays as measured and flagged until you rule |

**Side finding:** the LAZ point cloud is EPSG:6344 + NAVD88, the same frame as the twin. The EPSG:26915 label belongs to the DEM only. This partly resolves conflict C11.

## E. Operator decisions 2026-09-30 — plats (A-1 REV 15)

| Item | Decision / result |
|---|---|
| Frontages | 2020 site plan + survey CAD. 101 83.0 · 103 25.0 · 109 30 · 111 20 · 113 30.8 (CAD demising 30.79'; plan label 32.3' is an error). Only 131/133 is still derived |
| Heights | 2019 ALTA survey labels. 16.4 typical · 105 13.2 · 103 20.6 (operator: taller) · 101 23.6 · 101 end projection 13.5 · facade ≈23.6 (Jason's). The LiDAR cross-check runs +1.1 to +2.4 ft |
| Housekeeping | Native plats added in `reference/plats/` and registered as library sources |
| C08 | Resolved. CAD 528.93' = 521.04' storefront face + 7.83' end projection |
| C14 (mm-13) | Withdrawn. The survey itself spells "Arnould Heights"; the title-check ruling keeps "Arnold Heights" as the name of record. No edits |
| Still open | 101/103 line: CAD `UNITS` layer 35.5 / 72.5 vs survey 25.0 / 83.0 · 117.5: CAD demising 19.5' vs plat string 20.2' |
