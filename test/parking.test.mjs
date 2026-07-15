import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { splitParkingLayer, isHeadOn, storefrontStalls, zoneTotal } from "../src/lib/parking.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(join(root, "src/data/geometry.json"), "utf8"));
const prims = geometry.layers.parking;

test("storefront row is head-on: 57 ticks (56 stalls), all perpendicular", () => {
  const row = storefrontStalls(prims);
  assert.equal(row.length, 57, "plat says '56 SPACES' → 57 tick lines");
  for (const l of row) assert.ok(isHeadOn(l), `stall tick at x=${l.x1} still angled`);
});

test("main-field herringbone stays angled (plat-exact, do not straighten)", () => {
  const { stalls } = splitParkingLayer(prims);
  const field = stalls.filter(l => (l.y1 + l.y2) / 2 > 390 && l.x1 !== l.x2);
  assert.ok(field.length >= 80, `main-field angled stalls expected ≥80, got ${field.length}`);
});

test("zone striping counts still sum to the plat total (314)", () => {
  assert.equal(zoneTotal(geometry.parking.zones), geometry.parking.totalPlat);
  assert.equal(geometry.parking.totalPlat, 314);
});

test("splitParkingLayer partitions every primitive", () => {
  const { paving, stalls, labels } = splitParkingLayer(prims);
  assert.equal(paving.length + stalls.length + labels.length, prims.length);
});
