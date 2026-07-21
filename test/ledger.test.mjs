import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  OTB_LATE_POLICY, computeDaysLate, computeLateFeeAmount, assessLateFee,
  effectiveEntries, withRunningBalance, unitBalance, monthRentCharges, aging, round2
} from "../src/lib/ledger.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const units = JSON.parse(readFileSync(join(root, "src/data/units.json"), "utf8"));

/* ---- late-fee schedule (donor spec semantics: grace 5, $100 flat, $25/day) ---- */
test("late fee: inside grace window assesses nothing", () => {
  for (const ref of ["2026-07-01", "2026-07-03", "2026-07-06"]) {
    const r = assessLateFee({ referenceDate: ref, dueDate: "2026-07-01" });
    assert.equal(r.shouldAssess, false, ref);
    assert.equal(r.amount, 0);
  }
});

test("late fee: OTB standard schedule — $100 day 1, $125 day 2, $150 day 3", () => {
  const cases = [["2026-07-07", 1, 100], ["2026-07-08", 2, 125], ["2026-07-09", 3, 150]];
  for (const [ref, days, amt] of cases) {
    const r = assessLateFee({ referenceDate: ref, dueDate: "2026-07-01" });
    assert.equal(r.daysLate, days, ref);
    assert.equal(r.amount, amt, ref);
  }
});

test("late fee: amounts never carry fractional cents", () => {
  const amt = computeLateFeeAmount(3, { graceDays: 0, flatFee: 100.005, perDayFee: 0.111 });
  assert.equal(amt, round2(amt));
});

test("computeDaysLate is 0 for future due dates", () => {
  assert.equal(computeDaysLate({ referenceDate: "2026-07-01", dueDate: "2026-08-01", graceDays: 5 }), 0);
});

/* ---- entry algebra ---- */
const E = (id, unit, type, amount, date, extra = {}) => ({ id, unit, type, amount, date, ...extra });

test("running balance: debits add, credits subtract, chronological", () => {
  const rows = withRunningBalance([
    E("c1", "105", "charge", 3231.16, "2026-07-01"),
    E("p1", "105", "payment", 3000, "2026-07-10"),
    E("f1", "105", "late_fee", 100, "2026-07-07"),
  ]);
  assert.deepEqual(rows.map(r => r.id), ["c1", "f1", "p1"]);
  assert.deepEqual(rows.map(r => r.runningBalance), [3231.16, 3331.16, 331.16]);
});

test("void-as-entry removes its target and itself; unknown voidOf is inert", () => {
  const list = [
    E("c1", "105", "charge", 100, "2026-07-01"),
    E("f1", "105", "late_fee", 100, "2026-07-07"),
    E("v1", "105", "void", 0, "2026-07-08", { voidOf: "f1" }),
    E("v2", "105", "void", 0, "2026-07-08", { voidOf: "ghost" }),
  ];
  assert.deepEqual(effectiveEntries(list).map(e => e.id), ["c1"]);
  assert.equal(unitBalance(list, "105"), 100);
});

/* ---- monthly charges ---- */
test("monthRentCharges: every rent-paying unit, total-rent convention, idempotent ids", () => {
  const charges = monthRentCharges(units, "2026-08");
  const paying = units.filter(u => (+u.monthly || 0) > 0);
  assert.equal(charges.length, paying.length);
  assert.ok(charges.length >= 20 && charges.length < units.length,
    `expected vacant/owner rows excluded (got ${charges.length}/${units.length})`);
  const u105 = charges.find(c => c.unit === "105");
  assert.equal(u105.amount, 3231.16);           // TOTAL rent, not base
  assert.equal(u105.id, "rent:2026-08:105");    // deterministic → idempotent
  assert.equal(new Set(charges.map(c => c.id)).size, charges.length);
});

test("monthRentCharges rejects malformed months", () => {
  assert.throws(() => monthRentCharges(units, "2026-8"));
});

/* ---- aging ---- */
test("aging: FIFO credits retire oldest debits first; buckets by age", () => {
  const entries = [
    E("c1", "121", "charge", 1000, "2026-03-01", { due: "2026-03-01" }),
    E("c2", "121", "charge", 1000, "2026-06-01", { due: "2026-06-01" }),
    E("c3", "121", "charge", 1000, "2026-07-01", { due: "2026-07-01" }),
    E("p1", "121", "payment", 1500, "2026-07-05"),
  ];
  const a = aging(entries, "2026-07-21")["121"];
  // p1 kills c1 (1000) + half of c2 (500) → c2 open 500 (age 50d), c3 open 1000 (age 20d)
  assert.equal(a.current, 1000);
  assert.equal(a.d31_60, 500);
  assert.equal(a.d61_90, 0);
  assert.equal(a.d90, 0);
  assert.equal(a.total, 1500);
});

test("aging: overpayment surfaces as credit and drops settled units", () => {
  const settled = aging([
    E("c1", "107", "charge", 500, "2026-07-01", { due: "2026-07-01" }),
    E("p1", "107", "payment", 500, "2026-07-02"),
  ], "2026-07-21");
  assert.equal(settled["107"], undefined);
  const over = aging([
    E("c1", "109", "charge", 500, "2026-07-01", { due: "2026-07-01" }),
    E("p1", "109", "payment", 600, "2026-07-02"),
  ], "2026-07-21")["109"];
  assert.equal(over.credit, -100);
  assert.equal(over.total, -100);
});
