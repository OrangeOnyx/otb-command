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

import { subdivideRow, buildRegister, registerCSV, bboxOf, stallStatus, CATEGORIES, categoryCounts } from "../src/lib/siteassets.js";

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

test("buildRegister: 27 units, 2 buildings, 2 parcels, 8 curb cuts, liquor line, cameras as points", () => {
  const reg = buildRegister(geometry, { cameras: [{ id: "x", name: "X", pos: { x: 10, y: 20 } }], unitName: id => "T" + id });
  const n = categoryCounts(reg);
  assert.equal(n.unit, 27); assert.equal(n.building, 2); assert.equal(n.parcel, 2); assert.equal(n.drive, 8);
  assert.ok(reg.find(a => a.id === "esmt-liquor-line").d.startsWith("M "));
  assert.equal(reg.find(a => a.id === "unit-135a").sub, "T135A");
  const cam = reg.find(a => a.id === "cam-x");
  assert.deepEqual(cam.point, [10, 20]);
  assert.deepEqual(bboxOf(cam), { x: -20, y: -10, w: 60, h: 60 });
});

test("unit-keyed items without a shape sit at the unit centroid; meters locate via cluster or unit", () => {
  const items = [{ id: "clu-x", cat: "meter-cluster", label: "Cluster", point: [5, 5], status: "digitized", source: "t" },
                 { id: "tc-101", cat: "timeclock", label: "Time clock 101", unit: "101", status: "photo", source: "t" },
                 { id: "tc-999", cat: "timeclock", label: "orphan", unit: "999", status: "photo", source: "t" }];
  const meters = [{ id: "wm-w1", kind: "wmeter", number: "W1", unit: "101", account: "a", cluster: "clu-x" },
                  { id: "em-e1", kind: "emeter", number: "E1", unit: "103", account: "b" }];
  const reg = buildRegister(geometry, { items, meters });
  const u = geometry.units["101"];
  assert.deepEqual(reg.find(a => a.id === "tc-101").point, [Math.round((u.x + u.w / 2) * 100) / 100, Math.round((u.y + u.h / 2) * 100) / 100]);
  assert.equal(reg.find(a => a.id === "tc-999").unlocated, true);
  assert.deepEqual(reg.find(a => a.id === "wm-w1").point, [5, 5]);
  assert.equal(reg.find(a => a.id === "wm-w1").parent, "clu-x");
  assert.equal(reg.find(a => a.id === "em-e1").located, "unit-centroid");
});

test("pins map into their register category; placeholders exist with zero records", () => {
  const reg = buildRegister(geometry, { pins: [{ id: "p1", type: "dumpster", x: 1, y: 2 }, { id: "p2", type: "monument", x: 3, y: 4 }] });
  assert.equal(reg.find(a => a.id === "pin-p1").cat, "dumpster");
  assert.equal(reg.find(a => a.id === "pin-p2").cat, "pin");
  const ph = CATEGORIES.filter(c => c[3]).map(c => c[0]);
  assert.deepEqual(ph, ["storm-drain", "backflow", "fdc-riser", "grease-trap", "dumpster", "roof-drain", "irrigation"]);
  assert.equal(categoryCounts(buildRegister(geometry))["storm-drain"], 0);
});

test("stallStatus: pending zone is cad-pending, storefront est-geometric, others plat-derived", () => {
  assert.equal(stallStatus({ id: "johnston-cad", pending: true }), "cad-pending");
  assert.equal(stallStatus({ id: "storefront" }), "est-geometric");
  assert.equal(stallStatus({ id: "lot8" }), "plat-derived");
});

test("registerCSV: header + one row per asset, quoted", () => {
  const reg = buildRegister(geometry);
  const lines = registerCSV(reg).trim().split("\n");
  assert.equal(lines[0], '"label","asset_id","category","group","parent","unit","status","center_x_px","center_y_px","count","source"');
  assert.equal(lines.length, reg.length + 1);
});

const siteReg = JSON.parse(readFileSync(join(root, "src/data/site-register.json"), "utf8"));
const meterDoc = JSON.parse(readFileSync(join(root, "src/data/meters.json"), "utf8"));

test("site-register: 39 operator-numbered columns, contiguous ids, 37 cross-linked to the Codex twin", () => {
  const cols = siteReg.items.filter(i => i.cat === "column");
  assert.deepEqual(cols.map(c => c.id), Array.from({ length: 39 }, (_, i) => "col-" + String(i + 1).padStart(2, "0")));
  assert.equal(cols.filter(c => c.codexAssetId).length, 37);
  assert.deepEqual(siteReg.fits["codex-crosslink"].operatorUnmatched, ["Column 1", "Column 2"]);
});

test("site-register: every sheet fit within its tier (6 px drawings, 10 px context)", () => {
  for (const s of siteReg.sources) assert.ok(s.rmsPx <= (s.maxRmsPx || siteReg.maxRmsPx), s.id + " rms " + s.rmsPx);
});

test("site-register: located points sit inside the A-1 full viewBox", () => {
  const [x0, y0, w, h] = geometry.viewBox.full.split(/\s+/).map(Number);
  for (const i of siteReg.items.filter(i => i.point))
    assert.ok(i.point[0] >= x0 && i.point[0] <= x0 + w && i.point[1] >= y0 && i.point[1] <= y0 + h, i.id + " " + i.point);
});

test("site-register: shut-off clusters total 37; meter-cluster counts vs workbook flag only 'Behind 131'", () => {
  const sh = siteReg.items.filter(i => i.cat === "shutoff");
  assert.equal(sh.length, 13);
  assert.equal(sh.reduce((s, i) => s + i.count, 0), 37);
  const wm = meterDoc.meters.filter(m => m.kind === "wmeter");
  const mismatched = siteReg.items.filter(i => i.cat === "meter-cluster")
    .filter(c => c.count !== wm.filter(m => m.cluster === c.id).length + (c.id === "mclu-119" ? 1 : 0)).map(c => c.id);
  assert.deepEqual(mismatched, ["mclu-131"]); // map shows 1, workbook lists 4 (123 '?' counted behind 119)
});

test("meters.json: 28 water + 28 electric, unique numbers", () => {
  assert.deepEqual(meterDoc.counts, { wmeter: 28, emeter: 28 });
  assert.equal(new Set(meterDoc.meters.map(m => m.id)).size, meterDoc.meters.length);
});

test("full register with all sources: unique ids", () => {
  const reg = buildRegister(geometry, { items: siteReg.items, meters: meterDoc.meters });
  assert.equal(new Set(reg.map(a => a.id)).size, reg.length);
});
