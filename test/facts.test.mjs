import { test } from "node:test";
import assert from "node:assert/strict";
import { PARKING, JD_BANK, HVAC_149, EXCLUSIVES, APPRAISAL_2019, factLines } from "../src/lib/facts.js";

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

/* F-5 register row #19 (2026-09-11): the 2019 Broussard MAI appraisal is a
   repo-locked instrument fact sourced from the AC archive row
   (docs/harvest/ac-archive-2026-08-29/appraisals.json). S-1 shows it as a
   "Valuation on file" line; P-1 uses the cap rate as a hint only. */
test("2019 appraisal figures match the AC archive row", () => {
  assert.equal(APPRAISAL_2019.source, "ac:appraisals:003b088b-8ea5-4e87-9ef5-dc22e24c888c");
  assert.equal(APPRAISAL_2019.appraiser, "Terry J. Broussard, MAI, CCIM, MRICS");
  assert.equal(APPRAISAL_2019.effectiveDate, "2019-10-01");
  assert.equal(APPRAISAL_2019.asIsValue, 6000000);
  assert.equal(APPRAISAL_2019.asDevelopedValue, 6700000);
  assert.equal(APPRAISAL_2019.incomeApproachValue, 6712000);
  assert.equal(APPRAISAL_2019.salesComparisonValue, 6725000);
  assert.equal(APPRAISAL_2019.costApproachValue, 6535000);
  assert.equal(APPRAISAL_2019.landValue, 2160000);
  assert.equal(APPRAISAL_2019.noi, 570498);
  assert.equal(APPRAISAL_2019.capRatePct, 8.5);
  assert.equal(APPRAISAL_2019.buildingSf, 62749, "appraiser's SF — differs from GLA 62,883; surfaced, not fixed");
  assert.equal(APPRAISAL_2019.landSf, 210830);
  assert.ok(Object.isFrozen(APPRAISAL_2019));
  assert.throws(() => { "use strict"; APPRAISAL_2019.asIsValue = 1; });
});

test("appraisal fact lines carry value, NOI, cap rate, date — plain text", () => {
  const line = factLines.appraisal2019();
  assert.ok(line.includes("$6,000,000"));
  assert.ok(line.includes("$570,498"));
  assert.ok(line.includes("8.50%"));
  assert.ok(line.includes("Oct 1, 2019"));
  assert.ok(line.includes("$6,712,000") && line.includes("$6,725,000") && line.includes("$6,535,000"));
  assert.ok(line.includes("Broussard"));
  assert.ok(!/[<>]/.test(line));
  const hint = factLines.capRateHint();
  assert.ok(hint.startsWith("8.50% per 2019 appraisal"));
  assert.ok(/reference only/i.test(hint));
});
