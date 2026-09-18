/* F-5 rulings 2026-09-17 — data guards for the two registers that moved
   from prose / a Python dict into src/data (D-19a title exceptions,
   D-19b pylon panels) and the late-fee citation (D-4b). */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TITLE_EXCEPTIONS, PYLON } from "../src/lib/facts.js";
import { OTB_LATE_POLICY } from "../src/lib/ledger.js";
import directory from "../src/data/directory.json" with { type: "json" };
import units from "../src/data/units.json" with { type: "json" };
import leaseBody from "../src/data/lease-body.json" with { type: "json" };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("title exceptions: the 13 AC recorded agreements, verbatim entry numbers, every registerDoc resolves", () => {
  assert.equal(TITLE_EXCEPTIONS.length, 13);
  const entries = TITLE_EXCEPTIONS.map(e => e.entryNumber);
  for (const absentBefore of ["98-18247", "99-041054", "286167", "97-012420", "445327"])
    assert.ok(entries.includes(absentBefore), absentBefore + " was the gap D-19a closes");
  assert.ok(entries.includes("99-11797") && entries.includes("2004-00057697"));
  const docIds = new Set(directory.propertyDocuments.map(d => d.id));
  for (const e of TITLE_EXCEPTIONS) {
    assert.ok(e.title && e.status, e.entryNumber + " needs title + status");
    if (e.registerDoc) assert.ok(docIds.has(e.registerDoc), e.entryNumber + " → " + e.registerDoc + " missing from the K-1 register");
  }
  assert.equal(TITLE_EXCEPTIONS.filter(e => e.registerDoc).length, 7, "8 of 13 were in Atlas by entry number; two drainage entries share one register row");
});

test("pylon register: 14 panels, unit-for-unit the operator's sign order, P13 flagged for reprint", () => {
  assert.equal(PYLON.panels.length, 14);
  const byPanel = Object.fromEntries(PYLON.panels.map(p => [p.panel, p.unit]));
  assert.deepEqual(byPanel, { P1: "107", P2: "149", P3: "123", P4: "139", P5: "109", P6: "125", P7: "115",
    P8: "129", P9: "119.5", P10: "111", P11: "143", P12: "117.5", P13: "145", P14: "119" });
  const unitIds = new Set(units.map(u => u.unit));
  for (const p of PYLON.panels) assert.ok(unitIds.has(p.unit), p.panel + " → unit " + p.unit + " not on the rent roll");
  assert.equal(new Set(PYLON.panels.map(p => p.unit)).size, 14, "no unit on two panels");
  const p13 = PYLON.panels.find(p => p.panel === "P13");
  assert.equal(p13.physicalReads, "Boulevard Nutrition");
  assert.ok(PYLON.zoning.includes("99-041054"), "signage zoning instrument cited");
});

test("pylon tool reads the same register (no second PANEL_UNIT source)", () => {
  const py = readFileSync(join(root, "tools/pylon.py"), "utf8");
  assert.match(py, /pylon\.json/);
  assert.ok(!/PANEL_UNIT=\{"P1"/.test(py), "hard-coded dict must be gone");
});

test("late-fee policy of record matches the lease body §4.01(C) (ruling D-4b)", () => {
  const body = leaseBody.filter ? leaseBody : Object.values(leaseBody).flat();
  const text = JSON.stringify(body);
  assert.match(text, /Amounts not received by day five incur \$100 plus \$25 per day beginning day six/);
  assert.deepEqual(OTB_LATE_POLICY, { graceDays: 5, flatFee: 100, perDayFee: 25 });
});
