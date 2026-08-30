/* CAM/NNN reconciliation DRAFT model (src/lib/camrecon.js, register row #6 v1).
   Fixtures use a round glaSf=10,000 override so shares are exact; the default
   denominator is the audit-grade 62,883 SF GLA (GLA_SF). The vacant unit
   carries deliberately huge PSF values — if billed sums ever include vacant
   units, these tests fail. */
import test from "node:test";
import assert from "node:assert/strict";
import { reconModel, reconCaveats, GLA_SF } from "../src/lib/camrecon.js";

const close = (a, b, msg) =>
  assert.ok(Math.abs(a - b) < 1e-6, (msg || "close") + ": expected " + b + ", got " + a);

const UNITS = [
  { unit: "A", dba: "Alpha", sf: 6000, status: "active" },
  { unit: "B", dba: "Bravo", sf: 3000, status: "active" },
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
const OPT = { glaSf: 10000 };

test("billed recovery sums PSF×SF over OCCUPIED units only", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, OPT);
  close(m.components.cam.billed, 18000);  // 2×6000 + 2×3000 — V's 9 PSF excluded
  close(m.components.tax.billed, 9000);
  close(m.components.ins.billed, 4500);
  close(m.totals.billed, 31500);
  assert.equal(m.occupiedSf, 9000);
  assert.equal(m.vacantSf, 1000);
});

test("unit missing from recoveries bills 0 without crashing", () => {
  const m = reconModel([...UNITS, { unit: "X", dba: "X", sf: 500, status: "active" }],
    RECOVERIES, ACTUALS, OPT);
  close(m.totals.billed, 31500);
  const x = m.units.find(r => r.unit === "X");
  close(x.billed, 0);
});

test("gross-up applies to CAM only — taxes and insurance never grossed", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: 10 });
  close(m.components.cam.actual, 20000);  // actual untouched
  close(m.components.cam.grossed, 22000); // ×1.10
  close(m.components.tax.grossed, 9000);
  close(m.components.ins.grossed, 4000);
  close(m.totals.actual, 33000);
  close(m.totals.grossed, 35000);
  assert.equal(m.grossUpPct, 10);
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

test("per-unit rows: share = sf/GLA, actualShare = grossed × share, worst |Δ| first, vacant excluded", () => {
  const m = reconModel(UNITS, RECOVERIES, ACTUALS, OPT);
  assert.deepEqual(m.units.map(r => r.unit), ["A", "B"]); // |1200| > |600|, no V
  const a = m.units[0];
  close(a.share, 0.6);
  close(a.billed, 21000);      // (2+1+0.5) × 6000
  close(a.actualShare, 19800); // 33000 × 0.6
  close(a.delta, 1200);        // over-collected
  const b = m.units[1];
  close(b.share, 0.3);
  close(b.billed, 10500);
  close(b.actualShare, 9900);
  close(b.delta, 600);
});

test("default denominator is the audit-grade 62,883 SF GLA", () => {
  assert.equal(GLA_SF, 62883);
  const m = reconModel(UNITS, RECOVERIES, ACTUALS); // no glaSf override
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

test("caveats name the cap gap, the SF pro-rata convention, and CAM-only gross-up", () => {
  const c = reconCaveats();
  assert.equal(c.length, 3);
  assert.ok(c.every(s => typeof s === "string" && s.length > 0));
  assert.ok(c.some(s => s.includes("caps (4–5% yoy)")));
  assert.ok(c.some(s => s.includes("62,883 SF GLA")));
  assert.ok(c.some(s => s.includes("CAM gross-up applies to CAM only")));
});
