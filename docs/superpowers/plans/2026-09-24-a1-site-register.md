# A-1 Site Register (Stage 1 of the site twin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the A-1 site plan the treatment the Sep 23 OTB_Column_Twin gave the walkway columns: every site asset (units, parking zones, individual stalls, curb cuts, aisles, cameras) gets a stable ID. Each asset is highlightable, pickable from the plan or a searchable register, can be isolated and focused, and exports to CSV and JSON, with its provenance and verification status shown.

**Architecture:** The generator (`tools/extract-geometry.mjs`) already knows every stall row and driveway apron in plan-px coordinates. It writes those shapes into a new `geometry.assetGeom` key. A pure module (`src/lib/siteassets.js`) turns them into a flat asset list with deterministic IDs. It subdivides each row into exactly the plat-labeled stall count. A new view module (`src/views/plan-register.js`) owns the register panel and a top-most SVG highlight layer on A-1. `plan.js` only calls into it.

**Tech Stack:** Vanilla JS ES modules (Vite 7), `node --test` for unit tests, native SVG. No new dependencies.

**Spec:** Operator decisions, 2026-09-24 session (no separate spec doc):
- Staged: Stage 1 is this in-app register. Stage 2 (a separate plan, written after Stage 1 lands) is the portable 3D site twin: GLB + offline inspector keyed to the same asset IDs.
- Parking = **both**: 10 zone assets (9 plat zones plus the pending CAD Johnston row), each parenting its individual stalls.
- Reference implementation for UX parity: `C:\Users\adam\Documents\Codex\2026-09-23\ca\outputs\OTB_Column_Twin\` (index.html, viewer.js, README.md).
- Operator references, 2026-09-24 (`G:\My Drive\00 OTB\Additional Files to Consider\Plats and Site Plans and Pictures\`):
  - `07_Columns_Benches_and_Cans.pdf`: really a ZIP holding `1.jpeg`, the operator's walkway inventory. **39 numbered columns** run from 1 at the 101/Johnston end, along the storefront, to 39 at the Patricia end of the short-building walk. Red **B** = benches, purple **C** = trash cans. **This is the numbering of record for columns.**
  - Utilities sheet (plat-based, Arnould at top): blue circles = **city meters**, red circles = **tenant water shut-offs**. The number in each circle is the count at that spot.
  - `SOT_SITE_PLAN.pdf` and `Camera_Options_for_Belle.pdf` are also ZIPs of JPEGs. SOT = 2020 site plan (unit SFs match units.json). Camera options = proposed mounts on the plat, already covered by the 17-camera registry.
  - LUS ArcMap captures (2021): water (blue) and sewer (green) mains, manholes `2-2401`, `6-3823`, `6-3861`, `8-1782`, `6-3790`. **Out of Stage 1**; recorded for the utilities pass.

## Global Constraints

- Parking legal figure stays **324 provided / 344 required** (Entry 99-11797). The ops figure stays **314** (plat labels). The 10 CAD Johnston stalls are carried as `pending` and never folded into 314.
- Stall counts per zone must equal the plat labels in `geometry.parking.zones`: field 100 · Arnould 38 · storefront 56 · Lot 6 28 · Lot 8 19 · rear M.A. 18 · Johnston 10 · Lot 7 32 · JD Bank 13 = 314, plus Johnston CAD 10 (pending).
- Derived stalls are **not field verified**. Every stall row carries a verification status and the register says so. No condition, maintenance or occupancy is invented.
- JD Bank parcel is NOT A PART. Its 13 easement stalls are labeled as easement spaces on the bank parcel, never as Belle property.
- The locked plan-room palette applies: highlight = brass `#A87E2F`, selected = amber `#D97706` (brand Amber, the column twin's "selected orange" equivalent), ink `#1C2B26`. Neither color signals condition.
- **Columns: 39 of record vs 37 modeled.** The operator sheet numbers 39 columns. The Codex column twin found 37 candidates, with C25 flagged. Register IDs follow the operator numbering (`col-01`…`col-39`). Each column record carries the matching Codex `column-<hash>` assetId where a match exists within 1.5 m after registration. The unmatched ones are listed and never silently dropped or invented.
- Furniture and utility positions are **digitized from operator sheets**, with status `digitized`, plus a stated fit residual. They are not surveyed.
- The existing `📍 Assets` chip (site-asset pins) keeps its name. The new control is labeled **◫ Register** to avoid collision.
- Product name in any export header: "Cypress Command Platform". Never naked "Cypress" or "Command".
- Drawn geometry is unchanged: the A-1 title-block REV stays REV 14, because `assetGeom` is metadata about existing strokes. If the generator diff shows any change in `layers.*`, stop. That is a regression.
- Quality gate before every commit: `node --test` passes, `npm run build` succeeds.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `tools/extract-geometry.mjs` (modify) | Record stall-row quads, driveway apron polygons and aisle rects into `geometry.assetGeom` while drawing them. Single source of truth. |
| `src/data/geometry.json` (regenerated) | Gains `assetGeom: { zones[], drives[], aisles[] }`. No other key changes. |
| `src/lib/siteassets.js` (create) | Pure: `subdivideRow`, `bboxOf`, `stallStatus`, `buildRegister`, `registerCSV`. No DOM. |
| `test/siteassets.test.mjs` (create) | Counts, ID stability/uniqueness, subdivision geometry, CSV shape. |
| `src/views/plan-register.js` (create) | Register panel DOM, highlight/select SVG layer, focus/reset, isolate, labels, exports. |
| `src/views/plan.js` (modify) | Import and call `paintRegister` last in `drawPlan`; call `initRegister` from `initPlan`. |
| `index.html` (modify) | `◫ Register` chip; `<aside id="siteRegister">` inside the A-1 plan card. |
| `src/styles.css` (modify) | Panel grid, register list, highlight/isolate classes. |

---

### Task 1: Emit `geometry.assetGeom` from the generator

**Files:**
- Modify: `tools/extract-geometry.mjs` (after line 113 `const r2`; the Lot 7 `row7` block ~253–272; parking blocks ~335–481; apron helpers ~730–737; the `geometry` object ~963)
- Regenerate: `src/data/geometry.json`
- Test: `test/siteassets.test.mjs` (geometry-shape tests only in this task)

**Interfaces:**
- Produces: `geometry.assetGeom = { zones: Zone[], drives: Drive[], aisles: Aisle[] }` where
  - `Zone = { id, code, name, count, pending?: true, scope: "main"|"full", rows: Row[] }`
  - `Row = { id, n, quad: [[x,y],[x,y],[x,y],[x,y]] }`. The p0→p1 edge is the stall-ordering edge (stall 1 at p0). p3→p2 is the opposite edge.
  - `Drive = { id, name, street, movement, quad: [[x,y]…4] }` (ids A, B, J, P1, P2, P3, M1, M2)
  - `Aisle = { id, name, flow, quad: [[x,y]…4] }` (ids from `AISLES`)

- [ ] **Step 1: Write the failing test**

Create `test/siteassets.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(join(root, "src/data/geometry.json"), "utf8"));

const PLAT = { field: 100, arnould: 38, storefront: 56, lot6: 28, lot8: 19, rear: 18, johnston: 10, lot7: 32, jdbank: 13 };

test("assetGeom zones carry the plat-label stall counts (314) + the pending CAD row (10)", () => {
  const zones = geometry.assetGeom.zones;
  for (const [id, n] of Object.entries(PLAT)) {
    const z = zones.find(z => z.id === id);
    assert.ok(z, "missing zone " + id);
    assert.equal(z.count, n, id + " count");
    assert.equal(z.rows.reduce((s, r) => s + r.n, 0), n, id + " row sum");
    assert.ok(!z.pending, id + " must not be pending");
  }
  const cad = zones.find(z => z.id === "johnston-cad");
  assert.equal(cad.count, 10);
  assert.equal(cad.pending, true);
  const plat = zones.filter(z => !z.pending).reduce((s, z) => s + z.count, 0);
  assert.equal(plat, geometry.parking.totalPlat);
  assert.equal(plat + cad.count, geometry.parking.totalStriped);
});

test("assetGeom rows are finite 4-point quads", () => {
  for (const z of geometry.assetGeom.zones) for (const r of z.rows) {
    assert.equal(r.quad.length, 4, z.id + "/" + r.id);
    for (const p of r.quad) assert.ok(p.every(Number.isFinite), z.id + "/" + r.id + " non-finite");
  }
});

test("assetGeom records the 8 Belle curb cuts and every aisle, once each", () => {
  const ids = geometry.assetGeom.drives.map(d => d.id);
  assert.deepEqual([...ids].sort(), ["A", "B", "J", "M1", "M2", "P1", "P2", "P3"]);
  assert.deepEqual(geometry.assetGeom.aisles.map(a => a.id), geometry.access.aisles.map(a => a.id));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/siteassets.test.mjs`
Expected: FAIL with `TypeError: Cannot read properties of undefined (reading 'zones')`

- [ ] **Step 3: Add the registry scaffolding right after `const r2 = …` (line 113)**

```js
/* ── A-1 site register geometry (assetGeom). Plan-px quads recorded while the
   strokes below are drawn; p0→p1 is the stall-ordering edge. Counts are the
   plat 'N SPACES' labels — the register subdivides each row count-exact, so a
   row's drawn tick spacing may differ slightly from its derived stalls. ── */
const AG = { zones: [], drives: [], aisles: [] };
[["field", "F", "Main field", 100], ["arnould", "AR", "Arnould frontage row", 38],
 ["storefront", "SF", "Storefront row (long building)", 56], ["lot6", "L6", "Lot 6 west field", 28],
 ["lot8", "L8", "Lot 8 pocket", 19], ["rear", "RM", "Rear Marie Antoinette parallel row", 18],
 ["johnston", "JS", "Johnston strip", 10], ["lot7", "L7", "Lot 7 remote lot", 32, "full"],
 ["jdbank", "JD", "JD Bank easement spaces (NOT A PART)", 13],
 ["johnston-cad", "JC", "Johnston CAD head-in row (unlabeled on plat)", 10, "main", true]]
  .forEach(([id, code, name, count, scope = "main", pending]) =>
    AG.zones.push({ id, code, name, count, ...(pending ? { pending: true } : {}), scope, rows: [] }));
const azRow = (zid, id, n, quad) =>
  AG.zones.find(z => z.id === zid).rows.push({ id, n, quad: quad.map(([x, y]) => [r2(x), r2(y)]) });
// a-range × b-range quad in plan px, ordered along a (ax/by are defined in the parking section; called later)
const abQuad = (a0, a1, b0, b1) => [[ax(a0), by(b0)], [ax(a1), by(b0)], [ax(a1), by(b1)], [ax(a0), by(b1)]];
// same, ordered along b
const baQuad = (a0, a1, b0, b1) => [[ax(a0), by(b0)], [ax(a0), by(b1)], [ax(a1), by(b1)], [ax(a1), by(b0)]];
```

- [ ] **Step 4: Record Lot 7 rows (in the `row7` block, ~line 253)**

Replace the `row7` definition and its three calls, and add the east column record:

```js
  const row7 = (id, da0, da1, db0, db1, n) => { // n stalls → n+1 vertical ticks
    for (let i = 0; i <= n; i++) {
      const da = da0 + (i * (da1 - da0)) / n;
      const A = P7(da, db0), B = P7(da, db1);
      remoteLot.push(line(r2(A[0]), r2(A[1]), r2(B[0]), r2(B[1]), TICK7));
    }
    azRow("lot7", id, n, [P7(da0, db0), P7(da1, db0), P7(da1, db1), P7(da0, db1)]);
  };
  row7("frontage", 8, 62, -2, -20.5, 6);   // 6 SPACES — frontage row (noses M.A.)
  row7("mid", 3, 75, -55, -73.5, 8);       // 8 SPACES — mid row
  row7("rear", 3, 75, -112, -130.5, 8);    // 8 SPACES — rear row
```

and directly after the existing `for (let i = 0; i <= 10; i++) { … }` east-column loop:

```js
  azRow("lot7", "east", 10, [P7(56, -26), P7(56, -116), P7(74.5, -116), P7(74.5, -26)]);
```

Order check: frontage 6 + mid 8 + rear 8 + east 10 = 32.

- [ ] **Step 5: Record the main-parcel rows**

Add one `azRow` per drawn row, next to the loop that draws it:

```js
// Arnould head-in row — inside MOD.forEach, change the callback to take the index:
  MOD.forEach(([a0, a1, n, bFront, bBack], k) => {
    /* …existing tick loop + zlab unchanged… */
    azRow("arnould", "m" + (k + 1), n, abQuad(a0, a1, bFront, bBack));
  });

// field bands — inside BANDS.forEach(([b0, b1], bi) => …) and segs.forEach(([a0, a1]) => …),
// after the tick loop (18 per side on the west segment = 36, 7 per side east = 14):
      const n = a0 === 217.2 ? 18 : 7, seg = a0 === 217.2 ? "w" : "e";
      azRow("field", "b" + (bi + 1) + seg + "-near", n,
        [[ax(a0), by(b0)], [ax(a1), by(b0)], [ax(a1) - 12, ySp], [ax(a0) - 12, ySp]]);
      azRow("field", "b" + (bi + 1) + seg + "-far", n,
        [[ax(a0), ySp], [ax(a1), ySp], [ax(a1) - 12, by(b1)], [ax(a0) - 12, by(b1)]]);

// storefront — after its tick loop (57 ticks at 8.96' from a 131 → 56 stalls):
  { const x0 = ax(131) - 6.5, x1 = ax(131 + 56 * 8.96) - 6.5;
    azRow("storefront", "row56", 56, [[x0, by(-168.5)], [x1, by(-168.5)], [x1, by(-184.8)], [x0, by(-184.8)]]); }

// Lot 6 — island module is double-loaded across the ax(165.1) spine, 8 a side; plus the 12-space column:
  azRow("lot6", "island-w", 8, baQuad(147, 165.1, -71.5, -128.5));
  azRow("lot6", "island-e", 8, baQuad(165.1, 183, -71.5, -128.5));
  azRow("lot6", "walk12", 12, baQuad(98.5, 116.7, -42.9, -150.9));

// Lot 8 — 10 + 5 + 4 (these rows are drawn in raw px, so the quads are too):
  azRow("lot8", "end-walk10", 10, [[1186.5, by(-234.7) - 2], [1317, by(-234.7) - 2], [1317, by(-252.9)], [1186.5, by(-252.9)]]);
  azRow("lot8", "ma5", 5, [[1233.7, by(-288)], [1318.2, by(-288)], [1318.2, by(-300) + 4], [1233.7, by(-300) + 4]]);
  azRow("lot8", "breezeway4", 4, [[1154, by(-252)], [1154, by(-288)], [1188, by(-288)], [1188, by(-252)]]);

// rear M.A. — inside G.forEach(([a0, a1, n], k) => …):
    azRow("rear", "m" + (k + 1), n, abQuad(a0, a1, -283, -297));

// Johnston strip — 8 head-in + 2 at the pylon pocket:
  azRow("johnston", "head8", 8, abQuad(565.3, 622.3, -122.4, -140.4));
  azRow("johnston", "pylon2", 2, abQuad(656, 638, -147, -163));

// JD Bank — 6 along the notch line + 7 along Johnston:
  azRow("jdbank", "notch6", 6, baQuad(553, 571, -22, -76));
  azRow("jdbank", "johnston7", 7, baQuad(652, 668, -20, -83));

// Johnston CAD row (pending) — in the REV 13 block, after its tick loop:
  azRow("johnston-cad", "cad10", 10, baQuad(651.05, 669.55, -270.67, -180.67));
```

- [ ] **Step 6: Record driveways and aisles**

Above the apron helpers (~line 730) add:

```js
const recDrive = (d, pts) => {
  if (d.id) AG.drives.push({ id: d.id, name: d.name, street: d.street, movement: d.movement,
    quad: pts.map(([x, y]) => [r2(x), r2(y)]) });
  return pts;
};
```

Wrap each helper's point array in `recDrive(d, …)`. For example:

```js
const apronArnould = (d, st) => poly(recDrive(d, [[ax(d.throatA[0]), 662], [ax(d.throatA[1]), 662], [ax(d.flareA[1]), by(ST.arnould.curbFt)], [ax(d.flareA[0]), by(ST.arnould.curbFt)]]), st);
```

Do the same in `apronPatricia`, `apronMA` and `apronJohnston`. `BANK_DRIVE` has no `id`, so it is skipped. After `AISLES` is defined:

```js
AISLES.forEach(s => AG.aisles.push({ id: s.id, name: s.name, flow: s.flow,
  quad: abQuad(s.a[0], s.a[1], s.b[0], s.b[1]).map(([x, y]) => [r2(x), r2(y)]) }));
```

Then add `assetGeom: AG` to the `geometry` object (~line 963), after `units`.

- [ ] **Step 7: Regenerate and prove only `assetGeom` changed**

Run: `npm run extract-geometry && node -e "const o=JSON.parse(require('child_process').execSync('git show HEAD:src/data/geometry.json'));const n=require('./src/data/geometry.json');for(const k of new Set([...Object.keys(o),...Object.keys(n)]))if(JSON.stringify(o[k])!==JSON.stringify(n[k]))console.log('changed:',k)"`
Expected output: exactly `changed: assetGeom`. If any other key prints, revert `geometry.json` and find the unintended generator change. For example, a `recDrive` call site that draws an apron twice would push a duplicate. The test in Step 1 also catches that.

- [ ] **Step 8: Run the tests**

Run: `node --test test/siteassets.test.mjs`
Expected: 3 pass. If `drives` has duplicates, an apron helper is called twice for one drive. Make `recDrive` skip ids already present.

- [ ] **Step 9: Commit**

```bash
git add tools/extract-geometry.mjs src/data/geometry.json test/siteassets.test.mjs
git commit -m "Emit A-1 site-register geometry (stall rows, curb cuts, aisles) from the generator"
```

---

### Task 2: Pure register module `src/lib/siteassets.js`

**Files:**
- Create: `src/lib/siteassets.js`
- Test: `test/siteassets.test.mjs` (append)

**Interfaces:**
- Consumes: `geometry.assetGeom`, `geometry.units[0]` (map id → `{x,y,w,h}`), cameras with `{id,name,pos:{x,y}}`.
- Produces:
  - `CATEGORIES: [id, label][]` — `unit, zone, stall, drive, aisle, camera`
  - `subdivideRow(quad, n) → quad[]` (n quads, stall 1 at p0)
  - `bboxOf(asset) → {x,y,w,h}`
  - `stallStatus(zone) → "plat-derived" | "cad-pending" | "est-geometric"`
  - `buildRegister(geometry, { cameras = [], unitName = () => "" }) → Asset[]`
  - `Asset = { id, cat, label, sub, parent?, children?, count?, polys?: quad[], point?: [x,y], scope, status, source }`
  - `registerCSV(assets) → string`

- [ ] **Step 1: Append failing tests**

```js
import { subdivideRow, buildRegister, registerCSV, bboxOf, stallStatus } from "../src/lib/siteassets.js";

test("subdivideRow splits a quad into n equal stalls, stall 1 at p0", () => {
  const q = subdivideRow([[0, 0], [90, 0], [90, 18], [0, 18]], 10);
  assert.equal(q.length, 10);
  assert.deepEqual(q[0], [[0, 0], [9, 0], [9, 18], [0, 18]]);
  assert.deepEqual(q[9][1], [90, 0]);
});

test("buildRegister: 324 stalls, stable unique ids, parented to their zone", () => {
  const reg = buildRegister(geometry);
  const stalls = reg.filter(a => a.cat === "stall");
  assert.equal(stalls.length, 324);
  assert.equal(new Set(reg.map(a => a.id)).size, reg.length, "ids unique");
  assert.equal(stalls[0].id, "stall-field-001");
  const sf = reg.find(a => a.id === "zone-storefront");
  assert.equal(sf.children.length, 56);
  assert.equal(reg.find(a => a.id === "stall-storefront-056").parent, "zone-storefront");
  assert.equal(reg.filter(a => a.cat === "stall" && a.status === "cad-pending").length, 10);
});

test("buildRegister: ids are deterministic across builds", () => {
  assert.deepEqual(buildRegister(geometry).map(a => a.id), buildRegister(geometry).map(a => a.id));
});

test("buildRegister: 27 units, 8 curb cuts, cameras as points", () => {
  const reg = buildRegister(geometry, { cameras: [{ id: "x", name: "X", pos: { x: 10, y: 20 } }], unitName: id => "T" + id });
  assert.equal(reg.filter(a => a.cat === "unit").length, 27);
  assert.equal(reg.filter(a => a.cat === "drive").length, 8);
  assert.equal(reg.find(a => a.id === "unit-135a").sub, "T135A");
  const cam = reg.find(a => a.id === "cam-x");
  assert.deepEqual(cam.point, [10, 20]);
  assert.deepEqual(bboxOf(cam), { x: -20, y: -10, w: 60, h: 60 });
});

test("stallStatus: pending zone is cad-pending, storefront est-geometric, others plat-derived", () => {
  assert.equal(stallStatus({ id: "johnston-cad", pending: true }), "cad-pending");
  assert.equal(stallStatus({ id: "storefront" }), "est-geometric");
  assert.equal(stallStatus({ id: "lot8" }), "plat-derived");
});

test("registerCSV: header + one row per asset, quoted", () => {
  const reg = buildRegister(geometry);
  const lines = registerCSV(reg).trim().split("\n");
  assert.equal(lines[0], '"label","asset_id","category","parent","status","center_x_px","center_y_px","count","source"');
  assert.equal(lines.length, reg.length + 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/siteassets.test.mjs`
Expected: FAIL with `Cannot find module '…/src/lib/siteassets.js'`

- [ ] **Step 3: Implement `src/lib/siteassets.js`**

```js
/* A-1 site register — pure. Turns geometry.assetGeom (plan-px quads written by
   tools/extract-geometry.mjs) plus units + cameras into one flat, stably-IDed
   asset list: the 2D counterpart of the Sep 23 column twin's register. IDs are
   positional (zone + stall ordinal along the row's p0→p1 edge) and stay stable
   while the generator's row order is unchanged. They are NOT field tags. */

export const CATEGORIES = [
  ["unit", "Units"], ["zone", "Parking zones"], ["stall", "Stalls"],
  ["drive", "Curb cuts"], ["aisle", "Aisles"], ["camera", "Cameras"],
];

const r2 = n => Math.round(n * 100) / 100;
const lerp = (p, q, t) => [r2(p[0] + (q[0] - p[0]) * t), r2(p[1] + (q[1] - p[1]) * t)];
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, "-");

export function subdivideRow(quad, n) {
  const [p0, p1, p2, p3] = quad, out = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    out.push([lerp(p0, p1, t0), lerp(p0, p1, t1), lerp(p3, p2, t1), lerp(p3, p2, t0)]);
  }
  return out;
}

export function bboxOf(a) {
  if (a.point) return { x: a.point[0] - 30, y: a.point[1] - 30, w: 60, h: 60 };
  const pts = a.polys.flat();
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x: r2(x), y: r2(y), w: r2(Math.max(...xs) - x), h: r2(Math.max(...ys) - y) };
}

/* Verification label for a zone's derived stalls. */
export function stallStatus(zone) {
  if (zone.pending) return "cad-pending";           // CAD-striped, no plat label: 324 − 314 candidate
  if (zone.id === "storefront") return "est-geometric"; // row56 ↔ C3 stall-map, ±1 until the stall walk
  return "plat-derived";                            // plat count, even subdivision of the drawn row
}

const rectPoly = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];

export function buildRegister(geometry, { cameras = [], unitName = () => "" } = {}) {
  const ag = geometry.assetGeom, out = [];
  for (const [id, r] of Object.entries(geometry.units[0])) out.push({
    id: "unit-" + slug(id), cat: "unit", label: "Suite " + id, sub: unitName(id), polys: [rectPoly(r)],
    scope: "main", status: "presentation", source: "geometry.units — presentation rect (unequal x/y scale), not measured",
  });
  for (const z of ag.zones) {
    const stalls = [];
    for (const row of z.rows) for (const q of subdivideRow(row.quad, row.n)) {
      const k = stalls.length + 1;
      stalls.push({ id: `stall-${z.id}-${String(k).padStart(3, "0")}`, cat: "stall", label: `${z.code}-${k}`,
        sub: z.name + " · row " + row.id, parent: "zone-" + z.id, polys: [q], scope: z.scope,
        status: stallStatus(z), source: "plat count subdivided over the generator's drawn row" });
    }
    out.push({ id: "zone-" + z.id, cat: "zone", label: z.name, sub: z.count + " stalls" + (z.pending ? " · pending ground confirmation" : ""),
      count: z.count, children: stalls.map(s => s.id), polys: z.rows.map(r => r.quad), scope: z.scope,
      status: z.pending ? "cad-pending" : "plat", source: z.pending ? "architect CAD PARKING layer (no plat label)" : "recorded plat 'N SPACES' label" });
    out.push(...stalls);
  }
  for (const d of ag.drives) out.push({ id: "drive-" + slug(d.id), cat: "drive", label: d.name, sub: d.street + " · " + d.movement,
    polys: [d.quad], scope: "main", status: "cad", source: "architect CAD curb returns (geometry.access, REV 13)" });
  for (const s of ag.aisles) out.push({ id: "aisle-" + slug(s.id), cat: "aisle", label: s.name, sub: s.flow,
    polys: [s.quad], scope: "main", status: "plat", source: "plat TF arrows (geometry.access.aisles)" });
  for (const c of cameras) out.push({ id: "cam-" + slug(c.id), cat: "camera", label: c.name, sub: c.zone || "",
    point: [c.pos.x, c.pos.y], scope: "main", status: c.posConfidence || "registry", source: "src/data/cameras.json (+ operator overrides)" });
  return out;
}

const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
export function registerCSV(assets) {
  const head = ["label", "asset_id", "category", "parent", "status", "center_x_px", "center_y_px", "count", "source"];
  const rows = assets.map(a => { const b = bboxOf(a);
    return [a.label, a.id, a.cat, a.parent, a.status, r2(b.x + b.w / 2), r2(b.y + b.h / 2), a.count, a.source]; });
  return [head, ...rows].map(r => r.map(q).join(",")).join("\n") + "\n";
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/siteassets.test.mjs`
Expected: all pass. Then run `node --test` for the full suite. Expected: no new failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/siteassets.js test/siteassets.test.mjs
git commit -m "Add the pure A-1 site register: stable asset ids, count-exact stalls, CSV"
```

---

### Task 2b: Walkway furniture + utilities (digitized) into the register

**Files:**
- Create: `tools/digitize-site-furniture.mjs`: affine fit from source-image pixels to A-1 plan px, then writes the data file.
- Create: `src/data/site-furniture.json`: `{ _readme, sources[], fit{…residualPx}, items: [{ id, kind, n, count?, xy:[x,y], src, codexAssetId? }] }`
- Modify: `src/lib/siteassets.js`: add categories `column`, `bench`, `can`, `meter`, `shutoff`, and take `furniture` in `buildRegister(geometry, { furniture })`.
- Test: `test/siteassets.test.mjs` (append)

**Procedure:**
1. **Anchors.** Pick ≥ 4 unambiguous building corners visible on each source sheet: long-building 101 outer corner, long-building 133 corner, short-building 149 corner, 135A/B breezeway corner. Read their pixel coordinates from the source JPEG (zoom to confirm). Pair them with the same corners in plan px from `geometry.units[0]`: `101` x/y, `133` x+w, `149` y+h, `135A` y. Solve a least-squares 2D affine in the script and print the RMS residual. **Reject the fit if the residual is over 6 plan px (~3 ft).**
2. **Points.** Transcribe every marker's pixel position into the script's `POINTS` table: 39 columns, each B, each C, each meter circle with its count, each shut-off circle with its count. Use the marker's centre as read from the zoomed image.
3. **Codex cross-link.** Load `OTB_Column_Twin/model-data.json` if the path exists (optional input). Fit FML→plan with the same corner anchors taken from the FML walls. Attach `codexAssetId` to each operator column within 1.5 m. Print unmatched ones on both sides.
4. **Output.** Write `site-furniture.json`. It is committed data; the script is re-runnable.

**Register rules:**
- Column labels are `Column 1`…`Column 39`, IDs `col-01`…`col-39`, status `digitized`. Benches are `bench-NN`, cans `can-NN`, both numbered left→right as they appear along the walk from the 101 end. Meters are `meter-NN` with `count`. Shut-offs are `shutoff-NN` with `count` and a `sub` like "10 tenant shut-offs".
- All furniture assets are `point` assets. `bboxOf` pads points by 30 px.

- [ ] **Step 1: Failing tests (append)**

```js
import furniture from "../src/data/site-furniture.json" with { type: "json" };

test("furniture: 39 operator-numbered columns, contiguous ids", () => {
  const reg = buildRegister(geometry, { furniture });
  const cols = reg.filter(a => a.cat === "column");
  assert.equal(cols.length, 39);
  assert.deepEqual(cols.map(c => c.id), Array.from({ length: 39 }, (_, i) => "col-" + String(i + 1).padStart(2, "0")));
  assert.ok(cols.every(c => c.status === "digitized" && c.point.every(Number.isFinite)));
});

test("furniture: fit residual recorded and within 6 px", () => {
  assert.ok(furniture.fit.residualPx <= 6, "fit too loose: " + furniture.fit.residualPx);
});

test("furniture: columns fall inside the A-1 main viewBox", () => {
  for (const c of furniture.items.filter(i => i.kind === "column"))
    assert.ok(c.xy[0] > 0 && c.xy[0] < 1480 && c.xy[1] > 0 && c.xy[1] < 990, c.id);
});
```

- [ ] **Step 2: Run → FAIL** (missing JSON). **Step 3:** write the digitizer, run it, and check the residual. **Step 4:** extend `CATEGORIES` with `["column","Columns"],["bench","Benches"],["can","Trash cans"],["meter","City meters"],["shutoff","Tenant shut-offs"]`. In `buildRegister`, map `furniture.items` to `{ id, cat: kind, label, sub, point: xy, count, scope: "main", status: "digitized", source: src, codexAssetId }`. **Step 5:** tests pass, then `node --test` passes, then commit `"Digitize walkway columns, benches, cans, meters and shut-offs into the site register"`.

**Browser check (in Task 3):** with Columns highlighted, all 39 dots sit on the covered walkway line along both buildings. Any dot off the walk means the anchor fit is wrong. Fix it; don't nudge points.

---

### Task 3: Register panel + highlight layer on A-1

**Files:**
- Create: `src/views/plan-register.js`
- Modify: `src/views/plan.js` (imports ~line 16; end of `drawPlan` after `paintCameras` ~line 110; `initPlan` ~line 429)
- Modify: `index.html` (A-1 `plan-tools` row ~line 104; `plan-card` ~line 111)
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `buildRegister`, `registerCSV`, `bboxOf`, `CATEGORIES` from Task 2; `UNITS`, `getCamOverrides` from `../store.js`; `drawableCameras`, `applyOverrides` from `../lib/cameras.js`.
- Produces: `initRegister({ redraw })`, `paintRegister(svg)`, `registerOpen() → boolean`.

- [ ] **Step 1: Markup (index.html)**

After the `featType` select (line 106) add:

```html
        <button class="chip" id="regShow" title="Site register: stable asset IDs for units, parking zones and stalls, curb cuts, aisles and cameras. Highlight, isolate, focus, export">◫ Register</button>
```

Replace the plan card line (111) with:

```html
      <div class="card plan-card" id="planCard"><svg id="plan" viewBox="0 0 1480 990" role="img" aria-label="On The Boulevard site plan"></svg>
        <aside id="siteRegister" class="site-register" aria-label="Site register" hidden>
          <div class="sr-head"><h2>Site register</h2><span id="srCount" class="sr-muted"></span></div>
          <div id="srCats" class="sr-cats" role="group" aria-label="Highlight categories"></div>
          <label class="sr-toggle"><input type="checkbox" id="srIsolate"> Isolate highlighted</label>
          <label class="sr-toggle"><input type="checkbox" id="srLabels"> Show labels</label>
          <section id="srSel" class="sr-sel" aria-live="polite"><p class="sr-muted">Click a highlighted asset on the plan or pick one below.</p></section>
          <input id="srSearch" type="search" placeholder="Find F-12, stall-lot8-003, Driveway A…" autocomplete="off" aria-label="Find an asset">
          <div id="srList" class="sr-list"></div>
          <div class="sr-foot"><button id="srReset" class="chip">Reset view</button><button id="srCsv" class="chip">⤓ CSV</button><button id="srJson" class="chip">⤓ JSON</button></div>
          <details class="sr-basis"><summary>Basis &amp; limits</summary><p>Stalls are the recorded plat's per-zone counts subdivided evenly over the drawn rows. They are not field verified. The 10 Johnston CAD stalls stay pending until confirmed on the ground (legal 324 provided / ops 314). Unit rectangles are presentation geometry. IDs are positional and stable while the generator's row order holds; they are not physical tags. No condition or maintenance data is connected.</p></details>
        </aside></div>
```

- [ ] **Step 2: Create `src/views/plan-register.js`**

```js
/* A-1 site register — the column-twin treatment for the site plan: highlight by
   category, pick from plan or list, isolate, focus, labels, CSV/JSON export.
   Pure data lives in lib/siteassets.js; this module owns DOM + the top SVG layer. */
import geometry from "../data/geometry.json";
import cameraRegistry from "../data/cameras.json";
import furniture from "../data/site-furniture.json";
import { UNITS, getCamOverrides } from "../store.js";
import { drawableCameras, applyOverrides } from "../lib/cameras.js";
import { buildRegister, registerCSV, bboxOf, CATEGORIES } from "../lib/siteassets.js";
import { esc } from "../lib/format.js";
import { NS } from "../lib/svg.js";

const S = { open: false, cats: new Set(["zone"]), isolate: false, labels: false, sel: null, q: "" };
let reg = [], byId = new Map(), redraw = () => {};

function rebuild() {
  const cams = drawableCameras(applyOverrides(cameraRegistry.cameras, getCamOverrides()));
  const name = id => (UNITS.find(u => String(u.unit) === id) || {}).dba || "";
  reg = buildRegister(geometry, { cameras: cams, unitName: name, furniture });
  byId = new Map(reg.map(a => [a.id, a]));
}
export const registerOpen = () => S.open;

const lit = a => S.cats.has(a.cat) || (a.cat === "stall" && S.sel && byId.get(S.sel)?.children?.includes(a.id));

export function paintRegister(svg) {
  svg.classList.toggle("reg-isolate", S.open && S.isolate);
  if (!S.open) return;
  const layer = document.createElementNS(NS, "g");
  layer.setAttribute("class", "reg-layer");
  const sel = S.sel && byId.get(S.sel);
  const selSet = new Set(sel ? [sel.id, ...(sel.children || [])] : []);
  for (const a of reg) {
    if (!lit(a) && !selSet.has(a.id)) continue;
    const on = selSet.has(a.id);
    const shapes = a.point ? [circle(a.point)] : a.polys.map(poly);
    shapes.forEach(el => {
      el.setAttribute("class", "reg-shape" + (on ? " reg-on" : ""));
      el.dataset.id = a.id;
      el.addEventListener("click", e => { e.stopPropagation(); select(a.id); });
      const t = document.createElementNS(NS, "title"); t.textContent = a.label + " · " + a.id; el.appendChild(t);
      layer.appendChild(el);
    });
    if (S.labels && a.cat !== "stall" || S.labels && a.cat === "stall" && selSet.has(a.id)) layer.appendChild(label(a));
  }
  svg.appendChild(layer);
}
function poly(q) { const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", q.map(pt => pt.join(",")).join(" ")); return p; }
function circle([x, y]) { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 7); return c; }
function label(a) {
  const b = bboxOf(a), t = document.createElementNS(NS, "text");
  t.setAttribute("x", b.x + b.w / 2); t.setAttribute("y", b.y + b.h / 2 + 2);
  t.setAttribute("class", "reg-label"); t.textContent = a.cat === "stall" ? a.label.split("-").pop() : a.label.split(" — ")[0];
  return t;
}

function select(id) { S.sel = S.sel === id ? null : id; redraw(); renderPanel(); }
function focus(id) {
  const b = bboxOf(byId.get(id)), pad = Math.max(40, Math.max(b.w, b.h) * 0.6);
  const w = Math.max(160, b.w + pad * 2), h = w * (990 / 1480);
  document.getElementById("plan").setAttribute("viewBox",
    [b.x + b.w / 2 - w / 2, b.y + b.h / 2 - h / 2, w, h].map(n => Math.round(n)).join(" "));
}

function renderPanel() {
  if (!S.open) return;
  document.getElementById("srCats").innerHTML = CATEGORIES.map(([id, lab]) =>
    `<button class="chip${S.cats.has(id) ? " on" : ""}" data-cat="${id}" aria-pressed="${S.cats.has(id)}">${lab} <span class="sr-muted">${reg.filter(a => a.cat === id).length}</span></button>`).join("");
  const a = S.sel && byId.get(S.sel);
  document.getElementById("srSel").innerHTML = a
    ? `<h3>${esc(a.label)}</h3><p class="sr-muted">${esc(a.sub || "")}</p><dl>` +
      `<dt>Asset ID</dt><dd><code>${esc(a.id)}</code></dd><dt>Verification</dt><dd>${esc(a.status)}</dd>` +
      (a.count != null ? `<dt>Stalls</dt><dd>${a.count}</dd>` : "") +
      (a.parent ? `<dt>Zone</dt><dd><button class="linkish" data-pick="${a.parent}">${esc(byId.get(a.parent).label)}</button></dd>` : "") +
      `<dt>Source</dt><dd>${esc(a.source)}</dd></dl><button class="chip on" id="srFocus">Focus on this asset</button>`
    : `<p class="sr-muted">Click a highlighted asset on the plan or pick one below.</p>`;
  const q = S.q.trim().toLowerCase();
  const rows = reg.filter(x => q ? (x.label + " " + x.id + " " + (x.sub || "")).toLowerCase().includes(q)
    : x.cat !== "stall" || (a && (a.id === x.parent || a.parent === x.parent)));
  document.getElementById("srList").innerHTML = rows.slice(0, 400).map(x =>
    `<button class="sr-row${x.id === S.sel ? " on" : ""}${x.cat === "stall" ? " child" : ""}" data-pick="${x.id}">` +
    `<span>${esc(x.label)}</span><span class="sr-muted">${esc(x.cat)}${x.status === "cad-pending" ? " · pending" : ""}</span></button>`).join("") ||
    `<p class="sr-muted">No matching assets.</p>`;
  document.getElementById("srCount").textContent = reg.length + " assets";
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const el = Object.assign(document.createElement("a"), { href: url, download: name });
  el.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initRegister(opts) {
  redraw = opts.redraw;
  const panel = document.getElementById("siteRegister"), btn = document.getElementById("regShow");
  btn.addEventListener("click", () => {
    S.open = !S.open; btn.classList.toggle("on", S.open); panel.hidden = !S.open;
    document.getElementById("planCard").classList.toggle("with-register", S.open);
    if (S.open) rebuild(); redraw(); renderPanel();
  });
  panel.addEventListener("click", e => {
    const cat = e.target.closest("[data-cat]")?.dataset.cat;
    if (cat) { S.cats.has(cat) ? S.cats.delete(cat) : S.cats.add(cat); redraw(); renderPanel(); return; }
    const pick = e.target.closest("[data-pick]")?.dataset.pick;
    if (pick) { S.sel = pick; redraw(); focus(pick); renderPanel(); return; }
    if (e.target.id === "srFocus" && S.sel) focus(S.sel);
  });
  document.getElementById("srIsolate").addEventListener("change", e => { S.isolate = e.target.checked; redraw(); });
  document.getElementById("srLabels").addEventListener("change", e => { S.labels = e.target.checked; redraw(); });
  document.getElementById("srSearch").addEventListener("input", e => { S.q = e.target.value; renderPanel(); });
  document.getElementById("srReset").addEventListener("click", () => { S.sel = null; redraw(); renderPanel(); });
  const stamp = new Date().toISOString().slice(0, 10);
  document.getElementById("srCsv").addEventListener("click", () =>
    download(`OTB-site-register-${stamp}.csv`, registerCSV(reg), "text/csv"));
  document.getElementById("srJson").addEventListener("click", () =>
    download(`OTB-site-register-${stamp}.json`, JSON.stringify({ product: "Cypress Command Platform", property: "On The Boulevard",
      geometryRev: geometry.rev, units: "A-1 plan px (viewBox 0 0 1480 990)", generated: stamp, assets: reg }, null, 1), "application/json"));
}
```

Reset uses `redraw()`, and `drawPlan` restores the scope viewBox, which undoes any focus.

- [ ] **Step 3: Wire into `plan.js`**

Add the import after line 16:

```js
import { initRegister, paintRegister } from "./plan-register.js";
```

In `drawPlan`, as the last statement (after `paintCameras(g(svg, "cam-layer"));`):

```js
  paintRegister(svg); // A-1 site register highlight layer — always on top
```

At the end of `initPlan`:

```js
  initRegister({ redraw: drawPlan });
```

- [ ] **Step 4: Styles (append to `src/styles.css`)**

```css
/* A-1 site register (column-twin treatment) */
.plan-card.with-register { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
.site-register { display: flex; flex-direction: column; gap: 8px; font-size: 12px; max-height: 78vh; overflow: auto; }
.site-register h2 { font: 600 15px var(--display, "Big Shoulders Display"); letter-spacing: .04em; margin: 0; }
.sr-head { display: flex; justify-content: space-between; align-items: baseline; }
.sr-muted { color: #5F6E64; }
.sr-cats { display: flex; flex-wrap: wrap; gap: 4px; }
.sr-toggle { display: flex; gap: 6px; align-items: center; }
.sr-sel dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin: 6px 0; }
.sr-sel dt { color: #5F6E64; } .sr-sel dd { margin: 0; word-break: break-word; }
.sr-sel code { font-family: "IBM Plex Mono", monospace; font-size: 11px; }
.sr-list { display: flex; flex-direction: column; max-height: 36vh; overflow: auto; border-top: 1px solid #CDD2C2; }
.sr-row { display: flex; justify-content: space-between; gap: 8px; text-align: left; background: none; border: 0; border-bottom: 1px solid #E2E5D9; padding: 5px 4px; cursor: pointer; font: inherit; color: #1C2B26; }
.sr-row.child { padding-left: 16px; } .sr-row.on { background: #F2E6CC; }
.sr-row:focus-visible, .linkish:focus-visible { outline: 2px solid #A87E2F; outline-offset: 1px; }
.linkish { background: none; border: 0; padding: 0; color: #2F6B4F; text-decoration: underline; cursor: pointer; font: inherit; }
.sr-foot { display: flex; gap: 6px; flex-wrap: wrap; }
.reg-shape { fill: rgba(168, 126, 47, .28); stroke: #A87E2F; stroke-width: 1.2; cursor: pointer; }
.reg-shape.reg-on { fill: rgba(217, 119, 6, .45); stroke: #D97706; stroke-width: 2; }
.reg-label { font: 600 7px "IBM Plex Mono", monospace; fill: #1C2B26; text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: #F6F7F1; stroke-width: 2.5px; }
#plan.reg-isolate > g:not(.reg-layer) { opacity: .18; }
@media (max-width: 900px) { .plan-card.with-register { grid-template-columns: 1fr; } .site-register { max-height: none; } }
```

- [ ] **Step 5: Build + tests**

Run: `node --check src/views/plan-register.js && node --test && npm run build`
Expected: all tests pass, and the build finishes with no errors.

- [ ] **Step 6: Browser verification (preview_start the dev server)**

On A-1, check each of these:
1. `◫ Register` opens the panel. Zones highlight in brass.
2. Clicking the storefront zone on the plan selects it (amber). Its 56 stalls appear under it in the list and highlight.
3. Picking `SF-12` focuses the viewBox on that stall. **Reset view** restores the plan.
4. **Isolate** dims every other layer.
5. **Labels** shows zone and asset names.
6. Searching `pending` lists the 10 JC stalls.
7. The CSV has 1 header plus N rows.
8. At 390 px width the panel stacks below the plan.
9. The console has no errors.

Capture a screenshot for the operator.

- [ ] **Step 7: Commit**

```bash
git add src/views/plan-register.js src/views/plan.js index.html src/styles.css
git commit -m "Add the A-1 site register: highlight, pick, isolate, focus and export site assets"
```

---

### Task 4: Record it

**Files:**
- Modify: `HANDOFF.md` (add a dated entry: Stage 1 shipped, assetGeom contract, the Stage 2 plan pending)
- Create: `docs/site-register-2026-09.md` (asset ID scheme, status vocabulary, counts, limits: operator-facing basis note)

- [ ] **Step 1: Write both docs.** Content covers the ID scheme (`unit-*`, `zone-*`, `stall-<zone>-NNN`, `drive-*`, `aisle-*`, `cam-*`), the status vocabulary (`plat`, `plat-derived`, `est-geometric`, `cad-pending`, `cad`, `presentation`), the 314/324 rule, and the Stage 2 hand-off: the GLB node `extras.assetId` must reuse these IDs.
- [ ] **Step 2: Commit** `git commit -m "Document the A-1 site register asset ids and basis"`.

---

## Stage 2 (separate plan, after Stage 1 merges)

A portable `OTB_Site_Twin` package modeled on `OTB_Column_Twin`:
- GLB in meters, Y up. Building shells extruded to `heights.json` (with the "derived parapet association, not ceiling" caveat).
- Parking zones and stalls as ground-plane meshes; curb cuts, aisles, boundary and Lot 7 included.
- Every node's `extras.assetId` equals the Stage 1 IDs.
- Offline three.js inspector with overview, plan and eye-level views, plus `site-register.csv` and a conversion report.

**Visual target (operator reference):** `Style_I_would_like_to_get_the_center_to_look_like_for_marketing.png` is a clean presentation render: grey asphalt, white striping, landscaped islands, massed buildings with parapets and canopies. Materials come from the Sep 2026 drone set:
- white TPO roof with RTUs
- dark-shingle mansard canopy over the walkway
- tan/cream fascia and cream square columns
- white CMU rear walls
- the Jason's Deli hip-roof corner

The 39 operator columns (Task 2b) become the canopy supports. The **presentation look** is separate from the **measured record**: the render never alters register geometry.

Key open item for that plan: the plan-px → feet transform (unequal x/y scale). Stage 2 must convert through the generator's a/b-feet coordinates, not the px quads.

---

## Scope expansion — operator ruling 2026-09-24: "include all of it, placeholders for the ☐ items"

Source review of `G:\My Drive\00 OTB\01 Belle Files to be placed\` (Architecture + Center Infrastructure, ~120 files; `Combined.pdf` is a page-for-page duplicate of the other Center files). Stage 1 now registers **every** category below. Categories are grouped in the panel.

| Group | Category id | Source → data file | Build |
|---|---|---|---|
| Site | `parcel`, `building`, `unit` | plat / geometry REV 14 / units.json | generated |
| Site | `zone`, `stall` (314 + 10 pending) | assetGeom | generated (Task 1–2) |
| Site | `ada` (ADA stalls + loading pads) | Oct 2020 survey symbols | digitized |
| Site | `drive`, `aisle`, `island` | assetGeom (islands from REV 14 GREEN rects) | generated |
| Site | `walk` (4'/5' walks, covered walkway, breezeway) | Oct 2020 survey | digitized polylines |
| Site | `easement` (liquor line, 10' utility, electric 577566, guy) | geometry easements layer | generated |
| Site | `tree` + green-area figures | Greenspace 9201.0C (1990s) | digitized, status `historic-source` |
| Furniture | `column` (39), `bench`, `can` | 07 Columns, Benches, and Cans | digitized (colour-detected markers) |
| Utilities | `wmeter` (31), `emeter` (32 incl. 3 house) | Rev Belle Realty Arnould Blvd Property.xlsx → `src/data/meters.json` | data rows; point = its cluster |
| Utilities | `meter-cluster` (6), `shutoff` (13 clusters, per-cluster counts) | Water Shutoff Clusters.png | digitized (colour-detected circles) |
| Utilities | `transformer` (2), `pole` (Patricia service pole + primary) | Main.pdf E1.02 (2006) | digitized |
| Utilities | `lus` (public mains, hydrants, manholes/valves 2-2401, 6-3823, 6-3861, 8-1782, 6-3790, 2-2436) | LUS ArcMap captures 7/14/2021 | digitized, status `public-utility-context` |
| Utilities | `irrigation` (Hunter X-Core ×1) | manual only | **placeholder** |
| Systems | `rtu` (rooftop units / heat pumps, per unit; tonnage where scheduled) | tenant sets 113/105/111/149 + hvac.json | per-unit rows, position = unit centroid unless drawn |
| Systems | `ground-hp` (6) + `bollard` (3 pairs) | Crist 5/22/2007 A-1 | digitized |
| Systems | `panel` (per unit; Federal Pacific flagged) | Breaker Labeling photos + panel schedules | per-unit rows, status `photo-unlocated` where unit unknown |
| Systems | `timeclock` (Intermatic T101, 24 photographed; 111/135B/139 missing) | Unit Time Clocks | per-unit rows; missing ones listed as `no-photo` |
| Systems | `lighting` (canopy recessed / lantern post / wall bracket types) | Main E1.02 schedule | type rows; positions **placeholder** |
| Systems | `pylon` + 14 panels, `sign` (lantern post, fire-lane) | pylon.json, PA1.01 | generated / digitized |
| Systems | `fence` (2 × 6' wood), `freezer` (149 walk-in) | Oct 2020 survey | digitized |
| Systems | `firewall` (4-hr / 2-hr) | Main T1.02, 1996 site plan | digitized polylines |
| Systems | `camera` (17) | cameras.json | generated |
| Pins | every existing `📍` feature type | store features | read-only |
| **Placeholders (☐)** | `storm-drain`, `backflow`, `fdc-riser`, `grease-trap`, `dumpster`, `roof-drain`, `irrigation` | none (civil sheets C1.02–C1.05 cited in Main.pdf, not on file) | category shows "0 recorded — no source on file"; pins of the matching type fill it |

**Digitizing method (replaces Task 2b's hand transcription):** `tools/digitize-site-sources.py` detects coloured markers by HSV threshold + connected components (purple C / red B / black column tags on the 07 sheet; blue / red circles on the shut-off sheet, reading the count by the circle), fits a least-squares affine per sheet from ≥4 building-corner anchors to A-1 plan px, rejects fits with RMS > 6 px, and writes `src/data/site-register.json` `{ sources[], fits{sheet: residualPx}, items[] }`. Hand-read positions (transformers, heat pumps, fences, trees, LUS) are entered in the script's `MANUAL` table with their source sheet and pixel, so every point is reproducible. New placeholder pin types are appended to `FEATURE_TYPES` (backward-compatible).

**Flagged, not changed (locked facts hold):** 2006 Main T1.01 "324 req / 323 prov" and 2007 counts 339 (Lot 7 34, Lot 8 18) vs variance 324/344 and plat 32/19; survey suite total ≈62,807 SF (103 at pre-correction 3,051) vs 62,883; columns 39 (record) vs 37 (Codex) vs ~27 (2007 partial); **Federal Pacific panel** → separate safety item.
