import { test } from "node:test";
import assert from "node:assert/strict";
import { isoPoint, prismFaces, facePath, depthKey, shade, isoBounds, FT_SCALE } from "../src/lib/iso.js";

test("isoPoint: origin maps to origin", () => {
  const p = isoPoint(0, 0, 0);
  assert.equal(p.x, 0);
  assert.equal(p.y, 0);
});

test("isoPoint: +x goes right and down, +y goes left and down", () => {
  const px = isoPoint(10, 0, 0);
  assert.ok(px.x > 0 && px.y > 0, "+x is right-down");
  const py = isoPoint(0, 10, 0);
  assert.ok(py.x < 0 && py.y > 0, "+y is left-down");
});

test("isoPoint: height raises the point (smaller y)", () => {
  const base = isoPoint(5, 5, 0);
  const top = isoPoint(5, 5, 20);
  assert.equal(top.y, base.y - 20);
});

test("prismFaces: returns top + two walls, each a 4-point quad, top raised by z", () => {
  const f = prismFaces({ x: 0, y: 0, w: 10, h: 10 }, 20);
  assert.equal(f.top.length, 4);
  assert.equal(f.right.length, 4);
  assert.equal(f.front.length, 4);
  const baseA = isoPoint(0, 0, 0);
  assert.equal(f.top[0].y, baseA.y - 20);
});

test("facePath: builds a closed path from points", () => {
  const d = facePath([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]);
  assert.match(d, /^M 0.00 0.00 L 1.00 0.00 L 1.00 1.00 Z$/);
});

test("depthKey: a nearer (larger x+y) rect sorts after a farther one", () => {
  const far = depthKey({ x: 0, y: 0, w: 10, h: 10 });
  const near = depthKey({ x: 100, y: 100, w: 10, h: 10 });
  assert.ok(near > far);
});

test("shade: darkens a hex toward black; passes through non-hex", () => {
  assert.equal(shade("#ffffff", 0), "#ffffff");
  assert.equal(shade("#ffffff", 1), "#000000");
  assert.equal(shade("url(#hatch)", 0.3), "url(#hatch)");
});

test("isoBounds: produces a padded box covering the massing", () => {
  const rects = [{ x: 0, y: 0, w: 10, h: 10 }];
  const b = isoBounds(rects, () => 20, 40);
  assert.ok(b.w > 0 && b.h > 0);
  assert.equal(typeof b.x, "number");
});

test("FT_SCALE is a positive constant", () => {
  assert.ok(FT_SCALE > 0);
});
