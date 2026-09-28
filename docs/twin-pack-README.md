# OTB Twin Pack: Blender + Unreal

On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette LA · Cypress Command Platform
Built by `python tools/build-twin-pack.py` (repo `otb-command`). Regenerate; never hand-edit.

## One frame for everything

| | |
|---|---|
| Horizontal | **EPSG:6344** NAD83(2011) / UTM zone 15N, metres |
| Vertical | **NAVD88 (GEOID12B)**, metres (EPSG:5703), the USGS 3DEP LiDAR datum |
| Local origin | **E 591000, N 3341600, H 0**. All files use local metres from here |
| GLB (glTF) axes | x = East, y = Up, z = −North |
| Blender axes | X = East, Y = North, Z = Up (the glTF importer converts) |
| Unreal axes | X = East, Y = South, Z = Up, centimetres (the glTF importer converts) |
| LAZ | absolute EPSG:6344 + NAVD88 coordinates, CRS embedded |

Every model in `models/` is **already registered**: it lines up the moment it is imported, with no manual moves.
`frame.json` records how each source was tied to the frame, with residuals, and gives check positions
(`unreal_checks` / `blender_checks`) for Suite 101, Suite 149, Column 1 and a Lot 8 stall.

## Contents

| File | What | Registration | Accuracy (vs LiDAR) |
|---|---|---|---|
| `models/OTB-site-twin.glb` | A-1 register exterior twin: parcels, 27 suites, 324 stalls, 39 columns, benches, cans, utilities. Every node carries `extras.assetId` | 27 suite centres → LiDAR-registered footprints | 0.78 m RMS (max 1.41) |
| `models/OTB-interior-complete-model.glb` | Floorplanner interior: walls, doors, windows, columns | 37 columns → site twin columns (C*k* = col-*k*+2), then as above | 0.63 m RMS to the site twin |
| `models/OTB-interior-{site-context,upper-floors,fixtures}.glb` | Interior sub-layers | same as interior | same |
| `models/OTB-site-mesh.glb` | Photogrammetry mesh of the site (DJI orbit 2026-07), 600k faces, vertex colours (`COLOR_0`) | Façades → LiDAR roof edges; LiDAR height field | see `data/photogrammetry-report.json` |
| `models/OTB-terrain-3dep.glb` | 1 m bare-earth terrain | native (LiDAR) | source |
| `terrain/OTB-heightmap-1009.png` + `.json` | 16-bit Unreal Landscape heightmap + exact scale/placement | native | source |
| `pointclouds/OTB-lidar-3dep-2017.laz` | USGS 3DEP 2017 LiDAR, clipped to the site + 60 m | native | source |
| `pointclouds/OTB-site-photogrammetry.laz` | Dense coloured photogrammetry cloud | as mesh | as mesh |
| `splat/OTB-splat-dji-twin.ply` | DJI Gaussian splat re-seated in the twin frame (Z-up). SH band 1 rotated, bands 2–3 zeroed | as mesh | see `frame.json` `splat` |
| `data/assets-twin-frame.csv` | Every register asset with local and EPSG:6344 coordinates | — | — |
| `data/site-register.csv`, `data/twin-data.json` | The A-1 register itself | — | — |
| `data/skydio-*` | Rectified 2025-10-15 Skydio poses (RealityScan/Metashape flight log in EPSG:6344) | — | 38 photos LiDAR-locked, 0.21–0.26 m |
| `models/OTB-polycam-2026-08-18-twin.glb` + `pointclouds/…-twin.laz` | iPhone LiDAR scan, Jason's Deli corner (149) + 145/143 frontage | local→geo exact, then heading + shift ICP to the DJI cloud | 75 % of overlap within 0.3 m (reference-limited) |
| `blender/import_otb_twin.py` | Builds `OTB_Twin.blend`: all models in collections, register fields on objects, camera | — | — |
| `unreal/import_otb_twin.py` | Unreal Editor import (see below) | — | — |
| `data/check-*.jpg` | Top-view proof that the models line up | — | — |

## Blender (4.2+ / 5.x)

1. Open Blender (empty scene) > *Scripting* > *Open* `blender/import_otb_twin.py` > *Run Script* > *File > Save As* `OTB_Twin.blend`.
   Collections: site twin, interior, photogrammetry, terrain, Polycam (interior sub-layers hidden).
2. Click any register object: *Object Properties > Custom Properties* shows `assetId`, `otb_category`, `otb_label`,
   `otb_status`, `otb_E_6344`/`otb_N_6344`/`otb_H_navd88`.
4. Splat: install a 3DGS add-on (e.g. KIRI 3DGS Render) and import `splat/OTB-splat-dji-twin.ply`; it is Z-up in the same frame.
   Point clouds: import the LAZ with a point-cloud add-on, or use the photogrammetry mesh.

## Unreal Engine (5.4+, written against 5.8)

1. New project (Blank, no starter content). *Edit > Plugins*, enable **Python Editor Script Plugin**, **LiDAR Point Cloud**,
   **Georeferencing** (Interchange and glTF importers are on by default). Restart.
2. *Tools > Execute Python Script…* > `unreal/import_otb_twin.py`. It scene-imports the GLBs (hierarchy kept, actors at
   the origin), imports both LAZ clouds and puts them back at their true centres, adds a **GeoReferencingSystem**
   (flat planet, EPSG:6344, origin 591000 / 3341600), then tags every register actor (`OTB`, category, assetId) and
   files it under `OTB/Register/<category>` in the Outliner.
3. **Verify** (under 1 minute): select `unit-101`; its location should match `frame.json` → `unreal_checks.unit-101.unreal_cm`
   within the scene-import tolerance. If it is mirrored (Y flipped), your importer build uses a different axis mapping;
   report it rather than moving actors.
4. **Landscape (optional, replaces the terrain GLB):** *Landscape Mode > Import from file* → `terrain/OTB-heightmap-1009.png`.
   Use the `unreal_landscape` scale values in `OTB-heightmap-1009.json`; place the Landscape's NW corner at
   (`west_local_m`, −`north_local_m`) × 100 cm and its base at `height_min_navd88_m` × 100 cm.
5. **Context city (optional):** Cesium for Unreal + Google Photorealistic 3D Tiles *streams* the surroundings. Set the
   CesiumGeoreference origin to lat 30.2024815, lon −92.0545795, height ≈ −26.3 m ellipsoidal (= the local origin,
   NAVD88 0 m; Cesium works in WGS84 ellipsoid heights, so adjust the height if models float or sink). Google's terms allow streaming only:
   never bake, export or include those tiles in this pack.

## How the twin is produced (update workflow)

```
capture (E:/OTB-CAPTURE)  ->  tools/skydio-rectify.py   Skydio poses: per-photo zoom cameras, RTK priors, LiDAR lock
                           ->  tools/build-twin-mesh.py  DJI dense -> twin frame, merge, Poisson, Blender bake
repo register (A-1)        ->  npm run site-twin         site twin GLB keyed to permanent asset IDs
                           ->  tools/build-twin-pack.py  register every asset to the frame, this pack, Drive copy
```

New capture: add it under `E:/OTB-CAPTURE/<date>`, register it to this frame (LiDAR height field + façade edges, as
`build-twin-mesh.py` does), append it as a new model. **Never renumber asset IDs** because geometry improved.

## Known limits (read before relying on a number)

- **Roofs:** no photogrammetric roof surface. The Skydio tele frames (1–18× digital zoom, blank membrane) do not reconstruct;
  roof geometry here is LiDAR (2017) + the register model. Fix = one re-fly at fixed 1× zoom, one lens, ≥70 % overlap grid.
- **Register geometry** is plat/drawing-derived (`status` per asset says so); sub-metre agreement with the LiDAR, not a survey.
- **LiDAR is 2017.** Trees have grown; anything built or removed since is not in it.
- **Polycam 2026-09-28** (101 end-cap) is not in the pack: its registration reached 49.7 % of overlap within 0.3 m, under
  the 50 % bar (it needed 3.2 m and 1.9° of correction; the DJI cloud is weakest at the Johnston end). Re-run
  `tools/register-polycam.py` after the next capture there.
- **Mesh texture:** vertex colours at ~30 cm Poisson resolution (COLMAP 3.11.1 segfaults above depth 10). An 8K
  baked texture is available via `tools/build-twin-mesh.py --blender` once headless Blender runs on the build machine.
- The Esri-tuned footprints in the app are ~5.6 m / 1.25° off the LiDAR; this pack uses the LiDAR-registered set
  (`data/footprints-lidar.geojson`). The app is unchanged pending an operator ruling.
