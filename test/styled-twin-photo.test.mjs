import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { splatToStyled, lensBToStyled } from "../src/lib/styled-twin-photo.js";
import { realityBoxes } from "../src/lib/splat-align.js";
import { planToWorld } from "../src/lib/styled-twin-plan.js";

const geometry = JSON.parse(readFileSync(new URL("../src/data/geometry.json", import.meta.url)));

test("A-8 Photo mode: each suite's Lens-B box centre lands on its A-8 plan-true centre", () => {
  const t = splatToStyled(geometry.units);
  const units = Object.entries(geometry.units).map(([unit, r]) => ({ unit, ...r }));
  const { boxes } = realityBoxes(units);
  for (const b of boxes) {
    const r = geometry.units[b.unit];
    const [ex, ez] = planToWorld([r.x + r.w / 2, r.y + r.h / 2]);
    const [x, , z] = lensBToStyled([b.x, 0, b.z], t);
    assert.ok(Math.hypot(x - ex, z - ez) < 0.01, `${b.unit} off by ${Math.hypot(x - ex, z - ez).toFixed(3)} m`);
  }
});

test("A-8 Photo mode: a 16.4 ft Lens-B box height is 16.4 ft (5.0 m) in A-8", () => {
  const t = splatToStyled(geometry.units);
  const { boxes } = realityBoxes([{ unit: "x", x: 0, y: 0, w: 10, h: 10, heightFt: 16.4 }]);
  const [, y] = lensBToStyled([0, boxes[0].h, 0], t);
  assert.ok(Math.abs(y - 16.4 * 0.3048) < 0.01, y);
});
