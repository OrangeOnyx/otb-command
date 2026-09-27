# Source-derived upper floors: Units 101 and 103

`public/twin/upper-floors.glb` is an additive model in the same meter coordinate frame as the existing base model. It contains the native rear upper-floor strip for Unit 101 and the native Unit 103 upper footprint, with a central opening and rear stair openings. The existing base model and all 37 source column IDs remain unchanged.

These layers are a source-based visualization. They are not a field-verified as-built model. The user confirms that both units have second floors; source registration, elevations and stair details retain the qualifications below.

## Rebuild and validation

Requires modern Node.js and the repository's existing `three` package (`npm install` installs repository dependencies).

From the repository root:

```powershell
node tools/build-twin-upper-floors.mjs
node --test test/asset-twin-upper-floors.test.mjs
```

The default input locations are resolved relative to the script, not the shell working directory:

```text
../../outputs/OTB_Editable_Export_2026-09-23/On_The_Boulevard.native.fml
../infrastructure-intake/
  Floor Plans/101 - First Floor.png
  Floor Plans/101 - Second Floor.png
  Floor Plans/103 - First Floor.png
  Floor Plans/103 - Second Floor.png
  101 103/project.pdf
  103/June 14, 1993 - 93-003/A2.3.pdf
  103/June 14, 1993 - 93-003/A5.1.pdf
```

The generator accepts explicit input paths when the intake is stored elsewhere:

```powershell
node tools/build-twin-upper-floors.mjs "C:/source/On_The_Boulevard.native.fml" "C:/source/infrastructure-intake"
```

It reads `public/twin/model-data.json` for the base coordinate origin and stable column IDs, checks the existing `model.glb` hash, and writes only `upper-floors.glb` and `upper-floors.json`. The private intake is not copied into public assets. SHA-256 references in the JSON identify the exact inspected source files.

## Registration and vertical discrepancy

The native upper design is `193835178` on floor `183163884`; the registered ground design is `241952337` on floor `178816737`.

Two corresponding endpoints of upper wall 186 and ground wall 369 identify the Unit 103 facade at the shared 103/105 and 101/103 boundaries. The segment width agrees to within 0.002 cm. Their average difference gives a rigid translation in native centimeters:

```text
dx = -78.9476490220759 cm
dy = -2908.036366996171 cm
rotation = 0 degrees; scale = 1
```

The base-model origin is `(-6403.2662401319585, -2511.451712902764, 0)` native cm. Source coordinates become world meters with X = `(native x + dx - origin x)/100`, Z = `(native y + dy - origin y)/100`, and Y up. No additional GLB transform is required when combining the models.

A separate rear-edge comparison differs by approximately 0.16 m. It is recorded in `registration.independentCheck`; the generator does not scale or warp the source to conceal that difference.

The displayed upper-floor elevation is **3.05 m**, taken from native ground-floor story metadata. Existing ground walls and native upper walls are uniformly **3.8862 m** high. Consequently, unchanged ground walls extend **0.8362 m** above the displayed upper-floor plane. Actual floor-to-floor and upper-wall heights remain unverified; `physicalFloorToFloorHeightMeters` is null. The native metadata controls this provisional display, not a claim that the dimensions are physically consistent.

## Interpretation of floors, openings and stairs

- **Unit 101:** only the native narrow rear strip is modeled. The large front ground-floor space receives no invented upper slab. The supplied second-floor PNG and combined plan corroborate that partial footprint.
- **Unit 103 central void:** native area 3 is an auto-filled polygon inside the opening boundary. It is omitted as a floor and used as a hole in surrounding area 2. The supplied PNG and historical mezzanine plan support the opening.
- **Central guard boundary:** native wall segments 36–43 describe the opening boundary. The historical section shows guardrails rather than full-height partitions. Their height and construction were not reliably readable, so vertical guard geometry is omitted and the source indices are retained in the JSON.
- **Rear stair voids:** openings are derived from visible stair symbols within native enclosure bounds. Their JSON records distinguish this interpretation from native geometry.
- **Stairs:** six planar envelopes represent five flights and one intermediate landing. Approximate plan locations come from the visible symbols; no individual risers or treads are fabricated. The central stair midpoint elevation is an illustrative half-story value. These surfaces communicate connectivity and are not stair fabrication or compliance geometry.
- **Floors:** native polygon surfaces have zero modeled thickness because no reliable slab thickness was supplied.
- **Doors:** native opening positions, widths and vertical dimensions produce actual voids through walls. Leaves, frames and catalog objects are omitted.
- **Shared wall:** the rear 101/103 boundary is included in both unit layers so either can be viewed independently. This intentional coincidence does not add a physical second wall or change the base model.

## Consumer contract

The GLB has scene roots named `upper-101` and `upper-103`. Each root carries `extras`:

```json
{"layerId":"upper-101","unit":"101","level":2,"elevationStatus":"native-floor-height-metadata-unverified"}
```

Each root contains three meshes: `<layer>-walls`, `<layer>-floors`, `<layer>-stairs`. Mesh extras include `assetId`, `layerId`, `unit`, `level`, `physicalVerification:'unverified'`, and:

| Mesh | `category` | `elementType` |
| --- | --- | --- |
| Walls | `walls` | `walls` |
| Floor planes | `floors` | `floors` |
| Stair envelopes | `floors` | `schematic-stair-envelope` |

Layer visibility should follow the root/layer ID; category controls can independently style or clip its materials. The scene uses solid colors and no image textures, finishes or invented roof geometry.

`upper-floors.json` includes:

- `layers[]`: `id`, `nodeName`, `unit`, `level`, `boundsMeters`, `elevationMeters`, native wall/floor metadata, source references and world-coordinate walls/floors/voids/stairs.
- `registration`: controls, translation and independent residual.
- `sources`: input file names and hashes.
- `verticalDiscrepancy` and `limitations`: explicit unverified assumptions and omissions.
- `preservation`: base GLB SHA-256 and the original 37 column IDs.
- `validation`: GLB size/counts and source geometry counts.

## Verification evidence

The dedicated tests load the generated binary with Three's GLTFLoader; verify finite geometry, unit roots, bounds and unit-length normals; ray-test the centers and inset perimeter points of all three actual floor holes; ray-test all 19 native door voids through wall thickness; assert the partial 101 footprint; and verify the base GLB hash and original column IDs. Source drawings were visually inspected to establish the footprint and void interpretations. Browser visual inspection remains part of the integrated application check.
