/* A-2 Maintenance requests (work-order module, 2026-07-23) — pure status/
   event model + the REMOTE data layer + the photo bucket store.

   Event-sourced like C-1 compliance: maintenance_requests rows are INSERT-only
   heads; every state change is an append-only maintenance_events row (status /
   assign / note) and the CURRENT state is derived here, never mutated. Photos
   live in the maintenance-photos bucket, one folder per request id.
   RLS scopes everything (tenant = own unit, vendor = ever-assigned, owner =
   read, operator = all) — the same listRequests() call serves every face.
   Pure parts tested in test/maintenance.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";
import { createBucketStore } from "./bucketstore.js";

/* ---- status / urgency vocabulary (plan-room palette) ---- */
export const MR_STATUS = {
  open: ["Open", "#C25E33"],
  assigned: ["Assigned", "#C99A33"], // derived: open + vendor on file
  in_progress: ["In Progress", "#2F6B4F"],
  done: ["Done", "#1E4F3C"],
  closed: ["Closed", "#5F6E64"],
};
export const MR_URGENCY = {
  emergency: ["EMERGENCY", "#C25E33"],
  urgent: ["Urgent", "#C99A33"],
  routine: ["Routine", "#5F6E64"],
};
export const MR_OPEN_STATES = ["open", "assigned", "in_progress"];

/* ---- pure helpers ---- */
export const newRequestId = (now = Date.now(), rnd = Math.random()) =>
  "mr" + now.toString(36) + Math.floor(rnd * 1e6).toString(36);

/* head row + its events → the state every face renders. displayStatus folds
   the derived 'assigned' in; raw status stays what the trail actually says. */
export function deriveRequest(row, events = []) {
  const forThis = events.filter(e => e.request_id === row.id);
  const latest = kind => forThis.filter(e => e.kind === kind).slice(-1)[0] || null;
  const st = latest("status"), asg = latest("assign");
  const status = (st && st.status) || "open";
  const vendorId = asg ? asg.vendor_id : null;
  return {
    ...row,
    events: forThis,
    status,
    vendorId,
    displayStatus: status === "open" && vendorId ? "assigned" : status,
    lastAt: forThis.length ? forThis[forThis.length - 1].created_at : row.created_at,
  };
}

/* One display line per event (compevents pattern). */
export function describeMrEvent(evt, vendorNames = {}) {
  const d = evt.created_at ? new Date(evt.created_at) : null;
  const line =
    evt.kind === "status" ? "status → " + ((MR_STATUS[evt.status] || [evt.status])[0]) :
    evt.kind === "assign" ? "assigned to " + (vendorNames[evt.vendor_id] || evt.vendor_id) :
    evt.note;
  return {
    when: d && !isNaN(d) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    who: String(evt.actor || "").split("@")[0],
    line,
  };
}

/* W-1 card for a derived request (null = doesn't belong on the board).
   Open work needs dispatch → action; anything moving → progress. Lane/dismiss
   overrides still apply through the board's existing override layer. */
export function mrCard(req) {
  if (!MR_OPEN_STATES.includes(req.displayStatus)) return null;
  const [ul] = MR_URGENCY[req.urgency] || MR_URGENCY.routine;
  return {
    id: "mr:" + req.id,
    unit: req.unit,
    kind: "maintenance",
    lane: req.displayStatus === "open" ? "action" : "progress",
    due: null,
    title: "Work order — " + req.title,
    detail: ul + " · " + (MR_STATUS[req.displayStatus] || [req.displayStatus])[0] +
      (req.vendorId ? " · " + req.vendorId : "") + " · manage on M-1",
  };
}

/* Cron detector (pure): unassigned-and-open requests older than the threshold
   (1 day for emergencies, `days` otherwise) become manager-thread candidates.
   Rows are get_open_maintenance() output: {id,unit,title,urgency,created_at,
   status,vendor_id}. Idempotency rides on triggerSource = "maint:<id>". */
export function maintTriggerCandidates(rows, todayISO, { days = 2 } = {}) {
  const today = Date.UTC(+todayISO.slice(0, 4), +todayISO.slice(5, 7) - 1, +todayISO.slice(8, 10));
  return (rows || [])
    .filter(r => r.status === "open" && !r.vendor_id && r.created_at)
    .filter(r => {
      const age = (today - Date.parse(String(r.created_at).slice(0, 10))) / 86400000;
      return age >= (r.urgency === "emergency" ? 1 : days);
    })
    .map(r => ({
      agent: "manager",
      triggerSource: "maint:" + r.id,
      title: "Unassigned work order — unit " + r.unit,
      detail: "Maintenance request \"" + r.title + "\" (unit " + r.unit + ", " +
        (MR_URGENCY[r.urgency] || MR_URGENCY.routine)[0] + ", filed " +
        String(r.created_at).slice(0, 10) + ") still has no vendor assigned. " +
        "Dispatch from the M-1 sheet — who handles this trade, and should we get bids?",
    }));
}

/* ---- photos: one folder per request id ---- */
export const mrPhotos = createBucketStore({ bucket: "maintenance-photos", idPrefix: "mp", ttl: 600 });
export const addMrPhoto = (file, requestId) => mrPhotos.add(file, requestId, file.name);
export const listMrPhotos = requestId => mrPhotos.list(requestId);
export const mrPhotoURL = path => mrPhotos.url(path);

/* ---- REMOTE data layer + cache (RLS scopes rows per role) ---- */
let cache = [];
const listeners = [];
export const getMaintCache = () => cache;
export function onMaintChange(cb) { listeners.push(cb); }

export async function refreshMaint() {
  if (!REMOTE) return cache;
  const [{ data: rows, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    sb.from("maintenance_requests").select("*").order("created_at", { ascending: false }),
    sb.from("maintenance_events").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
  ]);
  if (e1 || e2) { console.warn("maintenance read:", (e1 || e2).message); return cache; }
  cache = (rows || []).map(r => deriveRequest(r, events || []));
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

/* live W-1 cards from the cache — board.js concatenates these into its seed */
export function maintActionCards() {
  return cache.map(mrCard).filter(Boolean);
}

export async function submitRequest({ unit, title, detail, urgency }, email) {
  const ctx = await propertyContext();
  const row = {
    id: newRequestId(),
    org_id: ctx.org_id, property_id: ctx.property_id,
    unit: String(unit),
    title: String(title).slice(0, 120),
    detail: String(detail || "").slice(0, 2000),
    urgency: MR_URGENCY[urgency] ? urgency : "routine",
    created_by: String(email || "").toLowerCase(),
  };
  const { error } = await sb.from("maintenance_requests").insert(row);
  if (error) throw error;
  await refreshMaint();
  return row.id;
}

export async function addMrEvent(requestId, { kind, status = null, vendorId = null, note = "" }, actorEmail) {
  const ctx = await propertyContext();
  const { error } = await sb.from("maintenance_events").insert({
    request_id: requestId, org_id: ctx.org_id, property_id: ctx.property_id, kind, status, vendor_id: vendorId,
    note: String(note || "").slice(0, 1000), actor: String(actorEmail || ""),
  });
  if (error) throw error;
  await refreshMaint();
}

/* ---- tenant roster (operator-managed; drives magic-link role match) ---- */
export async function listTenantContacts() {
  const { data, error } = await sb.from("tenant_contacts").select("*").order("unit");
  if (error) { console.warn("tenant_contacts:", error.message); return []; }
  return data || [];
}
export async function upsertTenantContact(email, unit, name = "") {
  const ctx = await propertyContext();
  const { error } = await sb.from("tenant_contacts")
    .upsert({ email: String(email).trim().toLowerCase(), org_id: ctx.org_id, property_id: ctx.property_id, unit: String(unit), name, active: true });
  if (error) throw error;
}
export async function deactivateTenantContact(email) {
  const { error } = await sb.from("tenant_contacts").update({ active: false }).eq("email", email);
  if (error) throw error;
}
