/* Single source of mutable state. Every mutation writes through to localStorage.
   Persisted: compliance cell states + note overrides.
   C1: the CLIENT bundle carries only the public unit skeleton (no $/legal/notes);
   confidential fields are merged in at boot via installUnitsPrivate() from the
   auth-gated /api/seed endpoint. Full units.json stays the SOT for tools+server. */
import unitsData from "./data/units.public.json";
import complianceData from "./data/compliance.json";
import { PAGE_IDS } from "./lib/pages.js";
import { OPEX_LINES, emptyLayers, snapshotOf } from "./lib/layers.js";
export { OPEX_LINES }; // schema lives in the layer registry; re-exported for views

const LS_KEY = "otb-command-state-v1";
const STATE_VERSION = 1;

export const UNITS = unitsData;
export const byUnit = {};
UNITS.forEach(u => { byUnit[u.unit] = u; });

/* Merge confidential per-unit fields (base/total/monthly/legal/notes) into the
   skeleton objects IN PLACE — UNITS entries and byUnit values are the same
   references, so every view sees the merged data after boot hydration. */
export function installUnitsPrivate(map) {
  for (const [unit, priv] of Object.entries(map || {})) {
    if (byUnit[unit] && priv && typeof priv === "object") Object.assign(byUnit[unit], priv);
  }
}

export const COMP_FIELDS = complianceData.fields;
export const COMP_STATES = complianceData.states; // cycle order: u → ok → flag → na
export const SEED_NOTE = complianceData.seedNote;
const FOOD_ONLY = new Set(complianceData.foodOnly);
const VALID_STATE = new Set(complianceData.states);

/* baseline compliance state: na for vacant/owner and non-food food-only fields,
   unverified otherwise, then the documented per-unit seed (149 anchor). */
function baselineComp() {
  const comp = {};
  UNITS.forEach(u => {
    comp[u.unit] = {};
    COMP_FIELDS.forEach(([k]) => {
      if (u.status === "vacant" || u.status === "owner") comp[u.unit][k] = "na";
      else if (FOOD_ONLY.has(k) && u.cat !== "food") comp[u.unit][k] = "na";
      else comp[u.unit][k] = "u";
    });
  });
  for (const [unit, seed] of Object.entries(complianceData.seed)) {
    Object.assign(comp[unit], seed);
  }
  return comp;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

/* actions = override layer over the auto-seeded Action Board (W-1).
   Mirrors the notes-override pattern: the board derives cards from live data;
   the store persists only what the operator changed.
     lane[id]      → moved a seeded/custom card to a different lane
     edit[id]      → { title?, detail?, due? } inline edits to a seeded card
     dismissed[id] → archived/removed from the board
     custom[]      → operator-added cards ({id,kind,lane,title,detail,due,unit?}) */
const LANES = new Set(["watch", "action", "progress", "done"]);

/* generic record-collection override (Directory K-1: contacts + documents).
   Seeds live in the views; the store persists only edits/dismissals/custom. */
const COLLECTIONS = new Set(["contacts", "documents"]);

/* owner-visible sheets (Path B owner view): operator picks which sheets the
   shopping-center owners can see. Persisted + exported so it travels.
   PAGE_IDS/DEFAULT_OWNER_SHEETS live in lib/pages.js with the nav table. */

/* financials = operator-entered operating assumptions for the P-1 NOI rollup.
   Income is derived from the rent roll; expenses aren't in the SOT, so these
   annual figures are the one manual input. Schema (OPEX_LINES) + empty shape
   live in lib/layers.js with the rest of the layer registry. */

/* features = site-asset pins on A-1 (digital-twin layer): water shutoffs, meters,
   benches, cans, columns… Operator-placed points in plan coordinates (the A-1
   1480×990 space). Pure custom data — no seeds, whole array persists. */
export const FEATURE_TYPES = [
  ["shutoff", "💧", "Water shutoff"], ["meter", "⚡", "Utility meter"],
  ["hydrant", "🧯", "Fire hydrant/riser"], ["column", "🏛", "Column"],
  ["bench", "🪑", "Bench"], ["can", "🗑", "Trash can"],
  ["light", "💡", "Light pole"], ["sign", "🪧", "Sign"], ["other", "📍", "Other"]
];
const FEATURE_IDS = new Set(FEATURE_TYPES.map(t => t[0]));
const cleanFeature = f => ({
  id: String(f.id), type: FEATURE_IDS.has(f.type) ? f.type : "other",
  label: String(f.label || ""), note: String(f.note || ""), x: +f.x, y: +f.y
});

/* cameras = operator drag-corrections to the CCTV layer (A-1): camera id →
   { x, y, aimDeg } overriding the seeded ESTIMATES in data/cameras.json.
   Positions are property facts — once a walk confirms them, bake back into
   the seed and clear the overrides. */
const cleanCamOverride = o => {
  const r = {};
  if (Number.isFinite(+o.x) && Number.isFinite(+o.y)) { r.x = +o.x; r.y = +o.y; }
  if (Number.isFinite(+o.aimDeg)) r.aimDeg = ((+o.aimDeg % 360) + 360) % 360;
  return r;
};

/* Every persisted layer comes from the registry (lib/layers.js) — adding a
   layer there materializes it here, in persist/export, and in remote sync. */
const state = emptyLayers({ comp: baselineComp });
const saved = load();
if (saved) applySnapshot(saved);

function applySnapshot(snap) {
  if (snap.comp && typeof snap.comp === "object") {
    for (const [unit, fields] of Object.entries(snap.comp)) {
      if (!state.comp[unit] || typeof fields !== "object") continue;
      for (const [k, v] of Object.entries(fields)) {
        if (k in state.comp[unit] && VALID_STATE.has(v)) state.comp[unit][k] = v;
      }
    }
  }
  if (snap.notes && typeof snap.notes === "object") {
    for (const [unit, v] of Object.entries(snap.notes)) {
      if (byUnit[unit] && typeof v === "string") state.notes[unit] = v;
    }
  }
  const a = snap.actions;
  if (a && typeof a === "object") {
    if (a.lane && typeof a.lane === "object")
      for (const [id, l] of Object.entries(a.lane)) if (LANES.has(l)) state.actions.lane[id] = l;
    if (a.edit && typeof a.edit === "object")
      for (const [id, e] of Object.entries(a.edit)) if (e && typeof e === "object") state.actions.edit[id] = e;
    if (a.dismissed && typeof a.dismissed === "object")
      for (const [id, v] of Object.entries(a.dismissed)) if (v) state.actions.dismissed[id] = true;
    if (Array.isArray(a.custom))
      state.actions.custom = a.custom.filter(c => c && typeof c === "object" && c.id && c.title);
  }
  for (const name of COLLECTIONS) {
    const c = snap[name];
    if (!c || typeof c !== "object") continue;
    if (c.edit && typeof c.edit === "object")
      for (const [id, e] of Object.entries(c.edit)) if (e && typeof e === "object") state[name].edit[id] = e;
    if (c.dismissed && typeof c.dismissed === "object")
      for (const [id, v] of Object.entries(c.dismissed)) if (v) state[name].dismissed[id] = true;
    if (Array.isArray(c.custom))
      state[name].custom = c.custom.filter(r => r && typeof r === "object" && r.id);
  }
  const f = snap.financials;
  if (f && typeof f === "object") {
    if (f.opex && typeof f.opex === "object")
      for (const [k, v] of Object.entries(f.opex)) if (k in state.financials.opex && Number.isFinite(+v)) state.financials.opex[k] = +v;
    if (f.capRatePct != null && Number.isFinite(+f.capRatePct)) state.financials.capRatePct = +f.capRatePct; // null must stay null, not coerce to 0
  }
  if (Array.isArray(snap.ownerSheets))
    state.ownerSheets = PAGE_IDS.filter(p => snap.ownerSheets.includes(p));
  if (Array.isArray(snap.features))
    state.features = snap.features
      .filter(f => f && typeof f === "object" && f.id && Number.isFinite(+f.x) && Number.isFinite(+f.y))
      .map(cleanFeature);
  if (snap.cameras && typeof snap.cameras === "object" && !Array.isArray(snap.cameras)) {
    for (const [id, o] of Object.entries(snap.cameras)) {
      if (!o || typeof o !== "object") continue;
      const clean = cleanCamOverride(o);
      if (Object.keys(clean).length) state.cameras[String(id)] = clean;
    }
  }
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      version: STATE_VERSION, savedAt: new Date().toISOString(),
      ...snapshotOf(state)
    }));
  } catch { /* storage unavailable (private mode / quota) — state stays in memory */ }
}

/* ---------- change notification ---------- */
const listeners = [];
export function subscribe(fn) { listeners.push(fn); }
function emit(type, detail) { listeners.forEach(fn => fn(type, detail)); }

/* ---------- selection (UI state, not persisted) ---------- */
let selected = null;
export function getSelected() { return selected; }
export function setSelected(unit) {
  if (selected === unit) return;
  selected = unit;
  emit("selection", unit);
}

/* ---------- reads ---------- */
export function getComp(unit, key) { return state.comp[unit][key]; }
export function getNote(unit) {
  return unit in state.notes ? state.notes[unit] : (byUnit[unit].notes || "");
}
export function noteIsOverride(unit) { return unit in state.notes; }
export function getActionOverrides() { return state.actions; }

/* ---------- mutations (write-through) ---------- */
export function cycleComp(unit, key) {
  const order = COMP_STATES;
  state.comp[unit][key] = order[(order.indexOf(state.comp[unit][key]) + 1) % order.length];
  persist();
  emit("comp", { unit, key });
}
export function setNote(unit, textValue) {
  const v = String(textValue).trim();
  if (v === (byUnit[unit].notes || "")) delete state.notes[unit]; // back to SOT — drop override
  else state.notes[unit] = v;
  persist();
  emit("notes", { unit });
}

/* ---------- action board mutations ---------- */
export function moveAction(id, lane) {
  if (!LANES.has(lane)) return;
  state.actions.lane[id] = lane;
  persist();
  emit("actions", { id, lane });
}
export function editAction(id, patch) {
  const cur = state.actions.edit[id] || {};
  state.actions.edit[id] = { ...cur, ...patch };
  const custom = state.actions.custom.find(c => c.id === id);
  if (custom) Object.assign(custom, patch); // edit a custom card in place
  persist();
  emit("actions", { id });
}
export function dismissAction(id) {
  state.actions.dismissed[id] = true;
  persist();
  emit("actions", { id });
}
export function restoreActions() { // un-archive everything
  state.actions.dismissed = {};
  persist();
  emit("actions", {});
}
export function addAction(card) {
  const c = { kind: "task", lane: "action", detail: "", ...card };
  c.id = c.id || ("user:" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36));
  c.custom = true;
  state.actions.custom.push(c);
  persist();
  emit("actions", { id: c.id });
  return c.id;
}
export function archivedCount() { return Object.keys(state.actions.dismissed).length; }

/* ---------- directory collections (contacts / documents) ---------- */
export function getCollection(name) { return state[name]; }
export function editRecord(name, id, patch) {
  if (!COLLECTIONS.has(name)) return;
  state[name].edit[id] = { ...(state[name].edit[id] || {}), ...patch };
  const custom = state[name].custom.find(r => r.id === id);
  if (custom) Object.assign(custom, patch);
  persist();
  emit(name, { id });
}
export function dismissRecord(name, id) {
  if (!COLLECTIONS.has(name)) return;
  state[name].dismissed[id] = true;
  persist();
  emit(name, { id });
}
export function addRecord(name, rec) {
  if (!COLLECTIONS.has(name)) return null;
  const r = { ...rec };
  r.id = r.id || (name[0] + ":u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36));
  r.custom = true;
  state[name].custom.push(r);
  persist();
  emit(name, { id: r.id });
  return r.id;
}

/* ---------- owner-view sheet visibility ---------- */
export function getOwnerSheets() { return state.ownerSheets.slice(); }
export function setOwnerSheet(id, on) {
  if (!PAGE_IDS.includes(id)) return;
  const s = new Set(state.ownerSheets);
  on ? s.add(id) : s.delete(id);
  state.ownerSheets = PAGE_IDS.filter(p => s.has(p));
  persist();
  emit("ownerSheets", { id });
}

/* ---------- financials (P-1 operating assumptions) ---------- */
export function getFinancials() { return state.financials; }
export function setOpex(key, value) {
  if (!(key in state.financials.opex)) return;
  state.financials.opex[key] = Math.max(0, +value || 0);
  persist();
  emit("financials", { key });
}
export function setCapRate(value) {
  const v = parseFloat(value);
  state.financials.capRatePct = Number.isFinite(v) && v > 0 ? v : null;
  persist();
  emit("financials", {});
}

/* ---------- site-asset pins (A-1 features layer) ---------- */
export function getFeatures() { return state.features.slice(); }
export function addFeature(f) {
  const rec = cleanFeature({ ...f, id: "sf" + Date.now().toString(36) + Math.floor(Math.random() * 1e4) });
  state.features.push(rec);
  persist(); emit("features", { id: rec.id });
  return rec;
}
export function editFeature(id, patch) {
  const i = state.features.findIndex(f => f.id === id);
  if (i < 0) return;
  state.features[i] = cleanFeature({ ...state.features[i], ...patch, id });
  persist(); emit("features", { id });
}
export function removeFeature(id) {
  state.features = state.features.filter(f => f.id !== id);
  persist(); emit("features", { id });
}

/* ---------- CCTV position overrides (A-1 camera layer) ---------- */
export function getCamOverrides() { return { ...state.cameras }; }
export function setCamOverride(id, patch) {
  const clean = cleanCamOverride({ ...state.cameras[id], ...patch });
  if (!Object.keys(clean).length) return;
  state.cameras[String(id)] = clean;
  persist(); emit("cameras", { id });
}
export function clearCamOverride(id) {
  delete state.cameras[id];
  persist(); emit("cameras", { id });
}

/* ---------- remote hydrate (Path B): load a server snapshot as the base ---------- */
export function hydrateRemote(snap) {
  if (!snap || typeof snap !== "object") return;
  Object.assign(state, emptyLayers({ comp: baselineComp }));
  applySnapshot(snap);
  persist(); // cache locally too
}

/* ---------- JSON export / import ---------- */
export function exportJSON() {
  return JSON.stringify({
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    property: "On The Boulevard — 101–149 Arnould Blvd, Lafayette, LA 70506",
    ...snapshotOf(state)
  }, null, 2);
}
export function importJSON(text) {
  const snap = JSON.parse(text); // throws on bad JSON — caller surfaces it
  if (!snap || typeof snap !== "object" || (!snap.comp && !snap.notes && !snap.actions && !snap.contacts && !snap.documents && !snap.financials)) {
    throw new Error("Not an Orange Ocean Atlas export — expected { comp, notes, actions, … }.");
  }
  Object.assign(state, emptyLayers({ comp: baselineComp }));
  applySnapshot(snap);
  persist();
  emit("import");
}
