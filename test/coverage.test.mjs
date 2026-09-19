/* Guard for the C-1 document coverage model (src/lib/coverage.js): the two
   evidence sources (document records + matrix states), COI expiry states via
   lib/coi.js thresholds, the filters and the summary counts. */
import test from "node:test";
import assert from "node:assert/strict";
import { coverageRow, coverageRows, filterCoverage, coiExpiryText, COVERAGE_FILTERS } from "../src/lib/coverage.js";

const T = "2026-09-19";
const u = (unit, status = "active") => ({ unit, dba: "T " + unit, status });
const lease = link => ({ id: "l", type: "Lease", name: "Executed lease", link });
const coi = (link, expires) => ({ id: "c", type: "Certificate of insurance", name: "COI", link, expires });

test("lease: attached file OR matrix 'On file' covers; matrix flag always shows as flagged", () => {
  assert.equal(coverageRow(u("101"), [lease("doc://x")], {}, T).lease, "ok");
  assert.equal(coverageRow(u("101"), [lease("")], { lease: "ok" }, T).lease, "ok");
  assert.equal(coverageRow(u("101"), [lease("")], { lease: "u" }, T).lease, "missing");
  assert.equal(coverageRow(u("101"), [lease("doc://x")], { lease: "flag" }, T).lease, "flag");
  assert.equal(coverageRow(u("135B", "owner"), [], { lease: "na" }, T).lease, "na");
});

test("COI: expiry drives ok / soon / lapsed once evidence exists", () => {
  assert.equal(coverageRow(u("129"), [coi("doc://c", "2027-05-01")], {}, T).coi, "ok");
  assert.equal(coverageRow(u("129"), [coi("doc://c", "2026-10-30")], {}, T).coi, "soon");     // 41d → expiring
  assert.equal(coverageRow(u("129"), [coi("doc://c", "2026-08-01")], {}, T).coi, "lapsed");
  assert.equal(coverageRow(u("129"), [coi("", "2026-08-01")], {}, T).coi, "lapsed", "a dated record without a file still counts as evidence");
  assert.equal(coverageRow(u("129"), [], { coi: "ok" }, T).coi, "ok");
  assert.equal(coverageRow(u("129"), [], { coi: "u" }, T).coi, "missing");
  assert.equal(coverageRow(u("129"), [coi("doc://c", "2027-05-01")], { coi: "flag" }, T).coi, "flag");
});

test("other docs count excludes lease and COI records; gap flag", () => {
  const r = coverageRow(u("123"), [lease("doc://l"), coi("doc://c", "2027-01-01"), { type: "Floor plan", name: "Plan", link: "x" }, { type: "Sign drawing", name: "Sign", link: "" }], {}, T);
  assert.equal(r.other, 2);
  assert.equal(r.gap, false);
  assert.equal(coverageRow(u("123"), [lease("doc://l")], {}, T).gap, true);
  assert.equal(coverageRow(u("123"), [lease("doc://l"), coi("doc://c", "2026-10-30")], {}, T).gap, true, "COI expiring soon is a gap");
});

test("rows skip vacant bays; summary counts", () => {
  const docs = { 101: [lease("doc://l"), coi("doc://c", "2027-05-01")], 115: [lease("")], 129: [coi("doc://c", "2026-08-01")] };
  const comp = { 129: { lease: "ok" } };
  const { rows, summary } = coverageRows([u("101"), u("115"), u("129"), u("131", "vacant")], k => docs[k] || [], k => comp[k], T);
  assert.deepEqual(rows.map(r => r.unit), ["101", "115", "129"]);
  assert.deepEqual(summary, { total: 3, missingLease: 1, missingCoi: 1, coiLapsedSoon: 1, gaps: 2, complete: 1 });
  assert.deepEqual(filterCoverage(rows, "gaps").map(r => r.unit), ["115", "129"]);
  assert.deepEqual(filterCoverage(rows, "nolease").map(r => r.unit), ["115"]);
  assert.deepEqual(filterCoverage(rows, "nocoi").map(r => r.unit), ["115"]);
  assert.deepEqual(filterCoverage(rows, "lapsed").map(r => r.unit), ["129"]);
  assert.deepEqual(filterCoverage(rows, "complete").map(r => r.unit), ["101"]);
  assert.equal(filterCoverage(rows, "all").length, 3);
  assert.deepEqual(COVERAGE_FILTERS.map(f => f[0]), ["gaps", "nolease", "nocoi", "lapsed", "complete", "all"]);
});

test("COI expiry text", () => {
  assert.equal(coiExpiryText(coverageRow(u("1"), [coi("x", "2026-10-30")], {}, T)), "2026-10-30 (41d)");
  assert.equal(coiExpiryText(coverageRow(u("1"), [coi("x", "2026-08-01")], {}, T)), "2026-08-01 (lapsed 49d)");
  assert.equal(coiExpiryText(coverageRow(u("1"), [], {}, T)), "—");
});
