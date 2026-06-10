/* Single source of mutable state. Every mutation writes through to localStorage.
   Persisted: compliance cell states + note overrides. Unit/rent data stays
   read-only from units.json (SOT) in Phase 2. */
import unitsData from "./data/units.json";
import complianceData from "./data/compliance.json";

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

const state = { comp: baselineComp(), notes: {} };
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
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      version: STATE_VERSION, savedAt: new Date().toISOString(),
      comp: state.comp, notes: state.notes
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

/* ---------- JSON export / import ---------- */
export function exportJSON() {
  return JSON.stringify({
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    property: "On The Boulevard — 101–149 Arnould Blvd, Lafayette, LA 70506",
    comp: state.comp,
    notes: state.notes
  }, null, 2);
}
export function importJSON(text) {
  const snap = JSON.parse(text); // throws on bad JSON — caller surfaces it
  if (!snap || typeof snap !== "object" || (!snap.comp && !snap.notes)) {
    throw new Error("Not an OTB Command export — expected { comp, notes }.");
  }
  state.comp = baselineComp();
  state.notes = {};
  applySnapshot(snap);
  persist();
  emit("import");
}
