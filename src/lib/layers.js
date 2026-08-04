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

/* ── row contract (Phase B-5 typed layers) ────────────────────────
   Each layer maps to a typed Supabase table: toRows(layerState) → canonical
   row array (no tenancy stamps — remote adds org_id/property_id/origin at
   flush); fromRows(rows) → layer state (extra DB columns ignored). Law:
   fromRows(toRows(s)) ≡ s (test/layers-rows.test.mjs). `pos` preserves array
   order (custom cards, features) across the DB. ownsRow(row) scopes layers
   that share a table (directory_state, layer_settings) so sync/prime for one
   layer never touches its table-mate's rows. */
const numOrNull = v => (v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v);
const ownAll = () => true;

const overrideRows = collection => ({
  ownsRow: collection ? (r => r.collection === collection) : ownAll,
  toRows(s) {
    const ids = new Set([
      ...Object.keys(s.edit || {}),
      ...Object.keys(s.dismissed || {}),
      ...(s.custom || []).map(c => c.id),
      ...(collection ? [] : Object.keys(s.lane || {})),
    ]);
    const rows = [];
    for (const id of ids) {
      const pos = (s.custom || []).findIndex(c => c.id === id);
      const custom = pos >= 0 ? s.custom[pos] : null;
      const lane = collection ? undefined : (s.lane?.[id] || null);
      const edit = s.edit?.[id] || null;
      const dismissed = !!s.dismissed?.[id];
      if (!lane && !edit && !dismissed && !custom) continue; // fully reverted → no row
      rows.push(collection
        ? { collection, id, edit, dismissed, custom, pos: custom ? pos : null }
        : { card_id: id, lane, edit, dismissed, custom, pos: custom ? pos : null });
    }
    return rows;
  },
  fromRows(rows) {
    const s = collection ? { edit: {}, dismissed: {}, custom: [] }
                         : { lane: {}, edit: {}, dismissed: {}, custom: [] };
    const customs = [];
    for (const r of rows || []) {
      const id = collection ? r.id : r.card_id;
      if (!collection && r.lane) s.lane[id] = r.lane;
      if (r.edit) s.edit[id] = r.edit;
      if (r.dismissed) s.dismissed[id] = true;
      if (r.custom) customs.push(r);
    }
    s.custom = customs.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)).map(r => r.custom);
    return s;
  },
});

const singletonRows = key => ({
  ownsRow: r => r.key === key,
  toRows: s => [{ key, data: s }],
  fromRows: rows => (rows || []).find(r => r.key === key)?.data,
});

export const LAYER_DEFS = [
  { key: "comp", empty: null, // baseline needs unit seeds — store supplies it
    table: "comp_state", pk: ["unit", "field"], ownsRow: ownAll,
    toRows(s) {
      const rows = [];
      for (const [unit, fields] of Object.entries(s || {}))
        for (const [field, state] of Object.entries(fields || {}))
          rows.push({ unit, field, state });
      return rows;
    },
    fromRows(rows) {
      const s = {};
      for (const r of rows || []) (s[r.unit] ||= {})[r.field] = r.state;
      return s;
    } },
  { key: "notes", empty: () => ({}),
    table: "unit_notes", pk: ["unit"], ownsRow: ownAll,
    toRows: s => Object.entries(s || {}).map(([unit, text]) => ({ unit, text })),
    fromRows: rows => Object.fromEntries((rows || []).map(r => [r.unit, r.text])) },
  { key: "actions", empty: () => ({ lane: {}, edit: {}, dismissed: {}, custom: [] }),
    table: "board_state", pk: ["card_id"], ...overrideRows(null) },
  { key: "contacts", empty: emptyColl,
    table: "directory_state", pk: ["collection", "id"], ...overrideRows("contacts") },
  { key: "documents", empty: emptyColl,
    table: "directory_state", pk: ["collection", "id"], ...overrideRows("documents") },
  { key: "financials", empty: () => ({ opex: emptyOpex(), capRatePct: null }),
    table: "layer_settings", pk: ["key"], ...singletonRows("financials") },
  { key: "ownerSheets", empty: () => [...DEFAULT_OWNER_SHEETS],
    table: "layer_settings", pk: ["key"], ...singletonRows("owner_sheets") },
  { key: "features", empty: () => [],
    table: "site_features", pk: ["id"], ownsRow: ownAll,
    toRows: s => (s || []).map((f, i) => ({ id: f.id, type: f.type,
      label: f.label, note: f.note, x: f.x, y: f.y, pos: i })),
    fromRows: rows => (rows || []).slice()
      .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
      .map(r => ({ id: r.id, type: r.type, label: r.label, note: r.note, x: +r.x, y: +r.y })) },
  { key: "cameras", empty: () => ({}),
    table: "camera_overrides", pk: ["camera_id"], ownsRow: ownAll,
    toRows: s => Object.entries(s || {}).map(([camera_id, o]) => ({
      camera_id, x: numOrNull(o.x), y: numOrNull(o.y), aim_deg: numOrNull(o.aimDeg) })),
    fromRows(rows) {
      const s = {};
      for (const r of rows || []) {
        const o = {};
        if (r.x != null && r.y != null) { o.x = +r.x; o.y = +r.y; }
        if (r.aim_deg != null) o.aimDeg = +r.aim_deg;
        if (Object.keys(o).length) s[r.camera_id] = o;
      }
      return s;
    } },
];

export const ROW_TABLES = [...new Set(LAYER_DEFS.map(d => d.table))];

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
