import test from "node:test";
import assert from "node:assert/strict";
import { expiryBucket, expiryMark, expiryLegend } from "../src/lib/roll.js";

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

test("expiryLegend mentions only non-empty buckets, with plural grammar", () => {
  assert.equal(expiryLegend(1, 2), "▲ 1 EXPIRES ≤6 MO · △ 2 IN 6–12 MO");
  assert.equal(expiryLegend(2, 0), "▲ 2 EXPIRE ≤6 MO");
  assert.equal(expiryLegend(0, 3), "△ 3 IN 6–12 MO");
  assert.equal(expiryLegend(0, 0), "");
});
