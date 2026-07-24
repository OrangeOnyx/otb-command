import test from "node:test";
import assert from "node:assert/strict";
import { expiryBucket, expiryMark, expiryLegend, fitZoom } from "../src/lib/roll.js";

test("expiryBucket boundaries", () => {
  assert.equal(expiryBucket(2), "exp6");
  assert.equal(expiryBucket(6), "exp6");        // exactly 6 → near bucket
  assert.equal(expiryBucket(6.1), "exp12");
  assert.equal(expiryBucket(12), "exp12");      // exactly 12 → watch bucket
  assert.equal(expiryBucket(12.1), null);
  assert.equal(expiryBucket(48), null);
  assert.equal(expiryBucket(-3), "exp6");       // already past → most urgent
});

test("expiryBucket rejects non-numbers (vacant / no term end)", () => {
  assert.equal(expiryBucket(null), null);
  assert.equal(expiryBucket(undefined), null);
  assert.equal(expiryBucket(NaN), null);
  assert.equal(expiryBucket("6"), null);
});

test("expiryMark glyphs", () => {
  assert.equal(expiryMark("exp6"), "▲");
  assert.equal(expiryMark("exp12"), "△");
  assert.equal(expiryMark(null), "");
});

test("fitZoom: never inflates, floors at .5, stable rounding, safe on junk", () => {
  assert.equal(fitZoom(653, 706), 1);          // fits → untouched
  assert.equal(fitZoom(706, 706), 1);          // exact fit
  assert.equal(fitZoom(800, 706), 0.883);      // overflow → measured shrink
  assert.equal(fitZoom(3000, 706), 0.5);       // floor
  assert.equal(fitZoom(0, 706), 1);            // junk in → no-op out
  assert.equal(fitZoom(700, 0), 1);
  assert.equal(fitZoom(null, 706), 1);
});

test("expiryLegend mentions only non-empty buckets, with plural grammar", () => {
  assert.equal(expiryLegend(1, 2), "▲ 1 EXPIRES ≤6 MO · △ 2 IN 6–12 MO");
  assert.equal(expiryLegend(2, 0), "▲ 2 EXPIRE ≤6 MO");
  assert.equal(expiryLegend(0, 3), "△ 3 IN 6–12 MO");
  assert.equal(expiryLegend(0, 0), "");
});
