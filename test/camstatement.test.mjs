/* Per-tenant annual CAM/Tax/Ins reconciliation statement (src/lib/camstatement.js,
   F-2). Fixtures mirror test/camrecon.test.mjs (glaSf 10,000 → exact shares). */
import test from "node:test";
import assert from "node:assert/strict";
import { reconModel } from "../src/lib/camrecon.js";
import { camStatementModel, camStatementHTML } from "../src/lib/camstatement.js";

const close = (a, b, msg) =>
  assert.ok(Math.abs(a - b) < 1e-6, (msg || "close") + ": expected " + b + ", got " + a);

const UNITS = [
  { unit: "A", dba: 'Alpha <b>"Co"</b>', sf: 6000, status: "active", start: "2024-02-15" },
  { unit: "B", dba: "Bravo", sf: 3000, status: "active", start: "2025-07-01" },
  { unit: "V", dba: "Vacant", sf: 1000, status: "vacant" },
];
const RECOVERIES = { camFlatPsf: 2, units: {
  A: { base: 15, cam: 2, tax: 1, ins: 0.5, total: 18.5 },
  B: { base: 12, cam: 2, tax: null, ins: 0.5, total: null },
  V: { cam: 9, tax: 9, ins: 9 } } };
const ACTUALS = { cam: 20000, taxes: 9000, insurance: 4000 };
const PRIOR = { cam: 10000, taxes: 9000, insurance: 4000 };
const TERMS = { A: { capPct: 0.05, capBasis: "prior_year_actuals", capFromLeaseYear: 2, capComponents: ["cam", "tax", "ins"],
  auditRights: true, baseYear: null, source: "ac:lease_abstractions:x", note: "abstract note <i>x</i>" } };
const INFO_A = { unit: "A", dba: 'Alpha <b>"Co"</b>', sf: 6000, base: 15, total: 18.5, monthly: 9250 };
const INFO_B = { unit: "B", dba: "Bravo", sf: 3000 }; // no private economics loaded

const recon = () => reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, grossUpPct: 0, year: 2026, priorOpex: PRIOR, terms: TERMS });
const rowOf = (m, u) => m.units.find(r => r.unit === u);

/* ---- model ---- */
test("model: PSF breakdown Base·CAM·Tax·Ins → Total PSF → $/mo from unit private economics + recoveries", () => {
  const m = camStatementModel(recon(), rowOf(recon(), "A"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_A });
  assert.equal(m.unit, "A");
  assert.equal(m.year, 2026);
  assert.equal(m.priorYear, 2025);
  assert.deepEqual(m.psf, { basePsf: 15, camPsf: 2, taxPsf: 1, insPsf: 0.5, totalPsf: 18.5, monthly: 9250 });
  assert.equal(m.sf, 6000);
  close(m.share, 0.6);
  assert.equal(m.leaseYear, 3);
});

test("model: unknown economics stay null — never zero", () => {
  const m = camStatementModel(recon(), rowOf(recon(), "B"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_B });
  assert.deepEqual(m.psf, { basePsf: null, camPsf: 2, taxPsf: null, insPsf: 0.5, totalPsf: null, monthly: null });
  assert.equal(m.recoveriesKnown, false);
  assert.equal(m.trueUp, null);
  assert.equal(m.amountDue, null);
  assert.equal(m.credit, null);
});

test("model: lines carry billed / actual / capped / owed per component; totals and the credit reconcile", () => {
  const m = camStatementModel(recon(), rowOf(recon(), "A"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_A });
  assert.deepEqual(m.lines.map(l => l.key), ["cam", "tax", "ins"]);
  const cam = m.lines[0];
  close(cam.billed, 12000); close(cam.actualShare, 12000); close(cam.cappedShare, 6300); close(cam.owed, 6300);
  assert.equal(cam.capped, true);
  const tax = m.lines[1];
  close(tax.cappedShare, 5400); close(tax.owed, 5400);
  close(m.totals.billed, 21000);
  close(m.totals.actualShare, 19800);
  close(m.totals.cappedShare, 14100);
  close(m.totals.owed, 14100);
  close(m.trueUp, -6900);
  assert.equal(m.amountDue, 0);
  close(m.credit, 6900);
  assert.equal(m.recoveriesKnown, true);
});

test("model: amount due when actual share exceeds estimates; cap block and audit rights surface", () => {
  const r = reconModel(UNITS, RECOVERIES, { cam: 40000, taxes: 9000, insurance: 4000 }, { glaSf: 10000, grossUpPct: 0, year: 2026, terms: TERMS });
  const m = camStatementModel(r, rowOf(r, "A"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_A });
  close(m.totals.actualShare, 31800);
  assert.equal(m.totals.cappedShare, null, "no prior-year actuals → cap cannot be computed");
  close(m.trueUp, 10800);
  close(m.amountDue, 10800);
  assert.equal(m.credit, 0);
  assert.equal(m.cap.pct, 0.05);
  assert.equal(m.cap.applies, true);
  assert.equal(m.cap.computed, false);
  assert.match(m.cap.reason, /prior-year actuals not on file/);
  assert.equal(m.cap.fromLeaseYear, 2);
  assert.deepEqual(m.cap.components, ["cam", "tax", "ins"]);
  assert.equal(m.auditRights, true);
});

test("model: no cap on file → cap.pct null with the reason; methodology drops the 'Exhibit C' reference", () => {
  const r = reconModel(UNITS, RECOVERIES, ACTUALS, { glaSf: 10000, year: 2026, terms: TERMS }); // derived gross-up
  const m = camStatementModel(r, rowOf(r, "B"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_B });
  assert.equal(m.cap.pct, null);
  assert.equal(m.cap.applies, false);
  assert.match(m.cap.reason, /no cap on file/i);
  assert.equal(m.auditRights, false);
  assert.ok(!/Exhibit C/.test(m.methodology));
  assert.match(m.methodology, /90% occupancy/);
  close(m.grossUp.factor, 0.95 / 0.9);
  assert.equal(m.grossUp.derived, true);
});

test("model: year falls back to the recon year; missing inputs throw", () => {
  const r = recon();
  assert.equal(camStatementModel(r, rowOf(r, "A"), RECOVERIES, TERMS, {}).year, 2026);
  assert.throws(() => camStatementModel(null, rowOf(r, "A"), RECOVERIES, TERMS, { year: 2026 }));
  assert.throws(() => camStatementModel(r, null, RECOVERIES, TERMS, { year: 2026 }));
});

/* ---- document ---- */
const htmlA = () => camStatementHTML(camStatementModel(recon(), rowOf(recon(), "A"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_A }), INFO_A, { issuedISO: "2027-03-15" });

test("HTML escapes the dba; the transcription note stays off the tenant statement — no raw markup survives", () => {
  const html = htmlA();
  assert.ok(html.includes("Alpha &lt;b&gt;&quot;Co&quot;&lt;/b&gt;"));
  assert.ok(!html.includes("abstract note"), "operator transcription note must not print for the tenant");
  assert.ok(!html.includes("<b>") && !html.includes("<i>"), "unescaped markup leaked from data");
});

test("HTML carries letterhead, title, meta, PSF breakdown, reconciliation table, cap line, methodology, audit note", () => {
  const html = htmlA();
  assert.ok(html.includes("<title>CAM Reconciliation — Unit A — 2026</title>"));
  assert.ok(html.includes("ON THE BOULEVARD"));
  assert.ok(html.includes("Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd, Lafayette, LA 70506"));
  assert.ok(html.includes("Annual Reconciliation of Additional Rent — 2026"));
  assert.ok(html.includes("Mar 15, 2027"));
  assert.ok(html.includes("6,000 SF"));
  assert.ok(html.includes("60.00%"));
  assert.ok(html.includes("Lease year 3"));
  // PSF breakdown row: Base · CAM · Tax · Ins → Total PSF → $/mo (TOTAL rent)
  assert.ok(html.includes("$15.00") && html.includes("$2.00") && html.includes("$1.00") && html.includes("$0.50") && html.includes("$18.50"));
  assert.ok(html.includes("$9,250.00"));
  assert.ok(html.includes("Estimates billed") && html.includes("Actual share") && html.includes("Capped share"));
  assert.ok(html.includes("$21,000.00") && html.includes("$19,800.00") && html.includes("$14,100.00"));
  assert.ok(html.includes("5% cap over 2025 actuals applied (lease year 3) — cap binding"));
  assert.ok(html.includes("no gross-up applied"));
  assert.ok(html.includes("audit rights"));
  assert.ok(html.includes("Cypress Command"));
});

test("HTML balance box: credit → clear class and CR figure; amount due → owe class", () => {
  const credit = htmlA();
  assert.ok(credit.includes('class="v clear"'));
  assert.ok(credit.includes("−$6,900.00 CR"));
  assert.ok(credit.includes("Credit to tenant"));
  const r = reconModel(UNITS, RECOVERIES, { cam: 40000, taxes: 9000, insurance: 4000 }, { glaSf: 10000, grossUpPct: 0, year: 2026, terms: TERMS });
  const owe = camStatementHTML(camStatementModel(r, rowOf(r, "A"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_A }), INFO_A, { issuedISO: "2027-03-15" });
  assert.ok(owe.includes('class="v owe"'));
  assert.ok(owe.includes("$10,800.00"));
  assert.ok(owe.includes("Amount due"));
  assert.ok(!owe.includes("audit rights") || TERMS.A.auditRights, "audit note follows the terms row");
});

test("HTML renders unknown economics as — and withholds the balance; no cap → 'No cap on file'", () => {
  const r = recon();
  const html = camStatementHTML(camStatementModel(r, rowOf(r, "B"), RECOVERIES, TERMS, { year: 2026, unitInfo: INFO_B }), INFO_B, { issuedISO: "2027-03-15" });
  assert.ok(html.includes("Not determinable"));
  assert.ok(html.includes("recovery PSF not on file"));
  assert.ok(html.includes("No cap on file"));
  assert.ok(!html.includes("audit rights"));
  assert.ok(!html.includes("$0.00"), "unknown monthly and unknown estimates must not print as $0");
  assert.ok(html.includes('class="num">—</td>'), "unknown PSF prints as —");
});
