import test from "node:test";
import assert from "node:assert/strict";
import { qMul, qRotate, qFromAxisAngle, qBetween, levelQuat, applyAlign, composeAlign, realityBoxes, TRUE_FT_WORLD } from "../src/lib/splat-align.js";
import { WORLD, FT_WORLD } from "../src/lib/scene3d-layout.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " !~ " + b);
const vClose = (a, b, eps = 1e-9) => a.forEach((v, i) => close(v, b[i], eps));

test("qFromAxisAngle: 90° about Y maps +X to -Z", () => {
  const q = qFromAxisAngle([0, 1, 0], Math.PI / 2);
  vClose(qRotate(q, [1, 0, 0]), [0, 0, -1], 1e-12);
  vClose(qRotate(q, [0, 0, 1]), [1, 0, 0], 1e-12);
});

test("qMul composes rotations right-to-left", () => {
  const yaw90 = qFromAxisAngle([0, 1, 0], Math.PI / 2);
  const roll90 = qFromAxisAngle([1, 0, 0], Math.PI / 2);
  // apply roll first, then yaw
  const q = qMul(yaw90, roll90);
  vClose(qRotate(q, [0, 1, 0]), qRotate(yaw90, qRotate(roll90, [0, 1, 0])), 1e-12);
});

test("qBetween handles generic, identical and opposite vectors", () => {
  vClose(qRotate(qBetween([1, 0, 0], [0, 1, 0]), [1, 0, 0]), [0, 1, 0], 1e-12);
  vClose(qBetween([0, 1, 0], [0, 1, 0]), [0, 0, 0, 1]);
  const q = qBetween([0, 1, 0], [0, -1, 0]); // 180°
  vClose(qRotate(q, [0, 1, 0]), [0, -1, 0], 1e-9);
});

test("levelQuat maps a tilted Y-down normal onto +Y", () => {
  // COLMAP-ish: gravity up ≈ -Y with a few degrees of tilt
  const n = [0.05, -0.99, 0.08];
  const len = Math.hypot(...n);
  const up = qRotate(levelQuat(n), n.map(c => c / len));
  vClose(up, [0, 1, 0], 1e-9);
});

test("applyAlign = scale·rotate + translate", () => {
  const align = { quaternion: qFromAxisAngle([0, 1, 0], Math.PI), scale: 2, position: [10, 1, -5] };
  vClose(applyAlign(align, [1, 0, 0]), [8, 1, -5], 1e-9);
  vClose(applyAlign(align, [0, 3, 0]), [10, 7, -5], 1e-9);
});

test("composeAlign applies level first, yaw second", () => {
  const lq = levelQuat([0, -1, 0]);             // flip Y-down world upright
  const a = composeAlign(lq, Math.PI / 2, 1, [0, 0, 0]);
  // splat-frame vertical (0,-1,0) must land on +Y regardless of yaw
  vClose(qRotate(a.quaternion, [0, -1, 0]), [0, 1, 0], 1e-9);
});

test("realityBoxes uses true-proportion heights (no Lens-B exaggeration)", () => {
  const units = [{ unit: "101", x: 0, y: 0, w: 100, h: 50, heightFt: 16.4 }];
  const { boxes } = realityBoxes(units);
  close(boxes[0].h, 16.4 * TRUE_FT_WORLD, 1e-12);
  assert.ok(TRUE_FT_WORLD < FT_WORLD);             // flatter than Lens B
  close(boxes[0].w, 100 * WORLD, 1e-12);           // plan scale unchanged
  close(boxes[0].y, boxes[0].h / 2, 1e-12);        // rests on ground
});
