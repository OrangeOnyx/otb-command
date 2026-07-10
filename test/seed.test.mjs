import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = p => JSON.parse(readFileSync(join(root, p), "utf8"));

const SENSITIVE = ["base", "total", "monthly", "legal", "notes"];

test("units.public.json carries NO sensitive fields", () => {
  const pub = rd("src/data/units.public.json");
  assert.ok(pub.length >= 27);
  for (const u of pub) for (const f of SENSITIVE) assert.ok(!(f in u), `${u.unit} leaks ${f}`);
});

test("public skeleton + private payload reconstructs the SOT units exactly", () => {
  const full = rd("src/data/units.json");
  const pub = rd("src/data/units.public.json");
  const seed = rd("api/_seed.json");
  const byUnitPub = Object.fromEntries(pub.map(u => [u.unit, u]));
  for (const orig of full) {
    const merged = { ...byUnitPub[orig.unit], ...seed.unitsPrivate[orig.unit] };
    assert.deepEqual(merged, orig, `unit ${orig.unit} round-trip mismatch`);
  }
});

test("_seed.json bundles the confidential collections", () => {
  const seed = rd("api/_seed.json");
  assert.ok(Object.keys(seed.contacts).length > 0, "tenant contacts present");
  assert.ok(seed.vendors.length >= 60, "vendor roster present");
  assert.ok(seed.leaseLinks && seed.floorplanLinks, "lease + floorplan links present");
});

