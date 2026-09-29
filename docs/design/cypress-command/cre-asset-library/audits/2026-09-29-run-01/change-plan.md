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
