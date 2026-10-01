import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { zoneColor, planToModel, polygonCentroid, isParkingIsland, registerPlacements, rectToModel, STYLED_PALETTE } from "../src/lib/styled-twin-placement.js";

const site = JSON.parse(readFileSync(new URL("../public/twin/site-context.json", import.meta.url)));
const register = JSON.parse(readFileSync(new URL("../src/data/site-register.json", import.meta.url)));
const M = site.registration.matrix3x2;

test("every paved surface renders as concrete, never blacktop (operator 2026-09-30)", () => {
  for (const kind of ["parking", "service"]) assert.equal(zoneColor(kind), STYLED_PALETTE.concrete);
  assert.equal(zoneColor("landscape"), STYLED_PALETTE.lawn);
});

test("plan registration reproduces the twin's own frame check", () => {
  const check = site.registration.frameChecks[0];
  const [x, z] = planToModel(check.planPoint, M);
  assert.ok(Math.abs(x - check.modelPointMeters[0]) < 0.01 && Math.abs(z - check.modelPointMeters[2]) < 0.01);
});

test("the eight parking-field islands are found for the twin-head poles", () => {
  const islands = site.zones.filter(isParkingIsland);
  assert.equal(islands.length, 8);
  for (const zone of islands) assert.ok(polygonCentroid(zone.polygonMeters).every(Number.isFinite));
});

test("register placements keep only items with a recorded point", () => {
  const placed = registerPlacements(register.items, M, ["tree", "bollard", "transformer", "meter-cluster", "lighting"]);
  assert.equal(placed.filter(p => p.cat === "tree").length, register.items.filter(i => i.cat === "tree" && i.point).length);
  assert.ok(placed.every(p => p.xz.every(Number.isFinite)));
  assert.equal(rectToModel({ x: 0, y: 0, w: 10, h: 10 }, M).length, 4);
});
