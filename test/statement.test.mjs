import test from "node:test";
import assert from "node:assert/strict";
import { statementModel, statementHTML, statementMonths, monthLabel } from "../src/lib/statement.js";
import { LEDGER_START_YM } from "../src/lib/ledger.js";

const E = (id, unit, type, amount, date, extra = {}) => ({ id, unit, type, amount, date, ...extra });

/* Two months of unit-105 history: Aug charge+partial payment; Sept charge,
   a late fee that gets VOIDED, and a full payment. Plus a foreign-unit row. */
const FIX = [
  E("c1", "105", "charge", 1000, "2026-08-01", { due: "2026-08-01", code: "rent", description: "Rent 2026-08" }),
  E("p1", "105", "payment", 400, "2026-08-10", { description: "check #1001" }),
  E("c2", "105", "charge", 1200, "2026-09-01", { due: "2026-09-01", code: "rent", description: "Rent 2026-09" }),
  E("f1", "105", "late_fee", 100, "2026-09-08", { description: "Late fee 2026-09" }),
  E("v1", "105", "void", 0, "2026-09-09", { voidOf: "f1", description: "void" }),
  E("p2", "105", "payment", 1200, "2026-09-15", { description: "check <b>#1042</b>" }),
  E("x1", "107", "charge", 999, "2026-08-01", { code: "rent" }), // other unit — ignored
];

/* ---- statementModel ---- */
test("opening balance is the signed sum strictly before ym; lines carry running balances", () => {
  const m = statementModel(FIX, "105", "2026-09");
  assert.equal(m.openingBalance, 600); // 1000 − 400, Aug only
  assert.deepEqual(m.lines.map(l => l.balance), [1800, 600]); // continues from opening
  assert.deepEqual(m.lines.map(l => l.date), ["2026-09-01", "2026-09-15"]);
});

test("void pair drops: neither the late fee nor the void marker renders", () => {
  const m = statementModel(FIX, "105", "2026-09");
  assert.equal(m.lines.length, 2);
  assert.ok(!m.lines.some(l => /Late fee|void/.test(l.description)));
});

test("charge/payment columns split by DEBIT_TYPES; totals and closing are exact", () => {
  const m = statementModel(FIX, "105", "2026-09");
  assert.deepEqual(m.lines.map(l => [l.charge, l.payment]), [[1200, null], [null, 1200]]);
  assert.equal(m.totalCharges, 1200);
  assert.equal(m.totalPayments, 1200);
  assert.equal(m.closingBalance, 600);
});

test("first month opens at zero; other units' rows never leak in", () => {
  const m = statementModel(FIX, "105", "2026-08");
  assert.equal(m.openingBalance, 0);
  assert.deepEqual(m.lines.map(l => l.balance), [1000, 600]);
  assert.equal(m.totalCharges, 1000);
  assert.equal(m.totalPayments, 400);
  assert.ok(!m.lines.some(l => l.charge === 999));
});

test("empty month: opening carries through, no lines, closing = opening", () => {
  const m = statementModel(FIX, "105", "2026-10");
  assert.equal(m.openingBalance, 600); // whole prior history netted
  assert.equal(m.lines.length, 0);
  assert.equal(m.closingBalance, 600);
});

test("malformed ym throws", () => {
  assert.throws(() => statementModel(FIX, "105", "2026-9"));
});

/* ---- statementMonths ---- */
test("months run LEDGER_START_YM → today inclusive, newest first", () => {
  assert.deepEqual(statementMonths(FIX, "2026-09"), ["2026-09", "2026-08"]);
  assert.deepEqual(statementMonths([], LEDGER_START_YM), [LEDGER_START_YM]);
});

test("months list is capped at the newest 24", () => {
  const list = statementMonths([], "2028-12"); // 29 months since 2026-08
  assert.equal(list.length, 24);
  assert.equal(list[0], "2028-12");
  assert.equal(list[23], "2027-01");
  for (let i = 1; i < list.length; i++) assert.ok(list[i] < list[i - 1], "newest first");
});

test("a back-dated effective entry widens the range; a voided one does not", () => {
  const back = [E("m1", "105", "charge", 50, "2026-06-15", { code: "misc" })];
  assert.ok(statementMonths(back, "2026-08").includes("2026-06"));
  const voided = [...back, E("v9", "105", "void", 0, "2026-08-01", { voidOf: "m1" })];
  assert.deepEqual(statementMonths(voided, "2026-08"), ["2026-08"]);
});

/* ---- statementHTML ---- */
const INFO = { unit: "105", dba: 'Café <b>"Latte"</b>', sf: 2000 };

test("HTML escapes the dba and every data field — no raw <b> survives", () => {
  const html = statementHTML(statementModel(FIX, "105", "2026-09"), INFO, { issuedISO: "2026-09-30" });
  assert.ok(html.includes("Café &lt;b&gt;&quot;Latte&quot;&lt;/b&gt;"));
  assert.ok(html.includes("check &lt;b&gt;#1042&lt;/b&gt;"));
  assert.ok(!html.includes("<b>"), "unescaped <b> leaked from data");
});

test("HTML carries letterhead, month title, issued date, balance due, and the ledger note", () => {
  const html = statementHTML(statementModel(FIX, "105", "2026-09"), INFO, { issuedISO: "2026-09-30" });
  assert.ok(html.includes("ON THE BOULEVARD"));
  assert.ok(html.includes("Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd, Lafayette, LA 70506"));
  assert.ok(html.includes("Statement — " + monthLabel("2026-09")));
  assert.ok(html.includes("Sep 30, 2026"));
  assert.ok(html.includes("Balance due"));
  assert.ok(html.includes("Statement generated from the Atlas ledger — entries from " + LEDGER_START_YM));
});

test("balance due colors: brick class when owed, green class when settled or credit", () => {
  const owed = statementHTML(statementModel(FIX, "105", "2026-09"), INFO, { issuedISO: "2026-09-30" });
  assert.ok(owed.includes('class="v owe"')); // closing 600 > 0
  const credit = statementModel([E("p9", "105", "payment", 50, "2026-08-05")], "105", "2026-08");
  const html = statementHTML(credit, INFO, { issuedISO: "2026-08-31" });
  assert.ok(html.includes('class="v clear"'));
  assert.ok(html.includes("−$50.00 CR"));
});

test("monthLabel renders the document month", () => {
  assert.equal(monthLabel("2026-08"), "August 2026");
  assert.equal(monthLabel("2027-01"), "January 2027");
});
