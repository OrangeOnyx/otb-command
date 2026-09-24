/* A-2 Maintenance requests (work-order module, 2026-07-23) — pure status/
   event model + the REMOTE data layer + the photo bucket store.

   Event-sourced like C-1 compliance: maintenance_requests rows are INSERT-only
   heads; every state change is an append-only maintenance_events row (status /
   assign / note) and the CURRENT state is derived here, never mutated. Photos
   live in the maintenance-photos bucket, one folder per request id.
   RLS scopes everything (tenant = own unit, vendor = ever-assigned, owner =
   read, operator = all) — the same listRequests() call serves every face.
   Pure parts tested in test/maintenance.test.mjs. */
import { REMOTE, LOCAL_REVIEW, sb, propertyContext } from "./remote.js";
import { createBucketStore } from "./bucketstore.js";
import { deriveRequest, maintenanceLinkFields, maintenanceEventFields, maintenanceLocationLabel, createLocalMaintenanceStore } from "./maintenance-model.js";
export { deriveRequest, COMMON_AREA_UNIT, maintenanceLocationLabel } from "./maintenance-model.js";
export const maintenanceMode = () => LOCAL_REVIEW ? 'local-review' : REMOTE ? 'remote' : 'unavailable';
const requireMaintenance = () => { if (!REMOTE && !LOCAL_REVIEW) throw new Error('Maintenance requires the hosted backend or explicit local review mode.'); };
const localStore = () => createLocalMaintenanceStore(globalThis.localStorage);

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
      (req.vendorId ? " · " + req.vendorId : "") + (req.asset_id ? " · " + maintenanceLocationLabel(req) : "") + " · manage on M-1",
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
export const mrPhotos = createBucketStore({ bucket: "maintenance-photos", idPrefix: "mp", ttl: 600,
  local: LOCAL_REVIEW ? { db: 'otb-maintenance-photos-local-review-v1', store: 'photos' } : null });
export async function addMrPhoto(file, requestId) {
  requireMaintenance();
  if (LOCAL_REVIEW && !localStore().list().some(r => r.id === requestId)) throw new Error('Local review request not found.');
  if (!String(file?.type || '').startsWith('image/')) throw new Error('Choose an image for the request photo.');
  return mrPhotos.add(file, requestId, file.name);
}
export const listMrPhotos = requestId => { requireMaintenance(); return mrPhotos.list(requestId); };
export const mrPhotoURL = path => { requireMaintenance(); return mrPhotos.url(path); };

/* ---- hosted data (RLS per role) or explicit isolated browser review ---- */
let cache = [];
const listeners = [];
export const getMaintCache = () => cache;
export function onMaintChange(cb) { listeners.push(cb); return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; }
const notifyMaint = () => listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });

export async function refreshMaint() {
  if (LOCAL_REVIEW) { cache = localStore().list(); notifyMaint(); return cache; }
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const [{ data: rows, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    sb.from("maintenance_requests").select("*").eq('property_id', ctx.property_id).order("created_at", { ascending: false }),
    sb.from("maintenance_events").select("*").eq('property_id', ctx.property_id).order("created_at", { ascending: true }).order("id", { ascending: true }),
  ]);
  if (e1 || e2) { console.warn("maintenance read:", (e1 || e2).message); return cache; }
  cache = (rows || []).map(r => deriveRequest(r, events || []));
  notifyMaint();
  return cache;
}

/* live W-1 cards from the cache — board.js concatenates these into its seed */
export function maintActionCards() {
  return cache.map(mrCard).filter(Boolean);
}

export async function submitRequest(input, email) {
  requireMaintenance();
  const { title, detail, urgency } = input;
  if (!String(title || '').trim()) throw new Error('Give the request a short title.');
  const link = maintenanceLinkFields(input);
  const ctx = LOCAL_REVIEW ? { org_id: 'local-review', property_id: 'otb' } : await propertyContext();
  if (link.asset_id) {
    const { getPhysicalAsset } = await import('./physical-assets.js');
    const asset = await getPhysicalAsset(link.asset_id);
    if (!asset || asset.status === 'retired') throw new Error('Choose an active physical asset.');
    if (!LOCAL_REVIEW && (!asset.persisted || asset.org_id !== ctx.org_id || asset.property_id !== ctx.property_id)) throw new Error('Save the physical asset in this property before linking a work order.');
    if (asset.unit && String(asset.unit) !== link.unit) throw new Error('The request suite must match the linked asset.');
    if (!asset.unit && link.unit !== 'common-area') throw new Error('Use common-area for an asset without a verified suite association.');
    link.asset_label ||= asset.label;
  }
  const row = {
    id: newRequestId(),
    org_id: ctx.org_id, property_id: ctx.property_id,
    ...link,
    title: String(title).trim().slice(0, 120),
    detail: String(detail || "").slice(0, 2000),
    urgency: MR_URGENCY[urgency] ? urgency : "routine",
    created_by: String(email || "").toLowerCase(),
  };
  if (LOCAL_REVIEW) {
    localStore().insertRequest({ ...row, created_at: new Date().toISOString() });
    await refreshMaint(); return row.id;
  }
  const { error } = await sb.from("maintenance_requests").insert(row);
  if (error) throw error;
  await refreshMaint();
  return row.id;
}

export async function addMrEvent(requestId, event, actorEmail) {
  requireMaintenance();
  const fields = maintenanceEventFields(event);
  if (LOCAL_REVIEW) { localStore().appendEvent(requestId, event, actorEmail); await refreshMaint(); return; }
  const ctx = await propertyContext();
  const { error } = await sb.from("maintenance_events").insert({
    request_id: requestId, org_id: ctx.org_id, property_id: ctx.property_id, ...fields, actor: String(actorEmail || ""),
  });
  if (error) throw error;
  await refreshMaint();
}

/* ---- tenant roster (operator-managed; drives magic-link role match) ---- */
export async function listTenantContacts() {
  if (LOCAL_REVIEW) return [];
  const { data, error } = await sb.from("tenant_contacts").select("*").order("unit");
  if (error) { console.warn("tenant_contacts:", error.message); return []; }
  return data || [];
}
export async function upsertTenantContact(email, unit, name = "") {
  if (!REMOTE) throw new Error('Tenant access management requires the hosted backend.');
  const ctx = await propertyContext();
  const { error } = await sb.from("tenant_contacts")
    .upsert({ email: String(email).trim().toLowerCase(), org_id: ctx.org_id, property_id: ctx.property_id, unit: String(unit), name, active: true });
  if (error) throw error;
}
export async function deactivateTenantContact(email) {
  if (!REMOTE) throw new Error('Tenant access management requires the hosted backend.');
  const { error } = await sb.from("tenant_contacts").update({ active: false }).eq("email", email);
  if (error) throw error;
}
