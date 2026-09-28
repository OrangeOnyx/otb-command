# Skydio survey rescue — why the 2025-10-15 photos never lined up, and the fix

**Date:** 2026-09-28 · **Tool:** `python tools/skydio-rectify.py` · **Outputs:** `export/skydio-rectify/` (gitignored, regenerable)
**Source:** 165 Skydio X10 stills, 2025-10-15 (3 flights), `E:/OTB-CAPTURE/Drone-Footage-RAW-2026-07/OTB-mesh-photos-skydio/`

## Twin frame (canonical from here on)

**EPSG:6344 NAD83(2011) / UTM 15N + NAVD88 (GEOID12B), metres**, the frame of the USGS 3DEP LAZ.
Local origin **E 591000, N 3341600, H 0**. Every twin asset (Blender, Unreal, splats, meshes) should be
registered to this frame and origin.

## The four defects (all measured from the photos' own metadata)

| # | Defect | Evidence | Effect |
|---|---|---|---|
| 1 | Altitude is WGS84 **ellipsoidal** | XMP `VertCS=ellipsoidal`; `GpsMslHeight − AbsoluteAltitude = 26.28 m` on all 165 | Tools that read it as MSL sink the model ~26 m |
| 2 | The flights **disagree vertically** | RTK − LiDAR-locked solution: flight 35D0EBA6 −0.16 m (n 27) · 7DD70157 −1.90 m (n 9) · B3A7C8C4 +9.05 m (n 2) | Joint models tilt / warp vertically |
| 3 | **Two lenses** mixed | module 5 tele (110 photos, 9248×6944, f≈12,400 px) · module 7 wide (55, 8192×6144, f≈4,940 px) | The July COLMAP models that registered all 165 used ONE camera at f≈10,864 px (@3840) — a flattened, near-orthographic solution |
| 4 | Per-photo **digital zoom** | EXIF `DigitalZoomRatio` 1.01×–18.31× on the tele (most 1.3–3.1×); 1.56×/1.94× on 5 wide frames | Each photo has its own focal (= calibrated f × zoom). No shared camera fits; free bundle adjustment "fits" by warping (tele drifted +25 %, wide −8 %, fx≠fy) |

Horizontal RTK is sound: after culling mis-registered frames, RTK and the solved positions agree to
~0.1–0.4 m (median) horizontally.

## Method

1. **LiDAR prep.** 3DEP LAZ (`npm run fetch-lidar -- --with-laz`) → 0.5 m DSM/DTM, roof mask (height above
   ground 2.5–15 m, planar, ≥100 m²). No building class in this LAZ (classes 1/2/7 only).
2. **Reconstruction.** COLMAP, one **fixed** camera per photo: XMP calibrated focal × EXIF zoom, principal
   point scaled about the image centre, `DewarpData` k1/k2/k3 as FULL_OPENCV radial. `pose_prior_mapper`
   with the full-precision XMP RTK (geoid-corrected) as priors in the local twin frame, σ 0.5 m horizontal,
   5 m vertical, robust loss.
3. **Alignment per group.** Robust similarity to RTK (seeded by a median shift); cameras still > 3 m from RTK
   horizontally are mis-registered (look-alike roof tiles) and culled; re-fit. Then a **vertical-only
   LiDAR lock**: robust plane fit of `z − DSM` over flat cells (ground, roof interior) → dz + two tilts.
   Horizontal stays on RTK (a 7-DoF ICP slid 6.6° on flat surfaces).

## Result

| | |
|---|---|
| Registered | **50 / 165** photos (25 more reconstructed but culled as mis-registered) |
| LiDAR-locked | **38** photos in 2 groups: dz +0.57 m / tilt 2.27° (0.21 m RMS, 83 % on-surface) and dz +1.37 m / tilt 0.69° (0.26 m RMS, 56 %) |
| RTK-only | 12 photos in 2 small groups (too little structure to lock; flagged `lidar_locked=0`) |
| Reprojection | median 0.37 px, p95 1.8 px (recomputed on the transformed poses) |
| All sparse points vs LiDAR | 69 % within 0.3 m, 79 % within 1 m (misses concentrate on tree crowns: 2017 LiDAR vs 2025 canopy) |

**What the Skydio set is good for:** the 50 registered wide-angle frames (parking field, façades, the
neighbour building to the NE) are now correctly posed in the twin frame, usable as texture/evidence and to
extend a photogrammetry mesh. **What it cannot do:** reconstruct our roofs. 110 of 165 frames are zoomed
tele close-ups of blank membrane; they do not connect geometrically. This confirms the July finding
("capture-limited") with a cause. A roof model needs the re-fly recipe (`docs/roof-condition-brief.md`):
fixed zoom 1×, one lens, ≥70 % overlap grid.

## Side finding — building footprints are ~5.6 m off

The Esri-tuned footprints (`src/data/footprints-geo.json`, `azY 52.25`) sit **2.6 m W / 4.9 m N and 1.25°**
from the LiDAR roofs (IoU 0.76 → 0.86 after a rigid fit). Most likely roof-lean in the Esri orthoimagery plus
the datum difference. The LiDAR-registered set is `export/skydio-rectify/footprints-lidar.geojson`.
**Not applied to the app.** Adopting it would move A-2 / Google Earth / twin placement and needs an operator
ruling.

## Outputs (`export/skydio-rectify/`)

- `poses-rectified.csv`: per photo: group, flight, lens, E/N/H (6344 + NAVD88), local x/y/z, lat/lon, yaw/pitch/roll, RTK − solved, `lidar_locked`
- `flightlog-6344.csv`: `name,E,N,H,yaw,pitch,roll` for RealityScan / Metashape (set CRS EPSG:6344 + EPSG:5703)
- `colmap-world/`: merged COLMAP TXT model in the local twin frame (dense MVS / Postshot / Brush input)
- `sparse-world.ply`, `footprints-lidar.geojson`, `check-topview.png`, `report.json`

COLMAP workspace: `C:/Users/adam/tools3dgs/otb-skydio-v2/` (`db3.db`, `sparse-z/`). The July `otb-roof/`
workspace is untouched.
