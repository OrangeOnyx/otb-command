# Coordinate systems / transform reconciliation

Status: REVIEWED from repository evidence only. No unverified bridge transforms invented.
Audit finish pass: 2026-09-29T04:55:00-05:00 (America/Chicago).
Repo: `otb-command` @ `ace81d8087a51764f63ec6e0707918507a770212` (master).

## Summary finding

Runtime **site-twin / A-5 presentation model** and the **LiDAR / Polycam twin registration** use **different coordinate frames**. Mixing meshes or picking points across them without an explicit, verified bridge will misplace assets.

## Frame A — A-1 plan / plat presentation (site-twin)

| Item | Evidence |
| --- | --- |
| Source drawing | `src/data/geometry.json` `boundary.transform` |
| Plan px → plat feet | `kxPxPerFt=1.8515`, `kyPxPerFt=1.88663`; envelope xRight=1360,xLeft=70,yBottom=662,yTop=96; `aRangeFt=[-25,671.73]`, `bRangeFt=[-300,0]` |
| Adapter | `tools/site-twin/coords.mjs` |
| Feet → model metres | `FT=0.3048`; `feetToModel([a,b],y)=[-a*FT, y, b*FT]` |
| Orientation (D4) | Plat axes: Marie Antoinette = −Z, Arnould = +Z; true-north rotation **recorded, not applied** |
| Authority | Presentation from plat/CAD/operator sheets; **not surveyed / not field verified** |

### Documented formulas (from source)

```text
planToFeet([x,y], t) =
  [ t.aRangeFt[0] + (t.envelope.xRight - x) / t.kxPxPerFt,
    t.bRangeFt[1] + (y - t.envelope.yBottom) / t.kyPxPerFt ]

feetToModel([a,b], y=0) = [-a * 0.3048, y, b * 0.3048]
```

## Frame B — Floorplanner native interior model

| Item | Evidence |
| --- | --- |
| Source | `On_The_Boulevard.native.fml` (sha256 in `public/twin/model-report.json`) |
| Units | centimeter → meter; upAxis Y |
| Origin | `originFmlCm ≈ {x: -6403.27, y: -2511.45, z: 0}` |
| Mapping | `[ (FML.x-origin.x)/100, FML.z/100, (FML.y-origin.y)/100 ]` |
| Authority | Floorplanner export; not measured survey |

## Frame C — Site-context affine (parking / common areas)

| Item | Evidence |
| --- | --- |
| File | `public/twin/site-context.json` `registration` |
| matrix3x2 | `[[-0.16384354, -0.00010084], [0.00331724, -0.15766261], [118.08055643, 58.28941254]]` |
| Quality | controlCount=37; rmsMeters=0.53702082; maxResidualMeters=1.29391791 |
| Status | `same-frame-verified-drawing-registration` (drawing agreement, not survey) |

## Frame D — LiDAR / Polycam twin geodetic local

| Item | Evidence |
| --- | --- |
| Tool | `tools/register-polycam.py` |
| CRS | EPSG:4326 → **EPSG:6344**; vertical **NAVD88** (tool header) |
| Local origin | `ORIGIN = [591000.0, 3341600.0, 0.0]` |
| Pipeline | Umeyama (local↔geo) → vertical seed → 4-DoF ICP onto DJI dense cloud |
| Pack fetch | `tools/fetch-otb-lidar.mjs` tag `lidar-otb-v1` |

## Unverified / missing

- **No in-repo verified bridge** from Frame D to Frame A.
- Do **not** invent identity/translation between A and D.
- Google 3D Tiles / Cesium frames are separate; not reconciled here.
- Site-context elevations are rendering offsets around Y=0 — not measured terrain.

## Reconciliation recommendation (proposal only)

1. Frame A = A-5 / site-twin presentation authority for A-1 register picks.
2. Frame D = calibrated scan authority for LiDAR/photogrammetry.
3. Before unified rendering: compute/survey bridge with shared control; publish matrix+RMS+date; require approval.
4. Until then: dual-frame labeling; refuse silent joins.

## Evidence locators

- `tools/site-twin/coords.mjs`
- `src/data/geometry.json`
- `public/twin/model-report.json`
- `public/twin/site-context.json`
- `tools/register-polycam.py`
- `docs/asset-twin-site-context.md`
- `dist-twin/OTB_Site_Twin/twin-report.json`
