/* O-1 Operations — SOP module (harvest H1.3, 2026-08-25). Ported from Asset
   Command's 5-table SOP system into Atlas idiom: content tables are editable
   (stamped), occurrences + completions are schedule scaffolding + append-only
   trail, and occurrence STATUS IS DERIVED — completed ⟺ a completion links
   the occurrence, overdue ⟺ its due date passed without one (same
   derive-don't-mutate pattern as M-1). The auto-trigger cron replaces AC's
   dead Manus scheduler: sopNewOccurrences materializes the current period per
   scheduled procedure (deterministic ids, insert-0 on re-run — the
   rent-charges idiom) and sopOverdueCandidate emits ONE digest thread keyed
   by the newest lapse, so a static backlog never re-fires.
   All date math is UTC ymd string comparison — no timestamps, no tz.
   Pure parts tested in test/sop.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";

/* ---- vocabulary (plan-room palette) ---- */
export const SOP_FREQ = {
  daily: ["Daily", "#2F6B4F"],
  weekly: ["Weekly", "#2F6B4F"],
  biweekly: ["Biweekly", "#2F6B4F"],
  monthly: ["Monthly", "#A87E2F"],
  quarterly: ["Quarterly", "#A87E2F"],
  annually: ["Annually", "#5F6E64"],
  as_needed: ["As needed", "#5F6E64"],
};
export const SOP_STATUS = {
  completed: ["Done", "#1E4F3C"],
  due: ["Due today", "#C99A33"],
  overdue: ["Overdue", "#C25E33"],
  pending: ["Pending", "#5F6E64"],
};

/* ---- period math: {start,end} ymd of the period containing `ymd` ----
   Occurrences are due at period END. Weeks run Mon–Sun; biweekly blocks are
   anchored to epoch Monday 1970-01-05 (week 0), block = even week + its odd
   successor. null = unscheduled (as_needed / unknown). */
const MS = 86400000;
const msToYmd = ms => new Date(ms).toISOString().slice(0, 10);
const EPOCH_MONDAY = Date.parse("1970-01-05T00:00:00Z");

export function periodFor(freq, ymd) {
  const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  const ms = Date.UTC(y, m - 1, d);
  if (freq === "daily") return { start: ymd, end: ymd };
  if (freq === "weekly") {
    const start = ms - ((new Date(ms).getUTCDay() + 6) % 7) * MS;
    return { start: msToYmd(start), end: msToYmd(start + 6 * MS) };
  }
  if (freq === "biweekly") {
    const w = Math.floor((ms - EPOCH_MONDAY) / (7 * MS));
    const start = EPOCH_MONDAY + (w - (((w % 2) + 2) % 2)) * 7 * MS;
    return { start: msToYmd(start), end: msToYmd(start + 13 * MS) };
  }
  if (freq === "monthly")
    return { start: msToYmd(Date.UTC(y, m - 1, 1)), end: msToYmd(Date.UTC(y, m, 0)) };
  if (freq === "quarterly") {
    const q = Math.floor((m - 1) / 3);
    return { start: msToYmd(Date.UTC(y, q * 3, 1)), end: msToYmd(Date.UTC(y, q * 3 + 3, 0)) };
  }
  if (freq === "annually") return { start: y + "-01-01", end: y + "-12-31" };
  return null;
}
export const dueEndFor = (freq, ymd) => { const p = periodFor(freq, ymd); return p ? p.end : null; };

/* deterministic occurrence id — idempotent materialization rides on it */
export const sopOccurrenceId = (procId, dueYmd) => "sa:" + procId + ":" + dueYmd;

/* client-row ids (imported AC rows keep their original ids) */
export const newSopId = (prefix, now = Date.now(), rnd = Math.random()) =>
  prefix + now.toString(36) + Math.floor(rnd * 1e6).toString(36);

/* ---- derivation ---- */
/* mark occurrences done from the completions trail (assignment_id links);
   an occ.done already true (e.g. RPC-folded) stays true */
export function foldCompletions(occurrences, completions) {
  const done = new Set((completions || []).map(c => c.assignment_id).filter(Boolean));
  return (occurrences || []).map(o => ({ ...o, done: !!o.done || done.has(o.id) }));
}

/* completed | due (today) | overdue | pending — pure ymd comparison */
export function deriveOccurrence(occ, todayYmd) {
  if (occ.done) return "completed";
  if (occ.due_on < todayYmd) return "overdue";
  if (occ.due_on === todayYmd) return "due";
  return "pending";
}

/* ---- cron materializer (pure): rows the scan should insert today ----
   Skips inactive + as_needed procedures and any procedure whose CURRENT
   period already holds an occurrence — coverage is period-based, not
   id-based, so imported AC rows (original ids) cover their periods too. */
export function sopNewOccurrences(procedures, occurrences, todayYmd) {
  const out = [];
  for (const p of procedures || []) {
    if (p.is_active === false) continue;
    const per = periodFor(p.frequency, todayYmd);
    if (!per) continue;
    const covered = (occurrences || []).some(o =>
      o.procedure_id === p.id && o.due_on >= per.start && o.due_on <= per.end);
    if (!covered) out.push({
      id: sopOccurrenceId(p.id, per.end),
      procedure_id: p.id,
      assignee: p.assignee || "",
      due_on: per.end,
    });
  }
  return out;
}

/* ---- cron digest (pure): ONE manager-thread candidate for the whole
   overdue set, or null when clean. Keyed by the NEWEST overdue due date:
   stable while nothing new lapses (never re-fires on a static backlog),
   fresh thread when a new occurrence goes overdue (re-listing stragglers). */
export function sopOverdueCandidate(procedures, occurrences, todayYmd, { max = 15 } = {}) {
  const byId = Object.fromEntries((procedures || []).map(p => [p.id, p]));
  const overdue = (occurrences || [])
    .filter(o => !o.done && o.due_on < todayYmd)
    .sort((a, b) => (a.due_on < b.due_on ? -1 : a.due_on > b.due_on ? 1 : 0));
  if (!overdue.length) return null;
  const procIds = [...new Set(overdue.map(o => o.procedure_id))];
  const lines = overdue.slice(0, max).map(o =>
    "• " + ((byId[o.procedure_id] || {}).title || o.procedure_id) + " — due " + o.due_on);
  return {
    agent: "manager",
    triggerSource: "sop-overdue:" + overdue[overdue.length - 1].due_on,
    title: "SOPs overdue — " + procIds.length + " procedure" + (procIds.length === 1 ? "" : "s"),
    detail: overdue.length + " scheduled SOP occurrence" + (overdue.length === 1 ? " is" : "s are") +
      " overdue:\n" + lines.join("\n") +
      (overdue.length > max ? "\n…and " + (overdue.length - max) + " more" : "") +
      "\n\nWork them on the O-1 Operations sheet — complete each one, or clear " +
      "occurrences that no longer apply.",
  };
}

/* ---- streak: consecutive completed occurrences, newest first. An occurrence
   not yet due (or due today) that is still open is skipped, not a break. */
export function sopStreak(procId, occurrences, todayYmd) {
  const mine = (occurrences || [])
    .filter(o => o.procedure_id === procId)
    .sort((a, b) => (a.due_on < b.due_on ? 1 : a.due_on > b.due_on ? -1 : 0));
  let n = 0;
  for (const o of mine) {
    if (o.done) { n++; continue; }
    if (o.due_on >= todayYmd) continue;
    break;
  }
  return n;
}

/* ---- REMOTE data layer + cache (owner/operator RLS; sealed for others) ---- */
let cache = { categories: [], procedures: [], steps: [], occurrences: [], completions: [] };
const listeners = [];
export const getSopCache = () => cache;
export function onSopChange(cb) { listeners.push(cb); }

export async function refreshSop() {
  if (!REMOTE) return cache;
  const ctx = await propertyContext();
  const scoped = t => sb.from(t).select("*").eq("property_id", ctx.property_id);
  const [cat, proc, step, occ, comp] = await Promise.all([
    scoped("sop_categories").order("sort_order").order("name"),
    scoped("sop_procedures").order("title"),
    scoped("sop_steps").order("step_number"),
    scoped("sop_assignments").order("due_on", { ascending: false }),
    scoped("sop_completions").order("completed_at", { ascending: false }),
  ]);
  const bad = [cat, proc, step, occ, comp].find(r => r.error);
  if (bad) { console.warn("sop read:", bad.error.message); return cache; }
  cache = {
    categories: cat.data || [],
    procedures: proc.data || [],
    steps: step.data || [],
    occurrences: foldCompletions(occ.data || [], comp.data || []),
    completions: comp.data || [],
  };
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

const stamped = async row => {
  const ctx = await propertyContext();
  return { ...row, org_id: ctx.org_id, property_id: ctx.property_id };
};

/* completion is the audit trail — append-only, links the open occurrence
   when the sheet hands one over */
export async function addSopCompletion({ procedureId, assignmentId = null, notes = "", minutes = null }, email) {
  const row = await stamped({
    id: newSopId("sc"),
    procedure_id: procedureId,
    assignment_id: assignmentId,
    completed_by: String(email || "").toLowerCase(),
    notes: String(notes || "").slice(0, 1000),
    duration_minutes: Number.isFinite(+minutes) && +minutes > 0 ? Math.round(+minutes) : null,
  });
  const { error } = await sb.from("sop_completions").insert(row);
  if (error) throw error;
  await refreshSop();
  return row.id;
}

export async function upsertSopCategory({ id, name, description = "", icon = "", sortOrder = 0 }) {
  const row = await stamped({
    id: id || newSopId("sk"),
    name: String(name).slice(0, 120),
    description: String(description || "").slice(0, 500),
    icon: String(icon || "").slice(0, 8),
    sort_order: Math.round(+sortOrder) || 0,
  });
  const { error } = await sb.from("sop_categories").upsert(row);
  if (error) throw error;
  await refreshSop();
  return row.id;
}

export async function upsertSopProcedure({ id, categoryId, title, description = "", frequency = "as_needed",
  estimatedMinutes = null, assignee = "", unit = null, compField = null, isActive = true, version = 1 }) {
  const row = await stamped({
    id: id || newSopId("sp"),
    category_id: categoryId,
    title: String(title).slice(0, 200),
    description: String(description || "").slice(0, 1000),
    frequency: SOP_FREQ[frequency] ? frequency : "as_needed",
    estimated_minutes: Number.isFinite(+estimatedMinutes) && +estimatedMinutes > 0 ? Math.round(+estimatedMinutes) : null,
    assignee: String(assignee || "").toLowerCase(),
    unit: unit || null,
    comp_field: compField || null,
    is_active: !!isActive,
    version: Math.max(1, Math.round(+version) || 1),
  });
  const { error } = await sb.from("sop_procedures").upsert(row);
  if (error) throw error;
  await refreshSop();
  return row.id;
}

export async function upsertSopStep({ id, procedureId, stepNumber, title, instructions = "",
  isCheckpoint = false, warningNote = "" }) {
  const row = await stamped({
    id: id || newSopId("ss"),
    procedure_id: procedureId,
    step_number: Math.max(1, Math.round(+stepNumber) || 1),
    title: String(title).slice(0, 200),
    instructions: String(instructions || "").slice(0, 2000),
    is_checkpoint: !!isCheckpoint,
    warning_note: String(warningNote || "").slice(0, 500),
  });
  const { error } = await sb.from("sop_steps").upsert(row);
  if (error) throw error;
  await refreshSop();
  return row.id;
}

export async function deleteSopStep(id) {
  const { error } = await sb.from("sop_steps").delete().eq("id", id);
  if (error) throw error;
  await refreshSop();
}

export async function setSopProcedureActive(id, active) {
  const { error } = await sb.from("sop_procedures").update({ is_active: !!active }).eq("id", id);
  if (error) throw error;
  await refreshSop();
}

/* occurrence hygiene: clear a scheduled instance that no longer applies
   (reschedule = clear + the cron re-materializes next period; RLS allows
   operator delete only, and completions referencing it survive as ad-hoc) */
export async function deleteSopOccurrence(id) {
  const { error } = await sb.from("sop_assignments").delete().eq("id", id);
  if (error) throw error;
  await refreshSop();
}
