/* CAM/NNN reconciliation model (src/lib/camrecon.js, register row #6 — F-2 v2).
   Fixtures use a round glaSf=10,000 override so shares are exact; the default
   denominator is the audit-grade 62,883 SF GLA (GLA_SF). The vacant unit
   carries deliberately huge PSF values — if billed sums ever include vacant
   units, these tests fail. grossUpPct:0 is passed explicitly where the v1
   behaviours are asserted: an ABSENT grossUpPct now derives the factor from
   occupancy (calc/grossup.js). */
import test from "node:test";
import assert from "node:assert/strict";
import { reconModel, reconCaveats, leaseYearAt, GLA_SF } from "../src/lib/camrecon.js";

const close = (a, b, msg) =>
  assert.ok(Math.abs(a - b) < 1e-6, (msg || "close") + ": expected " + b + ", got " + a);

const UNITS = [
  { unit: "A", dba: "Alpha", sf: 6000, status: "active", start: "2024-02-15" },
  { unit: "B", dba: "Bravo", sf: 3000, status: "active", start: "2025-07-01" },
  { unit: "V", dba: "Vacant", sf: 1000, status: "vacant" },
];
const RECOVERIES = {
  camFlatPsf: 2,
  units: {
    A: { cam: 2, tax: 1, ins: 0.5 },
    B: { cam: 2, tax: 1, ins: 0.5 },
    V: { cam: 9, tax: 9, ins: 9 }, // vacant — must never bill
  },
};
const ACTUALS = { cam: 20000, taxes: 9000, insurance: 4000 };
const OPT = { glaSf: 10000, grossUpPct: 0 };
const CAP_ALL = { capPct: 0.05, capBasis: "prior_year_actuals", capFromLeaseYear: 2, capComponents: ["cam", "tax", "ins"], auditRights: false, baseYear: null, source: "x" };
const CAP_CAM4 = { ...CAP_ALL, capPct: 0.04, capComponents: ["cam"] };

/* ── v1 behaviours (kept) ─────────────────────────────────────────── */
test("billed recovery sums PSF×SF over OCCUPIED units only", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, OPT);
  close(m.components.cam.billed, 18000);  // 2×6000 + 2×3000 — V's 9 PSF excluded
  close(m.components.tax.billed, 9000);
  close(m.components.ins.billed, 4500);
  close(m.totals.billed, 31500);
  assert.equal(m.occupiedSf, 9000);
  assert.equal(m.vacantSf, 1000);
});

test("unit missing from recoveries bills 0 without crashing and is flagged unknown", () => {
  const m = reconModel([...UNITS, { unit: "X", dba: "X", sf: 500, status: "active" }],
    RECOVERIES, ACTUALS, OPT);
  close(m.totals.billed, 31500);
  const x = m.units.find(r => r.unit === "X");
  close(x.billed, 0);
  assert.equal(x.recoveriesKnown, false);
  assert.equal(x.trueUp, null, "no true-up can be stated without recovery PSF on file");
  assert.ok(m.units.find(r => r.unit === "A").recoveriesKnown);
});

test("explicit gross-up applies to CAM only — taxes and insurance never grossed", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: 10 });
  close(m.components.cam.actual, 20000);  // actual untouched
  close(m.components.cam.grossed, 22000); // ×1.10
  close(m.components.tax.grossed, 9000);
  close(m.components.ins.grossed, 4000);
  close(m.totals.actual, 33000);
  close(m.totals.grossed, 35000);
  assert.equal(m.grossUpPct, 10);
  assert.equal(m.grossUpDerived, false);
  close(m.grossUpFactor, 1.1);
  assert.match(m.methodology, /operator override/i);
});

test("delta = billed − grossed; positive = over-collected, negative = under", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, OPT); // 0% gross-up
  close(m.components.cam.delta, -2000); // 18000 billed vs 20000 actual — under
  close(m.components.tax.delta, 0);
  close(m.components.ins.delta, 500);   // 4500 billed vs 4000 actual — over
  close(m.totals.delta, -1500);
});

test("vacancyShortfall = grossed grand total × vacant share of GLA", () => {
  close(reconModel(UNITS, RECOVERIES, ACTUALS, OPT).vacancyShortfall, 3300); // 33000 × 0.1
  close(reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: 10 }).vacancyShortfall, 3500); // 35000 × 0.1
});

test("per-unit rows: share = sf/GLA, actualShare = grossed × share, worst |true-up| first, vacant excluded", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, OPT);
  assert.deepEqual(m.units.map(r => r.unit), ["A", "B"]); // |1200| > |600|, no V
  const a = m.units[0];
  close(a.share, 0.6);
  close(a.billed, 21000);      // (2+1+0.5) × 6000
  close(a.actualShare, 19800); // 33000 × 0.6
  close(a.delta, 1200);        // over-collected (v1 sign: billed − actualShare)
  close(a.trueUp, -1200);      // tenant credit (F-2 sign: owed − billed)
  const b = m.units[1];
  close(b.share, 0.3);
  close(b.billed, 10500);
  close(b.actualShare, 9900);
  close(b.delta, 600);
  close(b.trueUp, -600);
  close(m.totals.trueUp, -1800);
});

test("default denominator is the audit-grade 62,883 SF GLA", () => {
  assert.equal(GLA_SF, 62883);
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { grossUpPct: 0 }); // no glaSf override
  assert.equal(m.glaSf, 62883);
  close(m.units.find(r => r.unit === "A").share, 6000 / 62883);
});

test("returns null when the worksheet is empty (all three actuals 0)", () => {
  assert.equal(reconModel(UNITS, RECOVERIES, { cam: 0, taxes: 0, insurance: 0 }, OPT), null);
  assert.equal(reconModel(UNITS, RECOVERIES, {}, OPT), null);
  assert.equal(reconModel(UNITS, RECOVERIES, null, OPT), null);
  // one component alone is enough to draft
  assert.notEqual(reconModel(UNITS, RECOVERIES, { cam: 1000 }, OPT), null);
});

/* ── derived gross-up (calc/grossup.js) ───────────────────────────── */
test("absent grossUpPct derives the CAM factor from occupied SF / GLA to 95% — CAM only", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000 }); // occupancy 0.9
  assert.equal(m.grossUpPct, null);
  assert.equal(m.grossUpDerived, true);
  close(m.occupancy, 0.9);
  close(m.grossUpFactor, 0.95 / 0.9);
  close(m.components.cam.grossed, 21111.11); // round2(20000 × 1.0556)
  close(m.components.tax.grossed, 9000);
  close(m.components.ins.grossed, 4000);
  close(m.totals.grossed, 34111.11);
  assert.match(m.methodology, /90% occupancy/);
  assert.match(m.methodology, /95% occupancy/);
  assert.match(m.methodology, /not grossed up/);
});

test("derived gross-up never grosses DOWN above the 95% target", () => {
  const full = [
    { unit: "A", dba: "Alpha", sf: 6000, status: "active" },
    { unit: "B", dba: "Bravo", sf: 3700, status: "active" },
    { unit: "V", dba: "Vacant", sf: 300, status: "vacant" },
  ];
  const m = reconModel(full, RECOVERIES, ACTUALS, { glaSf: 10000 }); // occupancy 0.97
  close(m.grossUpFactor, 1);
  close(m.components.cam.grossed, 20000);
});

test("null grossUpPct behaves like absent; 0 is an explicit no-gross-up override", () => {
  const derived = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: null });
  assert.equal(derived.grossUpDerived, true);
  const zero = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: 0 });
  assert.equal(zero.grossUpDerived, false);
  close(zero.grossUpFactor, 1);
  close(zero.components.cam.grossed, 20000);
  assert.match(zero.methodology, /no gross-up/i);
});

/* ── lease year ───────────────────────────────────────────────────── */
test("leaseYearAt = reconciliation year − commencement year + 1 (as of Dec 31); unknown start → null", () => {
  assert.equal(leaseYearAt("2024-02-15", 2026), 3);
  assert.equal(leaseYearAt("2024-02-15", 2024), 1);
  assert.equal(leaseYearAt("2024-12-31", 2025), 2);
  assert.equal(leaseYearAt("2027-01-01", 2026), 0); // not yet commenced
  assert.equal(leaseYearAt("", 2026), null);
  assert.equal(leaseYearAt(null, 2026), null);
  assert.equal(leaseYearAt("2024-02-15", null), null);
  assert.equal(leaseYearAt("soon", 2026), null);
});

test("unit rows carry the lease year for the reconciliation year; year absent → null", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...OPT, year: 2026 });
  assert.equal(m.year, 2026);
  assert.equal(m.priorYear, 2025);
  assert.equal(m.units.find(r => r.unit === "A").leaseYear, 3);
  assert.equal(m.units.find(r => r.unit === "B").leaseYear, 2);
  const noYear = reconModel(UNITS, RECOVERIES, ACTUALS, OPT);
  assert.equal(noYear.year, null);
  assert.equal(noYear.units[0].leaseYear, null);
});

/* ── caps + true-up ───────────────────────────────────────────────── */
const PRIOR = { cam: 10000, taxes: 9000, insurance: 4000 }; // 23,000 — CAM doubled this year
const WITH_CAP = { ...OPT, year: 2026, priorOpex: PRIOR, terms: { A: CAP_ALL } };

test("5% cap over prior-year actuals binds: cappedShare = min(actualShare, priorShare × 1.05); true-up uses the capped figure", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, WITH_CAP);
  assert.equal(m.hasPrior, true);
  const a = m.units.find(r => r.unit === "A");
  assert.equal(a.capPct, 0.05);
  assert.equal(a.capApplies, true);
  close(a.actualShare, 19800);           // 33,000 × .6
  close(a.priorShare, 13800);            // 23,000 × .6
  close(a.cappedShare, 14100);           // per component: CAM 6,000×1.05 + tax 5,400 + ins 2,400 (a total-level cap would say 14,490)
  assert.equal(a.capBinding, true);
  close(a.trueUp, 14100 - 21000);        // −6,900 → tenant credit
  assert.match(a.capReason, /5% cap/);
  assert.match(a.capReason, /2025 actuals/);
  assert.match(a.capReason, /lease year 3/);
  // per-component detail feeds the statement
  close(a.lines.cam.actualShare, 12000); close(a.lines.cam.priorShare, 6000); close(a.lines.cam.cappedShare, 6300);
  close(a.lines.tax.cappedShare, 5400);  // 9,000 × .6 vs 9,000 × .6 × 1.05 → within cap
  close(a.lines.ins.cappedShare, 2400);
  close(a.lines.cam.billed, 12000); close(a.lines.tax.billed, 6000); close(a.lines.ins.billed, 3000);
});

test("a unit with no terms row reports 'no cap on file' and settles at actual share", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, WITH_CAP);
  const b = m.units.find(r => r.unit === "B");
  assert.equal(b.capPct, null);
  assert.equal(b.capApplies, false);
  assert.equal(b.cappedShare, null);
  assert.equal(b.capBinding, false);
  assert.match(b.capReason, /no cap on file/i);
  close(b.priorShare, 6900);             // prior still reported for context
  close(b.trueUp, 9900 - 10500);
});

test("cap within limit: prior × (1+cap) ≥ actual → cappedShare = actualShare, not binding", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, priorOpex: ACTUALS });
  const a = m.units.find(r => r.unit === "A");
  close(a.cappedShare, a.actualShare);
  assert.equal(a.capBinding, false);
  assert.match(a.capReason, /within cap/i);
});

test("capComponents restricts the cap: 4% CAM-only leaves tax and insurance at actual share", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, terms: { A: CAP_CAM4 } });
  const a = m.units.find(r => r.unit === "A");
  close(a.lines.cam.cappedShare, 6240);  // 6,000 × 1.04
  close(a.lines.tax.cappedShare, 5400);  // uncapped component
  close(a.lines.ins.cappedShare, 2400);
  close(a.cappedShare, 14040);
  assert.match(a.capReason, /4% cap/);
});

test("cap not yet in force: lease year below capFromLeaseYear → not applied, reason names the start year", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, year: 2024 }); // A lease year 1
  const a = m.units.find(r => r.unit === "A");
  assert.equal(a.leaseYear, 1);
  assert.equal(a.capApplies, false);
  assert.equal(a.cappedShare, null);
  assert.match(a.capReason, /lease year 1/);
  assert.match(a.capReason, /starts lease year 2/);
  close(a.trueUp, 19800 - 21000);
});

test("cap on file but lease start unknown → not applied, reason 'lease year unknown'", () => {
  const units = [{ ...UNITS[0], start: "" }, UNITS[1], UNITS[2]];
  const m = reconModel(units, RECOVERIES, ACTUALS, WITH_CAP);
  const a = m.units.find(r => r.unit === "A");
  assert.equal(a.leaseYear, null);
  assert.equal(a.capApplies, false);
  assert.match(a.capReason, /lease year unknown/i);
  close(a.trueUp, 19800 - 21000);
});

test("cap on file, lease not yet commenced in the reconciliation year → not applied", () => {
  const units = [{ ...UNITS[0], start: "2027-03-01" }, UNITS[1], UNITS[2]];
  const a = reconModel(units, RECOVERIES, ACTUALS, WITH_CAP).units.find(r => r.unit === "A");
  assert.equal(a.leaseYear, 0);
  assert.equal(a.capApplies, false);
  assert.match(a.capReason, /not yet commenced/i);
});

test("cap applies but no prior-year actuals on file → cappedShare null, true-up at actual share, reason says so", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, priorOpex: null });
  assert.equal(m.hasPrior, false);
  const a = m.units.find(r => r.unit === "A");
  assert.equal(a.capApplies, true);
  assert.equal(a.cappedShare, null);
  assert.equal(a.priorShare, null);
  assert.match(a.capReason, /prior-year actuals not on file/i);
  close(a.trueUp, 19800 - 21000);
  // an all-zero prior worksheet is the same as none
  assert.equal(reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, priorOpex: { cam: 0, taxes: 0, insurance: 0 } }).hasPrior, false);
});

test("prior-year shares are grossed the same way as the current year (same CAM factor)", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, grossUpPct: 10 });
  const a = m.units.find(r => r.unit === "A");
  close(a.lines.cam.priorShare, 6600);   // 10,000 × 1.10 × .6
  close(a.priorShare, 6600 + 5400 + 2400);
});

test("leaseYearOf hook overrides the rent-roll derivation", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, year: 2024, leaseYearOf: u => (u.unit === "A" ? 7 : null) });
  const a = m.units.find(r => r.unit === "A");
  assert.equal(a.leaseYear, 7);
  assert.equal(a.capApplies, true);
  assert.equal(m.units.find(r => r.unit === "B").leaseYear, null);
});

test("audit rights ride along from the terms row", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, terms: { A: { ...CAP_ALL, auditRights: true } } });
  assert.equal(m.units.find(r => r.unit === "A").auditRights, true);
  assert.equal(m.units.find(r => r.unit === "B").auditRights, false);
});

test("rows sort by |true-up| (capped) first, then unit", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, WITH_CAP); // A −6,900 vs B −600
  assert.deepEqual(m.units.map(r => r.unit), ["A", "B"]);
  const tie = reconModel([UNITS[0], { ...UNITS[1], sf: 6000, unit: "0" }],
    { ...RECOVERIES, units: { ...RECOVERIES.units, "0": RECOVERIES.units.A } }, ACTUALS, OPT);
  assert.deepEqual(tie.units.map(r => r.unit), ["0", "A"]);
});

/* ── caveats ──────────────────────────────────────────────────────── */
test("caveats: base three always — SF pro-rata over 62,883 SF GLA, CAM-only gross-up, base-year unmodeled", () => {
  const c = reconCaveats();
  assert.equal(c.length, 3);
  assert.ok(c.every(s => typeof s === "string" && s.length > 0));
  assert.ok(c.some(s => s.includes("62,883 SF GLA")));
  assert.ok(c.some(s => s.includes("CAM gross-up applies to CAM only")));
  assert.ok(c.some(s => /base-year/i.test(s)));
  assert.ok(!c.some(s => /caps \(4–5% yoy\)/.test(s)), "the cap gap is modeled now");
});

test("caveats: no prior-year actuals + capped units → says so with the year; unknown lease starts and unknown recoveries listed", () => {
  const noPrior = reconCaveats(reconModel(UNITS, RECOVERIES, ACTUALS, { ...WITH_CAP, priorOpex: null }));
  assert.ok(noPrior.some(s => /2025 actuals/.test(s) && /not on file/.test(s)), noPrior.join(" | "));
  const unkStart = reconCaveats(reconModel([{ ...UNITS[0], start: "" }, UNITS[1], UNITS[2]], RECOVERIES, ACTUALS, WITH_CAP));
  assert.ok(unkStart.some(s => /Lease start/.test(s) && /\bA\b/.test(s)), unkStart.join(" | "));
  const unkRec = reconCaveats(reconModel([...UNITS, { unit: "X", dba: "X", sf: 500, status: "active" }], RECOVERIES, ACTUALS, WITH_CAP));
  assert.ok(unkRec.some(s => /Recovery PSF/.test(s) && /\bX\b/.test(s)), unkRec.join(" | "));
});

test("caveats: with prior on file and caps applied, the proration note appears and the no-prior line does not", () => {
  const c = reconCaveats(reconModel(UNITS, RECOVERIES, ACTUALS, WITH_CAP));
  assert.ok(!c.some(s => /not on file/.test(s)));
  assert.ok(c.some(s => /prorated/.test(s)));
});

/* ── owner-occupied suite + unknown-recovery ordering (real-roll findings) ── */
test("owner-occupied suite counts toward occupancy but gets no tenant row; its share is ownerAbsorbed", () => {
  const units = [...UNITS, { unit: "O", dba: "Owner office", sf: 500, status: "owner", start: "2020-01-01" }];
  const rec = { ...RECOVERIES, units: { ...RECOVERIES.units, O: { cam: 0, tax: 0, ins: 0 } } };
  const m = reconModel(units, rec, ACTUALS, { glaSf: 10500, grossUpPct: 0, year: 2026, terms: { O: CAP_ALL } });
  assert.equal(m.occupiedSf, 9500);   // 6000 + 3000 + 500 — owner suite is occupied space
  assert.equal(m.ownerSf, 500);
  assert.equal(m.vacantSf, 1000);
  assert.deepEqual(m.units.map(r => r.unit), ["A", "B"], "no statement / true-up for the landlord's own suite");
  close(m.ownerAbsorbed, 33000 * 500 / 10500);
  close(m.vacancyShortfall, 33000 * 1000 / 10500);
  close(m.totals.trueUp, m.units.reduce((s, r) => s + r.trueUp, 0));
});

test("rows with unknown recovery PSF sort last regardless of size", () => {
  const units = [{ unit: "X", dba: "Huge unknown", sf: 9000, status: "active" }, ...UNITS];
  const rec = { ...RECOVERIES, units: { ...RECOVERIES.units, X: { cam: null, tax: null, ins: null } } };
  const m = reconModel(units, rec, ACTUALS, { glaSf: 20000, grossUpPct: 0 });
  assert.deepEqual(m.units.map(r => r.unit), ["A", "B", "X"]);
  assert.equal(m.units[2].recoveriesKnown, false);
  assert.equal(m.units[2].trueUp, null);
});
