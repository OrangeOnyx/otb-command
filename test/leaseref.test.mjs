/* Guard: pure folds of src/lib/leaseref.js — the read-only AC lease
   reference (lease_abstracts + rent_escalation_ref). Lookup must be
   string-keyed against row.unit; escalationEvents must keep only valid-YMD
   rows on/after today (inclusive), drop free-text dates, sort soonest
   first, and coerce new_rent/previous_rent to finite numbers or null. */
import test from "node:test";
import assert from "node:assert/strict";
import { unitAbstract, unitEscalations, escalationEvents } from "../src/lib/leaseref.js";

/* Fixture resembling real rows. */
const ABS = [
  { unit: "129", commencement: "2024-03-01", expiration: "2029-02-28", base_rent: 4100, confidence: "high" },
  { unit: "149", commencement: "2010-06-01", expiration: "2030-05-31", base_rent: 10500, confidence: "medium" },
];
const ESC = [
  { unit: "129", effective_on: "2027-03-01", previous_rent: "4100", new_rent: "4223", increase_type: "fixed", increase_value: "3%", notice_required: "none", notes: "" },
  { unit: "129", effective_on: "2026-03-01", previous_rent: 4000, new_rent: 4100, increase_type: "fixed", increase_value: "", notice_required: null, notes: "" },
  { unit: "129", effective_on: "see rider", previous_rent: null, new_rent: "TBD", increase_type: "", increase_value: "", notice_required: "", notes: "free-text date from extraction" },
  { unit: "149", effective_on: "2026-06-01", previous_rent: 10000, new_rent: "n/a", increase_type: "cpi", increase_value: "CPI", notice_required: "90 days", notes: "" },
];

/* ---- unitAbstract ---- */
test("unitAbstract finds the unit's row; missing unit is null", () => {
  assert.equal(unitAbstract(ABS, "129").confidence, "high");
  assert.equal(unitAbstract(ABS, "131"), null);
});

test("unitAbstract: numeric unit argument matches string row keys", () => {
  assert.equal(unitAbstract(ABS, 149).base_rent, 10500);
});

test("unitAbstract tolerates null/undefined abstracts", () => {
  assert.equal(unitAbstract(null, "129"), null);
  assert.equal(unitAbstract(undefined, "129"), null);
});

/* ---- unitEscalations ---- */
test("unitEscalations filters to the unit's rows (invalid dates included — it does not judge)", () => {
  assert.equal(unitEscalations(ESC, "129").length, 3);
  assert.equal(unitEscalations(ESC, 149).length, 1); // numeric arg coerces
  assert.deepEqual(unitEscalations(ESC, "135A"), []);
  assert.deepEqual(unitEscalations(null, "129"), []);
});

/* ---- escalationEvents ---- */
test("escalationEvents keeps only future valid-YMD rows, sorted soonest first", () => {
  const ev = escalationEvents(ESC, "2026-04-01");
  // "see rider" dropped (invalid ymd); 129/2026-03-01 dropped (past)
  assert.deepEqual(ev.map(e => [e.unit, e.date]), [
    ["149", "2026-06-01"],
    ["129", "2027-03-01"],
  ]);
});

test("escalationEvents: effective_on equal to today is included (>= boundary)", () => {
  const ev = escalationEvents(ESC, "2026-06-01");
  assert.ok(ev.some(e => e.unit === "149" && e.date === "2026-06-01"));
});

test("escalationEvents coerces rents to numbers, null when not finite", () => {
  const ev = escalationEvents(ESC, "2026-04-01");
  const jd = ev.find(e => e.unit === "149");
  assert.equal(jd.newRent, null);     // "n/a" is not a number
  assert.equal(jd.prevRent, 10000);
  const cw = ev.find(e => e.unit === "129");
  assert.equal(cw.newRent, 4223);     // "4223" string → number
  assert.equal(cw.prevRent, 4100);    // "4100" string → number
  assert.equal(cw.type, "fixed");
  assert.equal(cw.notice, "none");
});

test("escalationEvents: null notice/type map to empty strings; empty input is []", () => {
  const ev = escalationEvents(
    [{ unit: "137", effective_on: "2099-01-01", previous_rent: 1, new_rent: 2, increase_type: null, notice_required: null }],
    "2026-04-01");
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, "");
  assert.equal(ev[0].notice, "");
  assert.deepEqual(escalationEvents([], "2026-04-01"), []);
  assert.deepEqual(escalationEvents(null, "2026-04-01"), []);
});
