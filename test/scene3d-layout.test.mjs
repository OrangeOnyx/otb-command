import { test } from "node:test";
import assert from "node:assert/strict";
import { layout3d, WORLD, FT_WORLD } from "../src/lib/scene3d-layout.js";

const RECTS = [
  { unit: "A", x: 0, y: 0, w: 100, h: 100 },
  { unit: "B", x: 100, y: 0, w: 100, h: 100 },
];
const H = () => 16.4;

test("layout3d: one box per rect", () => {
  const { boxes } = layout3d(RECTS, H);
  assert.equal(boxes.length, 2);
});

test("layout3d: model is centered on origin (mean x,z ~ 0)", () => {
  const { boxes } = layout3d(RECTS, H);
  const mx = boxes.reduce((s, b) => s + b.x, 0) / boxes.length;
  const mz = boxes.reduce((s, b) => s + b.z, 0) / boxes.length;
  assert.ok(Math.abs(mx) < 1e-9, "centered in x");
  assert.ok(Math.abs(mz) < 1e-9, "centered in z");
});

test("layout3d: box footprint scales by WORLD, height by feet*FT_WORLD, y = h/2", () => {
  const { boxes } = layout3d(RECTS, () => 20);
  const b = boxes[0];
  assert.ok(Math.abs(b.w - 100 * WORLD) < 1e-9);
  assert.ok(Math.abs(b.d - 100 * WORLD) < 1e-9);
  assert.ok(Math.abs(b.h - 20 * FT_WORLD) < 1e-9);
  assert.ok(Math.abs(b.y - b.h / 2) < 1e-9, "box sits on the ground");
});

test("layout3d: taller feet -> taller box", () => {
  const tall = layout3d(RECTS, () => 30).boxes[0].h;
  const short = layout3d(RECTS, () => 10).boxes[0].h;
  assert.ok(tall > short);
});

test("layout3d: span is positive", () => {
  assert.ok(layout3d(RECTS, H).span > 0);
});

test("layout3d: carries the unit id through", () => {
  const { boxes } = layout3d(RECTS, H);
  assert.deepEqual(boxes.map(b => b.unit).sort(), ["A", "B"]);
});
