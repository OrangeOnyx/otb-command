/* Guard for the T-1 renewal pipeline (src/lib/renewals.js): the notice-
   deadline grouping, blank-end suites parked as unresolved, Tier-1 dates
   winning over the abstract, and the display lines. */
import test from "node:test";
import assert from "node:assert/strict";
import { renewalRow, renewalPipeline, noticeLine, termLine, RENEWAL_GROUPS, NOTICE_WINDOW_DAYS } from "../src/lib/renewals.js";
import options from "../src/data/renewal-options.json" with { type: "json" };

const T = "2026-09-19";
const u = (unit, end, status = "active", extra = {}) => ({ unit, dba: "T " + unit, sf: 1000, monthly: 1000, status, end, ...extra });
const opt = { term: "3 years", noticeDays: 60, rentBasis: "Negotiated", confidence: "high" };

test("groups: window ≤ 90d to notice · passed · available · expired · unresolved · none", () => {
  assert.equal(NOTICE_WINDOW_DAYS, 90);
  assert.equal(renewalRow(u("111", "2027-01-31"), opt, T).group, "window");    // notice 2026-12-02 = 74d
  assert.equal(renewalRow(u("115", "2026-09-30"), opt, T).group, "passed");    // notice 2026-08-01 = -49d
  assert.equal(renewalRow(u("109", "2028-09-30"), opt, T).group, "available"); // notice 2028-08-01
  assert.equal(renewalRow(u("113", "2026-09-01"), opt, T).group, "expired");
  assert.equal(renewalRow(u("139", ""), opt, T).group, "unresolved");
  assert.equal(renewalRow(u("107", "2027-03-31"), undefined, T).group, "none");
  assert.equal(renewalRow(u("145", ""), undefined, T).group, "unresolved", "no end + no option still reads unresolved");
});

test("row math: noticeBy = end − noticeDays; day counts relative to today", () => {
  const r = renewalRow(u("111", "2027-01-31"), opt, T);
  assert.equal(r.noticeBy, "2026-12-02");
  assert.equal(r.daysToNotice, 74);
  assert.equal(r.daysToEnd, 134);
  const p = renewalRow(u("115", "2026-09-30"), opt, T);
  assert.equal(p.noticeBy, "2026-08-01");
  assert.equal(p.daysToNotice, -49);
});

test("an option without a notice period stays 'available' until the end passes", () => {
  const r = renewalRow(u("123", "2029-12-31"), { term: "3 × 5 years" }, T);
  assert.equal(r.group, "available");
  assert.equal(r.noticeBy, "");
  assert.equal(noticeLine(r), "Ends 2029-12-31 · 1199d");
});

test("pipeline orders groups per RENEWAL_GROUPS and rows soonest-notice first", () => {
  const p = renewalPipeline([
    u("109", "2028-09-30"), u("111", "2027-01-31"), u("101", "2027-02-28"), u("115", "2026-09-30"), u("117", "2026-09-30"),
    u("139", "", "active", { leaseEvidence: { label: "Renewal signed by tenant" } }), u("131", "", "vacant"), u("135B", "", "owner"),
  ], { 109: opt, 111: opt, 101: opt, 115: opt, 117: opt, 139: opt }, T);
  assert.deepEqual(p.groups.map(g => g.id), RENEWAL_GROUPS.map(g => g[0]));
  const by = Object.fromEntries(p.groups.map(g => [g.id, g.rows.map(r => r.unit)]));
  assert.deepEqual(by.window, ["111"]);
  assert.deepEqual(by.available, ["101", "109"]);
  assert.deepEqual(by.passed, ["115", "117"]);
  assert.deepEqual(by.unresolved, ["139"]);
  assert.equal(p.counts.total, 6, "vacant + owner bays are not leases");
  assert.equal(p.counts.window, 1);
  assert.equal(p.groups.find(g => g.id === "unresolved").rows[0].evidence, "Renewal signed by tenant");
});

test("display lines", () => {
  assert.equal(noticeLine(renewalRow(u("111", "2027-01-31"), opt, T)), "Notice by 2026-12-02 · 74d until notice");
  assert.equal(noticeLine(renewalRow(u("115", "2026-09-30"), opt, T)), "Notice by 2026-08-01 · 49d past deadline");
  assert.equal(noticeLine(renewalRow(u("113", "2026-09-01"), opt, T)), "Ended 2026-09-01 · 18d ago");
  assert.equal(noticeLine(renewalRow(u("139", ""), opt, T)), "No contractual end on the schedule");
  assert.equal(termLine(renewalRow(u("111", "2027-01-31"), opt, T)), "Lease ends 2027-01-31 · Option: 3 years · Notice: 60 days");
  assert.equal(termLine(renewalRow(u("139", ""), opt, T)), "Lease end not on the schedule · Option: 3 years · Notice: 60 days");
});

test("renewal-options.json: 24 abstracted suites, every notice parsed to 60 days, reference-only", () => {
  const units = Object.keys(options.units);
  assert.equal(units.length, 24);
  for (const k of units) {
    assert.equal(options.units[k].noticeDays, 60, k);
    assert.ok(options.units[k].term, k);
  }
  assert.ok(!("131" in options.units) && !("133" in options.units) && !("135B" in options.units));
  assert.match(options._comment, /REFERENCE ONLY/);
});
