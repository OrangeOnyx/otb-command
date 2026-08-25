/* O-1 Operations — the SOP library (harvest H1.3). OPERATOR: browse the
   category/procedure/step library, see due-today/overdue/streak state, log
   completions (notes + minutes), author content (add/edit categories,
   procedures, steps; deactivate), clear stale occurrences. OWNER: read-only
   library + status. Tenants/vendors never see O-1 (single-sheet roles).
   All derivation lives in lib/sop.js; RLS scopes every query. */
import { REMOTE } from "../lib/remote.js";
import { esc } from "../lib/format.js";
import {
  SOP_FREQ, SOP_STATUS, deriveOccurrence, sopStreak,
  getSopCache, onSopChange, refreshSop,
  addSopCompletion, upsertSopCategory, upsertSopProcedure, upsertSopStep,
  deleteSopStep, setSopProcedureActive, deleteSopOccurrence,
} from "../lib/sop.js";

const todayYmd = () => new Date().toISOString().slice(0, 10);
const tag = (label, color) =>
  '<span style="background:' + color + ';color:#fff;border-radius:3px;padding:0 5px;font-size:10px">' + esc(label) + '</span>';
const freqTag = f => tag(...(SOP_FREQ[f] || SOP_FREQ.as_needed));
const statusTag = s => tag(...SOP_STATUS[s]);
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

/* open (not completed) occurrences for a procedure, oldest first */
const openOccs = (proc, occs) => occs
  .filter(o => o.procedure_id === proc.id && !o.done)
  .sort((a, b) => (a.due_on < b.due_on ? -1 : 1));

function procBadges(proc, cache, today) {
  const open = openOccs(proc, cache.occurrences);
  const overdue = open.filter(o => o.due_on < today);
  const dueToday = open.some(o => o.due_on === today);
  const streak = sopStreak(proc.id, cache.occurrences, today);
  const last = cache.completions.find(c => c.procedure_id === proc.id);
  return (overdue.length ? statusTag("overdue") + (overdue.length > 1 ? ' <span class="mono" style="font-size:10px;color:#C25E33">×' + overdue.length + '</span>' : "") : "") +
    (dueToday && !overdue.length ? statusTag("due") : "") +
    (streak >= 2 ? ' <span class="mono" style="font-size:10px" title="consecutive on-time completions">🔥' + streak + '</span>' : "") +
    (last ? ' <span class="mono mute" style="font-size:10px">last ' + esc(fmtWhen(last.completed_at)) + '</span>' : "");
}

function stepsHTML(proc, cache, operator) {
  const steps = cache.steps.filter(s => s.procedure_id === proc.id)
    .sort((a, b) => a.step_number - b.step_number);
  const rows = steps.map(s =>
    '<div style="margin:3px 0;padding-left:6px;border-left:2px solid ' + (s.is_checkpoint ? "#A87E2F" : "#E3E5DC") + '">' +
    '<span class="mono" style="font-size:11px">' + s.step_number + '.</span> ' +
    '<span style="font-size:12px;font-weight:' + (s.is_checkpoint ? "600" : "400") + '">' + esc(s.title) +
    (s.is_checkpoint ? ' <span title="checkpoint">⚑</span>' : "") + '</span>' +
    (operator ? ' <button class="safe-del sop-step-del" data-step="' + esc(s.id) + '" title="Delete step">✕</button>' : "") +
    (s.instructions ? '<div class="mute" style="font-size:11px">' + esc(s.instructions) + '</div>' : "") +
    (s.warning_note ? '<div style="font-size:11px;color:#C25E33">⚠ ' + esc(s.warning_note) + '</div>' : "") +
    '</div>').join("");
  return rows || '<div class="mute" style="font-size:11px">no steps written yet</div>';
}

/* inline procedure form (add or edit) */
function procFormHTML(cat, proc) {
  const p = proc || {};
  const opts = Object.entries(SOP_FREQ).map(([k, [label]]) =>
    '<option value="' + k + '"' + (k === (p.frequency || "as_needed") ? " selected" : "") + '>' + label + '</option>').join("");
  return '<div class="sop-form" data-cat="' + esc(cat.id) + '" data-proc="' + esc(p.id || "") + '" style="margin:6px 0;padding:8px;border:1px dashed #A87E2F;border-radius:4px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
    '<input type="text" class="spf-title" placeholder="Procedure title" value="' + esc(p.title || "") + '" style="flex:1;min-width:180px">' +
    '<select class="spf-freq">' + opts + '</select>' +
    '<input type="number" class="spf-min" placeholder="est. min" value="' + (p.estimated_minutes || "") + '" style="width:70px">' +
    '</div>' +
    '<textarea class="spf-desc" placeholder="Description" style="width:100%;min-height:36px;font-size:12px">' + esc(p.description || "") + '</textarea>' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<input type="email" class="spf-assignee" placeholder="assignee email (optional)" value="' + esc(p.assignee || "") + '" style="flex:1">' +
    '<button class="chip sop-proc-save">Save</button><button class="chip sop-form-cancel">Cancel</button></div></div>';
}

function stepFormHTML(procId, step) {
  const s = step || {};
  return '<div class="sop-step-form" data-proc="' + esc(procId) + '" data-step="' + esc(s.id || "") + '" style="margin:6px 0;padding:8px;border:1px dashed #5F6E64;border-radius:4px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
    '<input type="number" class="ssf-num" value="' + (s.step_number || "") + '" placeholder="#" style="width:50px">' +
    '<input type="text" class="ssf-title" placeholder="Step title" value="' + esc(s.title || "") + '" style="flex:1;min-width:160px">' +
    '<label class="mono" style="font-size:11px"><input type="checkbox" class="ssf-chk"' + (s.is_checkpoint ? " checked" : "") + '> checkpoint</label></div>' +
    '<textarea class="ssf-instr" placeholder="Instructions" style="width:100%;min-height:32px;font-size:12px">' + esc(s.instructions || "") + '</textarea>' +
    '<input type="text" class="ssf-warn" placeholder="Warning note (optional)" value="' + esc(s.warning_note || "") + '" style="width:100%;margin-top:4px">' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<button class="chip sop-step-save">Save step</button><button class="chip sop-form-cancel">Cancel</button></div></div>';
}

function procedureHTML(proc, cache, today, operator) {
  const open = openOccs(proc, cache.occurrences);
  const overdue = open.filter(o => o.due_on < today);
  const occRows = operator && overdue.length ?
    '<div style="margin:4px 0">' + overdue.map(o =>
      '<div class="mono" style="font-size:11px">' + statusTag("overdue") + ' due ' + esc(o.due_on) +
      ' <button class="chip sop-occ-clear" data-occ="' + esc(o.id) + '" title="Clear — no longer applies">✕ clear</button></div>').join("") + '</div>' : "";
  const completeBox = operator ?
    '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' +
    '<input type="text" class="sop-notes" placeholder="Completion notes (optional)" style="flex:1;min-width:140px;font-size:12px">' +
    '<input type="number" class="sop-min" placeholder="min" style="width:60px">' +
    '<button class="chip sop-complete" style="font-weight:600">✓ Complete</button></div>' : "";
  const authorRow = operator ?
    '<div style="display:flex;gap:6px;margin-top:6px">' +
    '<button class="chip sop-proc-edit">✎ Edit</button>' +
    '<button class="chip sop-step-add">＋ Step</button>' +
    '<button class="chip sop-proc-toggle">' + (proc.is_active ? "Deactivate" : "Reactivate") + '</button></div>' : "";
  return '<details class="sop-proc" data-proc="' + esc(proc.id) + '" style="margin:4px 0 4px 8px">' +
    '<summary style="cursor:pointer;list-style-position:outside">' +
    '<span style="font-weight:600;font-size:13px">' + esc(proc.title) + '</span> ' +
    freqTag(proc.frequency) + ' ' + procBadges(proc, cache, today) +
    (proc.estimated_minutes ? ' <span class="mono mute" style="font-size:10px">~' + proc.estimated_minutes + 'min</span>' : "") +
    '</summary>' +
    (proc.description ? '<div class="mute" style="font-size:12px;margin:4px 0">' + esc(proc.description) + '</div>' : "") +
    occRows +
    '<div class="sop-steps">' + stepsHTML(proc, cache, operator) + '</div>' +
    completeBox + authorRow +
    '<div class="sop-slot"></div></details>';
}

function render(host, account) {
  const cache = getSopCache();
  const today = todayYmd();
  const operator = account.role === "operator";
  if (!cache.categories.length && !cache.procedures.length) {
    host.innerHTML = '<div class="ai-note mute">Loading the SOP library…</div>';
    return;
  }
  const active = cache.procedures.filter(p => p.is_active);
  const open = cache.occurrences.filter(o => !o.done);
  const overdueN = open.filter(o => o.due_on < today).length;
  const dueN = open.filter(o => o.due_on === today).length;

  const catSection = cat => {
    const procs = active.filter(p => p.category_id === cat.id)
      .sort((a, b) => a.title.localeCompare(b.title));
    if (!procs.length && !operator) return "";
    return '<div class="sop-cat" data-cat="' + esc(cat.id) + '" style="margin:12px 0">' +
      '<div class="dw-sec">' + esc(cat.icon ? cat.icon + " " : "") + esc(cat.name) +
      ' <span class="mono mute" style="font-size:10px">' + procs.length + '</span>' +
      (operator ? ' <button class="chip sop-proc-add" style="font-size:10px">＋ procedure</button>' : "") + '</div>' +
      (cat.description ? '<div class="mute" style="font-size:11px;margin:2px 0 4px">' + esc(cat.description) + '</div>' : "") +
      procs.map(p => procedureHTML(p, cache, today, operator)).join("") +
      '<div class="sop-cat-slot"></div></div>';
  };

  const inactive = cache.procedures.filter(p => !p.is_active);
  host.innerHTML =
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    '<span class="dw-sec" style="margin:0">SOP library — ' + active.length + ' active</span>' +
    (dueN ? statusTag("due") + ' <span class="mono" style="font-size:11px">' + dueN + ' today</span>' : "") +
    (overdueN ? statusTag("overdue") + ' <span class="mono" style="font-size:11px">' + overdueN + '</span>' : "") +
    (!dueN && !overdueN ? '<span class="mono mute" style="font-size:11px">all clear</span>' : "") +
    (operator ? "" : ' <span class="mute mono" style="font-size:10px">(read-only)</span>') +
    '</div>' +
    cache.categories.map(catSection).join("") +
    (operator ?
      '<div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">' +
      '<input type="text" id="sopCatName" placeholder="New category name" style="min-width:160px">' +
      '<input type="text" id="sopCatIcon" placeholder="icon" style="width:56px">' +
      '<button class="chip" id="sopCatAdd">＋ Add category</button></div>' : "") +
    (inactive.length && operator ?
      '<details style="margin-top:10px"><summary class="mono mute" style="cursor:pointer">inactive (' + inactive.length + ')</summary>' +
      inactive.map(p => procedureHTML(p, cache, today, operator)).join("") + '</details>' : "");

  if (!operator) return;
  wire(host, account);
}

/* every write helper ends in refreshSop(), which fires onSopChange → render —
   no explicit rerender calls needed here */
function wire(host, account) {
  const fail = (what, err) => alert(what + " failed: " + err.message);
  const cache = getSopCache();

  host.querySelector("#sopCatAdd")?.addEventListener("click", async () => {
    const name = host.querySelector("#sopCatName").value.trim();
    if (!name) return;
    try {
      await upsertSopCategory({ name, icon: host.querySelector("#sopCatIcon").value.trim(),
        sortOrder: cache.categories.length + 1 });
    } catch (err) { fail("Add category", err); }
  });

  host.querySelectorAll(".sop-proc-add").forEach(b => b.onclick = () => {
    const catEl = b.closest(".sop-cat");
    const slot = catEl.querySelector(".sop-cat-slot");
    slot.innerHTML = procFormHTML({ id: catEl.dataset.cat }, null);
    wireForms(host);
  });

  host.querySelectorAll(".sop-proc").forEach(el => {
    const procId = el.dataset.proc;
    const proc = cache.procedures.find(p => p.id === procId);
    const slot = el.querySelector(".sop-slot");
    el.querySelector(".sop-complete")?.addEventListener("click", async () => {
      const open = openOccs(proc, cache.occurrences);
      try {
        await addSopCompletion({
          procedureId: procId,
          assignmentId: open.length ? open[0].id : null, // oldest open occurrence
          notes: el.querySelector(".sop-notes").value.trim(),
          minutes: el.querySelector(".sop-min").value,
        }, account.email);
      } catch (err) { fail("Complete", err); }
    });
    el.querySelector(".sop-proc-edit")?.addEventListener("click", () => {
      slot.innerHTML = procFormHTML({ id: proc.category_id }, proc);
      wireForms(host);
    });
    el.querySelector(".sop-step-add")?.addEventListener("click", () => {
      const nums = cache.steps.filter(s => s.procedure_id === procId).map(s => s.step_number);
      slot.innerHTML = stepFormHTML(procId, { step_number: (nums.length ? Math.max(...nums) : 0) + 1 });
      wireForms(host);
    });
    el.querySelector(".sop-proc-toggle")?.addEventListener("click", async () => {
      try { await setSopProcedureActive(procId, !proc.is_active); }
      catch (err) { fail("Toggle", err); }
    });
    el.querySelectorAll(".sop-occ-clear").forEach(b => b.onclick = async () => {
      if (!confirm("Clear this occurrence? It no longer counts as overdue; the cron re-materializes next period.")) return;
      try { await deleteSopOccurrence(b.dataset.occ); } catch (err) { fail("Clear", err); }
    });
    el.querySelectorAll(".sop-step-del").forEach(b => b.onclick = async e => {
      e.preventDefault();
      if (!confirm("Delete this step?")) return;
      try { await deleteSopStep(b.dataset.step); } catch (err) { fail("Delete step", err); }
    });
  });
}

function wireForms(host) {
  const fail = (what, err) => alert(what + " failed: " + err.message);
  host.querySelectorAll(".sop-form .sop-proc-save").forEach(b => b.onclick = async () => {
    const f = b.closest(".sop-form");
    const title = f.querySelector(".spf-title").value.trim();
    if (!title) { alert("Give the procedure a title."); return; }
    try {
      await upsertSopProcedure({
        id: f.dataset.proc || undefined,
        categoryId: f.dataset.cat,
        title,
        description: f.querySelector(".spf-desc").value.trim(),
        frequency: f.querySelector(".spf-freq").value,
        estimatedMinutes: f.querySelector(".spf-min").value,
        assignee: f.querySelector(".spf-assignee").value.trim(),
        version: f.dataset.proc ? (getSopCache().procedures.find(p => p.id === f.dataset.proc)?.version || 0) + 1 : 1,
      });
    } catch (err) { fail("Save procedure", err); }
  });
  host.querySelectorAll(".sop-step-form .sop-step-save").forEach(b => b.onclick = async () => {
    const f = b.closest(".sop-step-form");
    const title = f.querySelector(".ssf-title").value.trim();
    if (!title) { alert("Give the step a title."); return; }
    try {
      await upsertSopStep({
        id: f.dataset.step || undefined,
        procedureId: f.dataset.proc,
        stepNumber: f.querySelector(".ssf-num").value,
        title,
        instructions: f.querySelector(".ssf-instr").value.trim(),
        isCheckpoint: f.querySelector(".ssf-chk").checked,
        warningNote: f.querySelector(".ssf-warn").value.trim(),
      });
    } catch (err) { fail("Save step", err); }
  });
  host.querySelectorAll(".sop-form-cancel").forEach(b => b.onclick = () => {
    b.closest(".sop-form, .sop-step-form").remove();
  });
}

export function initSop(account) {
  const host = document.getElementById("sopBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">The SOP library runs on the hosted backend — unavailable in local-only mode.</div>';
    return;
  }
  if (account.role !== "operator" && account.role !== "owner") return; // sealed roles never route here
  onSopChange(() => render(host, account));
  refreshSop(); // paint fires via onSopChange
  render(host, account); // immediate skeleton while the fetch runs
}
