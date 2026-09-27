# Water-reference aerial comparison

Only the historical overview (`image002.png`, exposed as `infrastructure/gis-overview.png`) is registered for approximate comparison. The south and west closeups (`image001 (1).png` / `image004.png`) remain unregistered visual support. A registration attempt on the **2024 Louisiana DOTD aerial was withheld** because its sparse-control checks were too weak; the official image remains context only. All images were visually inspected. The historical screenshots show a taskbar date of **2021-07-14**; their aerial acquisition date is unknown. No geographic coordinates were inferred from the ArcMap cursor readout. This tool performs no network fetching and does not modify any image bytes or official imagery metadata.

## Visual registration

Four manually observed rear/end outline intersections on both building wings connect to the corresponding derived model corners already documented in `twin-water-map.json`. These control coordinates are approximate: rooftop shadows, pixels and overhangs can obscure the exact wall line. Parking-side roof edges include the covered walks and were excluded to avoid treating eaves as storefront walls.

| Control | Model X, Z (m) | Observed screenshot x, y (px) | Fit residual (px) |
| --- | --- | --- | --- |
| long_133_rear | -65.945, 37.467 | 331, 390 | 10.70 |
| long_101_rear | 92.174, 37.564 | 631, 764 | 1.23 |
| short_135_patricia | -95.981, 23.580 | 316, 269 | 12.36 |
| short_149_patricia | -94.682, -38.167 | 462, 170 | 3.19 |

The transform is constrained to uniform scale, rotation and translation, avoiding arbitrary shear from four sparse controls. It has **8.35 px RMS** and **12.36 px maximum residual**. Its scale is 3.075 px/model-m. These numbers describe internal fit consistency, not surveyed accuracy. Four controls have limited redundancy: leave-one-out RMS is **13.95 px**, maximum **19.30 px**. This larger sensitivity, the earlier model/map fit uncertainty and the unknown image acquisition date limit the overlay to visual comparison. It is not suitable for selecting an operating valve or declaring a meter-to-location match.

## 2024 DOTD attempt withheld

The non-renderable `withheldRegistrations` diagnostic retains the four attempted control points, candidate transform and all residuals for the unchanged 3072×3072 official JPEG. **It has no annotations and is not included in `sources`.** The points were read on the 1600 px inspection preview, converted to source pixels and rounded. The uniform-scale fit has **20.94 px RMS**, **30.06 px maximum**, and scale 7.950 px/model-m. Leave-one-out RMS is **63.18 px**, maximum **106.16 px**. That far-end sensitivity is too large for a useful marker overlay.

The rear-endpoint pairs separately imply 7.925 px/model-m for the long wing and 7.186 for the short wing (ratio 1.103). Exact corner choice, roof/eave/shadow offsets and source-model proportions cannot be separated with these observations. No markers or model geometry were moved to hide that discrepancy. Additional independently identified ground-wall control points or a surveyed registration would be needed before releasing a DOTD marker overlay.

Attribution: **Louisiana DOTD**. [2024 Lafayette imagery service](https://maps.dotd.la.gov/imagery/rest/services/Imagery/2024_Lafayette_6IN_RGBI/ImageServer). Year and georeferencing are copied from `twin-water-official-imagery.json`; the exact flight date is unknown. Original image hash, returned map extent, provider provenance and service URL are retained. The official georeference does not make the native model surveyed. Official source metadata and JPEG bytes are unchanged.

## Consumer contract

`src/data/twin-water-aerial.json` provides `sources[]`. Each source has `id`, `label`, `sourceImage`, `imageSizePx`, `crop`, displayed date/provenance and registration status. Only the overview has `transformModelXZToImage3x2`, controls, residuals and 19 projected `annotations`. Each annotation preserves its source ID, category, raw printed label, confirmed reported count and existing model position, adding `imagePoint: {x,y}` and `inCrop`. Render the separate official DOTD metadata source as context only; never use `withheldRegistrations` for pins.

Coordinates are **full source-image pixels**. Historical screenshots use x=0, y=100, width=1420, height=723; DOTD uses the full 3072×3072 image. Subtract the crop origin only when drawing in a cropped image coordinate system. The transform is `[modelX, modelZ, 1] @ matrix = [imageX, imageY]`. The overlay does not alter any existing model position, physical asset, count, meter membership or served-unit association. No aerial feature independently confirms a shutoff or meter position.

## Reproduction

Run `python tools/register-twin-water-aerial.py` with numpy and Pillow; add `--check` to compare without writing. The tool prefers the copied source assets and falls back to `../infrastructure-intake` (configurable with `--intake`). Binary hashes prevent silently using changed copies. It writes only this document and `twin-water-aerial.json`. Node tests validate source provenance, transform controls, crop coordinates, preserved water references and unregistered closeups.
