import test from "node:test";
import assert from "node:assert/strict";
import { computeDeal, compareDeals } from "../src/lib/calc/ner.js";
import { grossUp } from "../src/lib/calc/grossup.js";
import { sequenceEviction } from "../src/lib/calc/eviction.js";
import { computeKpis } from "../src/lib/calc/kpi.js";
import { runCalc, calcFallback, CALC_TOOL } from "../src/lib/calc/index.js";

/* ── NER ─────────────────────────────────────────────────────────────── */

test("NER: known-value deal (concessions amortized over term)", () => {
  const r = computeDeal({ label: "A", sf: 1000, baseRentPsf: 20, termMonths: 60, freeRentMonths: 3, tiPsf: 10, lcPsf: 5 });
  assert.equal(r.grossRentTotal, 100000);
  assert.equal(r.freeRentTotal, 5000);
  assert.equal(r.totalConcessions, 20000);
  assert.equal(r.netRentTotal, 80000);
  assert.equal(r.annualizedNer, 16000);
  assert.equal(r.nerPerSfPerYear, 16);
});

test("NER: escalation compounds annually with partial-year proration", () => {
  const r = computeDeal({ label: "E", sf: 1000, baseRentPsf: 10, termMonths: 30, annualEscalation: 0.1 });
  // yr1 10,000 + yr2 11,000 + half of yr3 at 12.1 → 6,050
  assert.equal(r.grossRentTotal, 27050);
});

test("NER: compare ranks by NER/SF, fills asset value at cap, precomputes deltas", () => {
  const out = compareDeals([
    { label: "Retain", sf: 1000, baseRentPsf: 17, termMonths: 60 },
    { label: "Replace", sf: 1000, baseRentPsf: 20, termMonths: 60, freeRentMonths: 3, tiPsf: 10, lcPsf: 5 },
  ], 0.08);
  assert.equal(out.winner, "Retain"); // 17 vs 16 NER
  assert.equal(out.delta.nerPerSfPerYearDelta, 1);
  assert.equal(out.deals[0].assetValueAtCap, 212500); // 17,000/0.08
  assert.equal(out.pairwiseDeltas.length, 2);
});

test("NER: input guards throw", () => {
  assert.throws(() => computeDeal({ label: "x", sf: 0, baseRentPsf: 10, termMonths: 12 }));
  assert.throws(() => compareDeals([{ label: "only", sf: 1, baseRentPsf: 1, termMonths: 1 }], 0.08));
  assert.throws(() => compareDeals([{ label: "a", sf: 1, baseRentPsf: 1, termMonths: 1 }, { label: "b", sf: 1, baseRentPsf: 1, termMonths: 1 }], 1.5));
});

/* ── CAM gross-up ────────────────────────────────────────────────────── */

test("gross-up: variable lines gross to target; tax/ins/fixed bill actual", () => {
  const r = grossUp([
    { label: "Utilities", actualAmount: 100000, kind: "variable" },
    { label: "RE Taxes", actualAmount: 50000, kind: "tax" },
    { label: "Mgmt fee", actualAmount: 20000, kind: "fixed" },
  ], 0.8, 0.95);
  assert.equal(r.grossUpFactor, 1.19);
  assert.equal(r.lines[0].grossedAmount, 118750);
  assert.equal(r.lines[1].grossedAmount, 50000);
  assert.equal(r.lines[2].grossUpAdjustment, 0);
  assert.equal(r.totalGrossUpAdjustment, 18750);
  assert.match(r.methodology, /not grossed up/);
});

test("gross-up: never grosses DOWN above target occupancy", () => {
  const r = grossUp([{ label: "Utilities", actualAmount: 100000, kind: "variable" }], 0.97, 0.95);
  assert.equal(r.lines[0].grossedAmount, 100000);
  assert.equal(r.lines[0].grossedUp, false);
});

test("gross-up: occupancy bounds throw", () => {
  assert.throws(() => grossUp([], 0, 0.95));
  assert.throws(() => grossUp([], 0.9, 1.2));
});

/* ── Louisiana eviction sequencer ────────────────────────────────────── */

test("eviction: monetary default = 4701 notice then 4731/4732/4733, ~10 days", () => {
  const r = sequenceEviction({ ground: "monetary", daysDelinquent: 12 });
  assert.equal(r.steps.length, 4);
  assert.equal(r.steps[0].article, "CCP 4701");
  assert.equal(r.estimatedDaysToJudgment, 10);
  assert.ok(r.warnings.some(w => w.code === "DELINQUENCY_OF_RECORD"));
  assert.ok(r.warnings.some(w => w.code === "NO_SELF_HELP"));
});

test("eviction: waiver of notice skips 4701 and shortens the clock", () => {
  const r = sequenceEviction({ ground: "monetary", waiverOfNotice: true });
  assert.equal(r.steps.length, 3);
  assert.equal(r.steps[0].article, "CCP 4731");
  assert.equal(r.estimatedDaysToJudgment, 5);
});

test("eviction: acceptance-of-rent trap blocks the sequence", () => {
  const r = sequenceEviction({ ground: "monetary", acceptedRentAfterNotice: true });
  assert.ok(r.warnings.some(w => w.code === "ACCEPTANCE_OF_RENT" && w.severity === "blocker"));
  assert.match(r.summary, /cannot proceed/);
});

test("eviction: bankruptcy short-circuits with the automatic stay", () => {
  const r = sequenceEviction({ ground: "bankruptcy" });
  assert.equal(r.steps.length, 0);
  assert.ok(r.warnings.some(w => w.code === "BANKRUPTCY_STAY" && w.severity === "blocker"));
});

test("eviction: holdover quotes 200% of monthly rent (§20.01)", () => {
  const r = sequenceEviction({ ground: "holdover", monthlyRent: 2800.92 });
  assert.equal(r.holdoverMonthlyRent, 5601.84);
});

/* ── KPI ─────────────────────────────────────────────────────────────── */

test("KPI: computes NOI, occupancies, collections, expense ratio", () => {
  const r = computeKpis({
    grossPotentialRent: 100000, actualCollections: 90000, operatingExpenses: 30000,
    occupiedSf: 59631, totalSf: 62810, scheduledBaseRent: 95000,
  });
  assert.equal(r.kpis.noi, 60000);
  assert.equal(r.kpis.occupancyPct, 0.9494);
  assert.equal(r.kpis.collectionsPct, 0.9);
  assert.equal(r.kpis.expenseRatio, 0.33);
  assert.match(r.narrativeInputs, /narrate, do not recompute/);
});

test("KPI: MoM deltas carry precomputed direction words", () => {
  const base = { grossPotentialRent: 100000, actualCollections: 90000, operatingExpenses: 30000, occupiedSf: 59631, totalSf: 62810, scheduledBaseRent: 95000 };
  const r = computeKpis(base, { ...base, actualCollections: 85000 });
  assert.equal(r.deltas.noiDirection, "up");
  assert.equal(r.deltas.occupancyDirection, "flat");
});

test("KPI: input guards throw", () => {
  assert.throws(() => computeKpis({ grossPotentialRent: 100, actualCollections: 1, operatingExpenses: 1, occupiedSf: 1, totalSf: 0, scheduledBaseRent: 1 }));
});

/* ── run_calc dispatcher ─────────────────────────────────────────────── */

test("runCalc dispatches every engine and never throws", () => {
  assert.equal(runCalc({ engine: "eviction_sequence", eviction: { ground: "monetary" } }).ok, true);
  assert.equal(runCalc({ engine: "cam_gross_up", grossUp: { actualOccupancy: 0.9, lines: [] } }).ok, true);
  assert.equal(runCalc({ engine: "nope" }).ok, false);
  assert.equal(runCalc({ engine: "ner_compare", ner: { capRate: 5, deals: [] } }).ok, false); // bad input → error, no throw
});

test("calcFallback renders deterministic prose per engine", () => {
  const out = runCalc({ engine: "kpi", kpi: { period: { grossPotentialRent: 100000, actualCollections: 90000, operatingExpenses: 30000, occupiedSf: 59631, totalSf: 62810, scheduledBaseRent: 95000 } } });
  assert.match(calcFallback(out), /^Verified KPIs: NOI \$60,000/);
  assert.equal(calcFallback({ ok: false }), "");
});

test("CALC_TOOL schema names every engine it dispatches", () => {
  assert.deepEqual(CALC_TOOL.input_schema.properties.engine.enum,
    ["ner_compare", "cam_gross_up", "eviction_sequence", "kpi"]);
});
