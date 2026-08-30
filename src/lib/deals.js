/* deals — the leasing pipeline (register #11 REBUILD, 2026-08-29). Content
   tier: owner+operator read, operator write (RLS-sealed). Prospects flow in
   from AI-1 leasing / voice intake by hand; the W-1 board renders open deals
   as cards. Writes fail loud; reads fail soft (house rule). */
import { REMOTE, sb, propertyContext } from "./remote.js";

export const DEAL_STAGES = {
  inquiry: "Inquiry", tour: "Tour", loi: "LOI",
  lease_draft: "Lease draft", signed: "Signed", lost: "Lost",
};
export const OPEN_STAGES = ["inquiry", "tour", "loi", "lease_draft"];

let cache = [];
const listeners = [];
export const getDeals = () => cache;
export function onDealsChange(cb) { listeners.push(cb); }

export async function refreshDeals() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("deals").select("*")
    .eq("property_id", ctx.property_id).order("created_at", { ascending: false });
  if (error) { console.warn("deals read failed:", error.message); return cache; }
  cache = data || [];
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

const stamped = async row => {
  const ctx = await propertyContext();
  return { ...row, org_id: ctx.org_id, property_id: ctx.property_id };
};

export function newDealId(now = Date.now(), rnd = Math.random()) {
  return "dl" + now.toString(36) + Math.floor(rnd * 1e6).toString(36);
}

export async function addDeal(fields) {
  const row = await stamped({
    id: newDealId(),
    prospect: String(fields.prospect || "").slice(0, 120),
    business: String(fields.business || "").slice(0, 120),
    contact_email: String(fields.email || "").slice(0, 120).toLowerCase(),
    contact_phone: String(fields.phone || "").slice(0, 40),
    target_unit: String(fields.unit || "").slice(0, 20),
    proposed_rent: String(fields.rent || "").slice(0, 40),
    stage: DEAL_STAGES[fields.stage] ? fields.stage : "inquiry",
    lead_source: String(fields.leadSource || "").slice(0, 60),
    notes: String(fields.notes || "").slice(0, 2000),
    source: "app",
    updated_by: String(fields.by || "").slice(0, 120),
  });
  const { error } = await sb.from("deals").insert(row);
  if (error) throw error;
  await refreshDeals();
  return row.id;
}

export async function setDealStage(id, stage, by) {
  if (!DEAL_STAGES[stage]) throw new Error("unknown stage: " + stage);
  const { error } = await sb.from("deals")
    .update({ stage, updated_at: new Date().toISOString(), updated_by: String(by || "").slice(0, 120) })
    .eq("id", id);
  if (error) throw error;
  await refreshDeals();
}

export async function deleteDeal(id) {
  const { error } = await sb.from("deals").delete().eq("id", id);
  if (error) throw error;
  await refreshDeals();
}

/* ---- pure (unit-tested in test/deals.test.mjs) ---- */

/* W-1 card objects for open deals; stage decides the lane. */
export function dealActionCards(deals) {
  const lane = { inquiry: "watch", tour: "action", loi: "action", lease_draft: "progress" };
  return (deals || [])
    .filter(d => OPEN_STAGES.includes(d.stage))
    .map(d => ({
      id: "deal:" + d.id,
      unit: d.target_unit || null,
      kind: "leasing",
      lane: lane[d.stage] || "watch",
      due: d.next_action_at || null,
      title: (d.business || d.prospect || "Prospect") + " — " + (DEAL_STAGES[d.stage] || d.stage),
      detail: [d.prospect, d.target_unit ? "Unit " + d.target_unit : "", d.proposed_rent].filter(Boolean).join(" · "),
    }));
}
