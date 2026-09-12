/* Persisted-layer registry (lib/layers.js) — the single source that killed the
   hand-synced store-keys/remote-LAYERS twin lists. */
import test from "node:test";
import assert from "node:assert/strict";
import { LAYER_DEFS, LAYER_KEYS, emptyLayers, snapshotOf, OPEX_LINES, cleanOpexYears } from "../src/lib/layers.js";

const KNOWN = ["comp", "notes", "actions", "contacts", "documents",
  "financials", "ownerSheets", "features", "cameras"];

test("registry covers exactly the known layers, unique, in order", () => {
  assert.deepEqual(LAYER_KEYS, KNOWN);
  assert.equal(new Set(LAYER_KEYS).size, LAYER_KEYS.length);
});

test("emptyLayers materializes every layer and returns fresh instances", () => {
  const mkComp = () => ({ "101": { bl: "u" } });
  const a = emptyLayers({ comp: mkComp });
  const b = emptyLayers({ comp: mkComp });
  assert.deepEqual(Object.keys(a).sort(), [...KNOWN].sort());
  for (const k of KNOWN) {
    assert.ok(a[k] !== undefined && a[k] !== null, k + " materialized");
    if (typeof a[k] === "object") assert.notEqual(a[k], b[k], k + " must not share references");
  }
  assert.deepEqual(a.actions, { lane: {}, edit: {}, dismissed: {}, custom: [] });
  assert.deepEqual(a.ownerSheets.length > 0, true, "ownerSheets seeds from pages defaults");
});

test("emptyLayers throws when a factory-less layer gets no override (comp)", () => {
  assert.throws(() => emptyLayers(), /comp.*empty-factory/);
});

test("snapshotOf picks exactly the registered layers off a state object", () => {
  const state = emptyLayers({ comp: () => ({}) });
  state.NOT_A_LAYER = 42;
  const snap = snapshotOf(state);
  assert.deepEqual(Object.keys(snap).sort(), [...KNOWN].sort());
  assert.ok(!("NOT_A_LAYER" in snap));
});

test("financials empty shape carries every OPEX line + null cap rate", () => {
  const { financials } = emptyLayers({ comp: () => ({}) });
  assert.deepEqual(Object.keys(financials.opex).sort(), OPEX_LINES.map(([k]) => k).sort());
  assert.equal(financials.capRatePct, null);
  assert.ok(Object.values(financials.opex).every(v => v === 0));
});

test("every registered layer except comp carries its own empty factory", () => {
  for (const { key, empty } of LAYER_DEFS) {
    if (key === "comp") assert.equal(empty, null);
    else assert.equal(typeof empty, "function", key);
  }
});

/* ── financials.opexYears (F-2): prior-year actuals keyed by calendar year ── */
test("financials empty shape carries an empty opexYears map", () => {
  const { financials } = emptyLayers({ comp: () => ({}) });
  assert.deepEqual(financials.opexYears, {});
});

test("cleanOpexYears keeps YYYY keys with the six OPEX lines, coerces numbers, floors negatives at 0", () => {
  const out = cleanOpexYears({ "2025": { taxes: "1200", insurance: 300.5, cam: -5, mgmt: 0, utilities: 10, reserves: 0 } });
  assert.deepEqual(Object.keys(out), ["2025"]);
  assert.deepEqual(Object.keys(out["2025"]).sort(), OPEX_LINES.map(([k]) => k).sort());
  assert.equal(out["2025"].taxes, 1200);
  assert.equal(out["2025"].insurance, 300.5);
  assert.equal(out["2025"].cam, 0);
});

test("cleanOpexYears rejects non-year keys, non-object years, unknown lines and non-numeric values", () => {
  const out = cleanOpexYears({
    "2024": { taxes: 100, bogus: 7, cam: "abc", mgmt: null },
    "24": { taxes: 1 }, "2024-01": { taxes: 1 }, "abcd": { taxes: 1 },
    "2023": 42, "2022": null, "2021": [1, 2],
  });
  assert.deepEqual(Object.keys(out), ["2024"]);
  assert.equal(out["2024"].taxes, 100);
  assert.equal(out["2024"].cam, 0, "non-numeric string → 0, line kept");
  assert.equal(out["2024"].mgmt, 0);
  assert.ok(!("bogus" in out["2024"]));
});

test("cleanOpexYears tolerates missing/invalid input and returns fresh objects", () => {
  assert.deepEqual(cleanOpexYears(undefined), {});
  assert.deepEqual(cleanOpexYears(null), {});
  assert.deepEqual(cleanOpexYears([]), {});
  assert.deepEqual(cleanOpexYears("2025"), {});
  const src = { "2025": { taxes: 1 } };
  const out = cleanOpexYears(src);
  assert.notEqual(out["2025"], src["2025"]);
});

test("financials layer round-trips opexYears through toRows/fromRows", () => {
  const d = LAYER_DEFS.find(l => l.key === "financials");
  const s = { opex: { taxes: 1, insurance: 0, cam: 0, mgmt: 0, utilities: 0, reserves: 0 }, capRatePct: null,
    opexYears: { "2025": { taxes: 9, insurance: 8, cam: 7, mgmt: 6, utilities: 5, reserves: 4 } } };
  assert.deepEqual(d.fromRows(d.toRows(s)), s);
});
