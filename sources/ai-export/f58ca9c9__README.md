# On The Boulevard — editable Floorplanner export

Exported from the live project on September 23, 2026.
Project: https://floorplanner.com/projects/109978485/editor

## Files

- `On_The_Boulevard.native.fml`: exact, untouched Floorplanner download. Preserve as the recovery/source copy.
- `On_The_Boulevard.working.json`: formatted JSON copy for programmatic manipulation. Every field is retained; parsed equality against the native export passed.
- `inventory.json`: project/floor/design inventory, source URL, timestamps, file hashes, and validation results.

## Included geometry

The export includes both floors and all three designs. The edited first-floor design (`241952337`, First design (copy)) contains 1,646 wall segments, 257 wall openings, 277 areas, 2 surfaces, and 6 cameras. It includes `01 Center Overview - Draft`, `02 End Unit - Eye Level Draft`, and the subsequent `Camera 4`.

The other first-floor design and second-floor design are retained separately. Counts in the inventory describe each design; do not add alternative designs together as physical building totals.

## Working with the data

Walls are in `floors[].designs[].walls[]`. Endpoints are `a` and `b`, endpoint elevations/heights are `az` and `bz`, and doors/windows are nested in `walls[].openings[]`. Areas, surfaces, decorations, identifiers, and design cameras remain in their native structures. Cameras can also exist at floor level.

This export uses centimeter-valued geometry: 388.62 cm corresponds to the editor's 12-foot-9-inch wall height. `useMetric=false` controls display. The project default wall height (121.92 cm), floor height (305 cm), and individual wall heights differ; preserve their separate meanings. No coordinates, heights, dimensions, identifiers, or sharing settings were changed.

The JSON is suitable for deriving plans/meshes, comparing the model against repository geometry, inspecting wall joins, and preparing a separate candidate with edited walls, openings, surfaces, or cameras. Retain the original copy and make edits to a versioned candidate.

## Limits

An edited file has not been reimported into Floorplanner. UI/API import availability and unit conventions for a chosen import route must be verified before a round trip. FML retains asset/material references; it is not a bundled texture library or standalone GLB mesh.

Floorplanner format reference: https://floorplanner.com/fml
