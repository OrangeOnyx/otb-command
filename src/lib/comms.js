/* L-1 Comm Log — cross-channel correspondence over comm_log (build wave,
   2026-08-29). Content tier: owner+operator read, operator insert/update/
   delete (RLS-sealed). Voice rows imported from Asset Command carry
   source='ac' (payload holds ac_kind / next_step); everything else is logged
   by hand from the sheet. org_id/property_id are DB defaults on this table —
   never supplied on insert; reads still FILTER by property_id. Writes fail
   loud; reads fail soft (house rule). Pure half above the REMOTE banner is
   unit-tested in test/comms.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";

/* ---- vocabulary ---- */
export const CHANNELS = {
  voice: "📞 Voice", sms: "💬 SMS", email: "✉ Email",
  letter: "📄 Letter", note: "📝 Note", meeting: "👥 Meeting",
};

/* channel validation — anything outside the map logs as a note */
export const validChannel = c => (CHANNELS[c] ? c : "note");

/* client-row id (imported AC rows keep their original ids) */
export function newCommId(now = Date.now(), rnd = Math.random()) {
  return "cm" + now.toString(36) + Math.floor(rnd * 1e6).toString(36);
}

/* filter: exact channel, case-blind substring on unit, case-blind substring
   q over summary / contact_name / body. Empty spec passes everything. */
export function filterComms(rows, { channel = "", unit = "", q = "" } = {}) {
  const uq = String(unit || "").trim().toLowerCase();
  const qq = String(q || "").trim().toLowerCase();
  return (rows || []).filter(r => {
    if (channel && r.channel !== channel) return false;
    if (uq && String(r.unit || "").toLowerCase().indexOf(uq) === -1) return false;
    if (qq && ![r.summary, r.contact_name, r.body]
      .some(v => String(v || "").toLowerCase().indexOf(qq) !== -1)) return false;
    return true;
  });
}

/* display model for one log line — all derivation, zero DOM */
export function commLine(row) {
  const r = row || {};
  const dir = r.direction === "in" ? "← " : r.direction === "out" ? "→ " : "";
  return {
    when: r.at ? String(r.at).slice(0, 16).replace("T", " ") : "",
    chip: CHANNELS[validChannel(r.channel)],
    who: dir + (r.contact_name || r.contact_email || r.contact_phone || "—"),
    summary: String(r.summary || ""),
    unitTag: r.unit ? "Unit " + r.unit : "",
    sourceTag: r.source === "ac" ? "AC" : "",
  };
}

/* ---- REMOTE data layer ---- */
let cache = [];
const listeners = [];
export const getComms = () => cache;
export function onCommsChange(cb) { listeners.push(cb); }

export async function refreshComms() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("comm_log").select("*")
    .eq("property_id", ctx.property_id)
    .order("at", { ascending: false }).limit(500);
  if (error) { console.warn("comm_log read failed:", error.message); return cache; }
  cache = data || [];
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

export async function addComm(fields, by) {
  const f = fields || {};
  const row = { // org_id/property_id defaulted by the DB — never supplied
    id: newCommId(),
    unit: f.unit ? String(f.unit).slice(0, 20) : null,
    vendor_id: f.vendorId || null,
    matter_id: f.matterId || null,
    channel: validChannel(f.channel),
    direction: f.direction === "in" || f.direction === "out" ? f.direction : "",
    at: f.at || new Date().toISOString(),
    contact_name: String(f.contactName || "").slice(0, 120),
    contact_phone: String(f.contactPhone || "").slice(0, 40),
    contact_email: String(f.contactEmail || "").slice(0, 120).toLowerCase(),
    summary: String(f.summary || "").slice(0, 300),
    body: String(f.body || "").slice(0, 4000),
    urgency: String(f.urgency || "").slice(0, 20),
    status: String(f.status || "").slice(0, 20),
    agent: String(f.agent || "").slice(0, 40),
    source: "app",
    updated_by: String(by || "").slice(0, 120),
  };
  const { error } = await sb.from("comm_log").insert(row);
  if (error) throw error;
  await refreshComms();
  return row.id;
}

export async function deleteComm(id) {
  const { error } = await sb.from("comm_log").delete().eq("id", id);
  if (error) throw error;
  await refreshComms();
}
