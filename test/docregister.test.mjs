/* Document register (src/lib/docregister.js) — the sectioned owner-document
   model behind K-1 / unit-drawer document cards and the S-1 risk register +
   renewal radar. Guards: vocabulary + fallbacks, amount/date formatting,
   the days-chip ladder, which rows a card shows, worst-first / soonest-first
   ordering, and that non-active documents stay off the radar. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  DOC_STATUS, DOC_RISK, validStatus, validRisk, fmtAmount, fmtYmd, daysChip,
  docDetail, riskRegister, renewalRadar,
} from "../src/lib/docregister.js";

const TODAY = "2026-09-18";

test("docregister: vocabulary + fallbacks + formatting", () => {
  assert.deepEqual(Object.keys(DOC_STATUS), ["active", "expired", "superseded", "reference"]);
  assert.deepEqual(Object.keys(DOC_RISK), ["none", "low", "medium", "high"]);
  assert.equal(validStatus("active"), "active");
  assert.equal(validStatus("bogus"), "");
  assert.equal(validRisk("high"), "high");
  assert.equal(validRisk(undefined), "none");
  assert.equal(fmtAmount(13647), "$13,647");
  assert.equal(fmtAmount("7,988,449"), "$7,988,449");
  assert.equal(fmtAmount("$1,500,000.00"), "$1,500,000");
  assert.equal(fmtAmount(""), "");
  assert.equal(fmtAmount("n/a"), "");
  assert.equal(fmtYmd("2027-05-15"), "May 15, 2027");
  assert.equal(fmtYmd("bad"), "bad");
});

test("docregister: daysChip ladder", () => {
  assert.equal(daysChip("", TODAY), null);
  assert.equal(daysChip("2026/09/18", TODAY), null);
  assert.deepEqual(daysChip("2026-09-10", TODAY), { days: -8, label: "8d overdue", tone: "brick" });
  assert.deepEqual(daysChip("2026-09-18", TODAY), { days: 0, label: "today", tone: "brick" });
  assert.equal(daysChip("2026-10-18", TODAY).tone, "brass");
  assert.equal(daysChip("2027-01-18", TODAY).tone, "anchor");
  assert.equal(daysChip("2027-05-15", TODAY).tone, "slate");
});

const HARTFORD = { id: "pd:ac:hartford", name: "Hartford Package — GL + Umbrella (26–27)", type: "Insurance · liability",
  counterparty: "Hartford Underwriters (agent: TSL)", ref: "43SBMAL3XX2", amount: 13647, amountKind: "premium",
  effective: "2026-05-15", expires: "2027-05-15", status: "active", risk: "low", riskNote: "Liability only by design.", note: "Named insured: Belle Realty." };
const LOAN = { id: "pd:ac:loan", name: "Investar Bank Term Loan", type: "Loan", counterparty: "Investar Bank",
  amount: 1500000, amountKind: "loan", effective: "2019-10-30", matures: "2030-04-30", status: "active", risk: "low" };
const TITLE = { id: "pd:ac:title", name: "Fidelity — Loan Policy (2007)", type: "Title", counterparty: "Fidelity National Title",
  ref: "Policy No. 74102317", amount: 1250000, amountKind: "insured", effective: "2007-07-25", status: "reference", risk: "high", riskNote: "Lender policy for a prior mortgage." };
const PLAIN = { id: "pd:plat", name: "Recorded plat", type: "Survey", ref: "M&D 1994" };
const EXPIRED = { id: "d:1:coi", name: "COI", type: "Certificate of insurance", unit: "105", expires: "2026-09-01", status: "expired" };

test("docregister: docDetail rows only when data exists, labels by kind/status", () => {
  const h = docDetail(HARTFORD, TODAY);
  assert.equal(h.detailed, true);
  assert.equal(h.statusLabel, "Active");
  assert.equal(h.riskLabel, "Low risk");
  assert.deepEqual(h.rows.map(r => r.k), ["Reference", "Premium", "Effective", "Renews / expires"]);
  assert.equal(h.rows[1].v, "$13,647");
  assert.equal(h.rows[3].chip.tone, "slate");
  const l = docDetail(LOAN, TODAY);
  assert.deepEqual(l.rows.map(r => r.k), ["Principal", "Effective", "Matures"]);
  assert.equal(l.rows[2].v, "Apr 30, 2030");
  const t = docDetail(TITLE, TODAY);
  assert.equal(t.rows.find(r => r.k === "Amount insured").v, "$1,250,000");
  assert.equal(t.statusLabel, "Reference");
  const p = docDetail(PLAIN, TODAY);
  assert.equal(p.detailed, false);
  assert.deepEqual(p.rows.map(r => r.k), ["Reference"]);
  assert.equal(p.riskLabel, "");
  // an expired (non-active) dated doc gets no countdown chip and a neutral label
  const e = docDetail(EXPIRED, TODAY);
  assert.equal(e.rows[0].k, "Renews / expires");
  assert.equal(e.rows[0].chip, null);
  assert.equal(docDetail({ ...PLAIN, status: "reference", expires: "2019-10-30" }, TODAY).rows[1].k, "Dated");
});

test("docregister: riskRegister worst-first", () => {
  const reg = riskRegister([HARTFORD, PLAIN, LOAN, TITLE, EXPIRED]);
  assert.deepEqual(reg.map(r => r.id), ["pd:ac:title", "pd:ac:hartford", "pd:ac:loan"]);
  assert.equal(reg[0].riskLabel, "High risk");
  assert.equal(reg[0].riskNote, "Lender policy for a prior mortgage.");
  assert.deepEqual(riskRegister([]), []);
});

test("docregister: renewalRadar soonest-first, active only, renewal beats maturity", () => {
  const both = { id: "x", name: "Both dates", expires: "2026-11-01", matures: "2026-10-01", status: "active" };
  const radar = renewalRadar([HARTFORD, PLAIN, LOAN, TITLE, EXPIRED, both], TODAY);
  assert.deepEqual(radar.map(r => r.id), ["x", "pd:ac:hartford", "pd:ac:loan"]);
  assert.equal(radar[0].kind, "Renews");
  assert.equal(radar[0].date, "2026-11-01");
  assert.equal(radar[1].chip.label, "in 239d");
  assert.equal(radar[2].kind, "Matures");
  assert.equal(radar[2].dateLabel, "Apr 30, 2030");
  // no status = treated as active (legacy K-1 records with an expires date)
  assert.equal(renewalRadar([{ id: "y", name: "y", expires: "2026-09-30" }], TODAY).length, 1);
});
