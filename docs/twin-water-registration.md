# Water-map registration

The existing 19 source circles are now available as approximate 3D references: 6 blue **city-meter annotations** and 13 red **tenant-shutoff annotations**. Adam confirmed on **2026-09-25** that the printed numbers are **counts at each location**. They total **24 reported city meters** and **37 reported tenant shutoffs**. Stable `water-map:*` IDs, raw printed labels, image points and source references are preserved from `twin-infrastructure.json`. The generated overlay records the new interpretation and its user-confirmation provenance while preserving the original unresolved interpretation as `sourceMarkerLabelMeaning`. No individual physical assets, meter membership or served units are created or assigned.

The workbook contains **28 water-meter IDs**, four more than the map's reported city-meter total. This is an unresolved difference between sources, not evidence of four missing meters. Dates, coverage and meter membership have not been reconciled. The historical infrastructure source file remains unchanged.

## Method and evidence

The original 2500×1164 map was visually inspected. Its two building outlines and color legend match the existing reference controls. Eight building corners from `twin-site-fixtures.json` provide source-image pixels and A-1 plan pixels. The existing 37 stable column-hash correspondences connect A-1 pixels to the **current** native GLB column centers in `model-data.json`. This tool recomputes that bridge and then fits image pixels to the eight derived model corner targets. It does not retrace or alter the map or use copied utility positions from the earlier package. Count interpretation rests on Adam's confirmation, separately from the geometric registration.

The native source hash is `89d3b30d265ff19b0b5b305a849653940cc87d3bfa59b5172eea3021774153f6`. Input file hashes, native project/design IDs, origin, transform matrices and all controls are recorded in JSON.

| Corner | Image x, y (px) | Target model X, Z (m) | Residual (m) |
| --- | --- | --- | --- |
| long_133_front | 507.5, 769 | -65.411, 12.050 | 0.792 |
| long_133_rear | 507.5, 1025 | -65.945, 37.467 | 0.456 |
| long_101_front | 2073.5, 760 | 92.708, 12.147 | 0.067 |
| long_101_rear | 2073.5, 1017.5 | 92.174, 37.564 | 0.192 |
| short_149_patricia | 217.5, 251 | -94.682, -38.167 | 0.090 |
| short_149_field | 470, 251 | -69.052, -38.151 | 0.013 |
| short_135_patricia | 217.5, 879 | -95.981, 23.580 | 0.548 |
| short_135_field | 470, 879 | -70.351, 23.596 | 0.472 |

Eight-corner fit: **0.419 m RMS**, **0.792 m maximum**. Leave-one-out check: **0.565 m RMS**, **0.941 m maximum**. The separate 37-column bridge has **0.537 m RMS**, **1.294 m maximum**. The eight-corner residual excludes bridge error and all field error; none of these values represents surveyed accuracy. Source walkway depths differ, and utility symbols are exterior extrapolations beyond the building controls.

## Consumer contract

`src/data/twin-water-map.json` exposes `annotations[19]`. Each entry preserves its original ID/category/raw label/image point, adding a human-readable `label`, numeric `reportedCount`, `countBasis`, `countProvenance`, `modelPositionMeters: [X, 0, Z]`, explicit approximate/unverified location status, and per-point validation. Use `reportedCount` for the confirmed meaning of the map number. The original `physicalAssetCount` remains null because no field inventory has been verified; `physicalAssetId` remains null and `memberMeterIds`/`servedUnits` remain empty. These references must not enter the permanent individual physical-asset seed list.

Use `displayBoundsMeters` when framing or validating the water-map overlay together with the model. **8** annotations lie outside the building-only native bounds by at most **2.794 m**. They should not be clamped onto a wall or rejected merely for being outside the building. Display bounds include a 2 m plan margin. A separate 5 m exterior-distance sanity gate catches unexpected registration drift; it is not an accuracy allowance or property boundary. Combine these bounds with upper-floor bounds in the UI as needed. Y=0 is only a display reference, not measured utility elevation/depth.

## Reproduction and checks

Run `python tools/register-twin-water-map.py` using numpy and Pillow. `--check` verifies that the committed JSON and this document match a fresh calculation without writing. The script reads only committed inputs and writes only these two generated files. Node checks live in `test/twin-water-registration.test.mjs` and cover source identity preservation, confirmed count interpretation and discrepancy, transform residuals, stable native-column controls, exterior display bounds and distinct nearby map markers.
