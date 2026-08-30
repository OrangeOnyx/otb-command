/* Quarterly board report — pure half (src/lib/boardreport.js).
   Quarter math, model composition from stored owner-brief models (including
   honest gap reporting), and HTML escaping of hostile stored content. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { quarterOf, lastCompleteQuarter, boardReportModel, boardReportHTML } from "../src/lib/boardreport.js";

/* minimal stored-brief model, shaped like lib/brief.js buildBriefModel */
const brief = over => ({
  month: "2026-04",
  monthLabel: "April 2026",
  occupancyPct: 0.9,
  scheduledMonthly: 50000,
  vacants: [{ unit: "131", sf: 1200 }],
  holdovers: [],
  expirations: [{ unit: "105", dba: "Tenant A", end: "2026-11-30", sf: 1500, monthly: 2500 }],
  noi: 400000,
  actions: [{ lane: "now", title: "Chase 131 LOI", due: "" }],
  ...over,
});

test("quarterOf: month boundaries", () => {
  const q1 = quarterOf("2026-01");
  assert.equal(q1.label, "Q1 2026");
  assert.deepEqual(q1.months, ["2026-01", "2026-02", "2026-03"]);

  const q4 = quarterOf("2026-12");
  assert.equal(q4.label, "Q4 2026");
  assert.deepEqual(q4.months, ["2026-10", "2026-11", "2026-12"]);

  // mid-quarter month lands in the same quarter as its boundary months
  assert.equal(quarterOf("2026-05").label, "Q2 2026");
});

test("lastCompleteQuarter: previous quarter, across the year boundary", () => {
  const y = lastCompleteQuarter("2026-01");
  assert.equal(y.label, "Q4 2025");
  assert.deepEqual(y.months, ["2025-10", "2025-11", "2025-12"]);

  const q = lastCompleteQuarter("2026-08");
  assert.equal(q.label, "Q2 2026"); // Q3 has 2026-08 itself → not complete
  assert.deepEqual(q.months, ["2026-04", "2026-05", "2026-06"]);

  // last month of a quarter: that quarter is still not complete
  assert.equal(lastCompleteQuarter("2026-03").label, "Q4 2025");
  assert.equal(lastCompleteQuarter("2026-04").label, "Q1 2026");
});

test("boardReportModel: 2 of 3 briefs present — missing listed, sums honest", () => {
  const quarter = quarterOf("2026-04"); // Q2 2026
  const apr = brief({ month: "2026-04", occupancyPct: 0.88, noi: 100000, scheduledMonthly: 48000 });
  const jun = brief({ month: "2026-06", monthLabel: "June 2026", occupancyPct: 0.93, noi: 120000, scheduledMonthly: 52000 });
  const m = boardReportModel(quarter, { "2026-04": apr, "2026-06": jun });

  assert.equal(m.label, "Q2 2026");
  assert.equal(m.present, 2);
  assert.deepEqual(m.missing, ["2026-05"]);
  assert.equal(m.noiTotal, 220000); // sums only the two present
  assert.deepEqual(m.occupancyTrend, [0.88, 0.93]); // chronological order
  // latest-month fields come from June, not April
  assert.equal(m.scheduledMonthlyLatest, 52000);
  assert.deepEqual(m.expirationsAhead, jun.expirations);
  assert.deepEqual(m.vacantsLatest, jun.vacants);
  assert.deepEqual(m.holdoversLatest, jun.holdovers);
  // months keeps all three slots, gap explicit as null
  assert.deepEqual(m.months.map(x => [x.ym, !!x.model]), [["2026-04", true], ["2026-05", false], ["2026-06", true]]);
});

test("boardReportModel: no present noi → noiTotal null; empty quarter degrades", () => {
  const quarter = quarterOf("2026-04");
  const noNoi = boardReportModel(quarter, { "2026-04": brief({ noi: null }) });
  assert.equal(noNoi.noiTotal, null);

  const empty = boardReportModel(quarter, {});
  assert.equal(empty.present, 0);
  assert.deepEqual(empty.missing, quarter.months);
  assert.equal(empty.scheduledMonthlyLatest, null);
  assert.deepEqual(empty.occupancyTrend, []);
});

test("boardReportHTML: escapes hostile stored content, includes missing-months line", () => {
  const quarter = quarterOf("2026-04");
  const hostile = brief({
    month: "2026-04",
    monthLabel: '<script>alert("x")</script>',
    actions: [{ lane: "now", title: '<img src=x onerror=alert(1)>', due: "" }],
    expirations: [{ unit: "105", dba: '<b>"Bad" & Co</b>', end: "2026-11-30", sf: 1500, monthly: 2500 }],
  });
  const m = boardReportModel(quarter, { "2026-04": hostile });
  const html = boardReportHTML(m, { generatedISO: "2026-08-29" });

  assert.ok(!html.includes('<script>alert'), "hostile monthLabel must not land as live markup");
  assert.ok(html.includes("&lt;script&gt;"), "hostile monthLabel escaped");
  assert.ok(!html.includes("<img src=x"), "hostile action title escaped");
  assert.ok(html.includes("&lt;b&gt;&quot;Bad&quot; &amp; Co&lt;/b&gt;"), "hostile tenant dba escaped");

  assert.ok(html.includes("Months without a stored brief: 2026-05, 2026-06"), "explicit gap disclosure");
  assert.ok(html.includes("Board Report — Q2 2026"));
  assert.ok(html.includes("2026-08-29"), "generated date rendered");
  assert.ok(html.includes("figures carry their source months' as-of dates"), "provenance footer");
});

test("boardReportHTML: no missing line when the quarter is fully on file", () => {
  const quarter = quarterOf("2026-04");
  const m = boardReportModel(quarter, {
    "2026-04": brief({ month: "2026-04", occupancyPct: 0.9 }),
    "2026-05": brief({ month: "2026-05", monthLabel: "May 2026", occupancyPct: 0.91 }),
    "2026-06": brief({ month: "2026-06", monthLabel: "June 2026", occupancyPct: 0.95 }),
  });
  const html = boardReportHTML(m, { generatedISO: "2026-08-29" });
  assert.ok(!html.includes("Months without a stored brief"));
  assert.ok(html.includes("up from 90.0%"), "occupancy direction word precomputed (last vs first)");
});
