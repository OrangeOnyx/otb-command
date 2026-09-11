import test from "node:test";
import assert from "node:assert/strict";
import { canEditCompliance, filterComplianceRows } from "../src/lib/compliance-ui.js";

test("compliance activation rejects read-only roles and owner preview, independent of navigation classes", () => {
  assert.equal(canEditCompliance([]), true);
  assert.equal(canEditCompliance("nav-open role-operator"), true);
  for (const role of ["role-owner", "role-tenant", "role-vendor", "owner-preview"]) {
    assert.equal(canEditCompliance(["nav-open", role]), false, role);
  }
});

test("compliance search and flagged-row filter intersect current store states without changing source data", () => {
  const units = [{ unit: "101", dba: "Pink Paisley" }, { unit: "103", dba: "Pink Paisley" }, { unit: "149", dba: "Jason's Deli" }];
  const fields = [["coi", "Insurance"], ["dep", "Deposit"]];
  const states = { "101": { coi: "u", dep: "na" }, "103": { coi: "flag", dep: "ok" }, "149": { coi: "ok", dep: "flag" } };
  const before = JSON.stringify({ units, states });
  const read = (unit, field) => states[unit][field];
  assert.deepEqual(filterComplianceRows(units, fields, read).map(u => u.unit), ["101", "103", "149"]);
  assert.deepEqual(filterComplianceRows(units, fields, read, { query: "  PAISLEY  " }).map(u => u.unit), ["101", "103"]);
  assert.deepEqual(filterComplianceRows(units, fields, read, { query: "paisley", flaggedOnly: true }).map(u => u.unit), ["103"]);
  assert.deepEqual(filterComplianceRows(units, fields, read, { flaggedOnly: true }).map(u => u.unit), ["103", "149"]);
  assert.deepEqual(filterComplianceRows(units, fields, read, { query: "149" }).map(u => u.unit), ["149"]);
  assert.deepEqual(filterComplianceRows(units, fields, read, { query: "absent" }), []);
  assert.equal(JSON.stringify({ units, states }), before);
  const revised = (unit, field) => unit === "103" ? "ok" : read(unit, field);
  assert.deepEqual(filterComplianceRows(units, fields, revised, { flaggedOnly: true }).map(u => u.unit), ["149"], "filter re-reads current state");
});
