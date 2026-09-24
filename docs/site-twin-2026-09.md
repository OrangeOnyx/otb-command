# OTB Site Twin (Stage 2) — basis and rebuild (2026-09-24)

`OTB_Site_Twin` is a portable 3D model and offline inspector for the whole site. It is built from the A-1 site register: every node in the GLB carries `extras.assetId`, which equals the register ID. The register (`docs/site-register-2026-09.md`), the 3D model, and any future work orders or sensors therefore share one key.

- **Plan:** `docs/superpowers/plans/2026-09-24-site-twin-stage2.md`.
- **Delivered:** `G:\My Drive\00 OTB\site-twin\OTB_Site_Twin.zip`. Extract it, then run **Start Viewer.cmd** and open http://127.0.0.1:8770.

## What it contains

| Item | Count |
| --- | --- |
| Register assets (same as A-1) | 745 |
| Modeled as geometry | 616 (648 glTF nodes, about 6.7k triangles, 1.28 MB GLB) |
| Listed as data only | 129 |

**Listed as data only** (these have no real position of their own, so they are not drawn):
- per-suite electrical panels, electric and water meters, and time clocks;
- zones and buildings, which are drawn through their members;
- unlocated rows (the Federal Pacific panel, fixture types, sign records).

**Modeled:**
- **Site:** parcel ground; 27 suites extruded to their CAD parapet heights with TPO roofs; the mansard walkway canopy; islands; 324 individually pickable stalls (the 10 CAD-pending stalls have amber stripes); ADA stalls.
- **Walkway:** 39 operator columns (37 carry `codexAssetId`), benches, cans.
- **Utilities:** meter cabinets, shut-offs, LUS mains (below grade) and structures, transformers, the pole.
- **Other structures:** ground heat pumps, bollards, fences and the freezer, the pylon, light poles, fire walls, cameras.
- **Rooftop units:** one per suite (see D2).
- **Placeholders:** 7 categories with 0 records.

## Decisions used (operator "go" on the defaults, 2026-09-24)

| # | Value | Status |
| --- | --- | --- |
| D1 | Canopy eave 10 ft, top 14 ft, 45° shingle face on the field side | presentation (no measured height on file) |
| D2 | One rooftop unit per suite, 5 × 4 × 3 ft | presentation proxy (per-suite count not verified) |
| D3 | 1990s trees modeled, hidden by default | historic source |
| D4 | Plat axes: Johnston toward −X, Marie Antoinette toward −Z. Plan view matches A-1 exactly. True-north rotation (0.912 rad) is recorded in `twin-data.json` and not applied | — |

## Coordinates

A-1 plan pixels are converted to plat feet (a, b) using `geometry.boundary.transform`. That transform uses kx 1.8515 and ky 1.88663 px/ft, which undoes A-1's roughly 1.9% difference in horizontal and vertical scale.

Feet are then converted to metres: X = −a·0.3048 and Z = b·0.3048, with Y up. The model is centred on the two-building footprint. The origin is recorded in `twin-data.json` as `transform.originPlatFt`.

Code: `tools/site-twin/coords.mjs`.

## Honesty rules carried into the model

- **Positions** are the register's: the plat, the CAD, and your sheets digitized onto the plan (to about 3 ft), plus the historic trees and the LUS context tier (about 9 ft). Nothing is surveyed or field verified.
- **Heights** come from `heights.json`, the CAD `BLD_HT` parapet associations. They are not ceiling heights. The Codex model's 12.75 ft walls are not used.
- **LUS mains** are drawn at −1.2 m. That depth is not verified.
- **Parcel and bank:** JD Bank's parcel is NOT A PART, so its building is not modeled. Its 13 easement stalls are modeled.
- **Colours:** brass means a highlighted category and amber means a selection. Neither indicates condition.

## Rebuild

```bash
npm run site-twin                  # dist-twin/OTB_Site_Twin/ (gitignored)
npm run site-twin -- --check       # rebuild in memory; fails unless model.glb is byte-identical
npm run site-twin -- --drive       # also zip and copy to G:\My Drive\00 OTB\site-twin\
node --test test/site-twin.test.mjs
```

Re-run the Stage 1 pipeline first whenever a source changes: `tools/extract-geometry.mjs`, `tools/digitize-site-sources.py`, `tools/build-meters.py`.

## Code map

| File | Role |
| --- | --- |
| `tools/build-site-twin.mjs` | `buildTwin()`: register → meshes → GLB, plus `twin-data`, CSV and report; CLI flags |
| `tools/site-twin/glb.mjs` | Dependency-free glTF 2.0 / GLB writer and validator |
| `tools/site-twin/meshes.mjs` | Primitives: flat polygon, prism, box, ribbon, wall, pipe, disc, mansard canopy, tree |
| `tools/site-twin/categories.mjs` | The per-category spec (mesh kind, dimensions, presentation and record colours, default visibility) and D1–D4 |
| `tools/site-twin/viewer/` | Offline inspector template, copied with three.js from `node_modules` |

## Not in Stage 2

- Loading the GLB into A-2's Lens-B.
- Interiors, and the 101/103 second floor.
- Photogrammetry textures.
- Live data against `assetId`.
- Survey-grade geometry.
