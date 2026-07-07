import { test } from "node:test";
import assert from "node:assert/strict";
import { SAFE_CATEGORIES, MAX_SAFE_BYTES, sanitizeName, safePath, displayName, categoryOf } from "../src/lib/safe.js";

test("safePath builds category/id__name and round-trips through displayName/categoryOf", () => {
  const p = safePath("tax", "s123", "2025 Return (final).pdf");
  assert.equal(p, "tax/s123__2025_Return_final_.pdf");
  assert.equal(categoryOf(p), "tax");
  assert.equal(displayName(p), "2025_Return_final_.pdf");
});

test("sanitizeName strips unsafe chars and caps length", () => {
  assert.equal(sanitizeName("a b/c\\d:e.pdf"), "a_b_c_d_e.pdf");
  assert.equal(sanitizeName("").length > 0, true);
  assert.ok(sanitizeName("x".repeat(200)).length <= 80);
});

test("displayName tolerates names containing double underscores", () => {
  assert.equal(displayName("leases/s1__my__file.pdf"), "my__file.pdf");
});

test("categories are the six vault sections; cap matches bucket", () => {
  assert.deepEqual(SAFE_CATEGORIES.map(c => c[0]), ["proforma", "leases", "tax", "insurance", "banking", "other"]);
  assert.equal(MAX_SAFE_BYTES, 25 * 1024 * 1024);
});
