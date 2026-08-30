/* lease_abstracts + rent_escalation_ref — read-only lease reference data
   imported from Asset Command (register #10 PORT, harvested 2026-08-29).
   AI-extracted abstracts of the executed leases (24) + their rent escalation
   schedule (83 rows). REFERENCE ONLY: the signed rent roll (docs/sot-2026-07)
   stays the economics SOT — abstracts inform, never override. */
import { REMOTE, sb, propertyContext } from "./remote.js";

let cache = { abstracts: [], escalations: [], loaded: false };
const listeners = [];
export const getLeaseRef = () => cache;
export function onLeaseRefChange(cb) { listeners.push(cb); }

export async function refreshLeaseRef() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const [a, e] = await Promise.all([
    sb.from("lease_abstracts").select("*").eq("property_id", ctx.property_id),
    sb.from("rent_escalation_ref").select("*").eq("property_id", ctx.property_id).order("effective_on"),
  ]);
  if (a.error || e.error) {
    console.warn("lease ref read failed:", (a.error || e.error).message);
    return cache;
  }
  cache = { abstracts: a.data || [], escalations: e.data || [], loaded: true };
  listeners.forEach(cb => { try { cb(); } catch (err) { console.warn(err); } });
  return cache;
}

/* ---- pure folds (unit-tested in test/leaseref.test.mjs) ---- */

export function unitAbstract(abstracts, unit) {
  return (abstracts || []).find(r => r.unit === String(unit)) || null;
}

export function unitEscalations(escalations, unit) {
  return (escalations || []).filter(r => r.unit === String(unit));
}

/* Upcoming escalation steps for T-1: valid-ymd effective_on on/after today,
   soonest first. Historic steps (the majority) never reach the timeline. */
export function escalationEvents(escalations, todayYmd) {
  return (escalations || [])
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.effective_on) && r.effective_on >= todayYmd)
    .map(r => ({
      unit: r.unit, date: r.effective_on,
      newRent: Number.isFinite(+r.new_rent) ? +r.new_rent : null,
      prevRent: Number.isFinite(+r.previous_rent) ? +r.previous_rent : null,
      type: r.increase_type || "", notice: r.notice_required || "",
    }))
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}
