/* Persisted-layer registry — THE single source for every persisted state layer.
   (2026-07-20 horizontal layer: store.js state keys and remote.js LAYERS were
   hand-synced twin lists — a layer added to one but not the other persisted
   locally but silently never synced to Supabase. Same bug class the pages.js
   nav table fixed for sheets.)

   store.js derives its state shape, resets, and persist/export payloads from
   this table; remote.js derives its sync allowlist. ADDING A LAYER = one entry
   here + its validation branch in store.applySnapshot() (+ nothing else).

   `empty` is a factory for the layer's pristine value. `comp` has empty:null —
   its baseline needs the unit seeds, so store.js supplies baselineComp via the
   overrides argument of emptyLayers(). Tested in test/layers.test.mjs. */
import { DEFAULT_OWNER_SHEETS } from "./pages.js";

/* P-1 operating-assumption lines (fixed schema — no add/remove). Lives here so
   the financials empty-factory and the P-1 view share one definition. */
export const OPEX_LINES = [
  ["taxes", "Property taxes"], ["insurance", "Insurance"], ["cam", "CAM / R&M"],
  ["mgmt", "Management"], ["utilities", "Utilities (common)"], ["reserves", "Reserves"]
];

const emptyOpex = () => Object.fromEntries(OPEX_LINES.map(([k]) => [k, 0]));
const emptyColl = () => ({ edit: {}, dismissed: {}, custom: [] });

export const LAYER_DEFS = [
  { key: "comp", empty: null }, // baseline needs unit seeds — store supplies it
  { key: "notes", empty: () => ({}) },
  { key: "actions", empty: () => ({ lane: {}, edit: {}, dismissed: {}, custom: [] }) },
  { key: "contacts", empty: emptyColl },
  { key: "documents", empty: emptyColl },
  { key: "financials", empty: () => ({ opex: emptyOpex(), capRatePct: null }) },
  { key: "ownerSheets", empty: () => [...DEFAULT_OWNER_SHEETS] },
  { key: "features", empty: () => [] },
  { key: "cameras", empty: () => ({}) },
];

export const LAYER_KEYS = LAYER_DEFS.map(d => d.key);

/* Fresh pristine state object covering EVERY registered layer.
   overrides: { key: factory } for layers whose empty needs outside data. */
export function emptyLayers(overrides = {}) {
  const out = {};
  for (const { key, empty } of LAYER_DEFS) {
    const make = overrides[key] || empty;
    if (typeof make !== "function")
      throw new Error(`layer "${key}" has no empty-factory — pass one in overrides`);
    out[key] = make();
  }
  return out;
}

/* Snapshot payload = exactly the registered layers, picked off a state object. */
export function snapshotOf(state) {
  return Object.fromEntries(LAYER_KEYS.map(k => [k, state[k]]));
}
