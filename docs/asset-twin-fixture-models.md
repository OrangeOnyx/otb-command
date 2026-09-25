# Bench and trash-can models

The twin represents the existing **10 bench and 20 trash-can records** as selectable physical geometry. The original `otb-a1-register:bench-##` and `otb-a1-register:can-##` source keys are retained. These objects link to the existing permanent physical-asset records; the geometry generator never creates or replaces a `pa_` ID.

## Source and uncertainty

- Locations: `src/data/twin-site-fixtures.json`, derived from the supplied `07 Columns, Benches, and Cans.pdf` and OTB site-twin register. Registration remains approximate: 0.537 m RMS and 1.294 m maximum control residual. This does not assert fixture-by-fixture location accuracy.
- Appearance: the supplied marketing photographs show tan bench seats and trim, dark metal arms/legs and ornamental backs; bins are square tan vertical-slat cabinets with dark frames and hoods. The unmodified marketing page 20 image is `src/assets/twin/bench-reference.jpg`. Models use these broad features; detailed patterns, manufacturer and individual fixture matches remain unverified.
- Assumed bench envelope: **1.80 m width × 0.65 m depth × 0.90 m height**.
- Assumed bin envelope: **0.55 m width × 0.55 m depth × 0.85 m height**.
- Bench/bin orientation follows the nearer walkway frontage, facing the parking area. This is a visual assumption, not surveyed orientation.
- Every model carries `physicalVerification: "unverified"`, dimension and appearance notes, and its original source position. No repair condition is inferred from its appearance.

The supplied ZIP's prior bench and bin meshes were plain 30-vertex blocks. Their previous proxy dimensions were not treated as measurements. The new geometry reuses the established inventory and positions while replacing those blocks with recognizable seating and bin parts.

## Runtime contract

`createFixtureModel({kind, sourceKey, fixtureId?, label?, position?, rotationY?, dimensions?, sourcePositionMeters?, placementMethod?})` returns a `THREE.Group`. Valid kinds are `bench` and `waste_bin`. Its local base is Y=0, width is X, and front is +Z. `position` is the base in the current model's metres/Y-up coordinate system. A factory instance owns its geometries and materials so selection coloring and disposal cannot affect other records.

`group.userData.fixtureDimensionsMeters` is `[width, height, depth]`; `dimensionsMeters` is `{width, depth, height}`. Every mesh repeats `sourceKey`, `fixtureId`, `assetKind` and `category: "fixtures"` for hit testing. The scene supplies its resolved permanent `assetId` separately. Each material's `userData.fixtureBaseColor` supports restoring its natural appearance after highlighting.

`projectFixtureToWalkway(position, walkwayRoot)` raycasts down onto the **walkway only**. It returns `{position, sourcePositionMeters, presentationBaseElevationMeters, method, metadata}`. Only presentation Y changes; source X/Z and the source point remain untouched. A miss preserves the input base. All 30 supplied positions currently hit the source-model walkway. An operator's explicit placement must not be replaced by this source-grounding convenience.

`fixtureOrientation(position)` and `fixtureRotationForItem(item)` expose the shared assumed orientation. `disposeFixtureModel(group)` releases its owned resources.

`chooseFixtureView(modelGroup, obstacles)` searches eye positions in front of the fixture, rejects cameras inside column bounds, and checks sightlines to the centre and four body samples against the supplied wall/column meshes. It raycasts both ways to account for single-sided wall back faces without changing materials. The result includes `position`, `target`, `clear`, `fallback`, `visibleSamples` and `reason`; callers should use a view only when `clear` is true. Every current fixture has a clear five-sample view. Bench 1 and Bench 5 require an alternate side offset because the original fixed camera fell inside source columns C07 and C17.

## Portable export

```powershell
node tools/build-twin-fixtures.mjs
node --test test/asset-twin-fixture-models.test.mjs
```

No extra dependency or environment variable is required; the existing Three.js dependency supplies the geometry. The builder reads the fixture inventory and ground GLB, resolves support elevations using the same runtime helper, then writes:

- `public/twin/fixtures.glb`: one `fixtures` root and 30 named fixture groups, preserving source keys in glTF extras. Repeated parts share five mesh prototypes. Materials are embedded; no remote textures or external files are required.
- `public/twin/fixture-models.json`: source hashes, assumptions, each source and presentation position, dimensions, orientation, and export hash.

The file is suitable for merging into the complete GLB with the existing lossless merger. The merge retains fixture groups, materials and provenance; it does not introduce field-verified geometry.

Validation checks existing identities, finite and bounded geometry, open bin slots, grounded model bases, independent selection materials, every exported/runtime fixture transform, export indexing and report hashes. Navigation tests cover all 30 fixtures against the real source walls/columns, independently check selected views using double-sided rays, and verify explicit failure when every view is obstructed.
