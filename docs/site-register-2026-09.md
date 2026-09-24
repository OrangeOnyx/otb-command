# A-1 Site Register — basis, IDs, sources (2026-09-24)

The A-1 site plan now gives every site asset the treatment the Sep 23 `OTB_Column_Twin` gave the walkway columns.

- **What it does:** each asset has a stable ID. You can highlight it by category, pick it on the plan or in a searchable register, isolate it, focus on it and label it. The register exports to CSV and JSON, and every entry carries its source and verification status.
- **Where to find it:** open A-1 and turn on **◫ Register**.
- **Plan:** `docs/superpowers/plans/2026-09-24-a1-site-register.md`.
- **Stage 2** will build the portable 3D site twin (GLB plus an offline inspector) keyed to these same IDs.

**Scale.** 745 assets in 41 categories, of which 7 are placeholders ("no source yet").

## Where the data comes from

| Layer | File | Built by |
| --- | --- | --- |
| Parcels, stall rows, curb cuts, aisles, easements, liquor line, islands | `src/data/geometry.json` → `assetGeom` | `tools/extract-geometry.mjs` (metadata only; drawn layers unchanged, REV 14) |
| Walkway furniture, meters, shut-offs, ADA, fences, pylon, trees, LUS, transformers, heat pumps, walks, fire walls, per-unit systems | `src/data/site-register.json` | `tools/digitize-site-sources.py` |
| Water and electric meters | `src/data/meters.json` | `tools/build-meters.py` (from the meter workbook) |
| Units, cameras, 📍 pins | `geometry.units`, `cameras.json`, store features | read live |
| Register assembly (pure) | — | `src/lib/siteassets.js` |
| Panel | — | `src/views/plan-register.js` |

## ID scheme

IDs are positional or keyed to their source. They stay stable as long as the generator's row order and the source sheets don't change. They are **not** physical field tags.

| Category | Pattern | Example |
| --- | --- | --- |
| Parcels | `parcel-<id>` | `parcel-main`, `parcel-lot7` |
| Buildings | `bldg-long`, `bldg-short` | |
| Units | `unit-<suite>` | `unit-117.5`, `unit-135a` |
| Parking zones | `zone-<zone>` | `zone-storefront` |
| Stalls | `stall-<zone>-NNN`, numbered along the row, stall 1 at the row's first corner | `stall-storefront-012` |
| Curb cuts, aisles | `drive-<id>`, `aisle-<id>` | `drive-a`, `aisle-ew-storefront` |
| Easements | `esmt-<id>` | `esmt-liquor-line` |
| Islands | `island-<id>` | |
| Columns | `col-01` … `col-39`, **your numbering** (1 at the 101 end, 39 at the Patricia end of the short walk) | |
| Benches, cans | `bench-NN`, `can-NN`, numbered along the walk from the 101 end | |
| City meter clusters | `mclu-<location>` | `mclu-119` |
| Tenant shut-off clusters | `shutoff-NN` | |
| Water meters | `wm-<meter no.>` | `wm-w1204084` |
| Electric meters | `em-<meter no.>` | |
| LUS utilities | `lus-<LUS structure id>`, `lus-mh-NN`, `lus-red-NN`, `lus-<main>` | |
| Per-unit systems | `rtu-<suite>`, `panel-<suite>`, `tc-<suite>[-k]` | |
| Pins | `pin-<pin id>` | |

**Column cross-link.** 37 of your 39 columns carry the Codex 3D twin's ID (`codexAssetId`). Columns 1 and 2, at the rear of the 101 end, are missing from the Codex model. Codex's review-flagged C25 is your Column 27.

## What the verification labels mean

| Label | Meaning |
| --- | --- |
| `plat` | Taken from the recorded plat. |
| `plat-derived` | The plat's count for the zone, spread evenly over the drawn row. |
| `est-geometric` | Storefront row56. Accurate to within one stall until the stall walk. |
| `cad-pending` | The 10 Johnston stalls that appear on the architect's CAD but have no label on the plat. These are the candidate 324 − 314. |
| `cad` | Taken from the architect's CAD. |
| `presentation` | Unit rectangles; not measured. |
| `digitized` | Read off one of your sheets. The sheet was aligned to A-1 on building corners with a gated error limit of 6 px (about 3 ft). |
| `historic-source` | 1990s trees; context tier, 10 px limit. |
| `public-utility-context` | Lafayette Utilities (LUS) 2021 captures; similarity fit at 17 px (about 9 ft). Features sit on street-parallel lines. |
| `approximate` | Placed by hand relative to building features from a photographed sheet (E1.02, Crist A-1, M1.02). |
| `records` | Per-unit row from plan sets or the workbook. Shown at the suite centre. |
| `photo` / `no-photo` | Time-clock photo set. |
| `photo-unlocated` | Federal Pacific panel; which unit it's in is unknown. |
| `pin` | Your 📍 pin. |

## Rules that still hold

- **Parking:** the legal figure stays **324 provided / 344 required**; operations stay on **314**. The 10 CAD stalls are `pending` and never counted into 314.
- **JD Bank:** the 13 stalls on the bank parcel are easement spaces. The bank parcel is NOT A PART of the property.
- **Nothing surveyed:** nothing in the register is surveyed or field verified. No condition or maintenance state is shown or implied. Brass means highlighted and amber means selected; neither indicates condition.

## Findings from the source review (flagged; locked facts unchanged)

1. **Meter cluster behind 131.** Your utility map shows 1 meter there; the workbook lists 4 (for 125, 127, 129 and 131/133).
2. **Suite 123's water meter** is listed with location "?". It is very likely in the "behind 119" cluster, which would make that cluster's count 8.
3. **Meter totals.** The workbook holds **28 water / 28 electric** meters, including house meters E1242388 (sprinkler), E1103767 and E1268329.
4. **Tenant shut-offs.** The map shows **37** in 13 clusters.
5. **Federal Pacific 42-circuit panel** appears in the breaker-labeling photos; the unit isn't identified. **This is a replacement-review item.**
6. **Time clocks.** There are no photos for 111, 135B and 139.
7. **Old drawings disagree with locked figures** (the locked figures stand):
   - The 2006 Main T1.01 says 324 required / 323 provided.
   - The 2007 Crist counts total 339, including Lot 7 at 34 and Lot 8 at 18.
   - The 2020 survey's suite areas add to about 62,807 SF, and it still shows 103 at the pre-correction 3,051.
8. **Walkway depth differs by source.** Floorplanner draws the walks 14.5 ft and 13.1 ft deep; the plat puts the stall curbs about 11 ft and 12.5 ft from the storefronts. Walk items are placed proportionally from face to curb.
9. **No drawings on file** for storm drains, backflow, FDC/risers, grease traps, dumpster pads, roof drains or the irrigation controller. Main.pdf cites civil sheets C1.02–C1.05, which aren't in the folder. Each of these categories has a pin type, so pins can fill them.

## To re-run

```bash
python tools/build-meters.py
python tools/digitize-site-sources.py
node --test test/siteassets.test.mjs
```

`digitize-site-sources.py` reads the source sheets from `G:\My Drive\00 OTB\01 Belle Files to be placed\` and, optionally, the Codex column twin's `model-data.json`.

If a sheet's alignment exceeds its tier's error limit, the script aborts rather than writing drifted points.
