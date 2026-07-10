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
    const expect = u.base + r.cam + r.tax + r.ins;
    assert.ok(Math.abs(u.total - expect) < 0.005, `unit ${u.unit}: total ${u.total} ≠ base+NNN ${expect.toFixed(2)}`);
  }
});

test("monthly = total × SF / 12 for every leased unit", () => {
  for (const u of units) {
    if (!u.monthly) continue;
    const expect = u.total * u.sf / 12;
    assert.ok(Math.abs(u.monthly - expect) < 0.5, `unit ${u.unit}: monthly ${u.monthly} ≠ ${expect.toFixed(2)}`);
  }
});

test("income composition reconciles to in-place rent within rounding", () => {
  const comp = { base: 0, cam: 0, tax: 0, ins: 0 };
  units.forEach(u => {
    comp.base += (u.base || 0) * u.sf;
    const r = recoveries.units[u.unit];
    if (r) { comp.cam += r.cam * u.sf; comp.tax += r.tax * u.sf; comp.ins += r.ins * u.sf; }
  });
  const compTotal = comp.base + comp.cam + comp.tax + comp.ins;
  const monthlyAnnual = units.reduce((s, u) => s + (u.monthly || 0), 0) * 12;
  assert.ok(Math.abs(compTotal - monthlyAnnual) < 1, `composition ${compTotal.toFixed(2)} vs monthly×12 ${monthlyAnnual.toFixed(2)} (Δ must be <$1)`);
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
