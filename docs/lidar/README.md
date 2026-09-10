# OTB LiDAR — Orange Ocean Atlas / Cypress Command

USGS 3DEP elevation pack for the **On The Boulevard** deployment of
Orange Ocean Atlas. Atlas uses the DEM / hillshade on the **A-2 satellite
lens**. Cypress Command uses the LAZ alongside the existing splat / mesh
pipeline for 3D-roof work.

Binaries are **Release assets only** — not tracked in git (same spirit as
`public/OTB-splat.ksplat` and `public/OTB-mesh.glb`).

## Release

**[lidar-otb-v1](https://github.com/OrangeOnyx/otb-command/releases/tag/lidar-otb-v1)**
on `OrangeOnyx/otb-command`.

| Asset | Size | Role |
|---|---|---|
| `OTB-hillshade.png` (+ `.aux.xml`) | 132 KB | MapLibre overlay on A-2 satellite |
| `OTB-hillshade.tif` | 148 KB | Same hillshade as GeoTIFF |
| `OTB-dem-1m.tif` | 1.3 MB | 1 m COG for Atlas maps / analysis |
| `OTB-site.laz` | ~67 MB | ~10.5 M points — 3D-roof / Cypress Command |
| `METADATA.json` / `README.md` | — | Provenance |

## Fetch (local)

```bash
node tools/fetch-otb-lidar.mjs          # maps + DEM + hillshade → public/elevation/
node tools/fetch-otb-lidar.mjs --with-laz   # also the 67 MB LAZ (dev only)
npm run dev
```

Then A-2 → 🛰 Satellite. If the PNG is present, a **⛰ Relief** chip toggles
the hillshade over the frozen Esri base. If it is missing, the lens is
unchanged (quiet fallback) and the console notes the fetch command — prod
stays healthy with no elevation files deployed.

Idempotent: a second run skips files whose size already matches the Release.

Private-repo downloads use `GITHUB_TOKEN` / `GH_TOKEN` when set; public
browser URLs work without a token.

## Why the PNG is not in git

The hillshade PNG is 132 KB and MapLibre-ready. It stays Release-only so
Vercel stays lean and a missing `public/elevation/` directory cannot break
prod. The overlay **probes** `/elevation/OTB-hillshade.png` at lens open
(HEAD + content-type; Vite's SPA HTML fallback counts as absent).

To ship a default-on overlay later: copy the PNG into git (or a deploy
step). The probe already treats a committed file as present.

**Do not** put `OTB-site.laz` on Vercel. The fetch script omits it unless
`--with-laz`. `.vercelignore` excludes `public/elevation` as a belt.

## CRS / AOI

- **Clip AOI (WGS84):** west −92.056, south 30.199, east −92.050, north 30.205
  (center ≈ 30.20257, −92.05255 — Arnould Blvd / OTB).
- **DEM / LAZ CRS:** NAD83 / UTM zone 15N (`EPSG:26915`), 1 m pixels.
- **Hillshade overlay corners** (pixel-is-area extent → WGS84, for MapLibre
  `image` source) live in `src/data/elevation.json`.

The frozen satellite composite (`public/OTB-sat-base.jpg`) sits inside this
AOI; the hillshade is a slightly larger north-up drape.

## Source (public domain)

USGS 3DEP project **LA_Catahoula_Concordia_2017_D17** — U.S. Government work,
public domain. See the Release `METADATA.json` for tile URLs and clip notes.

Hillshade method (upstream): `gdaldem hillshade -z 1 -az 315 -alt 45`.

## Alongside splat / mesh

| Product | Path | Use |
|---|---|---|
| Hillshade / DEM | `public/elevation/` after fetch | Atlas A-2 relief overlay; map analysis |
| LAZ | `public/elevation/OTB-site.laz` after `--with-laz` | Cypress Command 3D-roof, not loaded by Atlas |
| Gaussian splat | `public/OTB-splat.ksplat` (`tools/convert-splat.mjs`) | A-2 🎥 Reality lens |
| Photogrammetry mesh | `public/OTB-mesh.glb` (`npm run mesh-glb`) | A-2 ◧ 3D mesh toggle |

The LiDAR pack does not replace the drone splat/mesh. DEM is the terrain
skin for Atlas maps; LAZ is the classified point cloud for roof geometry.
