import { test } from "node:test";
import assert from "node:assert/strict";
import { PARKING, JD_BANK, HVAC_149, EXCLUSIVES, factLines } from "../src/lib/facts.js";

/* Guard for carry-forward problem #4 (2026-07-22 extraction): fact literals
   were hardcoded in D-1/W-1/T-1 render functions. These pins are audit-grade
   property facts from CLAUDE.md — a drift here means geometry.json or
   instruments.json was edited away from the recorded instruments. */

test("parking variance facts match the audit record", () => {
  assert.equal(PARKING.entry, "99-11797");
  assert.equal(PARKING.provided, 324);
  assert.equal(PARKING.required, 344);
  assert.equal(PARKING.drawn, 314);
  assert.equal(PARKING.delta, -10, "plat striping vs variance Δ must stay surfaced");
});

test("JD Bank easement instrument", () => {
  assert.equal(JD_BANK.expires, "2034-12-30");
  assert.equal(JD_BANK.spaces, 13);
  assert.equal(JD_BANK.monthlyToBelle, 250);
  assert.match(JD_BANK.expires, /^\d{4}-\d{2}-\d{2}$/, "ISO date — T-1 parses via pDate");
  const d = new Date(JD_BANK.expires + "T00:00:00");
  assert.ok(!isNaN(d), "expiry must parse");
});

test("HVAC §9.01 covenant names Butcher and unit 149", () => {
  assert.equal(HVAC_149.unit, "149");
  assert.equal(HVAC_149.contractor, "Butcher Air Conditioning");
  assert.ok(factLines.hvac149().includes("§9.01"));
  assert.ok(factLines.hvac149().includes("Butcher"));
});

test("exclusive-use watch covers HotWorx (129) and C. Wolf (135A)", () => {
  assert.deepEqual(EXCLUSIVES.map(e => e.unit), ["129", "135A"]);
  assert.ok(factLines.exclusivesTitle().includes("HotWorx"));
  assert.ok(factLines.exclusivesDetail().includes("135A"));
});

test("fact lines carry the numbers (no HTML)", () => {
  const all = Object.values(factLines).map(fn => fn()).join(" ");
  assert.ok(all.includes("314") && all.includes("324") && all.includes("99-11797"));
  assert.ok(!/[<>]/.test(all), "seam emits plain strings; views escape/format");
  assert.equal(factLines.parkingReconTitle(), "Reconcile parking Δ−10");
});

test("facts are frozen — views cannot mutate the record", () => {
  assert.ok(Object.isFrozen(PARKING) && Object.isFrozen(JD_BANK) && Object.isFrozen(HVAC_149));
  assert.throws(() => { "use strict"; PARKING.provided = 999; });
});
