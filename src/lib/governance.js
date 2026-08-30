/* S-1 Governance — operator-entered entity/covenant records over the
   `governance_items` table (register row #8), surfaced on the Owner Safe and
   feeding the T-1 timeline. RLS: owner+operator read · operator write.
   org_id/property_id are NEVER supplied on writes — the table defaults stamp
   them; reads filter by the resolved property context (matters.js idiom).

   BOUNDARY (do not blur): audit-grade instrument FACTS — the JD Bank
   easement, the §9.01 Butcher HVAC covenant, the exclusive-use clauses —
   stay repo-locked in src/lib/facts.js. governance_items are OPERATOR-ENTERED
   records layered on top (LLC annual reports, registered-agent renewals,
   insurance renewals, covenant compliance checks). Never duplicate facts.js
   content as seed rows here — a fact restated as a row would drift.

   Pure folds (deadline feed, sort, anniversary math, validation) tested in
   test/governance.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";

/* ---- vocabulary (keys mirror the schema CHECK constraints) ---- */
export const GOV_KINDS = {
  entity: "Entity",
  covenant: "Covenant",
  deadline: "Deadline",
  record: "Record",
};
export const GOV_STATUS = {
  open: "Open",
  satisfied: "Satisfied",
  waived: "Waived",
};

/* validation fallbacks — unknown values degrade to the safest key */
export const validGovKind = k => (GOV_KINDS[k] ? k : "record");
export const validGovStatus = s => (GOV_STATUS[s] ? s : "open");

/* client-row ids — injectable clock/rand for tests */
export const newGovId = (now = Date.now(), rnd = Math.random()) =>
  "gv" + now.toString(36) + Math.floor(rnd * 1e6).toString(36);

/* ---- pure folds ---- */
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MS = 86400000;
const ymdShift = (ymd, days) => {
  const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  return new Date(Date.UTC(y, m - 1, d) + days * MS).toISOString().slice(0, 10);
};

/* T-1 feed: OPEN items with a valid due_on no older than 30 days (recent
   lapses stay visible; ancient ones age off the timeline — same grace window
   as matterDeadlines), soonest first. Satisfied/waived never feed T-1. */
export function govDeadlines(items, todayYmd) {
  const floor = ymdShift(todayYmd, -30);
  return (items || [])
    .filter(g => g.status === "open" && YMD.test(g.due_on || "") && g.due_on >= floor)
    .map(g => ({
      id: g.id, title: g.title, entity: g.entity || "", ref: g.ref || "",
      date: g.due_on, kind: g.kind, overdue: g.due_on < todayYmd,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* list ordering: open → satisfied → waived; within a group by due_on
   (nulls last), then title */
const STATUS_RANK = { open: 0, satisfied: 1, waived: 2 };
export function sortGov(items) {
  return [...(items || [])].sort((a, b) => {
    const r = (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
    if (r) return r;
    const ad = YMD.test(a.due_on || "") ? a.due_on : null;
    const bd = YMD.test(b.due_on || "") ? b.due_on : null;
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

/* recurring='annual' display math: the next anniversary of due_on on or
   after today. A due date not yet passed IS the next occurrence. Display
   only — never persisted (the stored due_on stays the anchor). Feb 29
   anchors may yield a nonexistent date in non-leap years — tolerated. */
export function nextAnnual(dueYmd, todayYmd) {
  if (!YMD.test(dueYmd || "") || !YMD.test(todayYmd || "")) return null;
  if (dueYmd >= todayYmd) return dueYmd;
  const mmdd = dueYmd.slice(4); // "-MM-DD"
  const cand = todayYmd.slice(0, 4) + mmdd;
  return cand >= todayYmd ? cand : (+todayYmd.slice(0, 4) + 1) + mmdd;
}

/* ---- REMOTE data layer + cache trio ---- */
let cache = { items: [], loaded: false };
const listeners = [];
export const getGovernance = () => cache;
export function onGovernanceChange(cb) { listeners.push(cb); }

export async function refreshGovernance() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("governance_items").select("*")
    .eq("property_id", ctx.property_id)
    .order("due_on", { ascending: true, nullsFirst: false });
  if (error) { console.warn("governance read:", error.message); return cache; }
  cache = { items: data || [], loaded: true };
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

/* ---- writes (operator RLS; FAIL LOUD — the sheet surfaces errors) ----
   Whitelist patch: only the operator-editable columns ever leave the client;
   values are validated against the maps / ymd-or-null before the wire. */
const EDITABLE = ["kind", "title", "entity", "ref", "due_on", "recurring", "status", "notes"];
function govPatch(fields) {
  const patch = {};
  for (const k of EDITABLE) if (k in (fields || {})) patch[k] = fields[k];
  if ("kind" in patch) patch.kind = validGovKind(patch.kind);
  if ("title" in patch) patch.title = String(patch.title || "").slice(0, 200);
  if ("entity" in patch) patch.entity = String(patch.entity || "").slice(0, 160);
  if ("ref" in patch) patch.ref = String(patch.ref || "").slice(0, 120);
  if ("due_on" in patch) patch.due_on = YMD.test(patch.due_on || "") ? patch.due_on : null;
  if ("recurring" in patch) patch.recurring = patch.recurring === "annual" ? "annual" : "";
  if ("status" in patch) patch.status = validGovStatus(patch.status);
  if ("notes" in patch) patch.notes = String(patch.notes || "").slice(0, 2000);
  return patch;
}

export async function addGovItem(fields, by) {
  if (!REMOTE) throw new Error("governance requires the hosted backend");
  const row = {
    id: newGovId(),
    kind: "record", title: "", entity: "", ref: "",
    due_on: null, recurring: "", status: "open", notes: "",
    ...govPatch(fields),
    source: "app",
    updated_by: String(by || "").toLowerCase(),
  };
  if (!row.title.trim()) throw new Error("title required");
  const { error } = await sb.from("governance_items").insert(row);
  if (error) throw error;
  await refreshGovernance();
  return row.id;
}

export async function updateGovItem(id, fields, by) {
  if (!REMOTE) throw new Error("governance requires the hosted backend");
  const patch = govPatch(fields);
  if (!Object.keys(patch).length) return;
  patch.updated_by = String(by || "").toLowerCase();
  const { error } = await sb.from("governance_items").update(patch).eq("id", id);
  if (error) throw error;
  await refreshGovernance();
}

export async function deleteGovItem(id) {
  if (!REMOTE) throw new Error("governance requires the hosted backend");
  const { error } = await sb.from("governance_items").delete().eq("id", id);
  if (error) throw error;
  await refreshGovernance();
}
