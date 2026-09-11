/* F-4 HVAC PM contracts — operator-entered preventive-maintenance contracts
   over the `hvac_contracts` table (content tier), surfaced in the unit drawer
   and feeding the T-1 timeline. Mirrors governance.js: RLS owner+operator read
   · operator write; org_id/property_id are NEVER supplied on writes — the
   table defaults stamp them; reads filter by the resolved property context.
   Also the first client seam over `hvac_units` (28 AC-harvest system rows)
   so the per-unit system inventory finally reaches the app.

   BOUNDARY (do not blur): the §9.01 covenant — Jason's Deli (149) must keep
   a monthly PM contract with Butcher Air Conditioning — is an audit-grade
   FACT and stays repo-locked in src/lib/facts.js (HVAC_149). This module
   never seeds it as a row: covenant149Prefill() derives a form PREFILL from
   the fact; the contract row itself is operator-entered.

   Next due is DERIVED, never stored: nextDue(c) = last_service_on + one
   period (month-end clamped), else starts_on, else null. Unlike governance
   (dated records that age off after 30 days), a derived due date only moves
   when service is logged — so an overdue contract stays on T-1 until it is
   serviced or its status leaves 'active'. Pure folds tested in
   test/hvac.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";
import { HVAC_149 } from "./facts.js";
import vendors from "../data/vendors.json" with { type: "json" };

/* ---- vocabulary (keys mirror the schema CHECK constraints) ---- */
export const HVAC_FREQ = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semi-annual",
  annual: "Annual",
};
export const HVAC_STATUS = {
  active: "Active",
  lapsed: "Lapsed",
  ended: "Ended",
};
const PERIOD_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

/* validation fallbacks — unknown values degrade to the safest key */
export const validHvacFreq = f => (HVAC_FREQ[f] ? f : "monthly");
export const validHvacStatus = s => (HVAC_STATUS[s] ? s : "active");

/* client-row ids — hvac:<unit>:<n>; injectable clock/rand for tests */
export const hvacId = (unit, now = Date.now(), rnd = Math.random()) =>
  "hvac:" + String(unit) + ":" + now.toString(36) + Math.floor(rnd * 1e6).toString(36);

/* ---- pure folds ---- */
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MS = 86400000;
const msToYmd = ms => new Date(ms).toISOString().slice(0, 10);
const ymdShift = (ymd, days) => {
  const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  return msToYmd(Date.UTC(y, m - 1, d) + days * MS);
};
/* calendar-month add in UTC, clamped to the target month's last day
   (Jan 31 + 1 → Feb 28/29) — the sop.js periodFor idiom, not local time */
function addMonths(ymd, months) {
  const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return msToYmd(Date.UTC(y, m - 1 + months, Math.min(d, lastDay)));
}

/* derived next service date; null when the contract carries no anchor */
export function nextDue(c) {
  if (!c) return null;
  const last = YMD.test(c.last_service_on || "") ? c.last_service_on : null;
  if (last) return addMonths(last, PERIOD_MONTHS[validHvacFreq(c.frequency)]);
  return YMD.test(c.starts_on || "") ? c.starts_on : null;
}

/* T-1 feed: ACTIVE contracts whose derived next due is on or before
   today + graceDays (a look-ahead horizon) — overdue ones included at any
   age (see header). Rows sorted soonest first. */
export function hvacDeadlines(items, todayYmd, graceDays = 30) {
  const horizon = ymdShift(todayYmd, graceDays);
  return (items || [])
    .map(c => ({ c, date: c.status === "active" ? nextDue(c) : null }))
    .filter(({ date }) => date && date <= horizon)
    .map(({ c, date }) => ({
      id: c.id, unit: c.unit, title: c.scope || "HVAC preventive maintenance",
      vendor: c.vendor_name || "", ref: c.ref || "", date,
      overdue: date < todayYmd, frequency: validHvacFreq(c.frequency),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* list ordering: active → lapsed → ended; within a group by nextDue
   (nulls last), then unit (natural order so 103 < 119.5 < 135A) */
const STATUS_RANK = { active: 0, lapsed: 1, ended: 2 };
const unitCmp = (a, b) => String(a || "").localeCompare(String(b || ""), "en", { numeric: true });
export function sortHvac(items) {
  return [...(items || [])].sort((a, b) => {
    const r = (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
    if (r) return r;
    const ad = nextDue(a), bd = nextDue(b);
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return unitCmp(a.unit, b.unit);
  });
}

/* hvac_units rows for one drawer unit — matches `unit` or `unit_label`
   case-insensitively (harvest rows carry both), ordered by system_index
   with nulls last */
export function hvacSystemsFor(rows, unit) {
  const key = String(unit || "").toUpperCase();
  return (rows || [])
    .filter(r => String(r.unit || "").toUpperCase() === key || String(r.unit_label || "").toUpperCase() === key)
    .sort((a, b) => {
      const ai = a.system_index == null ? Infinity : a.system_index;
      const bi = b.system_index == null ? Infinity : b.system_index;
      return ai - bi;
    });
}

/* §9.01 form PREFILL derived from the repo-locked fact — NOT a seed row.
   vendor_id resolves through the vendor roster by company name so the
   contract can link to K-1 / V-1 without restating the id here. */
export function covenant149Prefill() {
  const v = vendors.find(x => x.company === HVAC_149.contractor);
  return {
    unit: HVAC_149.unit,
    vendor_id: v ? v.id : "",
    vendor_name: HVAC_149.contractor,
    frequency: "monthly",
    ref: HVAC_149.clause,
    scope: "Monthly preventive maintenance — Unit " + HVAC_149.unit + " HVAC (tenant-held)",
  };
}

/* ---- REMOTE data layer + cache trio ---- */
let cache = { items: [], loaded: false };
const listeners = [];
export const getHvacContracts = () => cache;
export function onHvacChange(cb) { listeners.push(cb); }
const notify = () => listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });

export async function refreshHvac() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("hvac_contracts").select("*")
    .eq("property_id", ctx.property_id)
    .order("unit", { ascending: true });
  if (error) { console.warn("hvac contracts read:", error.message); return cache; }
  cache = { items: data || [], loaded: true };
  notify();
  return cache;
}

/* hvac_units (AC harvest, 28 rows) — read once per session, same listener
   set so a drawer painting from either cache repaints on either arrival */
let unitsCache = { units: [], loaded: false };
export const getHvacUnits = () => unitsCache;
export async function listHvacUnits() {
  if (!REMOTE) return unitsCache.units;
  if (unitsCache.loaded) return unitsCache.units;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("hvac_units").select("*")
    .eq("property_id", ctx.property_id)
    .order("unit", { ascending: true });
  if (error) { console.warn("hvac units read:", error.message); return unitsCache.units; }
  unitsCache = { units: data || [], loaded: true };
  notify();
  return unitsCache.units;
}

/* ---- writes (operator RLS; FAIL LOUD — the drawer surfaces errors) ----
   Whitelist patch: only the operator-editable columns ever leave the client;
   values are validated against the maps / ymd-or-null before the wire. */
const EDITABLE = ["unit", "vendor_id", "vendor_name", "scope", "frequency",
  "starts_on", "ends_on", "last_service_on", "status", "ref", "notes"];
const ymdOrNull = v => (YMD.test(v || "") ? v : null);
function hvacPatch(fields) {
  const patch = {};
  for (const k of EDITABLE) if (k in (fields || {})) patch[k] = fields[k];
  if ("unit" in patch) patch.unit = String(patch.unit || "").trim().slice(0, 16);
  if ("vendor_id" in patch) patch.vendor_id = String(patch.vendor_id || "").slice(0, 80);
  if ("vendor_name" in patch) patch.vendor_name = String(patch.vendor_name || "").slice(0, 160);
  if ("scope" in patch) patch.scope = String(patch.scope || "").slice(0, 200);
  if ("frequency" in patch) patch.frequency = validHvacFreq(patch.frequency);
  if ("starts_on" in patch) patch.starts_on = ymdOrNull(patch.starts_on);
  if ("ends_on" in patch) patch.ends_on = ymdOrNull(patch.ends_on);
  if ("last_service_on" in patch) patch.last_service_on = ymdOrNull(patch.last_service_on);
  if ("status" in patch) patch.status = validHvacStatus(patch.status);
  if ("ref" in patch) patch.ref = String(patch.ref || "").slice(0, 120);
  if ("notes" in patch) patch.notes = String(patch.notes || "").slice(0, 2000);
  return patch;
}

export async function addHvacContract(fields, by) {
  if (!REMOTE) throw new Error("HVAC contracts require the hosted backend");
  const row = {
    unit: "", vendor_id: "", vendor_name: "", scope: "", frequency: "monthly",
    starts_on: null, ends_on: null, last_service_on: null, status: "active",
    ref: "", notes: "",
    ...hvacPatch(fields),
    source: "operator",
    updated_by: String(by || "").toLowerCase(),
  };
  if (!row.unit) throw new Error("unit required");
  row.id = hvacId(row.unit);
  const { error } = await sb.from("hvac_contracts").insert(row);
  if (error) throw error;
  await refreshHvac();
  return row.id;
}

export async function updateHvacContract(id, fields, by) {
  if (!REMOTE) throw new Error("HVAC contracts require the hosted backend");
  const patch = hvacPatch(fields);
  if (!Object.keys(patch).length) return;
  patch.updated_by = String(by || "").toLowerCase();
  const { error } = await sb.from("hvac_contracts").update(patch).eq("id", id);
  if (error) throw error;
  await refreshHvac();
}

export async function deleteHvacContract(id) {
  if (!REMOTE) throw new Error("HVAC contracts require the hosted backend");
  const { error } = await sb.from("hvac_contracts").delete().eq("id", id);
  if (error) throw error;
  await refreshHvac();
}

/* service visit logged → last_service_on moves, nextDue rolls forward */
export function logHvacService(id, ymd, by) {
  if (!YMD.test(ymd || "")) return Promise.reject(new Error("service date required (YYYY-MM-DD)"));
  return updateHvacContract(id, { last_service_on: ymd }, by);
}
