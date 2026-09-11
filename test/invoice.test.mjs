import test from "node:test";
import assert from "node:assert/strict";
import {
  invoiceNumber, invoiceModel, invoiceStatus, invoiceHTML, invoiceMonths,
} from "../src/lib/invoice.js";

const E = (id, unit, type, amount, date, extra = {}) => ({ id, unit, type, amount, date, ...extra });

/* Unit-105 ledger: Aug rent + a posted late fee + a second late fee that gets
   VOIDED + a partial payment; Sept rent untouched. A foreign-unit row and a
   hostile description ride along to prove filtering + escaping. */
const FIX = [
  E("c1", "105", "charge", 1000, "2026-08-01", { due: "2026-08-01", code: "rent", description: "Rent 2026-08 — Pink <Paisley>" }),
  E("f1", "105", "late_fee", 100, "2026-08-08", { code: "late_fee", description: "Late fee 2026-08" }),
  E("f2", "105", "late_fee", 50, "2026-08-09", { code: "late_fee", description: "duplicate fee" }),
  E("v1", "105", "void", 0, "2026-08-09", { voidOf: "f2", description: "void" }),
  E("p1", "105", "payment", 400, "2026-08-10", { description: "check #1001" }),
  E("c2", "105", "charge", 1200, "2026-09-01", { due: "2026-09-01", code: "rent", description: "Rent 2026-09" }),
  E("x1", "107", "charge", 999, "2026-08-01", { code: "rent" }), // other unit — ignored
];

/* ---- invoiceNumber ---- */
test("invoice number is INV-YYYYMM-<unit>, deterministic, and rejects a bad ym", () => {
  assert.equal(invoiceNumber("2026-08", "105"), "INV-202608-105");
  assert.equal(invoiceNumber("2026-08", "135A"), "INV-202608-135A");
  assert.equal(invoiceNumber("2026-08", "105"), invoiceNumber("2026-08", "105"));
  assert.throws(() => invoiceNumber("202608", "105"), /YYYY-MM/);
});

/* ---- invoiceModel ---- */
test("model collects the month's effective debits only — void pair dropped, other unit ignored", () => {
  const m = invoiceModel(FIX, "105", "2026-08");
  assert.equal(m.id, "INV-202608-105");
  assert.equal(m.unit, "105");
  assert.equal(m.ym, "2026-08");
  assert.equal(m.monthLabel, "August 2026");
  assert.deepEqual(m.entryIds, ["c1", "f1"]);
  assert.deepEqual(m.lines.map(l => [l.date, l.amount]), [["2026-08-01", 1000], ["2026-08-08", 100]]);
  assert.ok(!m.lines.some(l => l.amount === 50 || l.amount === 999));
  assert.equal(m.amount, 1100);
  assert.equal(m.due, "2026-08-01"); // the rent charge's due date
});

test("model applies payments FIFO across the unit — Aug partial, Sept untouched", () => {
  const aug = invoiceModel(FIX, "105", "2026-08");
  assert.equal(aug.paid, 400);
  assert.equal(aug.balance, 700);
  const sep = invoiceModel(FIX, "105", "2026-09");
  assert.equal(sep.amount, 1200);
  assert.equal(sep.paid, 0);
  assert.equal(sep.balance, 1200);
  assert.equal(sep.due, "2026-09-01");
});

test("model is null when the month has no debits, and null/empty-safe", () => {
  assert.equal(invoiceModel(FIX, "105", "2026-10"), null);
  assert.equal(invoiceModel([], "105", "2026-08"), null);
  assert.equal(invoiceModel(null, "105", "2026-08"), null);
  assert.equal(invoiceModel(FIX, "131", "2026-08"), null);
  assert.throws(() => invoiceModel(FIX, "105", "Aug 2026"), /YYYY-MM/);
});

test("due falls back to the 1st when no rent charge carries a due date", () => {
  const m = invoiceModel([E("m1", "105", "charge", 25, "2026-08-14", { code: "misc", description: "key" })], "105", "2026-08");
  assert.equal(m.due, "2026-08-01");
  assert.equal(m.amount, 25);
});

/* ---- invoiceStatus (paid is DERIVED, never stored) ---- */
const stored = (over = {}) => ({ id: "INV-202608-105", unit: "105", ym: "2026-08", status: "draft", entryIds: ["c1", "f1"], ...over });

test("partial: payments cover some of the debits; overdue only past due + grace", () => {
  const early = invoiceStatus(stored(), FIX, "2026-08-03");
  assert.equal(early.status, "partial");
  assert.equal(early.overdue, false);
  assert.equal(early.balance, 700);
  const late = invoiceStatus(stored({ status: "sent" }), FIX, "2026-08-20");
  assert.equal(late.status, "partial");
  assert.equal(late.overdue, true);
});

test("paid: FIFO payments cover the invoice in full; never overdue", () => {
  const rows = FIX.concat([E("p2", "105", "payment", 700, "2026-08-20", { description: "check #1002" })]);
  const s = invoiceStatus(stored({ status: "sent" }), rows, "2026-09-30");
  assert.equal(s.status, "paid");
  assert.equal(s.overdue, false);
  assert.equal(s.balance, 0);
  assert.equal(s.paid, 1100);
});

test("sent vs draft follow the stored row when nothing has been applied", () => {
  assert.equal(invoiceStatus({ unit: "105", ym: "2026-09", status: "draft", entryIds: ["c2"] }, FIX, "2026-09-02").status, "draft");
  assert.equal(invoiceStatus({ unit: "105", ym: "2026-09", status: "sent", entryIds: ["c2"] }, FIX, "2026-09-02").status, "sent");
  const od = invoiceStatus({ unit: "105", ym: "2026-09", status: "sent", entryIds: ["c2"] }, FIX, "2026-09-30");
  assert.equal(od.status, "sent");
  assert.equal(od.overdue, true);
});

test("void: stored void, or every underlying charge voided in the ledger", () => {
  assert.equal(invoiceStatus(stored({ status: "void" }), FIX, "2026-08-20").status, "void");
  const rows = FIX.concat([
    E("v2", "105", "void", 0, "2026-08-21", { voidOf: "c1" }),
    E("v3", "105", "void", 0, "2026-08-21", { voidOf: "f1" }),
  ]);
  const s = invoiceStatus(stored({ status: "sent" }), rows, "2026-08-22");
  assert.equal(s.status, "void");
  assert.equal(s.overdue, false);
  assert.equal(s.balance, 0);
});

test("status is null-safe on an empty ledger", () => {
  const s = invoiceStatus(stored(), [], "2026-08-20");
  assert.equal(s.status, "void");
  assert.equal(s.overdue, false);
});

/* ---- invoiceMonths ---- */
test("months list = statement range restricted to months that carry a debit, newest first", () => {
  assert.deepEqual(invoiceMonths(FIX.filter(e => e.unit === "105"), "2026-10"), ["2026-09", "2026-08"]);
  assert.deepEqual(invoiceMonths([], "2026-10"), []);
  assert.deepEqual(invoiceMonths(null, "2026-10"), []);
});

/* ---- invoiceHTML ---- */
test("HTML: title is the invoice number; letterhead, totals, and escaping hold", () => {
  const m = invoiceModel(FIX, "105", "2026-08");
  const html = invoiceHTML(m, { dba: 'Pink <script>alert("x")</script>' }, { issuedISO: "2026-08-02" });
  assert.match(html, /<title>INV-202608-105<\/title>/);
  assert.match(html, /ON THE BOULEVARD/);
  assert.match(html, /Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd/);
  assert.match(html, /August 2026/);
  assert.ok(!html.includes("<script>"), "hostile dba must be escaped");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("Pink <Paisley>"), "hostile description must be escaped");
  assert.ok(html.includes("Pink &lt;Paisley&gt;"));
  assert.ok(html.includes("$1,100.00"), "total charges");
  assert.ok(html.includes("$400.00"), "payments applied");
  assert.ok(html.includes("$700.00"), "balance due");
  assert.match(html, /Aug 2, 2026/);
  assert.match(html, /Save as PDF/);
});

test("HTML: null-safe unitInfo; zero balance renders as clear", () => {
  const rows = FIX.concat([E("p2", "105", "payment", 700, "2026-08-20")]);
  const html = invoiceHTML(invoiceModel(rows, "105", "2026-08"), null, { issuedISO: "2026-08-21" });
  assert.match(html, /class="v clear"/);
  assert.ok(html.includes("$0.00"));
});
