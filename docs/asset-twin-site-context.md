# Parking and common-area geometry

The additive `public/twin/site-context.glb` and `site-context.json` reuse the app's A-1 REV 14 plat/CAD geometry. They leave the native building model, utility references, fixtures and permanent asset IDs unchanged.

Run `node tools/build-twin-site-context.mjs` to regenerate. No extra dependencies, Google key, copied Google imagery or terrain service are needed. The existing Three.js mesh exporter is reused. The focused check is `node --test test/asset-twin-site-context.test.mjs`.

## Registration

Eight building-corner coordinates reconstructed from `geometry.json` match the existing fixture registration's A-1 corner coordinates to rounding precision. This establishes the same source drawing frame; the existing 37-column affine transform can therefore be reused rather than guessed. Its internal RMS is 0.537 m and maximum residual 1.294 m. These are drawing/model agreement metrics, not surveyed accuracy.

As a separate diagnostic, transformed source corners are approximately 0.71–1.99 m from their nearest native floor vertices. This is not an independent set of survey control points. Source building shape differences and model simplifications remain. The generator stops if the A-1 frame changes, the plan revision changes or the floor diagnostic exceeds 3 m.

All elevations are small rendering offsets around Y=0. The model does not claim measured terrain, grades, drainage invert levels or curb heights. The native walkway supplies storefront sidewalks; the generator does not overlay a replacement slab.

## Included context

- Main parking field and source striping, Arnould planting areas and islands, Lot 6 and Lot 8, rear parking/service areas, Johnston parking and access aisles.
- Lot 7 across Marie Antoinette, using the source drawing's remote outline and striping.
- Arnould public sidewalk, the Unit 149 connection, service pads, loading/pylon pads and drive aprons.
- Road/shoulder/median references and a separately labeled excluded JD Bank corner. These contextual areas do not create managed asset records.

The general base is labeled surface-unclassified rather than assigning unsupported grass/asphalt material. Landscape areas use the source drawing's planting shapes; current grass, shrubs, edge condition and utility contents need inspection. The parking inventory retains 314 plat-labeled spaces and 324 variance-provided spaces, with the candidate additional 10-stall row explicitly pending field confirmation.

## Permanent records and scan reconciliation

Each zone has a stable `id`, `kind`, `polygonMeters`, `position`, `boundsMeters`, provenance and unverified geometry status. The centroid is a label/focus target for the whole area, not a point asset. Model groups and meshes carry `siteZoneId` and `siteCategory`. Seed records with `site-area:${zone.id}` only where `!zone.contextOnly && zone.assetRecord !== false`.

The workbook's sprinkler meter W1217102 says only “Grass near Blvd.” The catalog's `grass-near-blvd` search area spans eight Arnould planting zones, carries the original meter source key and has `position:null`. Highlight or frame the areas as a search aid; do not assign a meter point, group membership or field verification from this description.

The field scan should identify shared control points, current curb/grass boundaries and actual utility lids. Register the new scan to the existing frame, append dated observations to the permanent area/asset IDs, and replace approximate zone geometry through a new model binding. Do not regenerate asset identities because coordinates improve.
