# Fixture inventory reconciliation

The supplied operator PDF contains **39 numbered columns, 10 red bench symbols and 20 purple can symbols**. Its supplied site-twin package links 37 columns to the existing native model IDs. This extraction preserves those IDs. Source Columns 1 and 2 are reference-only unmatched objects, not newly created assets.

`src/data/twin-site-fixtures.json` is the small reusable inventory. `items` contains 69 fixture references with source IDs, source-image pixels, A-1 pixels, approximate native-model positions and provenance. Only the 30 benches/cans have `seedPolicy: new_asset_candidate`; columns are `reference_only`. Consumers should use `sourceKey` to avoid duplicates and retain existing asset edits. No contacts, accounts or financial records are included.

## Registration and verification

The 37 supplied hash-ID correspondences were independently checked against native model column centers. An affine from A-1 pixels to current native GLB X/Z has RMS **0.537 m**, maximum **1.294 m**, with all 37 within the source package's 1.5 m tolerance. Leave-one-out RMS is **0.588 m** (maximum 1.455 m). The JSON records every control, residual, nearest two candidates and all matches within tolerance. These controls are candidate links supplied with the package, so the residuals measure internal drawing/model agreement, not independent ground accuracy.

Source Column 27 links to existing **C25 / column-45d9d6177283** and source Column 28 to **C26 / column-887d27e648e6**. The inventory separately numbers both objects. C25 remains a medium-confidence native wall-loop interpretation because it shares a side with a larger narrow feature; no ID is removed, merged or renamed.

The PDF's embedded 2500×1320 image was inspected, and bench/can locations are color-component centroids in that exact image. Column square centers follow the source generator's numbered-label transcription. A-1 positions come from the supplied ZIP CSV, whose generator adjusts fixtures proportionally across the walks because Floorplanner and plat walkway depths disagree. Thus a single affine necessarily leaves small discrepancies. All fixture heights/dimensions remain unverified; native-model placement Y=0 is only a ground reference.

## Utility image registration

`Water Shutoff Clusters.png` is 2500×1164. Eight explicit long/short building-corner anchors are preserved in JSON. The source-image→A-1 fit reproduces RMS **2.573 plan px** (maximum 4.871 px). The composed image→native affine is included, together with 6 blue meter-cluster and 13 red shut-off-cluster image centroids and source-register IDs for integration. The eight-control residual expressed in model units is **0.419 m**, excluding the separate column-fit error. Do not quote that as physical location accuracy. Exterior utility positions can extrapolate outside the column controls. Use the source-image overlay for exact source-symbol/count reading, and label 3D utility positions approximate.

## Reproduction

Run `python tools/extract-twin-site-fixtures.py --intake ../infrastructure-intake` from this worktree with numpy, Pillow and pypdf. It reads the ZIP, supplied images, native column analysis and current local model metadata without changing originals. It validates 39/10/20 source counts, all 37 stable native IDs, 1.5 m correspondence tolerance, image dimensions and 6/13 utility symbol counts, then regenerates this document, the inventory JSON and the extracted PDF image at `src/assets/twin/infrastructure/site-fixtures.png`. Source SHA-256 hashes are stored in JSON.
