/* Guard: pure folds of src/lib/payhistory.js — the read-only Asset Command
   payment_history import (313 rows, 2025-07 → 2026-07). Filtering must be
   string-keyed against row.unit, stats must count by `status` (the lateness
   truth — paid_at is meaningless for the bulk-entered 2026-07 period, and a
   blank status counts as clean), and portfolio totals must return a null
   on-time rate for empty input, never 0/0. */
import test from "node:test";
import assert from "node:assert/strict";
import { unitPayHistory, payHistoryStats, portfolioPayTotals } from "../src/lib/payhistory.js";

/* Fixture resembling real payment_history rows. */
const R = (unit, period, due, paid, status, extra = {}) => ({
  unit, period, amount_due: due, amount_paid: paid, status,
  paid_at: null, late_fee: 0, method: "check", check_number: null,
  notes: "", source: "ac", ...extra,
});

const FIX = [
  R("105", "2025-07", 3231.16, 3231.16, "paid", { paid_at: "2025-07-01", check_number: "1042" }),
  R("105", "2025-08", 3231.16, 3231.16, "late", { late_fee: 150, paid_at: "2025-08-09" }),
  R("105", "2025-09", 3231.16, 1600, "partial"),
  R("105", "2025-10", 3231.16, 0, "unpaid", { method: "" }),
  R("105", "2026-07", 3231.16, 3231.16, "", { paid_at: "2026-07-31", method: "" }), // bulk-entered AC period
  R("149", "2025-07", 10500, 10500, "paid", { method: "ach" }),
  R("149", "2026-07", 10500, 10500, "paid", { paid_at: "2026-07-31" }),
];

const cents = n => Math.round(n * 100);

/* ---- unitPayHistory ---- */
test("unitPayHistory filters to the unit's rows only", () => {
  assert.equal(unitPayHistory(FIX, "105").length, 5);
  assert.deepEqual(unitPayHistory(FIX, "149").map(r => r.period), ["2025-07", "2026-07"]);
  assert.deepEqual(unitPayHistory(FIX, "131"), []);
});

test("unitPayHistory: numeric unit argument matches string row keys", () => {
  assert.equal(unitPayHistory(FIX, 105).length, 5);
  assert.equal(unitPayHistory(FIX, 149).length, 2);
});

test("unitPayHistory tolerates null/undefined rows", () => {
  assert.deepEqual(unitPayHistory(null, "105"), []);
  assert.deepEqual(unitPayHistory(undefined, "105"), []);
});

/* ---- payHistoryStats ---- */
test("payHistoryStats counts statuses per unit and sums money", () => {
  const by = payHistoryStats(FIX);
  const s = by["105"];
  assert.equal(s.months, 5);
  assert.equal(s.paid, 2);      // "paid" + "" (blank status is clean — see module caveat)
  assert.equal(s.late, 1);
  assert.equal(s.partial, 1);
  assert.equal(s.unpaid, 1);
  assert.equal(cents(s.totalPaid), cents(3231.16 * 3 + 1600));
  assert.equal(s.lateFees, 150);

  const j = by["149"];
  assert.equal(j.months, 2);
  assert.equal(j.paid, 2);
  assert.equal(j.late + j.partial + j.unpaid, 0);
  assert.equal(cents(j.totalPaid), cents(21000));
});

test("payHistoryStats: blank status counts as paid (2026-07 bulk-entry caveat)", () => {
  const s = payHistoryStats([R("117.5", "2026-07", 2000, 2000, "")])["117.5"];
  assert.equal(s.paid, 1);
  assert.equal(s.late, 0);
});

test("payHistoryStats coerces string amounts and null fees to numbers", () => {
  const s = payHistoryStats([
    R("143", "2025-07", "500.25", "500.25", "paid", { late_fee: null }),
    R("143", "2025-08", 500.25, "abc", "unpaid", { late_fee: "25" }),
  ])["143"];
  assert.equal(cents(s.totalPaid), cents(500.25)); // "abc" → 0, "500.25" → 500.25
  assert.equal(s.lateFees, 25);                    // null → 0, "25" → 25
});

test("payHistoryStats on empty/null input is an empty map", () => {
  assert.deepEqual(payHistoryStats([]), {});
  assert.deepEqual(payHistoryStats(null), {});
});

/* ---- portfolioPayTotals ---- */
test("portfolioPayTotals: distinct months, dollar sums, on-time rate", () => {
  const t = portfolioPayTotals(FIX);
  assert.equal(t.rows, 7);
  assert.equal(t.months, 5); // 2025-07..10 + 2026-07
  assert.equal(cents(t.totalDue), cents(3231.16 * 5 + 10500 * 2));
  assert.equal(cents(t.totalPaid), cents(3231.16 * 3 + 1600 + 21000));
  assert.equal(t.lateFees, 150);
  // clean = paid(105/2025-07) + ""(105/2026-07) + both 149 rows = 4 of 7
  assert.equal(cents(t.onTimeRate * 100), cents((4 / 7) * 100));
});

test("portfolioPayTotals: empty input yields null rate, zero everything else", () => {
  for (const input of [[], null, undefined]) {
    const t = portfolioPayTotals(input);
    assert.equal(t.onTimeRate, null, "on-time rate must be null, not NaN/0");
    assert.equal(t.rows, 0);
    assert.equal(t.months, 0);
    assert.equal(t.totalDue, 0);
    assert.equal(t.totalPaid, 0);
    assert.equal(t.lateFees, 0);
  }
});
