/* Persisted-layer registry (lib/layers.js) — the single source that killed the
   hand-synced store-keys/remote-LAYERS twin lists. */
import test from "node:test";
import assert from "node:assert/strict";
import { LAYER_DEFS, LAYER_KEYS, emptyLayers, snapshotOf, OPEX_LINES } from "../src/lib/layers.js";

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
