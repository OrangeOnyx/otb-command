/* Guard for register row #16 — K-1 document expiry (src/lib/docexpiry.js):
   the COI thresholds (30d critical / 60d expiring, via lib/coi.js — math
   reused, never duplicated) applied to every dated document record,
   expired-first ordering, horizon filter, malformed dates dropped, and the
   strip's display-line formats for unit vs property docs. */
import test from "node:test";
import assert from "node:assert/strict";
import { expiringDocs, expiryLine, isoDate } from "../src/lib/docexpiry.js";

const T = "2026-08-29"; // fixed today — all day counts below are relative to it
const doc = (id, expires, unit) => ({ id, name: "Doc " + id, expires, ...(unit ? { unit } : {}) });

test("expired documents sort first, then soonest", () => {
  const rows = expiringDocs([
    doc("a", "2026-09-25"),        // +27 critical
    doc("b", "2026-08-20"),        // -9 expired
    doc("c", "2026-09-05", "131"), // +7 critical
    doc("d", "2026-10-20")         // +52 expiring
  ], T);
  assert.deepEqual(rows.map(r => r.id), ["b", "c", "a", "d"]);
  assert.equal(rows[0].state, "expired");
  assert.equal(rows[0].days, -9);
  assert.equal(rows[1].unit, "131");
});

test("30/60 threshold states come straight from coiStatus", () => {
  const rows = expiringDocs([
    doc("crit", "2026-09-28"), // +30 → critical edge
    doc("exp1", "2026-09-29"), // +31 → expiring
    doc("exp2", "2026-10-28"), // +60 → expiring edge
    doc("ok", "2026-10-29")    // +61 → ok, excluded
  ], T);
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.equal(by.crit.state, "critical");
  assert.equal(by.crit.days, 30);
  assert.equal(by.exp1.state, "expiring");
  assert.equal(by.exp2.state, "expiring");
  assert.equal(by.exp2.days, 60);
  assert.equal(by.ok, undefined);
});

test("horizon filter drops far-out rows; expired always kept", () => {
  const rows = expiringDocs([
    doc("near", "2026-09-05"), // +7
    doc("far", "2026-10-20"),  // +52 — outside 30d horizon
    doc("old", "2026-01-01")   // long expired
  ], T, { horizonDays: 30 });
  assert.deepEqual(rows.map(r => r.id), ["old", "near"]);
});

test("malformed or missing expires are dropped silently", () => {
  const rows = expiringDocs([
    doc("x", "not-a-date"),
    doc("y", ""),
    doc("z", "2026-9-5"),           // not zero-padded → invalid
    { id: "w", name: "no field" }   // no expires at all
  ], T);
  assert.deepEqual(rows, []);
});

test("rows reuse the COI badge palette, minus the vendor prefix", () => {
  const rows = expiringDocs([doc("e", "2026-08-20"), doc("c", "2026-09-05"), doc("w", "2026-10-20")], T);
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.deepEqual([by.e.label, by.e.color], ["EXPIRED", "#C25E33"]);
  assert.deepEqual([by.c.label, by.c.color], ["7d", "#C25E33"]);
  assert.deepEqual([by.w.label, by.w.color], ["52d", "#C99A33"]);
});

test("expiryLine — unit doc, property doc, and expired phrasing", () => {
  assert.equal(
    expiryLine({ name: "Executed lease", unit: "131", state: "critical", days: 17, expires: "2026-09-15" }),
    "Executed lease — Unit 131 · expires 2026-09-15 (17d)");
  assert.equal(
    expiryLine({ name: "Church easement COI", state: "expiring", days: 52, expires: "2026-10-20" }),
    "Church easement COI · expires 2026-10-20 (52d)");
  assert.equal(
    expiryLine({ name: "Elevator permit", unit: "149", state: "expired", days: -9, expires: "2026-08-20" }),
    "Elevator permit — Unit 149 · expired 2026-08-20 (9d ago)");
});

test("isoDate renders a local-calendar YYYY-MM-DD, zero-padded", () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(isoDate(new Date(2026, 11, 31)), "2026-12-31");
});
