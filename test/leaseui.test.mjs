// test/leaseui.test.mjs — pure parts of the drawer lease panel only (no DOM).
import test from "node:test";
import assert from "node:assert/strict";
import { harvestInputs } from "../src/lib/leaseUI.js";

test("harvestInputs maps form values to engine inputs with numeric coercion + defaults", () => {
  const v = {
    lesseeLegalName: " Bayou Furniture Co, LLC ", lesseeEntityType: "limited liability company",
    lesseeState: "Louisiana", lesseeNoticeAddress: "PO Box 1", lesseeEmail: "j@b.com",
    lesseePhone: "337-555-0100", lesseeRep: "Jane Doe", signerName: "Jane Doe", signerTitle: "Member",
    permittedUse: "retail sale of furniture", useStandard: "", executionDate: "2026-09-01",
    effectiveDate: "2026-09-01", commencementDate: "2026-10-01", expirationDate: "2031-09-30",
    additionalTermDates: "", basePsf: "14.5", termMonths: "60", escalationPct: "",
    freeRentMonths: "2", constructionMonths: "", deposit: "4000", renewalSummary: "", guarantyRequired: true,
  };
  const i = harvestInputs(v, "131");
  assert.equal(i.unit, "131");
  assert.equal(i.lesseeLegalName, "Bayou Furniture Co, LLC"); // trimmed
  assert.equal(i.useStandard, "retail");                       // default
  assert.equal(i.basePsf, 14.5);                               // number
  assert.equal(i.escalationPct, 0);                            // "" → 0
  assert.equal(i.guarantyRequired, true);
});

test("harvestInputs: blank NNN override (camPsf/taxPsf/insPsf) coerces to NaN, never 0", () => {
  const i = harvestInputs({ camPsf: "2.1", taxPsf: "", insPsf: "" }, "131");
  assert.equal(i.camPsf, 2.1);
  assert.ok(Number.isNaN(i.taxPsf), "blank taxPsf must be NaN, not 0 — the engine must reject it");
  assert.ok(Number.isNaN(i.insPsf), "blank insPsf must be NaN, not 0 — the engine must reject it");
});

test("harvestInputs: all three NNN overrides provided coerce to numbers", () => {
  const i = harvestInputs({ camPsf: "2.1", taxPsf: "0.9", insPsf: "1.0" }, "131");
  assert.equal(i.camPsf, 2.1);
  assert.equal(i.taxPsf, 0.9);
  assert.equal(i.insPsf, 1.0);
});
