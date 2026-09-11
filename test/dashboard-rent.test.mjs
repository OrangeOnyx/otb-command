import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sumKnownAmounts } from "../src/lib/format.js";

test("D1 rent totals require complete financial values and preserve recorded zero", () => {
  const skeleton = JSON.parse(readFileSync(new URL("../src/data/units.public.json", import.meta.url), "utf8"));
  assert.equal(sumKnownAmounts(skeleton.map(unit => unit.monthly)), null, "public roster must not imply zero income");
  for (const missing of [undefined, null, "", NaN, Infinity]) {
    assert.equal(sumKnownAmounts([1200, missing, 0]), null, "partial source must not produce a rent total");
  }
  assert.equal(sumKnownAmounts([]), null);
  assert.equal(sumKnownAmounts([1200, 0, 850.25]), 2050.25);
  assert.equal(sumKnownAmounts([0, 0]), 0, "explicit recorded zeros remain valid");
});
