import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { drawableCameras, frustumPath, dwViewUrl, validateRegistry, applyOverrides } from "../src/lib/cameras.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "src/data/cameras.json"), "utf8"));

test("registry carries the full 17-camera DW roster, no duplicates", () => {
  assert.equal(registry.cameras.length, 17);
  assert.deepEqual(validateRegistry(registry), []);
});

test("all 17 cameras drawable — Server Cabinet is exterior (rear 101/103, operator-corrected 2026-07-16)", () => {
  const draw = drawableCameras(registry.cameras);
  assert.equal(draw.length, 17);
  assert.ok(draw.some(c => c.id === "server-cabinet"));
});

test("every drawable camera sits inside the A-1 main viewBox", () => {
  for (const c of drawableCameras(registry.cameras)) {
    assert.ok(c.pos.x >= 0 && c.pos.x <= 1480, c.id + " x out of viewBox");
    assert.ok(c.pos.y >= 0 && c.pos.y <= 990, c.id + " y out of viewBox");
  }
});

test("frustumPath: closed fan anchored at the mount, spanning the fov", () => {
  const cam = { pos: { x: 100, y: 200 }, aimDeg: 90, fovDeg: 100, rangePx: 150 };
  const d = frustumPath(cam);
  assert.match(d, /^M100 200 L/);
  assert.match(d, /Z$/);
  // fov 100° at step 10° → 11 arc points
  assert.equal(d.split(" L").length - 1, 11);
  // aim 90 (=+y, toward Arnould): every arc point lies below the mount
  const ys = [...d.matchAll(/L[\d.-]+ ([\d.-]+)/g)].map(m => +m[1]);
  for (const y of ys) assert.ok(y > 200, "arc point above mount for a south-aimed cone");
});

test("frustumPath is null for interior cameras (no pos)", () => {
  assert.equal(frustumPath({ pos: null }), null);
});

test("dwViewUrl deep-links into the Belle Reality cloud system", () => {
  const cam = registry.cameras.find(c => c.id === "suite-113-north");
  const url = dwViewUrl(cam, registry);
  assert.equal(url,
    "https://dwspectrum.digital-watchdog.com/systems/97bad7e3-923e-433b-b6ee-4caffcc1f7b7/view/a10d5ba5-697d-dd81-d0e7-1bc936263ab9");
});

test("applyOverrides: drag-corrections replace pos/aim and mark operator-set", () => {
  const out = applyOverrides(registry.cameras, { "suite-113-north": { x: 600, y: 280, aimDeg: 10 } });
  const c = out.find(c => c.id === "suite-113-north");
  assert.deepEqual(c.pos, { x: 600, y: 280 });
  assert.equal(c.aimDeg, 10);
  assert.equal(c.posConfidence, "operator-set");
  // untouched cameras pass through by reference (no churn)
  assert.equal(out.find(c => c.id === "suite-119-parking"), registry.cameras.find(c => c.id === "suite-119-parking"));
});

test("applyOverrides: aim-only override keeps the seeded position", () => {
  const seed = registry.cameras.find(c => c.id === "suite-131");
  const out = applyOverrides(registry.cameras, { "suite-131": { aimDeg: 120 } });
  const c = out.find(c => c.id === "suite-131");
  assert.deepEqual(c.pos, seed.pos);
  assert.equal(c.aimDeg, 120);
});

test("applyOverrides: interior cameras and empty overrides are untouched", () => {
  const interior = [{ id: "nvr-watch", interior: true, pos: null, aimDeg: null }];
  const out = applyOverrides(interior, { "nvr-watch": { x: 1, y: 1, aimDeg: 0 } });
  assert.equal(out[0].pos, null);
  assert.deepEqual(applyOverrides(registry.cameras), registry.cameras);
});

test("registry excludes the four off-property 192.168.1.x cameras", () => {
  assert.equal(registry.excluded.length, 4);
  assert.ok(registry.cameras.every(c => c.ip.startsWith("10.10.10.")));
});
