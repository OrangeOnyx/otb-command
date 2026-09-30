# On The Boulevard — column twin

A portable 3D model and inspector built from the September 23, 2026 Floorplanner export. It separates **37 model-derived column candidates** from the walls, walkway and canopy, with stable asset IDs for later digital-twin integration.

## Open the viewer

1. Extract the complete ZIP into a folder.
2. Double-click **Start Viewer.cmd** on Windows with Python 3 installed.
3. Open **http://127.0.0.1:8765** and keep the server window open.

Alternatively, run `python server.py --port 8765` from this folder. The server listens only on this computer. No sign-in, package installation or internet connection is needed. Use `--port 8766` if the default port is occupied. Directly opening index.html may fail because browsers restrict local module/model loading.

## Inspect the columns

- Gold means highlighted column geometry; orange means selected. These colors do not indicate condition.
- Select a marker, click a column in the scene, or choose C01–C37 in the register. **Focus on this column** moves closer.
- **Show canopy** reveals the source elevated surface. It starts hidden so the columns are exposed.
- **Isolate columns** hides the rest of the model. **Show column labels** adds the C01-style identifiers.
- **Overview** supports orbit, zoom and pan. **Plan** provides an orthographic view.
- **Eye level** places you on the modeled walkway facing the selected column. Drag to look, use WASD to move, and use the arrow buttons to step between columns. Click the canvas before using the keyboard. This free view has no collision checks.
- **Reset view** returns to the overview and clears the selection. Visibility switches retain your choices.

## Files you can reuse

| File | Use |
| --- | --- |
| `model.glb` | Binary glTF model in meters, Y up; named groups and individually identified columns. |
| `model-data.json` | Asset IDs, labels, dimensions, positions, bounds, source wall references and camera presets. |
| `columns.csv` | Spreadsheet-friendly column register. |
| `model-report.json` | Geometry conversion, omissions, source warnings and validation results. |
| `source/` | Native FML, candidate analysis and portable model rebuild script. |
| `index.html`, `styles.css`, `viewer.js`, `vendor/` | Editable, offline viewer source and bundled Three.js under its MIT license. |

The GLB contains all groups, including the canopy. Its suggested default visibility is in `model-data.json`; other applications may initially show everything. Source column wall loops are retained in the GLB. The viewer adds translucent bounding fills for highlighting; those visual helpers are not structural geometry.

## Digital-twin integration

Load `model.glb` in a glTF-capable application. Category roots are `walls`, `floors`, `walkway`, `canopy`, `columns` and `openings`. A column node's glTF extras include `assetId`, `columnId`, `label`, `category`, `sourceRefs`, `confidence` and any `reviewNote`. Three.js exposes extras as `mesh.userData`.

Use **assetId** as the link to future inspection records, photos, work orders or sensor data. C01-style labels are display names. IDs are derived from the source wall GUIDs and stay stable while those GUIDs remain unchanged; they are not permanent field tags. No maintenance records or live feeds are connected in this package. The existing OTB Command application was not modified.

The coordinate origin is stored in `model-data.json`:

```text
model X = (FML x − originFmlCm.x) / 100
model Y = FML elevation / 100
model Z = (FML y − originFmlCm.y) / 100
```

This is a local coordinate model, without surveyed geographic registration. See `source/README.md` for rebuilding with Node.js 22.18+.

## Accuracy and exclusions

- Ground-floor design **241952337** from project **109978485** is the source. The full native export preserves both floors and alternate designs.
- The 37 candidates follow repeated near-square wall loops on the source walkway. This is not a certified physical column count. **C25 needs review** because it joins a larger feature and sits unusually close to C26.
- Typical modeled outer bounds are approximately **2.52 × 2.50 ft** with **12.75 ft** height. These dimensions come from source wall geometry and are **not field verified**. All source walls use the same height.
- The model preserves 166 door and 91 window openings, with generic window glazing. Catalog frames, door leaves, furniture, signage, roof profiles and detailed exterior finishes are not modeled.
- Six openings overhang their own wall segments in the source and were clipped to wall bounds; exact warnings appear in the conversion report.
- Canopy classification is inferred from the elevated surface matching the walkway. Surface elevation is treated as the bottom of the extrusion; that convention needs independent verification.
- The second floor is omitted from the GLB because its alignment with the ground floor is unverified.

This package is a usable spatial foundation for a digital twin, not a measured as-built survey, structural assessment or synchronized operational twin.
