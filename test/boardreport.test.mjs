/* Quarterly board report — pure half (src/lib/boardreport.js).
   Quarter math, model composition from stored owner-brief models (including
   honest gap reporting), and HTML escaping of hostile stored content. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { quarterOf, lastCompleteQuarter, boardReportModel, boardReportHTML, AUDIENCES, assertAudience } from "../src/lib/boardreport.js";
import { OO_CSS } from "../src/lib/docbrand.js";

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

/* ── F-3: audience variants (board · lender · stakeholder) ─────── */

const fullQuarter = () => boardReportModel(quarterOf("2026-04"), {
  "2026-04": brief({ month: "2026-04", occupancyPct: 0.9 }),
  "2026-05": brief({ month: "2026-05", monthLabel: "May 2026", occupancyPct: 0.91 }),
  "2026-06": brief({ month: "2026-06", monthLabel: "June 2026", occupancyPct: 0.95, capValue: 5000000, capRatePct: 8,
    unitCount: 27, occupiedUnits: 25, totalSf: 62000, occupiedSf: 58900, scheduledAnnual: 600000 }),
});

test("AUDIENCES + assertAudience: the three variants, unknown throws", () => {
  assert.deepEqual(AUDIENCES, ["board", "lender", "stakeholder"]);
  for (const a of AUDIENCES) assert.equal(assertAudience(a), a);
  assert.throws(() => assertAudience("investor"), /unknown report audience/);
  assert.throws(() => assertAudience(""), /unknown report audience/);
  assert.throws(() => boardReportModel(quarterOf("2026-04"), {}, { audience: "press" }), /unknown report audience/);
});

test("boardReportModel: audience defaults to board; latest-month extras surface", () => {
  const m = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() });
  assert.equal(m.audience, "board");
  assert.equal(m.collections, null);

  const full = fullQuarter();
  assert.equal(full.capValueLatest, 5000000);
  assert.equal(full.capRatePctLatest, 8);
  assert.deepEqual(full.actionsLatest, [{ lane: "now", title: "Chase 131 LOI", due: "" }]);
  assert.deepEqual(full.rentRollLatest, { unitCount: 27, occupiedUnits: 25, totalSf: 62000, occupiedSf: 58900, scheduledMonthly: 50000, scheduledAnnual: 600000 });

  // no cap value stored → null, never 0
  const bare = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() });
  assert.equal(bare.capValueLatest, null);
  assert.equal(boardReportModel(quarterOf("2026-04"), {}).rentRollLatest, null);
});

test("boardReportModel: lender extras fold collections + aging; absent stays null", () => {
  const payStats = {
    "105": { unit: "105", months: 12, paid: 10, late: 2, partial: 0, unpaid: 0, totalPaid: 30000, lateFees: 200 },
    "107": { unit: "107", months: 12, paid: 12, late: 0, partial: 0, unpaid: 0, totalPaid: 24000, lateFees: 0 },
  };
  const aging = {
    "105": { current: 2500, d31_60: 0, d61_90: 0, d90: 1000, credit: 0, total: 3500 },
    "109": { current: 0, d31_60: 0, d61_90: 0, d90: 0, credit: -200, total: -200 },
  };
  const m = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience: "lender", extras: { payStats, aging } });
  assert.equal(m.audience, "lender");
  assert.deepEqual(m.collections.pay, { units: 2, months: 24, paid: 22, late: 2, partial: 0, unpaid: 0, totalPaid: 54000, lateFees: 200, cleanRate: 22 / 24 });
  assert.deepEqual(m.collections.aging, { units: 2, current: 2500, d31_60: 0, d61_90: 0, d90: 1000, credit: -200, total: 3300 });

  const onlyPay = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience: "lender", extras: { payStats } });
  assert.deepEqual(onlyPay.collections.aging, null);
  assert.equal(onlyPay.collections.pay.units, 2);

  const none = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience: "lender" });
  assert.deepEqual(none.collections, { pay: null, aging: null });
});

test("boardReportHTML: board output is unchanged by the variant work", () => {
  const html = boardReportHTML(fullQuarter(), { generatedISO: "2026-08-29" });
  assert.ok(html.includes("<title>Board Report — Q2 2026</title>"));
  assert.ok(html.includes("QUARTERLY BOARD REPORT"));
  assert.ok(html.includes("<h2>Month by Month</h2>"));
  assert.ok(html.includes("<h2>Leasing Position (Latest Month on File)</h2>"));
  assert.ok(html.includes("<h2>Lease Expirations Ahead</h2>"));
  assert.ok(html.includes("Composed from 3 of 3 monthly Owner Intelligence Briefs"));
  assert.ok(!html.includes("Debt service"), "board carries no lender block");
  assert.ok(!html.includes("Distributions"), "board carries no stakeholder block");
  assert.ok(!html.includes("Collections"), "board carries no collections block");
});

test("boardReportHTML: lender variant — title, blocks, not-on-file lines, no invented numbers", () => {
  const quarter = quarterOf("2026-04");
  const m = boardReportModel(quarter, { "2026-04": brief({ noi: 100000 }) }, { audience: "lender" });
  const html = boardReportHTML(m, { generatedISO: "2026-08-29" });

  assert.ok(html.includes("<title>Lender Report — Q2 2026</title>"));
  assert.ok(html.includes("<h1>Lender Report — Q2 2026</h1>"));
  assert.ok(html.includes("QUARTERLY LENDER REPORT"));
  assert.ok(html.includes("<h2>Occupancy Trend</h2>"));
  assert.ok(html.includes("<h2>Rent Roll Totals"));
  assert.ok(html.includes("<h2>Lease Expirations — Next 24 Months</h2>"));
  assert.ok(html.includes("12-month horizon"), "24-month window discloses the stored 12-month horizon");
  assert.ok(html.includes("<h2>Collections</h2>"));
  assert.ok(html.includes("Collections history: not on file for this quarter"));
  assert.ok(html.includes("<h2>Debt Service</h2>"));
  assert.ok(html.includes("Debt service and covenant data are not on file in Cypress Command."));
  // provenance + gap disclosure survive
  assert.ok(html.includes("Months without a stored brief: 2026-05, 2026-06"));
  assert.ok(html.includes("Composed from 1 of 3 monthly Owner Intelligence Briefs"));
  assert.ok(html.includes("figures carry their source months' as-of dates"));
  // KPI tiles
  assert.ok(html.includes("Occupancy — quarter end"));
  assert.ok(html.includes("Indicative NOI — quarter total"));
  assert.ok(html.includes("$100,000"));
  // nothing from the other variants
  assert.ok(!html.includes("Month by Month"));
  assert.ok(!html.includes("Distributions"));
  // no debt figure anywhere: the maturity/principal from the docs archive must never leak
  assert.ok(!html.includes("1,500,000") && !html.includes("2030-04-30"));
});

test("boardReportHTML: lender collections block renders when extras are present", () => {
  const payStats = { "105": { unit: "105", months: 12, paid: 10, late: 2, partial: 0, unpaid: 0, totalPaid: 30000, lateFees: 200 } };
  const aging = { "105": { current: 2500, d31_60: 0, d61_90: 750, d90: 1000, credit: 0, total: 4250 } };
  const m = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience: "lender", extras: { payStats, aging } });
  const html = boardReportHTML(m, { generatedISO: "2026-08-29" });
  assert.ok(!html.includes("Collections history: not on file"));
  assert.ok(html.includes("$30,000"), "total paid");
  assert.ok(html.includes("83.3%"), "clean-pay rate 10/12");
  assert.ok(html.includes("$200"), "late fees");
  assert.ok(html.includes("Receivables Aging"));
  assert.ok(html.includes("$2,500"), "current bucket");
  assert.ok(html.includes("$750"), "61–90 bucket");
  assert.ok(html.includes("$1,000"), "90+ bucket");
  assert.ok(html.includes("$4,250"), "aging total");
  assert.ok(html.includes("Debt service and covenant data are not on file in Cypress Command."), "debt line is unconditional");

  // pay only: aging line names the gap
  const half = boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience: "lender", extras: { payStats } });
  const h2 = boardReportHTML(half, { generatedISO: "2026-08-29" });
  assert.ok(h2.includes("$30,000"));
  assert.ok(h2.includes("Receivables aging: not on file"));
});

test("boardReportHTML: stakeholder variant — title, blocks, distributions not on file", () => {
  const m = boardReportModel(quarterOf("2026-04"), {
    "2026-06": brief({ month: "2026-06", monthLabel: "June 2026", noi: 120000, capValue: 4800000, capRatePct: 8,
      actions: [{ lane: "now", title: "Sign 139/141 renewal", due: "2026-07-15" }, { lane: "watch", title: "131 LOI", due: "" }] }),
  }, { audience: "stakeholder" });
  const html = boardReportHTML(m, { generatedISO: "2026-08-29" });

  assert.ok(html.includes("<title>Stakeholder Report — Q2 2026</title>"));
  assert.ok(html.includes("<h1>Stakeholder Report — Q2 2026</h1>"));
  assert.ok(html.includes("QUARTERLY STAKEHOLDER REPORT"));
  assert.ok(html.includes("Indicative NOI — quarter total"));
  assert.ok(html.includes("$120,000"));
  assert.ok(html.includes("Indicative value"));
  assert.ok(html.includes("$4,800,000"));
  assert.ok(html.includes("8% cap"));
  assert.ok(html.includes("Occupancy — quarter end"));
  assert.ok(html.includes("<h2>Leasing Position (Latest Month on File)</h2>"));
  assert.ok(html.includes("<h2>Top Actions</h2>"));
  assert.ok(html.includes("Sign 139/141 renewal"));
  assert.ok(html.includes("<h2>Distributions</h2>"));
  assert.ok(html.includes("Member distributions and capital accounts are not on file."));
  assert.ok(html.includes("Months without a stored brief: 2026-04, 2026-05"));
  assert.ok(html.includes("Composed from 1 of 3 monthly Owner Intelligence Briefs"));
  assert.ok(html.includes("figures carry their source months' as-of dates"));
  assert.ok(!html.includes("Debt Service"));
  assert.ok(!html.includes("Collections"));

  // no cap value stored → dash, not a number
  const noVal = boardReportModel(quarterOf("2026-04"), { "2026-04": brief({ noi: null }) }, { audience: "stakeholder" });
  const h2 = boardReportHTML(noVal, { generatedISO: "2026-08-29" });
  assert.ok(h2.includes("Indicative value"));
  assert.ok(h2.includes("no cap-rate worksheet on file"));
  assert.ok(h2.includes("Top Actions"));
});

test("boardReportHTML: hostile strings in the new blocks are escaped", () => {
  const evil = '<img src=x onerror=alert(2)>';
  const payStats = { [evil]: { unit: evil, months: 1, paid: 1, late: 0, partial: 0, unpaid: 0, totalPaid: 100, lateFees: 0 } };
  const aging = { [evil]: { current: 10, d31_60: 0, d61_90: 0, d90: 0, credit: 0, total: 10 } };
  const lender = boardReportHTML(boardReportModel(quarterOf("2026-04"),
    { "2026-04": brief({ expirations: [{ unit: evil, dba: evil, end: "2026-11-30", sf: 1, monthly: 1 }] }) },
    { audience: "lender", extras: { payStats, aging } }), { generatedISO: "2026-08-29" });
  assert.ok(!lender.includes("<img src=x"), "lender: hostile unit/dba never lands live");
  assert.ok(lender.includes("&lt;img src=x"));

  const stake = boardReportHTML(boardReportModel(quarterOf("2026-04"),
    { "2026-04": brief({ actions: [{ lane: evil, title: evil, due: evil }], vacants: [{ unit: evil, sf: 5 }], holdovers: [evil] }) },
    { audience: "stakeholder" }), { generatedISO: "2026-08-29" });
  assert.ok(!stake.includes("<img src=x"), "stakeholder: hostile action/vacant/holdover never lands live");
  assert.ok(stake.includes("&lt;img src=x"));
});

test("boardReportHTML: every variant carries the OO brand and shared doc CSS", () => {
  for (const audience of AUDIENCES) {
    const html = boardReportHTML(boardReportModel(quarterOf("2026-04"), { "2026-04": brief() }, { audience }), { generatedISO: "2026-08-29" });
    assert.ok(html.includes(OO_CSS), audience + ": shared docbrand CSS");
    assert.ok(html.includes('<span class="o">ORANGE</span> <span class="c">OCEAN</span>'), audience + ": wordmark");
    assert.ok(html.includes("Property Manager for Belle Realty of Lafayette, LLC"), audience + ": foot");
  }
});
