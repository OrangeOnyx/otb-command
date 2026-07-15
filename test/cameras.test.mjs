import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { drawableCameras, frustumPath, dwViewUrl, validateRegistry } from "../src/lib/cameras.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "src/data/cameras.json"), "utf8"));

test("registry carries the full 17-camera DW roster, no duplicates", () => {
  assert.equal(registry.cameras.length, 17);
  assert.deepEqual(validateRegistry(registry), []);
});

test("16 drawable exterior cameras; Server Cabinet stays interior-only", () => {
  const draw = drawableCameras(registry.cameras);
  assert.equal(draw.length, 16);
  assert.ok(!draw.some(c => c.id === "server-cabinet"));
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

test("registry excludes the four off-property 192.168.1.x cameras", () => {
  assert.equal(registry.excluded.length, 4);
  assert.ok(registry.cameras.every(c => c.ip.startsWith("10.10.10.")));
});
