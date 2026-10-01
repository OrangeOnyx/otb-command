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
    assert.ok(p.point[0] > 300 && p.point[0] < 1131 && p.point[1] > 347 && p.point[1] < 662, `${p.id} outside the main field`);
  }
  const lot7 = lighting.doublePoles.find(p => p.lot === "lot-7").point;
  assert.ok(lot7[1] < 21, "Lot 7 pole must be across Marie Antoinette (y < 21)");
});

test("Lot 8 lights are mounted on the 135A/B wall that faces the lot", () => {
  assert.ok(lighting.wallPacks.length >= 2);
  for (const w of lighting.wallPacks) { assert.equal(w.point[1], 219.31); assert.ok(w.point[0] >= 1154.51 && w.point[0] <= 1310.94); }
});

test("every tenant with a logo has a sign-size logo file for the storefront fascia", () => {
  for (const u of logoUnits) assert.ok(existsSync(new URL(`../public/tenant-logos/sign/${u}.webp`, import.meta.url)), `missing sign logo ${u}`);
});
