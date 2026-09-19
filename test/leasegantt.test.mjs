/* Guard for the T-1 lease Gantt model (src/lib/leasegantt.js): bucket edges,
   blank-end suites staying "unresolved" (never guessed), horizon clipping,
   tick placement and the sort order the sheet draws. */
import test from "node:test";
import assert from "node:assert/strict";
import { daysBetween, ganttBucket, ganttModel, ganttTicks, ganttSummary, daysChip, isLeased } from "../src/lib/leasegantt.js";

const T = "2026-09-19";
const u = (unit, end, status = "active", extra = {}) => ({ unit, dba: "T " + unit, sf: 1000, monthly: 1000, status, end, ...extra });

test("daysBetween counts calendar days and rejects malformed dates", () => {
  assert.equal(daysBetween(T, "2026-09-30"), 11);
  assert.equal(daysBetween(T, "2026-09-10"), -9);
  assert.equal(daysBetween(T, ""), null);
  assert.equal(daysBetween(T, "9/30/2026"), null);
});

test("bucket edges: <0 expired · ≤90 · ≤180 · beyond · null unresolved", () => {
  assert.equal(ganttBucket(-1), "expired");
  assert.equal(ganttBucket(0), "lt90");
  assert.equal(ganttBucket(90), "lt90");
  assert.equal(ganttBucket(91), "lt180");
  assert.equal(ganttBucket(180), "lt180");
  assert.equal(ganttBucket(181), "gt180");
  assert.equal(ganttBucket(null), "unresolved");
});

test("vacant and owner-occupied bays carry no bar", () => {
  assert.ok(isLeased(u("101", "2027-02-28")));
  assert.ok(isLeased(u("149", "2030-10-31", "anchor")));
  assert.ok(!isLeased(u("131", "", "vacant")));
  assert.ok(!isLeased(u("135B", "", "owner")));
});

test("model: blank end = unresolved with no bar, expired sits first, unresolved last", () => {
  const m = ganttModel([
    u("121", "2031-12-31"),
    u("139", "", "active", { leaseEvidence: { label: "Renewal signed by tenant — landlord signature pending" } }),
    u("115", "2026-09-30"),
    u("113", "2026-09-01"),
    u("131", "", "vacant"),
  ], T, { years: 4 });
  assert.deepEqual(m.rows.map(r => r.unit), ["113", "115", "121", "139"]);
  const r139 = m.rows.find(r => r.unit === "139");
  assert.equal(r139.bucket, "unresolved");
  assert.equal(r139.f, null);
  assert.equal(r139.end, "");
  assert.match(r139.evidence, /landlord signature pending/);
  const r113 = m.rows.find(r => r.unit === "113");
  assert.equal(r113.bucket, "expired");
  assert.equal(r113.f, 0);
  const r121 = m.rows.find(r => r.unit === "121");
  assert.equal(r121.bucket, "gt180");
  assert.equal(r121.f, 1, "beyond the horizon pins to the right edge");
  assert.equal(r121.clipped, true);
  assert.deepEqual(m.counts, { expired: 1, lt90: 1, lt180: 0, gt180: 1, unresolved: 1 });
});

test("bar fraction is days / horizon", () => {
  const m = ganttModel([u("115", "2026-09-30")], T, { years: 4 });
  assert.ok(Math.abs(m.rows[0].f - 11 / (4 * 365.25)) < 1e-9);
});

test("ticks: Jan carries the year, Jul reads 'Jul YYYY', all inside the horizon", () => {
  const ticks = ganttTicks(T, 2);
  assert.deepEqual(ticks.map(t => t.label), ["2027", "Jul 2027", "2028", "Jul 2028"]);
  assert.ok(ticks.every(t => t.f > 0 && t.f <= 1));
  assert.equal(ticks[0].major, true);
  assert.equal(ticks[1].major, false);
});

test("summary line and day chip", () => {
  assert.equal(ganttSummary({ expired: 0, lt90: 2, lt180: 4, gt180: 18, unresolved: 0 }), "6 expiring within 6 months · 0 past recorded end");
  assert.equal(ganttSummary({ expired: 1, lt90: 0, lt180: 0, gt180: 0, unresolved: 4 }), "0 expiring within 6 months · 1 past recorded end · 4 term unresolved");
  assert.equal(daysChip(12), "12d");
  assert.equal(daysChip(-9), "-9d");
  assert.equal(daysChip(null), "—");
});
