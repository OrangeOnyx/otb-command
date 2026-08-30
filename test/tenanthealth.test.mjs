/* Tenant-health scoring (src/lib/tenanthealth.js) — pure folds over the
   predecessor payment record + rent-roll terms, with an injected today.
   GUARD (spec 2026-08-29-ac-harvest): lateness truth is `status`, never
   paid_at — the 2026-07 period was bulk-entered in Asset Command with a
   uniform timestamp. Fixtures below carry deliberately misleading paid_at
   values; if scoring or periodTotals ever derives lateness from paid_at,
   these tests fail. */
import test from "node:test";
import assert from "node:assert/strict";
import { tenantHealth, healthColor, periodTotals } from "../src/lib/tenanthealth.js";

const TODAY = "2026-08-29"; // fixed — never the live clock

// end dates measured from TODAY: ~36.6mo / ~18.0mo / ~8.0mo / ~3.1mo / past
const END_LONG = "2029-08-31";
const END_MID = "2028-02-28";
const END_SHORT = "2027-04-30";
const END_SOON = "2026-11-30";
const END_PAST = "2026-06-30";

const unit = (id, over = {}) =>
  ({ unit: id, dba: "Tenant " + id, status: "active", monthly: 1000, end: END_LONG, ...over });
const stats = (id, over = {}) =>
  ({ unit: id, months: 13, paid: 13, late: 0, partial: 0, unpaid: 0, totalPaid: 13000, lateFees: 0, ...over });

const one = (u, s) => tenantHealth([u], s ? { [u.unit]: s } : {}, TODAY)[0];

/* ---- payment record (max 60) ---- */
test("clean unit with long runway and no fees scores 100 = grade A", () => {
  const h = one(unit("101"), stats("101"));
  assert.equal(h.score, 100);
  assert.equal(h.grade, "A");
  assert.deepEqual(h.factors, []);
});

test("3 late months lose exactly 18 points and are named as a factor", () => {
  const clean = one(unit("101"), stats("101"));
  const h = one(unit("101"), stats("101", { late: 3, paid: 10 }));
  assert.equal(clean.score - h.score, 18);
  assert.ok(h.factors.includes("3 late months"));
});

test("unpaid and partial months are punished harder than late", () => {
  const late = one(unit("101"), stats("101", { late: 1 }));
  const partial = one(unit("101"), stats("101", { partial: 1 }));
  const unpaid = one(unit("101"), stats("101", { unpaid: 1 }));
  assert.ok(unpaid.score < partial.score, "unpaid < partial");
  assert.ok(partial.score < late.score, "partial < late");
  assert.ok(unpaid.factors.includes("1 unpaid month"));
  assert.ok(partial.factors.includes("1 partial month"));
});

test("payment component floors at 0 under heavy deductions", () => {
  // 5 unpaid = −75 raw; floor keeps score = 0 + 25 runway + 15 fees = 40
  const h = one(unit("101"), stats("101", { unpaid: 5 }));
  assert.equal(h.score, 40);
});

test("no history row = payment 45 + 'no predecessor record' factor", () => {
  const h = one(unit("131.5")); // not in stats map at all
  assert.equal(h.score, 45 + 25 + 15);
  assert.equal(h.grade, "A"); // 85 is the A boundary
  assert.ok(h.factors.includes("no predecessor record"));
});

/* ---- term runway (max 25) ---- */
test("runway bands: ≥24 → 25, 12–24 → 18, 6–12 → 10, <6 → 4", () => {
  const at = end => one(unit("101", { end }), stats("101")).score - 75; // 60 pay + 15 fees
  assert.equal(at(END_LONG), 25);
  assert.equal(at(END_MID), 18);
  assert.equal(at(END_SHORT), 10);
  assert.equal(at(END_SOON), 4);
});

test("runway factors describe the months left", () => {
  assert.ok(one(unit("101", { end: END_SHORT }), stats("101")).factors.includes("8 months runway"));
  assert.deepEqual(one(unit("101", { end: END_LONG }), stats("101")).factors, []); // full marks, no factor
});

test("expired term → runway 0 with 'past term' factor", () => {
  const past = one(unit("101", { end: END_PAST }), stats("101"));
  assert.equal(past.score, 75);
  assert.ok(past.factors.includes("past term"));
  // status:"expired" is past-term even if the recorded end is in the future
  const hold = one(unit("101", { end: END_LONG, status: "expired" }), stats("101"));
  assert.equal(hold.score, 75);
  assert.ok(hold.factors.includes("past term"));
});

/* ---- late-fee drag (max 15) ---- */
test("late-fee bands: $0 → 15, ≤$100 → 10, ≤$300 → 5, more → 0", () => {
  const at = lateFees => one(unit("101"), stats("101", { lateFees })).score - 85; // 60 pay + 25 run
  assert.equal(at(0), 15);
  assert.equal(at(100), 10);
  assert.equal(at(250), 5);
  assert.equal(at(500), 0);
});

test("late fees are named as a dollar factor", () => {
  assert.ok(one(unit("101"), stats("101", { lateFees: 225 })).factors.includes("$225 late fees"));
});

/* ---- roster + ordering ---- */
test("vacant and $0-monthly (owner-occupied) units are excluded", () => {
  const rows = tenantHealth([
    unit("131", { status: "vacant", monthly: 0 }),
    unit("135B", { monthly: 0 }),
    unit("101"),
  ], {}, TODAY);
  assert.deepEqual(rows.map(r => r.unit), ["101"]);
});

test("results sort worst-first", () => {
  const rows = tenantHealth(
    [unit("101"), unit("105"), unit("109")],
    {
      101: stats("101"),                               // 100
      105: stats("105", { unpaid: 4, lateFees: 500 }), // 0 + 25 + 0 = 25
      109: stats("109", { late: 2 }),                  // 48 + 25 + 15 = 88
    }, TODAY);
  assert.deepEqual(rows.map(r => r.unit), ["105", "109", "101"]);
  assert.equal(rows[0].grade, "E");
});

/* ---- periodTotals ---- */
test("periodTotals sums due/paid per period, computes cleanShare, sorts by period", () => {
  const rows = [
    // paid_at deliberately absurd — status is the only lateness truth (guard)
    { unit: "101", period: "2025-08", amount_due: 100, amount_paid: 100, status: "paid", paid_at: "2026-07-31" },
    { unit: "103", period: "2025-08", amount_due: 100, amount_paid: 50, status: "partial", paid_at: "2025-08-01" },
    { unit: "101", period: "2025-07", amount_due: 100, amount_paid: 100, status: "", paid_at: null },
  ];
  const t = periodTotals(rows);
  assert.deepEqual(t.map(p => p.period), ["2025-07", "2025-08"]);
  assert.deepEqual(t[0], { period: "2025-07", due: 100, paid: 100, cleanShare: 1 }); // "" counts clean
  assert.deepEqual(t[1], { period: "2025-08", due: 200, paid: 150, cleanShare: 0.5 });
});

test("periodTotals tolerates empty/absent input", () => {
  assert.deepEqual(periodTotals([]), []);
  assert.deepEqual(periodTotals(null), []);
});

/* ---- healthColor ---- */
test("healthColor maps A/B green, C brass, D/E brick", () => {
  assert.equal(healthColor("A"), "var(--green)");
  assert.equal(healthColor("B"), "var(--green)");
  assert.equal(healthColor("C"), "var(--brass)");
  assert.equal(healthColor("D"), "var(--brick)");
  assert.equal(healthColor("E"), "var(--brick)");
});
