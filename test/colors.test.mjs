/* Plan color modes (lib/colors.js) — SF lens added by the otb-ops harvest. */
import test from "node:test";
import assert from "node:assert/strict";
import { unitFill, legendFor, sfRamp, mix } from "../src/lib/colors.js";

test("sf lens colors by size regardless of status (vacants included)", () => {
  const small = unitFill({ unit: "133", status: "vacant", sf: 1272 }, "sf");
  const large = unitFill({ unit: "101", status: "active", sf: 6877 }, "sf");
  assert.notEqual(small, "url(#hatch)", "vacants get a size color, not the hatch");
  assert.notEqual(small, large);
  assert.equal(large, sfRamp((6877 - 1200) / (7000 - 1200)), "largest bay sits at the dark end of the ramp");
});

test("sf ramp clamps and interpolates between the palette endpoints", () => {
  assert.equal(sfRamp(-1), sfRamp(0));
  assert.equal(sfRamp(2), sfRamp(1));
  assert.equal(sfRamp(0), mix("#DCE0D3", "#1E4F3C", 0));
  assert.equal(sfRamp(1), mix("#DCE0D3", "#1E4F3C", 1));
});

test("sf legend exists and other legends still stand", () => {
  const sf = legendFor("sf");
  assert.equal(sf.length, 3);
  assert.ok(sf[0][0].includes("1,272"));
  assert.ok(legendFor("status").length >= 5);
  assert.ok(legendFor("expiry").length >= 4);
});

test("unit with no sf falls back to slate", () => {
  assert.equal(unitFill({ unit: "x", status: "active" }, "sf"), "#5F6E64");
});
