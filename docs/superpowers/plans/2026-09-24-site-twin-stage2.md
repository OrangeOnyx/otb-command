# OTB Site Twin (Stage 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable 3D twin of the whole site, `OTB_Site_Twin`, the site-scale counterpart of the Sep 23 `OTB_Column_Twin`. It ships as:
- a GLB model in meters, Y up;
- an offline three.js inspector;
- `twin-data.json`, a CSV register, and a conversion report.

Every node carries the **Stage 1 register ID** (`extras.assetId`), so the A-1 register, the 3D model and any future work orders or sensors share one key.

**Architecture:**
- A Node build (`tools/build-site-twin.mjs`) reads the same inputs as the A-1 register: `geometry.json` with its `assetGeom`, `site-register.json`, `meters.json`, `cameras.json`, `heights.json` and `pylon.json`.
- It builds the register with `src/lib/siteassets.js`. That is the single source of IDs, labels and statuses.
- It converts plan px to plat feet to model meters (`tools/site-twin/coords.mjs`).
- It generates meshes per category (`tools/site-twin/meshes.mjs`) and writes a GLB with a small dependency-free writer (`tools/site-twin/glb.mjs`).
- It copies a viewer template (`tools/site-twin/viewer/`) plus vendored three.js into `dist-twin/OTB_Site_Twin/`.
- `--check` rebuilds in memory and demands byte-identical output.

**Tech Stack:** Node 22 ESM, `three@0.185` (already a dependency; used for `ShapeUtils` triangulation, and `GLTFLoader` in tests and the viewer), `node --test`, a static HTML/CSS/JS viewer, and `server.py` for loopback serving, as in the Column Twin. No new npm dependencies.

**Spec:**
- Operator rulings 2026-09-24:
  - "Both, staged": the Stage 2 twin is keyed to the Stage 1 IDs.
  - "Include all of it, placeholders for the ☐ items."
  - LUS mains and hydrants are in.
  - Per-unit systems are in.
- Stage 1 plan: `docs/superpowers/plans/2026-09-24-a1-site-register.md`. Register basis: `docs/site-register-2026-09.md`.
- UX parity reference: `C:\Users\adam\Documents\Codex\2026-09-23\ca\outputs\OTB_Column_Twin\` (README, QA, DESIGN, viewer.js).
- Visual target: `G:\My Drive\00 OTB\Additional Files to Consider\Plats and Site Plans and Pictures\Style_I_would_like_to_get_the_center_to_look_like_for_marketing.png`:
  - grey asphalt, white striping, green islands with trees;
  - massed buildings with parapets and a canopy along the walk.

  Materials come from the Sep 2026 drone set:
  - white TPO roofs with RTUs;
  - dark-shingle mansard canopy over the walk;
  - cream square columns and tan/cream fascia;
  - white CMU rear walls;
  - the Jason's Deli hip-roof corner.

## Decisions needed before Task 3 (defaults in bold; the plan proceeds on the defaults if not overruled)

| # | Decision | Options |
| --- | --- | --- |
| D1 | Canopy geometry (no verified height on file) | **eave 10.0 ft, mansard top 14.0 ft, 45° shingle face on the field side, flagged `presentation`**; or operator-measured values |
| D2 | Rooftop units (count per unit unverified) | **one RTU proxy per suite on the roof, flagged `presentation-proxy`, hidden in Record look**; or none |
| D3 | 1990s trees (`historic-source`) | **modeled, hidden by default**; or omitted |
| D4 | Model orientation | **plat axes (Marie Antoinette = −Z side, Arnould = +Z) with the true-north rotation recorded in `twin-data.json`**; or baked to true north |

## Global Constraints

- **IDs:** node `extras.assetId` must equal the Stage 1 register `id`. There are no new ID schemes. Codex `column-<hash>` IDs ride along as `extras.codexAssetId`.
- **Units:** meters, Y up. The plan→feet transform is `geometry.boundary.transform`: kx 1.8515, ky 1.88663 px/ft, `a = aMin + (xRight − x)/kx`, `b = bMax + (y − yBottom)/ky`, with aMin −25, xRight 1360, yBottom 662, bMax 0.
- **Parking figures:** 314 ops / 324 legal. The 10 CAD stalls are modeled with the `cad-pending` status and a distinct stripe material. JD Bank's parcel is `NOT A PART`: it is not modeled as a Belle building. Its 13 easement stalls are modeled and labeled as easement spaces.
- **Heights:** from `heights.json` (parapet associations from the CAD `BLD_HT`), labeled "parapet association, not ceiling height". Codex's 12.75 ft walls are **not** used.
- **Placement honesty:**
  - A register row placed at `unit-centroid` (RTU, panel, electric meter, time clock) is **data only**. It is listed under its suite in the viewer and never drawn as a physical object, except the D2 RTU proxies, which are flagged.
  - `unlocated` rows are data only.
  - Placeholder categories appear in the viewer with 0 and the "no source on file" note.
- **Underground:** LUS mains are drawn at −1.2 m and labeled "depth unverified". There is no claim of pipe depth or size beyond LUS's labels.
- **Copy:** the product name "Cypress Command Platform" appears in the viewer footer and report. Palette: the plan-room tokens (ink #1C2B26, paper #EDEFE8, brass #A87E2F, selected amber #D97706). Neither highlight color signals condition.
- **Output:** `dist-twin/` is gitignored. Every delivered build is zipped and copied to `G:\My Drive\00 OTB\site-twin\` (operator export rule).
- **Quality gate:** `node --test` passes, `npm run build` succeeds, `node tools/build-site-twin.mjs --check` is byte-identical, and the browser acceptance checklist (Task 6) passes.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `tools/site-twin/coords.mjs` | Pure: plan px ↔ plat feet ↔ model meters; true-north rotation from `footprints-geo.json` georef. |
| `tools/site-twin/glb.mjs` | Pure: minimal glTF 2.0 builder (nodes, meshes, PBR materials, extras) → GLB `Buffer`; `validateGlb`. |
| `tools/site-twin/meshes.mjs` | Pure: primitive generators: `flatPolygon`, `prism`, `boxAt`, `ribbon`, `pipe`, `disc`, `canopy`, `tree`. |
| `tools/site-twin/categories.mjs` | Pure: the per-category spec table (mesh kind, dims, material, default visibility, look). |
| `tools/build-site-twin.mjs` | CLI: build the register → meshes → GLB + `twin-data.json` + `site-register.csv` + `twin-report.json`; copy the viewer and vendor files; `--check`, `--zip`, `--drive`. |
| `tools/site-twin/viewer/{index.html,viewer.js,styles.css,server.py,Start Viewer.cmd,README.md}` | Offline inspector (template, copied verbatim into the package). |
| `test/site-twin.test.mjs` | Coordinates, GLB validity + GLTFLoader import, ID parity with the register, category counts, determinism. |
| `.gitignore` | Add `dist-twin/`. |
| `package.json` | Add script `"site-twin": "node tools/build-site-twin.mjs"`. |

---

### Task 1: Coordinates

**Files:** Create `tools/site-twin/coords.mjs`, `test/site-twin.test.mjs`

**Interfaces — Produces:**
- `planToFeet([x,y], t) → [a,b]`, `feetToModel([a,b], y=0) → [X,Y,Z]` with X = a·0.3048, Z = −b·0.3048, Y up. `planToModel([x,y], y=0, t)` composes the two.
- `northRotation(georef) → radians` about +Y. Recorded only (D4).

- [ ] **Step 1: Failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planToFeet, planToModel } from "../tools/site-twin/coords.mjs";
const geometry = JSON.parse(readFileSync(new URL("../src/data/geometry.json", import.meta.url), "utf8"));
const T = geometry.boundary.transform;

test("plan envelope corners map to the plat a/b range", () => {
  assert.deepEqual(planToFeet([T.envelope.xRight, T.envelope.yBottom], T).map(v => Math.round(v * 100) / 100), [-25, 0]);
  const [a, b] = planToFeet([T.envelope.xLeft, T.envelope.yTop], T);
  assert.ok(Math.abs(a - T.aRangeFt[1]) < 0.05 && Math.abs(b - T.bRangeFt[0]) < 0.05);
});

test("long building spans ~522 ft in model meters", () => {
  const U = geometry.units;
  const x0 = planToModel([U["101"].x, U["101"].y], 0, T)[0], x1 = planToModel([U["133"].x + U["133"].w, U["133"].y], 0, T)[0];
  assert.ok(Math.abs(Math.abs(x1 - x0) / 0.3048 - 522.3) < 3);
});
```

- [ ] **Step 2:** Run `node --test test/site-twin.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement**

```js
/* Site twin coordinates: A-1 plan px -> plat feet (a,b) -> model metres (X,Y,Z), Y up.
   a runs Patricia(-25) -> Johnston(671.7); b runs Arnould R/W (0) -> Marie Antoinette (-300). */
export const FT = 0.3048;
export const planToFeet = ([x, y], t) => [t.aRangeFt[0] + (t.envelope.xRight - x) / t.kxPxPerFt,
                                          t.bRangeFt[1] + (y - t.envelope.yBottom) / t.kyPxPerFt];
export const feetToModel = ([a, b], y = 0) => [a * FT, y, -b * FT];
export const planToModel = (p, y, t) => feetToModel(planToFeet(p, t), y);
// footprints-geo.json georef.azY = azimuth (deg, clockwise from north) of the CAD +Y (= plat +b) axis
export const northRotation = georef => (georef.azY * Math.PI) / 180;
```

- [ ] **Step 4:** Tests pass. **Step 5:** Commit `"Add site-twin coordinate transforms (plan px → plat feet → model metres)"`.

---

### Task 2: GLB writer + validator

**Files:** Create `tools/site-twin/glb.mjs`; append to `test/site-twin.test.mjs`

**Interfaces — Produces:**
- `new GltfBuilder()`
- `.material(name, {color:[r,g,b], metallic=0, roughness=0.9, alpha=1}) → index`
- `.mesh(name, {positions: Float32Array, normals: Float32Array, indices: Uint32Array}, materialIdx) → index`
- `.node({name, mesh?, children?: [], extras?}) → index`
- `.scene(rootNodeIdxs)`
- `.toGlb() → Buffer`
- `validateGlb(buf) → {ok, errors[], meshes, nodes, triangles}`

The writer emits one buffer with 4-byte-aligned views. Accessors carry min/max for POSITION. JSON keys are emitted in deterministic order (insertion order only, no `Date`, no random values).

- [ ] **Step 1: Failing test**

```js
import { GltfBuilder, validateGlb } from "../tools/site-twin/glb.mjs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

test("GLB round-trips through three's GLTFLoader with extras intact", async () => {
  const g = new GltfBuilder();
  const m = g.material("brass", { color: [0.66, 0.49, 0.18] });
  const me = g.mesh("tri", { positions: new Float32Array([0,0,0, 1,0,0, 0,0,1]), normals: new Float32Array([0,1,0, 0,1,0, 0,1,0]), indices: new Uint32Array([0,2,1]) }, m);
  const n = g.node({ name: "col-01", mesh: me, extras: { assetId: "col-01", category: "column" } });
  g.scene([g.node({ name: "columns", children: [n] })]);
  const buf = g.toGlb();
  assert.equal(validateGlb(buf).ok, true);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, "", res, rej));
  let found; gltf.scene.traverse(o => { if (o.userData?.assetId === "col-01") found = o; });
  assert.ok(found);
});
```

- [ ] **Steps 2–5:**
  - Run the test and confirm it fails.
  - Implement the writer. Header magic `0x46546C67`, version 2, JSON chunk `0x4E4F534A` padded with spaces, BIN chunk `0x004E4942` padded with zeros. The validator checks the header and lengths, that every accessor's view bounds are within the buffer, that all float values are finite, and that node and mesh references are in range. This is the Codex check set.
  - Confirm the test passes.
  - Commit `"Add a dependency-free GLB writer + validator for the site twin"`.

---

### Task 3: Mesh primitives + the category spec

**Files:** Create `tools/site-twin/meshes.mjs`, `tools/site-twin/categories.mjs`; tests appended.

**Primitives (all return `{positions, normals, indices}` in model metres):**
- `flatPolygon(pts2d, y)`: triangulated with `THREE.ShapeUtils.triangulateShape`; normal +Y.
- `prism(pts2d, y0, y1)`: top, bottom and side walls.
- `boxAt([X,Z], w, d, h, y0=0, yawRad=0)`.
- `ribbon(polyline2d, width, y)`: striping and fences.
- `pipe(polyline2d, size, y)`: square-section tube for mains.
- `disc([X,Z], r, y)`: manholes, meter pads.
- `canopy(walkQuad, eaveY, topY, fieldEdge)`: a flat soffit at `eaveY` plus a sloped shingle face up to `topY` on the field edge (D1).
- `tree([X,Z], canopyR, height)`: trunk box plus an octahedron canopy (low-poly, presentation look).

**Category spec (`categories.mjs`):** one row per register category. `mesh` values:
- `flat` / `prism` / `box` / `ribbon` / `pipe` / `disc` / `canopy` / `tree`: the geometry kind.
- `data`: listed in the viewer only.
- `none`: a placeholder category.

| Category | mesh | dims / heights (ft unless noted) | presentation material | visible |
| --- | --- | --- | --- | --- |
| parcel | flat | y 0.00 | asphalt #3E4143 (main), #45484A (Lot 7) | on |
| island | prism | 0 → 0.5 (curb) | grass #5E8C4A | on |
| walk | prism + canopy | slab 0 → 0.5; canopy D1 | concrete #CFCBC2; shingle #3A3D40 | on |
| unit | prism | 0 → heights.json | wall cream #E6DCC6, roof TPO #F2F2EE, rear CMU #E9E9E4 | on |
| building | data | outline only (units carry the mass) | — | — |
| zone | data | members = stalls | — | — |
| stall | ribbon | stall-edge stripes 4" wide, y 0.02 | white #F4F4F0 (pending: dashed amber #D97706) | on |
| ada | flat | y 0.02 | blue #2F6FB0 + hatch-white | on |
| drive, aisle | flat | y 0.01 | asphalt (slightly lighter) | off |
| easement | ribbon | 0.3 m wide, y 0.03; liquor line brass | brass #A87E2F | off |
| tree | tree | trunk 8 ft, canopy r 10 ft | #4E7A3A | off (D3) |
| column | box | 2.5 × 2.5 × eave (D1) | cream #EDE6D3 | on |
| bench | box | 5 × 1.8 × 1.5 | dark #4A4F52 | on |
| can | box | 2 × 2 × 3.2 | dark green #2F4F3F | on |
| meter-cluster | box | 2 × 1 × 3 | grey #9AA0A3 | on |
| shutoff | disc | r 0.25 m, y 0.03 | red #C25E33 | on |
| wmeter, emeter, rtu, panel, timeclock | data (unit-centroid) | — | — | — |
| rtu (D2) | box proxy on roof | 5 × 4 × 3 at roof + 0 | #B7BCBF | presentation only |
| transformer | box | 6 × 6 × 5 | green #4F6B4E | on |
| pole | box | 1 × 1 × 35 | #6B5A45 | on |
| lus-main | pipe | 0.25 m square, y −1.2 m | water #3A73C9, sewer #4F9A3A | off |
| lus-point | disc | r 0.45 m, y 0.02 | #5F6E64 | off |
| ground-hp | box | 3 × 3 × 3.5 | #C9CDD0 | on |
| bollard | box pair | 0.5 × 0.5 × 3.5, 2 ft apart | yellow #E5B53A | on |
| lighting (located) | box | 1 × 1 × 25 | #6B6F72 | on |
| sign (pylon) | box | 10 × 2 × 20, plus a 14-panel face texture-free | #1C2B26 face, #EDE6D3 panels | on |
| fence | ribbon (vertical) | 6 ft high | wood #8A6A4A | on |
| freezer | prism | 0 → 9 | #E9E9E4 | on |
| firewall | ribbon (vertical) | through the building height + 2 ft | red-dashed in Record look only | off |
| camera | box | 0.6 m cube at 12 ft | #1C2B26 | off |
| placeholders | none | — | — | — |

**Record look:** flat plan-room palette (paper, card, ink, brass). **Presentation look:** the table colors. Both are baked as material variants: the GLB carries presentation materials, and the viewer swaps colors for Record by category.

- [ ] **Steps:**
  - Write tests for primitive validity: finite values, `indices % 3 == 0`, normals of unit length.
  - Write a test that `categories.mjs` covers every `CATEGORIES` id from `siteassets.js`.
  - Implement, run the tests, commit `"Add site-twin mesh primitives and the category spec"`.

---

### Task 4: Build CLI → `dist-twin/OTB_Site_Twin/`

**Files:** Create `tools/build-site-twin.mjs`; modify `.gitignore` and `package.json`.

**Build steps (deterministic):**
1. `reg = buildRegister(geometry, { cameras, items, meters, unitName })`. Pins are excluded: they live in the operator's browser state, and the viewer notes that.
2. Group the register by category and apply the spec rules. Each modeled asset becomes one node named by its `id`, with extras `{assetId, category, label, status, source, unit?, parent?, codexAssetId?, count?}`. Category roots are nodes named by the category id, and group roots by the group name.
3. Stalls: per zone, one merged stripe mesh per row for GLB size. Also one invisible pick-quad node **per stall** carrying the stall's `assetId` (flat, y 0.03), so every stall is individually selectable.
4. Units: prism from the unit rect converted to feet, **inset to the demising gap midpoints** so there are no 2 px presentation gaps. Height comes from `heights.json`, and extras record `heightBasis: "CAD BLD_HT parapet association"`.
5. Write:
   - `model.glb`
   - `twin-data.json`:
     - `{schema, product: "Cypress Command Platform", property, generatedFrom: {commit, geometryRev, registerFits}}`
     - `origin`, `transform`, `northRotationRad`
     - `categories[]` with counts, visibility and placeholder notes
     - `assets[]` with `{id, label, category, status, positionM?, boundsM?, dataOnly?}`
     - `cameraPresets` (overview, plan, eye-walk start at col-01)
     - `walkTour` (col-01 → col-39)
   - `site-register.csv` (`registerCSV`)
   - `twin-report.json`: counts, validation, omissions, and the D1–D4 values used.
6. Copy the viewer template plus `node_modules/three/build/three.module.js`, `three.core.js`, `examples/jsm/{controls/OrbitControls.js, loaders/GLTFLoader.js, utils/BufferGeometryUtils.js}` and three's LICENSE into `vendor/`.
7. `--check`: rebuild into memory and compare `model.glb` byte-for-byte and the JSON semantically. Exit non-zero on drift.
8. `--zip`: `OTB_Site_Twin.zip` (via PowerShell `Compress-Archive`). `--drive`: copy the zip plus the report to `G:\My Drive\00 OTB\site-twin\`.

- [ ] **Step 1: Failing tests (append)**

```js
test("every located, non-data register asset is a GLB node with its assetId; data-only rows are not", async () => { /* build in-memory via exported buildTwin(); traverse gltf.scene; compare id sets */ });
test("stall nodes = 324 (10 carry status cad-pending); column nodes = 39", async () => { /* ... */ });
test("build is deterministic: two in-memory builds give identical GLB bytes", async () => { /* ... */ });
```

`build-site-twin.mjs` exports `buildTwin({ root }) → { glb, data, csv, report }`, so the tests run without touching disk. The CLI wraps it.

- [ ] **Steps 2–5:**
  - Run the tests and confirm they fail.
  - Implement.
  - Run `npm run site-twin -- --check` and confirm the tests pass.
  - Commit `"Build the portable OTB site twin (GLB + twin-data + register CSV + report)"`.

---

### Task 5: Offline inspector (viewer template)

**Files:** Create `tools/site-twin/viewer/*`.

Adapted from the Column Twin's `viewer.js` (render on demand, marker picking, OrbitControls, overview/plan/eye modes, WASD). Behaviour:
- **Panel:**
  - category toggles grouped exactly as the A-1 register (Site / Parking / Walkway / Utilities / Systems / No source yet);
  - Record ↔ Presentation look;
  - Isolate highlighted; Show labels;
  - search by label, ID or status;
  - selected-asset card (ID, category, status, source, count, suite, 3D-twin cross-link, parent link);
  - "Focus"; Reset view.
- **Picking:** a ray pick on visible nodes that resolves to the nearest ancestor with `extras.assetId`. Selecting a zone or meter cluster highlights its children. Brass means highlighted and amber means selected (emissive tint, not a color replacement).
- **Views:**
  - Overview (orbit).
  - Plan (orthographic, top-down, M.A. at the top to match A-1).
  - Eye level on the walkway, with ← → stepping col-01…col-39 through `walkTour`.
- **Data-only rows** (unit-centroid RTU/panel/meter/time clock, unlocated rows) are listed under a "Suite records" section and are never drawn. Placeholders show `0 — no source on file`.
- **Footer:** "Cypress Command Platform · On The Boulevard · site twin", model basis, and links to `twin-report.json` and `site-register.csv`.
- **Accessibility and responsive** (Column Twin parity): native buttons and inputs, visible focus, reduced motion, a stacked layout below 900 px, no external network.

- [ ] **Steps:**
  - Build the package.
  - Serve it with `python server.py --port 8770`. Add a `.claude/launch.json` entry `otb-site-twin-8770` that runs `python dist-twin/OTB_Site_Twin/server.py --port 8770`.
  - Run the Task 6 checklist.
  - Commit `"Add the OTB site twin inspector"`.

---

### Task 6: Acceptance + delivery

- [ ] **Browser acceptance** (preview on port 8770):
  1. The model loads with no console errors.
  2. The overview shows both buildings with the canopy, columns under the canopy edge, striped lots and islands.
  3. Picking a column shows `col-NN` plus its Codex ID. Picking a stall shows `stall-<zone>-NNN`. Picking a zone highlights all its stalls.
  4. The Plan view matches A-1 orientation, with M.A. at the top and Arnould at the bottom.
  5. The eye-level walk tour steps through 1→39.
  6. The Record/Presentation toggle swaps looks.
  7. The LUS toggle shows pipes below grade with a "depth unverified" note.
  8. The placeholders list 0.
  9. At 390 px width, the panel stacks and nothing is clipped.
  10. Take a desktop screenshot plus a narrow one for the operator.
- [ ] **Gates:** `node --test`, `npm run build`, `npm run site-twin -- --check --zip --drive`.
- [ ] **Docs:** `docs/site-twin-2026-09.md`, covering basis, the D1–D4 values, what is presentation versus record, and how to rebuild. Add a `HANDOFF.md` entry.
- [ ] **Commit + PR.** Merging to master deploys the app, although the twin itself is a standalone package; the PR carries only tools, tests and docs.

## Not in Stage 2 (recorded)

- Loading the GLB into A-2's Lens-B (`src/lib/scene3d.js`, WORLD = plan px × 0.06) as an alternate layer. This is a follow-on once the operator has reviewed the standalone twin.
- Interiors: the Codex Floorplanner walls and the 27 per-suite floor plans.
- The second floor (101/103 mezzanine).
- Photogrammetry texture baking.
- Live data (work orders, sensors) against `assetId`.
- Survey-grade geometry and true-north baking, pending D4.
