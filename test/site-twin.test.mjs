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
