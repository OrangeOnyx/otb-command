/* N-1 Matters & Planning — long-running property affairs (zoning, legal,
   insurance, capital projects, governance, leasing strategy) over the
   `matters` table, plus the N-2 meeting-notes v1 surface: a meeting note is a
   comm_log row (channel='meeting') linked by matter_id. RLS: owner+operator
   read · operator write. org_id/property_id are NEVER supplied on writes —
   the table defaults (default_org_id/default_property_id) stamp them; reads
   filter by the resolved property context. comm_log itself is owned by the
   comms module — this file only does its own scoped read of a matter's
   correspondence and the meeting-note insert.
   Pure folds (deadline feed, sort, tones) tested in test/matters.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";
import { addDoc, buildDocLink, isDocLink, docPath } from "./docs.js";

/* ---- vocabulary (plan-room palette; keys mirror the CHECK constraints) ---- */
export const MATTER_KINDS = {
  general: ["General", "#5F6E64"],
  zoning: ["Zoning", "#A87E2F"],
  legal: ["Legal", "#C25E33"],
  insurance: ["Insurance", "#3A5570"],
  capital: ["Capital", "#1E4F3C"],
  governance: ["Governance", "#6B4E71"],
  leasing: ["Leasing", "#2F6B4F"],
};
export const MATTER_STATUS = {
  open: ["Open", "#2F6B4F"],
  monitoring: ["Monitoring", "#A87E2F"],
  closed: ["Closed", "#5F6E64"],
};

/* client-row ids — injectable clock/rand for tests */
export const newMatterId = (prefix = "mt", now = Date.now(), rnd = Math.random()) =>
  prefix + now.toString(36) + Math.floor(rnd * 1e6).toString(36);

/* ---- pure folds ---- */
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MS = 86400000;
const ymdShift = (ymd, days) => {
  const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  return new Date(Date.UTC(y, m - 1, d) + days * MS).toISOString().slice(0, 10);
};

/* T-1 feed: open/monitoring matters with a valid next_deadline no older than
   30 days (recent lapses stay visible; ancient ones age off the timeline),
   soonest first. */
export function matterDeadlines(matters, todayYmd) {
  const floor = ymdShift(todayYmd, -30);
  return (matters || [])
    .filter(m => (m.status === "open" || m.status === "monitoring") &&
      YMD.test(m.next_deadline || "") && m.next_deadline >= floor)
    .map(m => ({
      id: m.id, title: m.title, kind: m.kind, date: m.next_deadline,
      note: m.next_deadline_note || "", overdue: m.next_deadline < todayYmd,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* card ordering: open → monitoring → closed; within a group by next_deadline
   (nulls last), then title */
const STATUS_RANK = { open: 0, monitoring: 1, closed: 2 };
export function sortMatters(matters) {
  return [...(matters || [])].sort((a, b) => {
    const r = (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
    if (r) return r;
    const ad = YMD.test(a.next_deadline || "") ? a.next_deadline : null;
    const bd = YMD.test(b.next_deadline || "") ? b.next_deadline : null;
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

/* deadline urgency for the card line: overdue (brick) | soon ≤30d (brass) |
   later | null (no/invalid date) */
export function deadlineTone(dateYmd, todayYmd) {
  if (!YMD.test(dateYmd || "")) return null;
  if (dateYmd < todayYmd) return "overdue";
  if (dateYmd <= ymdShift(todayYmd, 30)) return "soon";
  return "later";
}

/* ---- REMOTE data layer + cache trio ---- */
let cache = { matters: [], loaded: false };
const listeners = [];
export const getMatters = () => cache;
export function onMattersChange(cb) { listeners.push(cb); }

export async function refreshMatters() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const { data, error } = await sb.from("matters").select("*")
    .eq("property_id", ctx.property_id)
    .order("updated_at", { ascending: false });
  if (error) { console.warn("matters read:", error.message); return cache; }
  cache = { matters: data || [], loaded: true };
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

/* a matter's correspondence — scoped read of comm_log, newest first */
export async function listMatterComms(matterId) {
  if (!REMOTE) return [];
  const ctx = await propertyContext();
  const { data, error } = await sb.from("comm_log")
    .select("id,at,channel,contact_name,summary,body,unit")
    .eq("property_id", ctx.property_id).eq("matter_id", matterId)
    .order("at", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

/* ---- writes (operator RLS; FAIL LOUD — the sheet alerts on error) ---- */
export async function addMatter({ title, kind = "general", summary = "", nextDeadline = null, nextDeadlineNote = "" }, by) {
  const row = {
    id: newMatterId(),
    title: String(title).slice(0, 200),
    kind: MATTER_KINDS[kind] ? kind : "general",
    status: "open",
    summary: String(summary || "").slice(0, 4000),
    next_deadline: YMD.test(nextDeadline || "") ? nextDeadline : null,
    next_deadline_note: String(nextDeadlineNote || "").slice(0, 300),
    source: "app",
    updated_by: String(by || "").toLowerCase(),
  };
  const { error } = await sb.from("matters").insert(row);
  if (error) throw error;
  await refreshMatters();
  return row.id;
}

/* whitelist patch — only the operator-editable columns ever leave the client */
const EDITABLE = ["title", "kind", "status", "summary", "next_deadline", "next_deadline_note", "closed_on"];
export async function updateMatter(id, fields, by) {
  const patch = {};
  for (const k of EDITABLE) if (k in (fields || {})) patch[k] = fields[k];
  if ("title" in patch) patch.title = String(patch.title).slice(0, 200);
  if ("kind" in patch && !MATTER_KINDS[patch.kind]) delete patch.kind;
  if ("status" in patch && !MATTER_STATUS[patch.status]) delete patch.status;
  if ("summary" in patch) patch.summary = String(patch.summary || "").slice(0, 4000);
  if ("next_deadline" in patch && !YMD.test(patch.next_deadline || "")) patch.next_deadline = null;
  if ("next_deadline_note" in patch) patch.next_deadline_note = String(patch.next_deadline_note || "").slice(0, 300);
  if ("closed_on" in patch && !YMD.test(patch.closed_on || "")) patch.closed_on = null;
  if (!Object.keys(patch).length) return;
  patch.updated_by = String(by || "").toLowerCase();
  const { error } = await sb.from("matters").update(patch).eq("id", id);
  if (error) throw error;
  await refreshMatters();
}

/* N-2 meeting-notes v1: a meeting note is a comm_log row linked to the
   matter. No matters refresh needed — the sheet invalidates its own comms
   cache for the matter. */
export async function addMeetingNote(matterId, { summary, body = "", contact = "", unit = null }, by) {
  const row = {
    id: newMatterId("cm"),
    matter_id: matterId,
    unit: unit || null,
    channel: "meeting",
    direction: "",
    contact_name: String(contact || "").slice(0, 120),
    summary: String(summary || "").slice(0, 500),
    body: String(body || "").slice(0, 4000),
    source: "app",
    updated_by: String(by || "").toLowerCase(),
  };
  const { error } = await sb.from("comm_log").insert(row);
  if (error) throw error;
  return row.id;
}

/* N-2 v1.5 file attachments: the file uploads through the documents bucket
   seam (folder "matter-<id>" keeps a matter's files grouped), then lands as a
   comm_log note whose body is the doc:// link. Bucket RLS already lets
   owner+operator read (open) while only the operator uploads/inserts. */
export const ATTACH_PREFIX = "Attached: ";
/* pure: the summary line an attachment row carries (comm_log cap 500) */
export const attachSummary = name =>
  (ATTACH_PREFIX + String(name || "file")).slice(0, 500);

/* pure: the doc:// storage path when a comm row's body is a doc link, else
   null — the view renders an "Open 📎" anchor for non-null rows */
export const commDocLink = row =>
  row && isDocLink(row.body) ? docPath(row.body) : null;

export async function attachMatterDoc(matterId, file, by) {
  const path = await addDoc(file, { unit: "matter-" + matterId });
  const row = {
    id: newMatterId("cm"),
    matter_id: matterId,
    channel: "note",
    direction: "",
    summary: attachSummary(file.name),
    body: buildDocLink(path),
    source: "app",
    updated_by: String(by || "").toLowerCase(),
  };
  const { error } = await sb.from("comm_log").insert(row);
  if (error) throw error;
  return row.id;
}
