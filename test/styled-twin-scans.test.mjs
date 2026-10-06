import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scanToStyled, scanNodePose } from "../src/lib/styled-twin-scans.js";
import { planToWorld } from "../src/lib/styled-twin-plan.js";

const scans = JSON.parse(readFileSync(new URL("../src/data/a8-scans.json", import.meta.url)));
const reg = JSON.parse(readFileSync(new URL("../src/data/site-register.json", import.meta.url))).items;

test("A-8 scan frame fit is tight (register items in both frames)", () => {
  assert.ok(scans.fit.n >= 100, "enough control points");
  assert.ok(scans.fit.rmsM < 0.1, `rms ${scans.fit.rmsM}`);
  assert.ok(Math.abs(scans.fit.scale - 1) < 0.03, "near-unit scale");
});

test("A-8 scan check points land on their register positions", () => {
  for (const c of scans.checks) {
    const [x, , z] = scanToStyled(c.glb, scans.fit);
    const [ex, ez] = planToWorld(reg.find(i => i.id === c.id).point);
    assert.ok(Math.hypot(x - ex, z - ez) < 0.5, `${c.id} off ${Math.hypot(x - ex, z - ez).toFixed(2)} m`);
  }
});

test("node pose reproduces scanToStyled (three.js yaw convention)", () => {
  const p = scanNodePose(scans.fit), [x, y, z] = [40, 11, -20];
  const c = Math.cos(p.rotationY), s = Math.sin(p.rotationY);
  const viaPose = [p.scale * (x * c + z * s) + p.position[0], p.scale * y + p.position[1], p.scale * (-x * s + z * c) + p.position[2]];
  scanToStyled([x, y, z], scans.fit).forEach((v, i) => assert.ok(Math.abs(v - viaPose[i]) < 1e-9));
});
