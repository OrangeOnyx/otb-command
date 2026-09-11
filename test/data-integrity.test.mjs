import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => JSON.parse(readFileSync(join(root, "src/data", f), "utf8"));
const units = rd("units.json");
const recoveries = rd("recoveries.json");
const hvac = rd("hvac.json");

test("per-unit total = base + CAM + Tax + Ins (single-source invariant)", () => {
  for (const u of units) {
    if (u.status === "vacant" || !u.total) continue;
    const r = recoveries.units[u.unit];
    assert.ok(r, `unit ${u.unit} missing recoveries row`);
    if ([r.cam, r.tax, r.ins].some(value => value === null)) {
      assert.ok(u.leaseEvidence?.openItems?.length && r.note, `unit ${u.unit}: missing components require a documented review gap`);
      continue;
    }
    const expect = u.base + r.cam + r.tax + r.ins;
    assert.ok(Math.abs(u.total - expect) < 0.005, `unit ${u.unit}: total ${u.total} ≠ base+NNN ${expect.toFixed(2)}`);
  }
});

// Owner-accepted stated-rent exceptions (docs/sot-2026-07/known_exceptions.csv):
// billing uses the STATED monthly from the signed rent roll; PSF formula is an
// audit check only. Pink Paisley (101-103) group stated $16,008.90 vs formula
// $16,013.74 → documented −$4.84/mo. Do not "fix" these back to formula.
const STATED_EXCEPTIONS = { "101": 11085.81, "103": 4923.09 };

test("monthly = total × SF / 12 for every leased unit (except documented stated-rent exceptions)", () => {
  for (const u of units) {
    if (!u.monthly) continue;
    if (u.unit in STATED_EXCEPTIONS) {
      assert.equal(u.monthly, STATED_EXCEPTIONS[u.unit], `unit ${u.unit}: stated exception drifted`);
      continue;
    }
    const expect = u.total * u.sf / 12;
    assert.ok(Math.abs(u.monthly - expect) < 0.5, `unit ${u.unit}: monthly ${u.monthly} ≠ ${expect.toFixed(2)}`);
  }
});

test("complete income compositions reconcile to their stated rents within the documented variance", () => {
  const comp = { base: 0, cam: 0, tax: 0, ins: 0 };
  const completeUnits = units.filter(u => ['cam', 'tax', 'ins'].every(key => Number.isFinite(recoveries.units[u.unit]?.[key])));
  completeUnits.forEach(u => {
    comp.base += (u.base || 0) * u.sf;
    const r = recoveries.units[u.unit];
    if (r) { comp.cam += r.cam * u.sf; comp.tax += r.tax * u.sf; comp.ins += r.ins * u.sf; }
  });
  const compTotal = comp.base + comp.cam + comp.tax + comp.ins;
  const monthlyAnnual = completeUnits.reduce((s, u) => s + (u.monthly || 0), 0) * 12;
  // Expected gap = Pink Paisley owner-accepted −$4.84/mo = $58.08/yr (± rounding pennies)
  const documentedVariance = 4.84 * 12;
  const delta = compTotal - monthlyAnnual;
  assert.ok(Math.abs(delta - documentedVariance) < 1,
    `composition ${compTotal.toFixed(2)} vs monthly×12 ${monthlyAnnual.toFixed(2)}: Δ ${delta.toFixed(2)} ≠ documented ${documentedVariance.toFixed(2)} (±$1)`);
});

test("every unit id joins cleanly to recoveries and hvac (incl. 117.5 / 135A/B)", () => {
  const ids = new Set(units.map(u => u.unit));
  for (const u of units) {
    assert.ok(u.unit in recoveries.units, `recoveries missing ${u.unit}`);
    assert.ok(u.unit in hvac.units, `hvac missing ${u.unit}`);
  }
  for (const k of Object.keys(recoveries.units)) assert.ok(ids.has(k), `recoveries orphan ${k}`);
  for (const k of Object.keys(hvac.units)) assert.ok(ids.has(k), `hvac orphan ${k}`);
});

test("audit-grade headline figures unchanged (27 units, GLA sum 62,810)", () => {
  assert.equal(units.length, 27);
  const sfSum = units.reduce((s, u) => s + u.sf, 0);
  assert.equal(sfSum, 62810, "demised SF sum drifted from the audited 62,810");
});

/* ── recovery-terms.json (F-2) — per-unit CAM/Tax/Ins cap terms, reference only ── */
const terms = rd("recovery-terms.json");
const TERM_KEYS = ["capPct", "capBasis", "capFromLeaseYear", "capComponents", "auditRights", "baseYear", "source", "note"];
const CAP_COMPONENTS = ["cam", "tax", "ins"];

test("recovery-terms.json joins every unit exactly once with a valid cap shape", () => {
  assert.ok(typeof terms._note === "string" && terms._note.includes("lease_abstractions"), "_note records provenance");
  assert.deepEqual(Object.keys(terms.units).sort(), units.map(u => u.unit).sort());
  for (const [unit, t] of Object.entries(terms.units)) {
    assert.ok(Object.keys(t).every(k => TERM_KEYS.includes(k)), unit + ": unknown key " + Object.keys(t).join(","));
    assert.ok(t.capPct === null || (typeof t.capPct === "number" && t.capPct > 0 && t.capPct < 1), unit + ": capPct");
    assert.ok(t.capBasis === null || t.capBasis === "prior_year_actuals", unit + ": capBasis");
    assert.ok(t.capFromLeaseYear === null || (Number.isInteger(t.capFromLeaseYear) && t.capFromLeaseYear >= 1), unit + ": capFromLeaseYear");
    assert.ok(Array.isArray(t.capComponents) && t.capComponents.every(c => CAP_COMPONENTS.includes(c)) &&
      new Set(t.capComponents).size === t.capComponents.length, unit + ": capComponents");
    assert.equal(typeof t.auditRights, "boolean", unit + ": auditRights");
    assert.ok(t.baseYear === null || (Number.isInteger(t.baseYear) && t.baseYear >= 1990 && t.baseYear <= 2100), unit + ": baseYear");
    assert.ok(typeof t.source === "string" && (t.source === "" || /^ac:lease_abstractions:[0-9a-f-]{36}$/.test(t.source)), unit + ": source");
    if ("note" in t) assert.ok(typeof t.note === "string" && t.note.length, unit + ": note");
    if (t.capPct !== null) {
      assert.ok(t.capBasis && t.capFromLeaseYear && t.capComponents.length && t.source, unit + ": a cap needs basis, start year, components and a source");
    } else {
      assert.equal(t.capBasis, null, unit); assert.equal(t.capFromLeaseYear, null, unit); assert.equal(t.capComponents.length, 0, unit);
    }
  }
});

test("recovery-terms: 14 capped units per the AC abstracts (143 = 4% CAM-only; 145 audit rights; no base-year clause anywhere)", () => {
  const capped = Object.entries(terms.units).filter(([, t]) => t.capPct !== null).map(([u]) => u).sort();
  assert.deepEqual(capped, ["101", "103", "105", "109", "111", "115", "119", "121", "123", "125", "127", "141", "143", "145"].sort());
  assert.equal(terms.units["143"].capPct, 0.04);
  assert.deepEqual(terms.units["143"].capComponents, ["cam"]);
  for (const u of capped.filter(u => u !== "143")) {
    assert.equal(terms.units[u].capPct, 0.05, u);
    assert.deepEqual([...terms.units[u].capComponents].sort(), [...CAP_COMPONENTS].sort(), u);
    assert.equal(terms.units[u].capFromLeaseYear, 2, u);
  }
  assert.deepEqual(Object.entries(terms.units).filter(([, t]) => t.auditRights).map(([u]) => u), ["145"]);
  assert.ok(Object.values(terms.units).every(t => t.baseYear === null));
  for (const u of units) {
    const sourced = terms.units[u.unit].source !== "";
    assert.equal(sourced, u.status !== "vacant" && u.status !== "owner", u.unit + ": abstraction on file iff leased");
  }
});

test("store exposes recovery terms for every unit on the roll (public reference data, no seed gate)", async () => {
  const { getRecoveryTerms, recoveryTermsFor, UNITS } = await import("../src/store.js");
  const t = getRecoveryTerms();
  assert.deepEqual(Object.keys(t).sort(), UNITS.map(u => u.unit).sort());
  assert.equal(recoveryTermsFor("143").capPct, 0.04);
  assert.equal(recoveryTermsFor("nope"), null);
});
