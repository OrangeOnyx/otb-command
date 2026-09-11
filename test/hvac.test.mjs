/* F-4 HVAC PM contracts — pure-half guard. Tests ONLY the fold/sort/date/id
   logic in src/lib/hvac.js (nextDue period math incl. month-end clamping,
   hvacDeadlines window + overdue flag + active-only, sortHvac ordering,
   injectable id generator, frequency/status validation fallbacks, vocabulary
   coverage of the schema CHECKs, the §9.01 prefill shape, the hvac_units
   join helper). No Supabase, no DOM — the REMOTE data layer is exercised in
   the app, not here. Boundary reminder: the §9.01 covenant FACT stays in
   facts.js; the prefill is derived from it and is never a seed row. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  HVAC_FREQ, HVAC_STATUS, validHvacFreq, validHvacStatus, hvacId,
  nextDue, hvacDeadlines, sortHvac, covenant149Prefill, hvacSystemsFor,
} from "../src/lib/hvac.js";
import { HVAC_149 } from "../src/lib/facts.js";

const C = (id, over = {}) => ({
  id, unit: "131", vendor_id: "", vendor_name: "Vendor " + id, scope: "",
  frequency: "monthly", starts_on: null, ends_on: null, last_service_on: null,
  status: "active", ref: "", notes: "", ...over,
});

/* ---- vocabulary ---- */
test("hvac: vocabulary covers every frequency and status the schema allows", () => {
  for (const f of ["monthly", "quarterly", "semiannual", "annual"]) assert.ok(HVAC_FREQ[f], f);
  for (const s of ["active", "lapsed", "ended"]) assert.ok(HVAC_STATUS[s], s);
  assert.equal(Object.keys(HVAC_FREQ).length, 4);
  assert.equal(Object.keys(HVAC_STATUS).length, 3);
});

/* ---- nextDue ---- */
test("hvac: nextDue = last_service_on + one period per frequency", () => {
  const last = "2026-01-15";
  assert.equal(nextDue(C("m", { frequency: "monthly", last_service_on: last })), "2026-02-15");
  assert.equal(nextDue(C("q", { frequency: "quarterly", last_service_on: last })), "2026-04-15");
  assert.equal(nextDue(C("s", { frequency: "semiannual", last_service_on: last })), "2026-07-15");
  assert.equal(nextDue(C("a", { frequency: "annual", last_service_on: last })), "2027-01-15");
});

test("hvac: nextDue clamps to the last day of a shorter target month (no overflow)", () => {
  assert.equal(nextDue(C("x", { frequency: "monthly", last_service_on: "2026-01-31" })), "2026-02-28");
  assert.equal(nextDue(C("x", { frequency: "monthly", last_service_on: "2024-01-31" })), "2024-02-29"); // leap
  assert.equal(nextDue(C("x", { frequency: "quarterly", last_service_on: "2026-03-31" })), "2026-06-30");
  assert.equal(nextDue(C("x", { frequency: "semiannual", last_service_on: "2026-08-31" })), "2027-02-28"); // year roll
  assert.equal(nextDue(C("x", { frequency: "quarterly", last_service_on: "2026-11-30" })), "2027-02-28");
  assert.equal(nextDue(C("x", { frequency: "monthly", last_service_on: "2026-12-31" })), "2027-01-31");
});

test("hvac: nextDue — never serviced falls back to starts_on; nothing dated → null", () => {
  assert.equal(nextDue(C("x", { starts_on: "2026-10-01" })), "2026-10-01");
  assert.equal(nextDue(C("x", { starts_on: "2026-10-01", last_service_on: "2026-09-05" })), "2026-10-05"); // service wins
  assert.equal(nextDue(C("x")), null);
  assert.equal(nextDue(C("x", { starts_on: "garbage", last_service_on: "" })), null);
  assert.equal(nextDue(C("x", { starts_on: "not-a-date", last_service_on: "2026-09-05" })), "2026-10-05");
  assert.equal(nextDue(null), null);
});

test("hvac: nextDue — unknown frequency degrades to monthly (validator fallback)", () => {
  assert.equal(nextDue(C("x", { frequency: "weekly", last_service_on: "2026-01-15" })), "2026-02-15");
});

/* ---- T-1 deadline feed ---- */
test("hvac: deadlines keep ACTIVE contracts due within the grace horizon or overdue", () => {
  const rows = hvacDeadlines([
    C("edge", { last_service_on: "2026-09-11" }),                 // due 2026-10-11 = today+30 → in
    C("far", { last_service_on: "2026-09-12" }),                  // due 2026-10-12 → beyond horizon → out
    C("soon", { last_service_on: "2026-08-20" }),                 // due 2026-09-20 → in
    C("today", { last_service_on: "2026-08-11" }),                // due today → in, not overdue
    C("over", { last_service_on: "2026-07-01" }),                 // due 2026-08-01 → overdue
    C("ancient", { last_service_on: "2025-01-01" }),              // still unserviced → stays (derived date never ages off)
    C("lapsed", { status: "lapsed", last_service_on: "2026-08-20" }),
    C("ended", { status: "ended", last_service_on: "2026-08-20" }),
    C("nodate"),                                                  // no nextDue → out
  ], "2026-09-11");
  assert.deepEqual(rows.map(r => r.id), ["ancient", "over", "today", "soon", "edge"]); // soonest first
  assert.deepEqual(rows.map(r => r.overdue), [true, true, false, false, false]); // today ≠ overdue
});

test("hvac: deadlines grace horizon is injectable", () => {
  const items = [C("a", { last_service_on: "2026-09-01" }), C("b", { last_service_on: "2026-09-11" })];
  assert.deepEqual(hvacDeadlines(items, "2026-09-11", 0).map(r => r.id), []);        // neither due yet
  assert.deepEqual(hvacDeadlines(items, "2026-09-11", 20).map(r => r.id), ["a"]);     // 10/01 in, 10/11 out
  assert.deepEqual(hvacDeadlines(items, "2026-09-11", 30).map(r => r.id), ["a", "b"]);
  assert.deepEqual(hvacDeadlines(null, "2026-09-11"), []);
});

test("hvac: deadline rows carry id/unit/title/vendor/ref/date/overdue/frequency", () => {
  const [r] = hvacDeadlines([C("x", {
    unit: "149", vendor_name: "Butcher Air Conditioning", ref: "§9.01",
    scope: "Monthly PM", last_service_on: "2026-08-20",
  })], "2026-09-11");
  assert.deepEqual(r, {
    id: "x", unit: "149", title: "Monthly PM", vendor: "Butcher Air Conditioning",
    ref: "§9.01", date: "2026-09-20", overdue: false, frequency: "monthly",
  });
  const [n] = hvacDeadlines([C("y", { scope: "", last_service_on: "2026-08-20" })], "2026-09-11");
  assert.equal(n.title, "HVAC preventive maintenance"); // blank scope → generic title, never ""
});

/* ---- list ordering ---- */
test("hvac: sort — active, lapsed, ended; nextDue nulls-last then unit", () => {
  const sorted = sortHvac([
    C("e1", { status: "ended", last_service_on: "2026-01-01" }),
    C("a3", { unit: "149" }),                                   // active, no date
    C("l1", { status: "lapsed" }),
    C("a2", { unit: "105", last_service_on: "2026-09-01" }),    // due 10/01
    C("a1", { unit: "131", last_service_on: "2026-08-01" }),    // due 09/01
    C("a4", { unit: "103" }),                                   // active, no date, unit before 149
  ]);
  assert.deepEqual(sorted.map(c => c.id), ["a1", "a2", "a4", "a3", "l1", "e1"]);
});

test("hvac: sort does not mutate its input", () => {
  const input = [C("b", { status: "ended" }), C("a")];
  sortHvac(input);
  assert.deepEqual(input.map(c => c.id), ["b", "a"]);
});

/* ---- validators ---- */
test("hvac: validHvacFreq/validHvacStatus pass valid keys, fall back safely", () => {
  for (const f of Object.keys(HVAC_FREQ)) assert.equal(validHvacFreq(f), f);
  assert.equal(validHvacFreq("weekly"), "monthly");
  assert.equal(validHvacFreq(undefined), "monthly");
  for (const s of Object.keys(HVAC_STATUS)) assert.equal(validHvacStatus(s), s);
  assert.equal(validHvacStatus("junk"), "active");
  assert.equal(validHvacStatus(null), "active");
});

/* ---- id generator ---- */
test("hvac: hvacId is hvac:<unit>:-prefixed and deterministic under injection", () => {
  const a = hvacId("149", 1700000000000, 0.5);
  assert.equal(a, "hvac:149:" + (1700000000000).toString(36) + Math.floor(0.5 * 1e6).toString(36));
  assert.equal(hvacId("149", 1700000000000, 0.5), a);
  assert.notEqual(hvacId("149", 1700000000001, 0.5), a);
  assert.notEqual(hvacId("131", 1700000000000, 0.5), a);
  assert.ok(hvacId("135A").startsWith("hvac:135A:"));
});

/* ---- §9.01 prefill (derived from facts.js, never a seed) ---- */
test("hvac: covenant149Prefill mirrors the repo-locked §9.01 fact", () => {
  const p = covenant149Prefill();
  assert.deepEqual(p, {
    unit: "149",
    vendor_id: "butcher-air-conditioning",
    vendor_name: "Butcher Air Conditioning",
    frequency: "monthly",
    ref: "§9.01",
    scope: "Monthly preventive maintenance — Unit 149 HVAC (tenant-held)",
  });
  assert.equal(p.unit, HVAC_149.unit);
  assert.equal(p.vendor_name, HVAC_149.contractor);
  assert.equal(p.ref, HVAC_149.clause);
  assert.notEqual(covenant149Prefill(), p); // fresh object each call — callers may mutate
});

/* ---- hvac_units join ---- */
test("hvac: hvacSystemsFor matches unit or unit_label (case-insensitive), ordered by system_index", () => {
  const rows = [
    { id: "1", unit: "135a", unit_label: "", system_index: 2, system_type: "Split" },
    { id: "2", unit: "", unit_label: "135A", system_index: 1, system_type: "PKG Unit" },
    { id: "3", unit: "149", unit_label: "149", system_index: 1, system_type: "RTU" },
    { id: "4", unit: "135A", unit_label: "135A", system_index: null, system_type: "Mini-split" },
  ];
  assert.deepEqual(hvacSystemsFor(rows, "135A").map(r => r.id), ["2", "1", "4"]); // nulls last
  assert.deepEqual(hvacSystemsFor(rows, "149").map(r => r.id), ["3"]);
  assert.deepEqual(hvacSystemsFor(rows, "131"), []);
  assert.deepEqual(hvacSystemsFor(null, "149"), []);
});
