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
