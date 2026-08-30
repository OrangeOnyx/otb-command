/* N-1 Matters & Planning — long-running property affairs as status-filtered
   cards over lib/matters.js. OPERATOR: open matters, edit fields inline, log
   meeting notes (N-2 v1 → comm_log), close/reopen. OWNER: read-only cards +
   correspondence. Tenants/vendors never route here (single-sheet roles).
   Correspondence loads lazily on first expand; card expansion + the comms
   cache survive rerenders via module state. */
import { REMOTE } from "../lib/remote.js";
import { esc } from "../lib/format.js";
import {
  MATTER_KINDS, MATTER_STATUS, sortMatters, deadlineTone,
  getMatters, onMattersChange, refreshMatters,
  addMatter, updateMatter, addMeetingNote, listMatterComms,
} from "../lib/matters.js";

const todayYmd = () => new Date().toISOString().slice(0, 10);
const tag = (label, color) =>
  '<span style="background:' + color + ';color:#fff;border-radius:3px;padding:0 5px;font-size:10px">' + esc(label) + '</span>';
const kindTag = k => tag(...(MATTER_KINDS[k] || MATTER_KINDS.general));
const statusTag = s => tag(...(MATTER_STATUS[s] || MATTER_STATUS.open));
const fmtDay = ymd => ymd ? new Date(ymd + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

/* sheet state survives rerenders */
let filter = "all";
const expanded = new Set();
const comms = new Map(); // matterId → rows[] | "loading" | "error"

const kindOpts = sel => Object.entries(MATTER_KINDS).map(([k, [label]]) =>
  '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + label + '</option>').join("");
const statusOpts = sel => Object.entries(MATTER_STATUS).map(([k, [label]]) =>
  '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + label + '</option>').join("");

function deadlineHTML(m, today) {
  if (!m.next_deadline) return "";
  const tone = deadlineTone(m.next_deadline, today);
  const color = tone === "overdue" ? "var(--brick)" : tone === "soon" ? "var(--brass)" : "var(--slate)";
  return '<span class="mono" style="display:block;font-size:11px;color:' + color + '">' +
    (tone === "overdue" ? "⚠ deadline passed " : "deadline ") + esc(fmtDay(m.next_deadline)) + '</span>';
}

function commsHTML(id) {
  const c = comms.get(id);
  if (c === undefined || c === "loading") return '<div class="led-note">loading correspondence…</div>';
  if (c === "error") return '<div class="led-note" style="color:var(--brick)">correspondence read failed — reopen the card to retry</div>';
  if (!c.length) return '<div class="led-note">no correspondence linked yet</div>';
  return c.map(r =>
    '<div class="led-note">' + esc(r.channel) + ' · ' + esc(fmtWhen(r.at)) +
    (r.contact_name ? " · " + esc(r.contact_name) : "") +
    (r.unit ? " · unit " + esc(r.unit) : "") +
    (r.summary ? ' — <span style="color:var(--ink)">' + esc(r.summary) + '</span>' : "") +
    '</div>').join("");
}

/* inline operator forms (render into the card's slot) */
function editFormHTML(m) {
  return '<div class="mtr-edit-form" style="margin:6px 0;padding:8px;border:1px dashed #A87E2F;border-radius:4px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
    '<input type="text" class="mef-title" value="' + esc(m.title) + '" placeholder="Title" style="flex:1;min-width:180px">' +
    '<select class="mef-kind">' + kindOpts(m.kind) + '</select>' +
    '<select class="mef-status">' + statusOpts(m.status) + '</select></div>' +
    '<textarea class="mef-sum" placeholder="Summary" style="width:100%;min-height:44px;font-size:12px">' + esc(m.summary || "") + '</textarea>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">' +
    '<input type="date" class="mef-dl" value="' + esc(m.next_deadline || "") + '" title="Next deadline">' +
    '<input type="text" class="mef-dln" value="' + esc(m.next_deadline_note || "") + '" placeholder="Deadline note" style="flex:1;min-width:140px"></div>' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<button class="chip mtr-edit-save" style="cursor:pointer;font-weight:600">Save</button>' +
    '<button class="chip mtr-form-cancel" style="cursor:pointer">Cancel</button></div></div>';
}

function noteFormHTML() {
  return '<div class="mtr-note-form" style="margin:6px 0;padding:8px;border:1px dashed #5F6E64;border-radius:4px">' +
    '<input type="text" class="mnf-sum" placeholder="Meeting summary (one line)" style="width:100%;font-size:12px">' +
    '<textarea class="mnf-body" placeholder="Notes (optional)" style="width:100%;min-height:44px;font-size:12px;margin-top:4px"></textarea>' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<button class="chip mtr-note-save" style="cursor:pointer;font-weight:600">Log note</button>' +
    '<button class="chip mtr-form-cancel" style="cursor:pointer">Cancel</button></div></div>';
}

function matterHTML(m, today, operator) {
  const isOpen = expanded.has(m.id);
  const snippet = String(m.summary || "");
  const summaryLine = !isOpen && snippet ?
    '<span class="mute" style="display:block;font-size:11px">' + esc(snippet.length > 110 ? snippet.slice(0, 110) + "…" : snippet) + '</span>' : "";
  const body = !isOpen ? "" :
    (m.summary ? '<div style="font-size:12px;margin:4px 0;white-space:pre-wrap">' + esc(m.summary) + '</div>' : "") +
    (m.next_deadline_note ? '<div class="led-note">deadline note — ' + esc(m.next_deadline_note) + '</div>' : "") +
    '<div class="led-note">opened ' + esc(fmtDay(m.opened_on)) +
    (m.status === "closed" && m.closed_on ? ' · closed ' + esc(fmtDay(m.closed_on)) : "") + '</div>' +
    '<div class="dw-sec" style="margin:6px 0 2px">Correspondence</div>' + commsHTML(m.id) +
    (operator ?
      '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' +
      '<button class="chip mtr-edit" style="cursor:pointer">✎ Edit</button>' +
      '<button class="chip mtr-note-add" style="cursor:pointer">＋ Meeting note</button>' +
      (m.status === "closed" ?
        '<button class="chip mtr-reopen" style="cursor:pointer">Reopen</button>' :
        '<button class="chip mtr-close" style="cursor:pointer">Close matter</button>') +
      '</div><div class="mtr-slot"></div>' : "");
  return '<details class="mtr" data-id="' + esc(m.id) + '"' + (isOpen ? " open" : "") +
    ' style="margin:6px 0;padding:6px 10px;border:1px solid #E3E5DC;border-radius:4px;background:#F6F7F1">' +
    '<summary style="cursor:pointer;list-style-position:outside">' +
    '<span style="font-weight:600;font-size:13px">' + esc(m.title) + '</span> ' +
    kindTag(m.kind) + ' ' + statusTag(m.status) +
    deadlineHTML(m, today) + summaryLine + '</summary>' + body + '</details>';
}

function render(host, account) {
  const { matters, loaded } = getMatters();
  const today = todayYmd();
  const operator = account.role === "operator";
  if (!loaded && !matters.length) {
    host.innerHTML = '<div class="ai-note mute">Loading matters…</div>';
    return;
  }
  const counts = { open: 0, monitoring: 0, closed: 0 };
  matters.forEach(m => { if (m.status in counts) counts[m.status]++; });
  const shown = sortMatters(filter === "all" ? matters : matters.filter(m => m.status === filter));

  host.innerHTML =
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">' +
    '<span class="dw-sec" style="margin:0">Matters — ' + counts.open + ' open</span>' +
    ["open", "monitoring", "closed", "all"].map(f =>
      '<button class="chip mtr-filter' + (filter === f ? " on" : "") + '" data-f="' + f + '" style="cursor:pointer">' +
      (f === "all" ? "All" : (MATTER_STATUS[f][0] + " " + counts[f])) + '</button>').join("") +
    (operator ? "" : ' <span class="mute mono" style="font-size:10px">(read-only)</span>') + '</div>' +
    (operator ?
      '<details id="mtrNew" style="margin-bottom:8px"><summary class="chip" style="cursor:pointer;display:inline-block">＋ New matter</summary>' +
      '<div style="margin:6px 0;padding:8px;border:1px dashed #A87E2F;border-radius:4px">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
      '<input type="text" id="mtrNewTitle" placeholder="Matter title" style="flex:1;min-width:180px">' +
      '<select id="mtrNewKind">' + kindOpts("general") + '</select>' +
      '<input type="date" id="mtrNewDeadline" title="Next deadline (optional)"></div>' +
      '<textarea id="mtrNewSummary" placeholder="Summary" style="width:100%;min-height:36px;font-size:12px"></textarea>' +
      '<div style="margin-top:4px"><button class="chip" id="mtrNewSave" style="cursor:pointer;font-weight:600">Open matter</button></div>' +
      '</div></details>' : "") +
    (matters.length ?
      (shown.length ? shown.map(m => matterHTML(m, today, operator)).join("") :
        '<div class="led-note">no ' + esc(filter) + ' matters</div>') :
      '<div class="ai-note mute">No matters on file' + (operator ? " — open the first one above." : ".") + '</div>');

  wire(host, account);
}

function loadComms(id, host, account) {
  if (comms.has(id) && comms.get(id) !== "error") return;
  comms.set(id, "loading");
  listMatterComms(id)
    .then(rows => comms.set(id, rows))
    .catch(err => { console.warn("matter comms:", err.message); comms.set(id, "error"); })
    .finally(() => { if (host.isConnected) render(host, account); });
}

function wire(host, account) {
  const fail = (what, err) => alert(what + " failed: " + err.message);
  host.querySelectorAll(".mtr-filter").forEach(b => b.onclick = () => {
    filter = b.dataset.f;
    render(host, account);
  });

  host.querySelector("#mtrNewSave")?.addEventListener("click", async () => {
    const title = host.querySelector("#mtrNewTitle").value.trim();
    if (!title) { alert("Give the matter a title."); return; }
    try {
      await addMatter({
        title,
        kind: host.querySelector("#mtrNewKind").value,
        summary: host.querySelector("#mtrNewSummary").value.trim(),
        nextDeadline: host.querySelector("#mtrNewDeadline").value || null,
      }, account.email); // refreshMatters → onMattersChange → rerender clears the form
    } catch (err) { fail("Open matter", err); }
  });

  host.querySelectorAll(".mtr").forEach(el => {
    const id = el.dataset.id;
    const m = getMatters().matters.find(x => x.id === id);
    if (!m) return;

    el.addEventListener("toggle", () => {
      if (el.open === expanded.has(id)) return; // rerender echo, not a user click
      if (el.open) { expanded.add(id); loadComms(id, host, account); }
      else expanded.delete(id);
      render(host, account);
    });

    const slot = () => el.querySelector(".mtr-slot");
    el.querySelector(".mtr-edit")?.addEventListener("click", () => {
      slot().innerHTML = editFormHTML(m);
      wireForms(host, account, id);
    });
    el.querySelector(".mtr-note-add")?.addEventListener("click", () => {
      slot().innerHTML = noteFormHTML();
      wireForms(host, account, id);
    });
    el.querySelector(".mtr-close")?.addEventListener("click", async () => {
      if (!confirm("Close this matter? It drops off the T-1 deadline feed.")) return;
      try { await updateMatter(id, { status: "closed", closed_on: todayYmd() }, account.email); }
      catch (err) { fail("Close", err); }
    });
    el.querySelector(".mtr-reopen")?.addEventListener("click", async () => {
      try { await updateMatter(id, { status: "open", closed_on: null }, account.email); }
      catch (err) { fail("Reopen", err); }
    });
  });
}

function wireForms(host, account, id) {
  const fail = (what, err) => alert(what + " failed: " + err.message);
  host.querySelectorAll(".mtr-edit-form .mtr-edit-save").forEach(b => b.onclick = async () => {
    const f = b.closest(".mtr-edit-form");
    const title = f.querySelector(".mef-title").value.trim();
    if (!title) { alert("Give the matter a title."); return; }
    const status = f.querySelector(".mef-status").value;
    const was = getMatters().matters.find(x => x.id === id) || {};
    try {
      await updateMatter(id, {
        title,
        kind: f.querySelector(".mef-kind").value,
        status,
        summary: f.querySelector(".mef-sum").value.trim(),
        next_deadline: f.querySelector(".mef-dl").value || null,
        next_deadline_note: f.querySelector(".mef-dln").value.trim(),
        // closing via edit stamps today; reopening clears the stamp
        closed_on: status === "closed" ? (was.closed_on || todayYmd()) : null,
      }, account.email);
    } catch (err) { fail("Save matter", err); }
  });
  host.querySelectorAll(".mtr-note-form .mtr-note-save").forEach(b => b.onclick = async () => {
    const f = b.closest(".mtr-note-form");
    const summary = f.querySelector(".mnf-sum").value.trim();
    if (!summary) { alert("Give the note a one-line summary."); return; }
    try {
      await addMeetingNote(id, { summary, body: f.querySelector(".mnf-body").value.trim() }, account.email);
      comms.delete(id); // invalidate → lazy reload paints the new note
      loadComms(id, host, account);
      render(host, account);
    } catch (err) { fail("Meeting note", err); }
  });
  host.querySelectorAll(".mtr-form-cancel").forEach(b => b.onclick = () => {
    b.closest(".mtr-edit-form, .mtr-note-form").remove();
  });
}

export function initMatters(account) {
  const host = document.getElementById("mattersBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">Matters require the hosted backend — unavailable in local-only mode.</div>';
    return;
  }
  if (!account || (account.role !== "operator" && account.role !== "owner")) return; // sealed roles never route here
  onMattersChange(() => render(host, account));
  refreshMatters(); // paint fires via onMattersChange
  render(host, account); // immediate skeleton while the fetch runs
}
