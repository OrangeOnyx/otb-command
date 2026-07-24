import { test } from "node:test";
import assert from "node:assert/strict";
import { pageFromHash, hashFor, resolveRoute } from "../src/lib/router.js";
import { PAGE_IDS, VENDOR_SHEET, TENANT_SHEET } from "../src/lib/pages.js";

/* Carry-forward problem #5: no URL routing. The seam is pure — main.js wires
   hashchange/nav; these tests pin the id↔hash contract and role fallbacks. */

test("every sheet id round-trips through the hash", () => {
  for (const id of PAGE_IDS) {
    assert.equal(hashFor(id), "#" + id);
    assert.equal(pageFromHash(hashFor(id)), id);
  }
});

test("hash forms tolerated: bare, #, #/, mixed case", () => {
  assert.equal(pageFromHash("roll"), "roll");
  assert.equal(pageFromHash("#roll"), "roll");
  assert.equal(pageFromHash("#/roll"), "roll");
  assert.equal(pageFromHash("#ROLL"), "roll");
});

test("unknown/empty hashes resolve to null — never a guessed sheet", () => {
  for (const bad of ["", "#", "#nope", "#pg-dash", null, undefined, "#roll2"])
    assert.equal(pageFromHash(bad), null, String(bad));
  assert.equal(hashFor("nope"), "", "hashFor refuses non-sheet ids");
});

test("resolveRoute honors visibility and falls back to the first visible sheet", () => {
  assert.equal(resolveRoute("roll", PAGE_IDS), "roll");
  // owner deep-links an operator sheet → lands on their first visible sheet
  const ownerVis = ["dash", "plan", "roll", "fin", "safe"];
  assert.equal(resolveRoute("comp", ownerVis), "dash");
  assert.equal(resolveRoute(null, ownerVis), "dash");
  assert.equal(resolveRoute("dash", []), null, "no visible sheets → no navigation");
});

test("vendor and tenant lockdowns route to their single sheet", () => {
  assert.equal(resolveRoute("fin", [VENDOR_SHEET]), VENDOR_SHEET);
  assert.equal(resolveRoute("safe", [TENANT_SHEET]), TENANT_SHEET);
});
