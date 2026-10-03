import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const lighting = load("../src/data/site-lighting.json");
const logoUnits = load("../src/data/logo-thumbs.json");

test("lighting inventory matches the operator's counts: 5 double poles in the main lot, 1 in Lot 7", () => {
  const poles = lighting.doublePoles;
  assert.equal(poles.filter(p => p.lot === "main").length, 5);
  assert.equal(poles.filter(p => p.lot === "lot-7").length, 1);
  assert.equal(poles.length, 6);
});

test("every light has a finite A-1 plan point, and the main-lot poles sit in the main field", () => {
  for (const p of [...lighting.doublePoles, ...lighting.wallPacks]) assert.ok(p.point.length === 2 && p.point.every(Number.isFinite), p.id);
  for (const p of lighting.doublePoles.filter(p => p.lot === "main")) {
    assert.ok(p.point[0] > 300 && p.point[0] < 1360 && p.point[1] > 347 && p.point[1] < 662, `${p.id} outside the main lot`);
  }
  const lot7 = lighting.doublePoles.find(p => p.lot === "lot-7").point;
  assert.ok(lot7[1] < 21, "Lot 7 pole must be across Marie Antoinette (y < 21)");
});

test("Lot 8: 4 building lights, 2 on each wall facing the lot (135A/B north wall, 133 east wall)", () => {
  const north = lighting.wallPacks.filter(w => w.face === "north"), east = lighting.wallPacks.filter(w => w.face === "east");
  assert.equal(north.length, 2); assert.equal(east.length, 2);
  for (const w of north) { assert.equal(w.point[1], 219.31); assert.ok(w.point[0] >= 1154.51 && w.point[0] <= 1310.94); }
  for (const w of east) { assert.ok(Math.abs(w.point[0] - 1127.8) < 1); assert.ok(w.point[1] > 131.35 && w.point[1] < 219.31); }
});

test("operator-marked field poles: 105/107 islands, the narrow islands, Jason's front corner; 2006 corner luminaire not drawn", () => {
  const pts = lighting.doublePoles.filter(p => p.lot === "main").map(p => p.point);
  assert.deepEqual(pts, [[385, 432], [385, 548], [913, 432], [913, 548], [1105, 612]]);
  assert.deepEqual(lighting.suppressRegister, ["light-pole-corner"]);
});

test("Lot 7 pole sits on the far edge, 3/4 across from the right", () => {
  const p = lighting.doublePoles.find(p => p.lot === "lot-7").point;
  assert.ok(p[1] < -240, "far edge (away from Marie Antoinette)");
  assert.ok(Math.abs(p[0] - (1360 - 0.75 * (1360 - 1174.85))) < 3);
});

test("corner columns 101 and 149 carry two fixtures; 135A/B have Lot 8 double doors", () => {
  assert.deepEqual(lighting.cornerColumns.map(c => c.column).sort(), ["col-07", "col-39"]);
  assert.deepEqual(lighting.lot8Doors.map(d => d.suite), ["135A", "135B"]);
});

test("every tenant with a logo has a sign-size logo file for the storefront fascia", () => {
  for (const u of logoUnits) assert.ok(existsSync(new URL(`../public/tenant-logos/sign/${u}.webp`, import.meta.url)), `missing sign logo ${u}`);
});

test("facade openings: Floorplanner doors/windows on every storefront face, rear service doors", () => {
  const f = load("../src/data/facade-openings.json"), n = face => f.openings.filter(o => o.face === face).length;
  assert.ok(n("long-front") >= 60 && n("short-front") >= 20 && n("long-rear") >= 15 && n("short-south") >= 5);
  for (const o of f.openings) assert.ok(o.widthFt > 0.5 && o.widthFt < 30 && Number.isFinite(o.along), o.id);
});

test("rooftop HVAC comes from the satellite base and sits on a roof", () => {
  const r = load("../src/data/roof-equipment.json"), units = load("../src/data/geometry.json").units;
  assert.ok(r.rtus >= 30 && r.fitMaxErrorM < 2);
  for (const it of r.items) { const u = units[it.unit]; assert.ok(u, it.point); assert.ok(it.point[0] >= u.x && it.point[0] <= u.x + u.w && it.point[1] >= u.y && it.point[1] <= u.y + u.h); }
});

test("service items stay off the buildings", () => {
  const units = Object.values(load("../src/data/geometry.json").units);
  for (const it of load("../src/data/site-service-items.json").items)
    assert.ok(!units.some(u => it.point[0] > u.x + 1 && it.point[0] < u.x + u.w - 1 && it.point[1] > u.y + 1 && it.point[1] < u.y + u.h - 1), it.id);
});

test("the rear roof ladder sits on the short building's Patricia face, in 145 by the 149 line (10/1 scan)", () => {
  const l = load("../src/data/site-service-items.json").items.find(i => i.kind === "roof-ladder");
  const u = load("../src/data/geometry.json").units["145"];
  assert.equal(l.point[0], u.x + u.w);
  assert.ok(l.point[1] > u.y && l.point[1] < u.y + u.h && u.y + u.h - l.point[1] < 6);
});

test("pylon face and glow map are built from the approved master", () => {
  for (const f of ["otb-pylon-face.webp", "otb-pylon-glow.webp"]) assert.ok(existsSync(new URL(`../public/pylon/${f}`, import.meta.url)), f);
});
