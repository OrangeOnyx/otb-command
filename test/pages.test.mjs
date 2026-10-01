import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES, PAGE_IDS, DEFAULT_PAGE, DEFAULT_OWNER_SHEETS } from "../src/lib/pages.js";

/* Regression guard for the ownerSheets drift bug: main.js rendered
   "Owners can see…" checkboxes for every sheet, but store.js kept its own
   whitelist that was missing spatial (A-2) and safe (S-1), so ticking them
   was a silent no-op — and owners could never see the Owner Safe. */

test("PAGES is the full 24-sheet nav in drawing-set order", () => {
  assert.deepEqual(PAGES.map(p => p[1]), [
    "D-0", "D-1", "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "R-1", "R-2", "C-1", "P-1", "S-1", "AI-1", "T-1", "W-1", "K-1", "B-1", "L-1", "N-1", "M-1", "O-1", "V-1"
  ]);
});

test("Boot lands on the D-1 dashboard (operator ruling 2026-09-11)", () => {
  assert.equal(DEFAULT_PAGE, "dash");
  assert.ok(PAGE_IDS.includes("dash"));
  assert.ok(PAGE_IDS.includes(DEFAULT_PAGE));
});

test("PAGE_IDS derives from PAGES — every nav sheet is owner-tickable", () => {
  assert.deepEqual(PAGE_IDS, PAGES.map(p => p[0]));
  assert.ok(PAGE_IDS.includes("spatial"), "A-2 Spatial must be whitelisted");
  assert.ok(PAGE_IDS.includes("safe"), "S-1 Owner Safe must be whitelisted");
});

test("page ids are unique", () => {
  assert.equal(new Set(PAGE_IDS).size, PAGE_IDS.length);
});

test("every PAGES row is [id, sheet, label] of non-empty strings", () => {
  for (const row of PAGES) {
    assert.equal(row.length, 3);
    for (const v of row) { assert.equal(typeof v, "string"); assert.ok(v.length); }
  }
});

test("owner defaults are valid sheet ids and include the Owner Safe", () => {
  for (const id of DEFAULT_OWNER_SHEETS) assert.ok(PAGE_IDS.includes(id), id);
  assert.ok(DEFAULT_OWNER_SHEETS.includes("safe"),
    "S-1 exists for owners (RLS already grants owner read) — default-visible");
});

test("A-5 can be granted to owners without changing owner defaults", () => {
  assert.ok(PAGE_IDS.includes("exterior"));
  assert.equal(DEFAULT_OWNER_SHEETS.includes("exterior"), false);
});

test("A-6 Asset Library is an operator sheet, not an owner default (operator ruling 2026-09-29)", () => {
  assert.ok(PAGE_IDS.includes("library"));
  assert.equal(DEFAULT_OWNER_SHEETS.includes("library"), false);
});

test("A-7 Visual Library is an operator sheet, not an owner default (operator ruling 2026-09-30)", () => {
  assert.ok(PAGE_IDS.includes("visuals"));
  assert.equal(DEFAULT_OWNER_SHEETS.includes("visuals"), false);
});
