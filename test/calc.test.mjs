import test from "node:test";
import assert from "node:assert/strict";
import { computeDeal, compareDeals } from "../src/lib/calc/ner.js";
import { grossUp } from "../src/lib/calc/grossup.js";
import { sequenceEviction } from "../src/lib/calc/eviction.js";
import { computeKpis } from "../src/lib/calc/kpi.js";
import { checkCapexPlan } from "../src/lib/calc/capex.js";
import { sequenceClaim } from "../src/lib/calc/insurance.js";
import { computeOcr } from "../src/lib/calc/ocr.js";
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
    ["ner_compare", "cam_gross_up", "eviction_sequence", "kpi", "capex_check", "insurance_claim", "occupancy_cost"]);
});

/* ── Capex reserve-gate (harvest #5) ─────────────────────────────────── */

test("capex: funds $50k from $200k reserve, replenishes in 10 months, coverage 4x", () => {
  const r = checkCapexPlan({ projectCost: 50000, currentReserveBalance: 200000, annualReserveContribution: 60000 });
  assert.equal(r.postProjectReserve, 150000);
  assert.equal(r.fundedFromReserve, true);
  assert.equal(r.monthsToReplenish, 10);
  assert.equal(r.reserveCoverage, 4);
  assert.match(r.recommendation, /Fund from reserve; replenish over 10 months/);
});

test("capex: reserve shortfall flags staged/top-up recommendation", () => {
  const r = checkCapexPlan({ projectCost: 150000, currentReserveBalance: 100000, annualReserveContribution: 60000 });
  assert.equal(r.fundedFromReserve, false);
  assert.equal(r.postProjectReserve, -50000);
  assert.equal(r.monthsToReplenish, null);
  assert.match(r.recommendation, /Reserve short by \$50,000/);
});

test("capex: EUL urgency bands — replace_now / plan_replacement / monitor", () => {
  const past = checkCapexPlan({ projectCost: 10000, currentReserveBalance: 50000, annualReserveContribution: 12000,
    asset: { assetType: "RTU", installYear: 2005, expectedUsefulLifeYears: 15, currentYear: 2026 } });
  assert.equal(past.asset.assetAge, 21);
  assert.equal(past.asset.remainingLife, -6);
  assert.equal(past.asset.pastEul, true);
  assert.equal(past.asset.urgency, "replace_now");
  assert.match(past.recommendation, /past its expected useful life/);

  const near = checkCapexPlan({ projectCost: 10000, currentReserveBalance: 50000, annualReserveContribution: 12000,
    asset: { installYear: 2013, expectedUsefulLifeYears: 15, currentYear: 2026 } });
  assert.equal(near.asset.urgency, "plan_replacement");

  const ok = checkCapexPlan({ projectCost: 10000, currentReserveBalance: 50000, annualReserveContribution: 12000,
    asset: { installYear: 2020, expectedUsefulLifeYears: 15, currentYear: 2026 } });
  assert.equal(ok.asset.remainingLife, 9);
  assert.equal(ok.asset.urgency, "monitor");
});

test("capex: zero contribution → null runway + note; guards throw", () => {
  const r = checkCapexPlan({ projectCost: 10000, currentReserveBalance: 50000, annualReserveContribution: 0 });
  assert.equal(r.monthsToReplenish, null);
  assert.ok(r.notes.some(n => /annualReserveContribution/.test(n)));
  assert.throws(() => checkCapexPlan({ projectCost: 0, currentReserveBalance: 1 }));
  assert.throws(() => checkCapexPlan({ projectCost: 1, currentReserveBalance: -1 }));
  // asset block without currentYear is rejected (purity: never Date.now())
  assert.throws(() => checkCapexPlan({ projectCost: 1, currentReserveBalance: 1, asset: { installYear: 2020 } }));
});

/* ── Insurance claim timeline (harvest #5) ───────────────────────────── */

test("insurance: default deadlines from 2026-01-01 (30d/60d/24mo)", () => {
  const r = sequenceClaim({ dateOfLoss: "2026-01-01" });
  const [mitigate, notice, proof, suit] = r.steps;
  assert.equal(mitigate.deadlineDate, "2026-01-01");
  assert.equal(mitigate.daysFromLoss, 0);
  assert.equal(notice.deadlineDate, "2026-01-31");
  assert.equal(notice.daysFromLoss, 30);
  assert.equal(proof.deadlineDate, "2026-03-02");
  assert.equal(proof.daysFromLoss, 60);
  assert.equal(suit.deadlineDate, "2028-01-01");
  assert.deepEqual(r.steps.map(s => s.order), [1, 2, 3, 4]);
});

test("insurance: custom overrides + month-end clamp (Dec 31 + 2mo → Feb 28)", () => {
  const r = sequenceClaim({ dateOfLoss: "2026-01-01", promptNoticeDays: 10, proofOfLossDays: 45, suitLimitationMonths: 12 });
  assert.equal(r.steps[1].deadlineDate, "2026-01-11");
  assert.equal(r.steps[2].deadlineDate, "2026-02-15");
  assert.equal(r.steps[3].deadlineDate, "2027-01-01");
  const clamp = sequenceClaim({ dateOfLoss: "2025-12-31", suitLimitationMonths: 2 });
  assert.equal(clamp.steps[3].deadlineDate, "2026-02-28");
});

test("insurance: delayed mitigation warns; invalid dates throw", () => {
  const r = sequenceClaim({ dateOfLoss: "2026-01-01", mitigationImmediate: false });
  assert.match(r.steps[0].detail, /NOT immediate/);
  assert.throws(() => sequenceClaim({ dateOfLoss: "not-a-date" }), /dateOfLoss/);
  assert.throws(() => sequenceClaim({ dateOfLoss: "2026-02-30" }), /dateOfLoss/);
  assert.throws(() => sequenceClaim({ dateOfLoss: "2026-01-01", promptNoticeDays: -1 }));
});

/* ── Occupancy cost ratio (harvest #5) ───────────────────────────────── */

test("OCR: exactly 20% is elevated, NOT atRisk; just over 20% is distress", () => {
  const edge = computeOcr({ annualBaseRent: 25000, annualCam: 8000, annualTax: 5000, annualInsurance: 2000, annualSales: 200000 });
  assert.equal(edge.totalOccupancyCost, 40000);
  assert.equal(edge.ocrPct, 20.0);
  assert.equal(edge.band, "elevated");
  assert.equal(edge.atRisk, false);
  const over = computeOcr({ annualBaseRent: 25000, annualCam: 8000, annualTax: 5000, annualInsurance: 2100, annualSales: 200000 });
  assert.equal(over.band, "distress");
  assert.equal(over.atRisk, true);
  assert.equal(over.salesToReach20Pct, 200500);
  assert.equal(over.salesGapToHealthy, 500);
});

test("OCR: healthy / watch bands + percentage rent counts", () => {
  const healthy = computeOcr({ annualBaseRent: 15000, annualCam: 3000, annualTax: 1500, annualInsurance: 500, annualSales: 200000 });
  assert.equal(healthy.ocrPct, 10.0);
  assert.equal(healthy.band, "healthy");
  const watch = computeOcr({ annualBaseRent: 20000, annualCam: 3000, annualTax: 1500, annualInsurance: 500, annualSales: 200000 });
  assert.equal(watch.ocrPct, 12.5);
  assert.equal(watch.band, "watch");
  const withPct = computeOcr({ annualBaseRent: 20000, annualCam: 3000, annualTax: 1500, annualInsurance: 500, percentageRent: 5000, annualSales: 200000 });
  assert.equal(withPct.totalOccupancyCost, 30000);
  assert.ok(withPct.ocr > watch.ocr);
});

test("OCR: guards throw on zero sales / negative components", () => {
  assert.throws(() => computeOcr({ annualBaseRent: 1, annualCam: 1, annualTax: 1, annualInsurance: 1, annualSales: 0 }));
  assert.throws(() => computeOcr({ annualBaseRent: -1, annualCam: 1, annualTax: 1, annualInsurance: 1, annualSales: 100 }));
});

/* ── run_calc dispatch + fallback for the three new engines ──────────── */

test("runCalc dispatches capex_check / insurance_claim / occupancy_cost; fallbacks render", () => {
  const capex = runCalc({ engine: "capex_check", capex: { projectCost: 50000, currentReserveBalance: 200000, annualReserveContribution: 60000 } });
  assert.equal(capex.ok, true);
  assert.match(calcFallback(capex), /^Verified reserve-gate: Fund from reserve/);
  const ins = runCalc({ engine: "insurance_claim", insurance: { dateOfLoss: "2026-01-01" } });
  assert.equal(ins.ok, true);
  assert.match(calcFallback(ins), /^Verified claim timeline: The claim clock starts/);
  const ocr = runCalc({ engine: "occupancy_cost", ocr: { annualBaseRent: 25000, annualCam: 8000, annualTax: 5000, annualInsurance: 2000, annualSales: 200000 } });
  assert.equal(ocr.ok, true);
  assert.match(calcFallback(ocr), /^Verified OCR: Occupancy cost ratio/);
  assert.equal(runCalc({ engine: "capex_check", capex: { projectCost: -1, currentReserveBalance: 1 } }).ok, false);
});
