# On The Boulevard — 3D presentation review

Reviewed September 23, 2026. Status: draft spatial model; elevations and current appearance are not verified.

## Live project

https://floorplanner.com/projects/109978485/editor

The existing First Design (Copy) contains an editable L-shaped center. Two new cameras were added while retaining the three existing cameras:

- **01 Center Overview - Draft** — Dollhouse overview, 65-degree field of view.
- **02 End Unit - Eye Level Draft** — First Person view of the large end-unit interior, approximately 5 feet 5 inches above the floor, 65-degree field of view.

Select either name from the camera dropdown at the top of the 3D editor. Arrow keys move through a First Person view. Save intentional camera changes with Update Camera. Existing building geometry was not rebuilt or corrected during this review.

## Source evidence

The historical native export below matches live project ID 109978485. Its file timestamp is May 25, 2026, and its first-floor metadata reports May 13, 2026. Its contents are evidence about that export, not a verified snapshot of every current live object.

`C:\Users\adam\Codex Projects\OTB_Master_Source_Package\00 OTB\Belle Realty SOT Documents\Additional Files to Consider\Plats and Site Plans and Pictures\On_The_Boulevard_json__1_.fml`

It contains 1,584 first-floor wall segments, 257 openings, 227 room polygons, two Walkway surfaces, and no furniture items in each first-floor design. Seventy-four room polygons are under one square foot; 154 wall segments are under 10 cm. These require inspection before cleanup, since some may represent legitimate small features.

All archived wall endpoints use a height of 388.62 cm (12 feet 9 inches). A representative live wall corner also displayed 12 feet 9 inches. The recorded-plat crop below labels a building height of 16.4 feet. Those may refer to different physical elements; do not replace all wall heights without checking their meaning. The archived second-floor coordinates appear offset from the first-floor footprint and need registration review.

## Supporting files

- Whole-center floorplan: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command\public\floorplan-center.png`
- Source-attributed dimensions: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command\src\data\geometry.json` (REV 14; some suite divisions are derived).
- Existing CAD: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command\cad\Boulev_CLEAN.dxf`
- Plat height reference: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command\reference\plat-longbldg-1.png`
- Exterior photo: `C:\Users\adam\Codex Projects\OTB_Master_Source_Package\00 OTB\Belle Realty SOT Documents\Aerial Photos\From Patricia 2.jpg`

The photo shows tan fascia, dark shingle canopy, cream square columns, a white low-slope roof, and rooftop equipment. Capture date and current tenant signage have not been verified.

## GitHub geometry verification — September 23, 2026

The default `master` branch of `OrangeOnyx/otb-command` was checked directly through GitHub. These local files match their current GitHub blob hashes:

| File | Git blob SHA | Role |
| --- | --- | --- |
| `src/data/geometry.json` | `50a783d8a1e802d36747ba3710115c0face6b54f` | REV 14 footprint dimensions, suite demising and source notes |
| `src/data/heights.json` | `4b836ba1eded5052570c0772316592bfd9e281c4` | 27 suite height associations |
| `cad/Boulev_CLEAN.dxf` | `f290bc8f68e3633ee6ba7510d85634dede9bbb40` | Architect CAD and building-height annotations |
| `public/floorplan-center.png` | `6e10c0541b7aa8f0389a9f6bf6da267b86f2233d` | Existing whole-center interior reference |

Use the dimensions in `geometry.demising`, expressed in feet, for the model's building shells: long building 522.31 by 85.45 feet; short building 208.65 by 84.49 feet. The `geometry.units` rectangles are presentation coordinates: the generator uses unequal X/Y scale factors and deliberate two-pixel gaps. They must not be imported directly as measured room geometry.

`heights.json` assigns 16.4 feet to most suites; 13.2 feet to 105/107/109; 13.5 feet to 101; and 23.6 feet to 103. `tools/extract-heights.py` assigns the nearest CAD `BLD_HT` annotation to a suite centroid. These are derived building/parapet-height associations, not verified interior ceiling measurements. The implementation does not enforce the distance cutoff described in its comments. Preserve that distinction when comparing them to Floorplanner's 12-foot-9-inch walls.

There are also unresolved source differences: the demising-based positions imply a 14.40-foot gap between the buildings, while an access note describes a 12.3-foot CAD breezeway. The CAD envelope used by the height/georeference tools is 528.9 by 86.1 feet for the long building. Do not silently rescale one source to match another. Confirm the physical measurement basis before replacing detailed Floorplanner walls.

GitHub sources: [geometry](https://github.com/OrangeOnyx/otb-command/blob/master/src/data/geometry.json), [heights](https://github.com/OrangeOnyx/otb-command/blob/master/src/data/heights.json), [height extractor](https://github.com/OrangeOnyx/otb-command/blob/master/tools/extract-heights.py), [geometry generator](https://github.com/OrangeOnyx/otb-command/blob/master/tools/extract-geometry.mjs).

## Remaining presentation work

A source-derived shell/suite reference is available in `otb-geometry-reference/shell-reference.png` (4000 by 2575 pixels), with its vector original `shell-reference.svg` and normalized foot-coordinate data in `geometry.json`. The PNG has a 100-foot calibration bar for a Floorplanner background import. It was rendered and visually checked. The geometry contains 27 unique suites, no positive-area overlaps, and bay sums matching the source dimensions. It represents shell and suite partitions only; detailed interiors remain in the existing floorplan/model references.

1. Confirm that the exterior photos still represent the property, and distinguish wall/ceiling heights from overall parapet or roof height.
2. Work in a preserved design copy to reconcile geometry fragments and second-floor alignment.
3. Reproduce the canopy, columns, roofline, glazing, and finishes from confirmed references.
4. Add exterior approach and covered-walkway cameras, plus selected interior views; verify transitions before exporting a presentation.

No paid export, public sharing, or live operational-data integration was performed. This is not yet a completed digital twin or a measured as-built deliverable.

Camera navigation reference: Floorplanner Editor Manual, April 2025, pages 15–18: https://fpcdn.s3.us-east-1.amazonaws.com/static/brochures/Floorplanner-editor-manual-04-2025.pdf
