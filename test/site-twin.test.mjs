import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planToFeet, planToModel } from "../tools/site-twin/coords.mjs";

const geometry = JSON.parse(readFileSync(new URL("../src/data/geometry.json", import.meta.url), "utf8"));
const T = geometry.boundary.transform;

test("plan envelope corners map to the plat a/b range", () => {
  assert.deepEqual(planToFeet([T.envelope.xRight, T.envelope.yBottom], T).map(v => Math.round(v * 100) / 100), [-25, 0]);
  const [a, b] = planToFeet([T.envelope.xLeft, T.envelope.yTop], T);
  assert.ok(Math.abs(a - T.aRangeFt[1]) < 0.05 && Math.abs(b - T.bRangeFt[0]) < 0.05, `${a} ${b}`);
});

test("long building spans ~522 ft in model metres", () => {
  const U = geometry.units;
  const x0 = planToModel([U["101"].x, U["101"].y], 0, T)[0], x1 = planToModel([U["133"].x + U["133"].w, U["133"].y], 0, T)[0];
  assert.ok(Math.abs(Math.abs(x1 - x0) / 0.3048 - 522.3) < 3, String(Math.abs(x1 - x0) / 0.3048));
});

import { GltfBuilder, validateGlb } from "../tools/site-twin/glb.mjs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const loadGlb = buf => {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => new GLTFLoader().parse(ab, "", res, rej));
};

test("GLB round-trips through three's GLTFLoader with extras intact", async () => {
  const g = new GltfBuilder();
  const m = g.material("brass", { color: [0.66, 0.49, 0.18] });
  const me = g.mesh("tri", { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), indices: new Uint32Array([0, 2, 1]) }, m);
  const n = g.node({ name: "col-01", mesh: me, extras: { assetId: "col-01", category: "column" } });
  g.scene([g.node({ name: "columns", children: [n] })]);
  const buf = g.toGlb();
  const v = validateGlb(buf);
  assert.equal(v.ok, true, v.errors.join("; "));
  assert.equal(v.triangles, 1);
  const gltf = await loadGlb(buf);
  let found; gltf.scene.traverse(o => { if (o.userData?.assetId === "col-01") found = o; });
  assert.ok(found, "extras -> userData.assetId");
});

import { Geo, flatPolygon, prism, boxAt, ribbon, pipe, disc, canopy, tree, wall } from "../tools/site-twin/meshes.mjs";
import { SPEC } from "../tools/site-twin/categories.mjs";
import { CATEGORIES } from "../src/lib/siteassets.js";

const sane = g => {
  const t = g.typed();
  assert.equal(t.indices.length % 3, 0);
  assert.ok(t.positions.every(Number.isFinite) && t.normals.every(Number.isFinite));
  for (let i = 0; i < t.normals.length; i += 3) assert.ok(Math.abs(Math.hypot(t.normals[i], t.normals[i + 1], t.normals[i + 2]) - 1) < 1e-4);
  for (const i of t.indices) assert.ok(i < t.positions.length / 3);
  return t;
};

test("mesh primitives produce finite, indexed, unit-normal geometry", () => {
  const sq = [[0, 0], [4, 0], [4, 3], [0, 3]];
  assert.equal(sane(flatPolygon(new Geo(), sq, 0)).indices.length, 6);
  assert.equal(sane(prism(new Geo(), sq, 0, 2)).indices.length, 6 + 4 * 6);
  sane(boxAt(new Geo(), [1, 1], 1, 2, 3, 0.5, 0.3));
  sane(ribbon(new Geo(), [[0, 0], [5, 0], [5, 5]], 0.2, 0.01));
  sane(pipe(new Geo(), [[0, 0], [10, 0]], 0.25, -1.2));
  sane(wall(new Geo(), [[0, 0], [0, 6]], 0.3, 0, 5));
  sane(disc(new Geo(), [0, 0], 0.5, 0.02));
  sane(canopy(new Geo(), [[0, 3], [10, 3]], [[0, 0], [10, 0]], 3.05, 4.27));
  sane(tree(new Geo(), [0, 0], 3, 7));
});

test("flat polygons face up", () => {
  const t = flatPolygon(new Geo(), [[0, 0], [4, 0], [4, 3]], 0).typed();
  const [a, b, c] = [0, 1, 2].map(k => [...t.positions.slice(t.indices[k] * 3, t.indices[k] * 3 + 3)]);
  const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])];
  assert.ok(n[1] > 0, "winding agrees with +Y normal");
});

test("category spec covers every register category", () => {
  for (const [id] of CATEGORIES) assert.ok(SPEC[id], "missing spec for " + id);
});

import { buildTwin, samplePath } from "../tools/build-site-twin.mjs";

const twin = buildTwin();

test("twin GLB validates and every drawn asset node carries its register id", async () => {
  assert.equal(twin.report.validation.ok, true, twin.report.validation.errors.join("; "));
  const gltf = await loadGlb(twin.glb);
  const ids = new Set(); gltf.scene.traverse(o => { if (o.userData?.assetId) ids.add(o.userData.assetId); });
  const drawn = twin.data.assets.filter(a => !a.dataOnly).map(a => a.id);
  assert.deepEqual([...ids].sort(), [...drawn].sort());
  assert.equal(twin.data.assets.length, new Set(twin.data.assets.map(a => a.id)).size, "unique ids");
});

test("stalls 324 (10 cad-pending), columns 39, units 27 are nodes; data-only rows are not drawn", () => {
  const by = c => twin.data.assets.filter(a => a.category === c && !a.dataOnly);
  assert.equal(by("stall").length, 324);
  assert.equal(by("stall").filter(a => a.status === "cad-pending").length, 10);
  assert.equal(by("column").length, 39);
  assert.equal(by("unit").length, 27);
  for (const c of ["panel", "timeclock", "wmeter", "emeter", "zone", "building"]) assert.equal(by(c).length, 0, c);
  assert.equal(twin.data.walkTour.length, 39);
});

test("build is deterministic (byte-identical GLB)", () => {
  assert.ok(buildTwin().glb.equals(twin.glb));
});

test("samplePath handles the generator's M/L/A/Z paths", () => {
  const pts = samplePath("M 0 0 L 10 0 A 5 5 0 0 1 20 0 Z", 4);
  assert.equal(pts.length, 2 + 4);
  assert.deepEqual(pts.at(-1).map(v => Math.round(v * 1e6) / 1e6 + 0), [20, 0]);
});
