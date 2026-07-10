/* Single source of mutable state. Every mutation writes through to localStorage.
   Persisted: compliance cell states + note overrides. Unit/rent data stays
   read-only from units.json (SOT) in Phase 2. */
import unitsData from "./data/units.json";
import complianceData from "./data/compliance.json";
import { PAGE_IDS, DEFAULT_OWNER_SHEETS } from "./lib/pages.js";

const LS_KEY = "otb-command-state-v1";
const STATE_VERSION = 1;

export const UNITS = unitsData;
export const byUnit = {};
UNITS.forEach(u => { byUnit[u.unit] = u; });

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
const emptyActions = () => ({ lane: {}, edit: {}, dismissed: {}, custom: [] });

/* generic record-collection override (Directory K-1: contacts + documents).
   Seeds live in the views; the store persists only edits/dismissals/custom. */
const COLLECTIONS = new Set(["contacts", "documents"]);
const emptyColl = () => ({ edit: {}, dismissed: {}, custom: [] });

/* owner-visible sheets (Path B owner view): operator picks which sheets the
   shopping-center owners can see. Persisted + exported so it travels.
   PAGE_IDS/DEFAULT_OWNER_SHEETS live in lib/pages.js with the nav table. */

/* financials = operator-entered operating assumptions for the P-1 NOI rollup.
   Income is derived from the rent roll; expenses aren't in the SOT, so these
   annual figures are the one manual input. Fixed schema — no add/remove. */
export const OPEX_LINES = [
  ["taxes", "Property taxes"], ["insurance", "Insurance"], ["cam", "CAM / R&M"],
  ["mgmt", "Management"], ["utilities", "Utilities (common)"], ["reserves", "Reserves"]
];
const emptyFin = () => ({ opex: { taxes: 0, insurance: 0, cam: 0, mgmt: 0, utilities: 0, reserves: 0 }, capRatePct: null });

const state = { comp: baselineComp(), notes: {}, actions: emptyActions(), contacts: emptyColl(), documents: emptyColl(), financials: emptyFin(), ownerSheets: [...DEFAULT_OWNER_SHEETS] };
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
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      version: STATE_VERSION, savedAt: new Date().toISOString(),
      comp: state.comp, notes: state.notes, actions: state.actions,
      contacts: state.contacts, documents: state.documents, financials: state.financials,
      ownerSheets: state.ownerSheets
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

/* ---------- remote hydrate (Path B): load a server snapshot as the base ---------- */
export function hydrateRemote(snap) {
  if (!snap || typeof snap !== "object") return;
  state.comp = baselineComp();
  state.notes = {};
  state.actions = emptyActions();
  state.contacts = emptyColl();
  state.documents = emptyColl();
  state.financials = emptyFin();
  state.ownerSheets = [...DEFAULT_OWNER_SHEETS];
  applySnapshot(snap);
  persist(); // cache locally too
}

/* ---------- JSON export / import ---------- */
export function exportJSON() {
  return JSON.stringify({
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    property: "On The Boulevard — 101–149 Arnould Blvd, Lafayette, LA 70506",
    comp: state.comp,
    notes: state.notes,
    actions: state.actions,
    contacts: state.contacts,
    documents: state.documents,
    financials: state.financials,
    ownerSheets: state.ownerSheets
  }, null, 2);
}
export function importJSON(text) {
  const snap = JSON.parse(text); // throws on bad JSON — caller surfaces it
  if (!snap || typeof snap !== "object" || (!snap.comp && !snap.notes && !snap.actions && !snap.contacts && !snap.documents && !snap.financials)) {
    throw new Error("Not an OTB Command export — expected { comp, notes, actions, … }.");
  }
  state.comp = baselineComp();
  state.notes = {};
  state.actions = emptyActions();
  state.contacts = emptyColl();
  state.documents = emptyColl();
  state.financials = emptyFin();
  state.ownerSheets = [...DEFAULT_OWNER_SHEETS];
  applySnapshot(snap);
  persist();
  emit("import");
}
