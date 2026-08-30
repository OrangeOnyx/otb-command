/* S-1 Owner Safe — vault for sensitive financial documents.
   Categories are folder prefixes in the private "safe" bucket (read = owner +
   operator roles only; write = operator; every view/upload/delete audited to
   safe_log). Owners get read/open only — operator controls are hidden by the
   existing body.role-owner CSS AND enforced server-side by RLS. */
import { SAFE_CATEGORIES, addSafeDoc, listSafe, safeURL, removeSafeDoc, listLog } from "../lib/safe.js";
import { openBoardReport } from "../lib/boardreport.js";
import { esc } from "../lib/format.js";
import { REMOTE, getSession } from "../lib/remote.js";
import {
  GOV_KINDS, sortGov, nextAnnual,
  getGovernance, onGovernanceChange, refreshGovernance,
  addGovItem, updateGovItem, deleteGovItem,
} from "../lib/governance.js";

const fmtSize = n => !n ? "" : n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const fmtDay = ymd => ymd ? new Date(ymd + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

async function render() {
  const host = document.getElementById("safeList");
  if (!host) return;
  const files = await listSafe();
  if (!host.isConnected) return;

  host.innerHTML = SAFE_CATEGORIES.map(([cat, label]) => {
    const rows = files.filter(f => f.category === cat);
    return '<div class="safe-cat">' +
      '<div class="safe-cat-head"><span class="safe-cat-name">' + label + '</span>' +
      '<span class="safe-cat-n mono">' + rows.length + '</span>' +
      '<button class="chip safe-add" data-cat="' + cat + '">+ Upload</button>' +
      '<input type="file" class="safe-file" data-cat="' + cat + '" hidden></div>' +
      (rows.length
        ? rows.map(f =>
          '<div class="safe-row" data-path="' + esc(f.path) + '">' +
          '<span class="safe-name">' + esc(f.name) + '</span>' +
          '<span class="safe-meta mono">' + fmtSize(f.size) + (f.addedAt ? " · " + fmtWhen(f.addedAt) : "") + '</span>' +
          '<a class="rec-link safe-open" href="#">Open 🔒</a>' +
          '<button class="safe-del" title="Remove">✕</button></div>').join("")
        : '<div class="safe-empty mute">nothing filed</div>') +
      '</div>';
  }).join("") +
    /* Quarterly board report (register row #12): composes the stored monthly
       owner-brief models. Operator AND owner — RLS scopes the reads. */
    '<div class="safe-cat">' +
    '<div class="safe-cat-head"><span class="safe-cat-name">Board report</span>' +
    '<button class="chip" id="safeBoardRpt">⤓ Last quarter</button>' +
    '<span class="led-note mute" id="safeBoardNote"></span></div></div>' +
    /* Governance (register row #8): operator-entered entity/covenant records
       over governance_items — its content is painted by renderGov (cache-fed,
       repainted alone via onGovernanceChange, never a full safe render). */
    '<div class="safe-cat" id="safeGov"></div>';

  const rptBtn = host.querySelector("#safeBoardRpt");
  if (rptBtn) rptBtn.onclick = async () => {
    const note = host.querySelector("#safeBoardNote");
    rptBtn.disabled = true;
    try {
      const q = await openBoardReport(new Date().toISOString().slice(0, 7));
      if (note) note.textContent = "Opened " + q + ".";
    } catch (err) {
      if (note) note.textContent = err.message; // incl. "hosted backend required" in local mode
    } finally { rptBtn.disabled = false; }
  };

  host.querySelectorAll(".safe-add").forEach(btn => {
    btn.onclick = () => host.querySelector('.safe-file[data-cat="' + btn.dataset.cat + '"]').click();
  });
  host.querySelectorAll(".safe-file").forEach(inp => {
    inp.onchange = async () => {
      const f = inp.files[0];
      inp.value = "";
      if (!f) return;
      try { await addSafeDoc(f, inp.dataset.cat); render(); renderLog(); }
      catch (err) { alert("Upload failed: " + err.message); }
    };
  });
  host.querySelectorAll(".safe-open").forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      const path = a.closest(".safe-row").dataset.path;
      try { window.open(await safeURL(path), "_blank", "noopener"); renderLog(); }
      catch (err) { alert("Could not open: " + err.message); }
    };
  });
  host.querySelectorAll(".safe-del").forEach(b => {
    b.onclick = async () => {
      const row = b.closest(".safe-row");
      if (!confirm("Remove " + row.querySelector(".safe-name").textContent + " from the safe?")) return;
      try { await removeSafeDoc(row.dataset.path); render(); renderLog(); } // L2: surface failures
      catch (err) { alert("Could not remove: " + err.message); }
    };
  });

  renderGov(); // full render rebuilt #safeGov empty — repaint it from cache
}

/* ── Governance block (register row #8) ──────────────────────────
   Operator-entered records layered over the repo-locked instrument facts
   (see src/lib/governance.js header). Owners read-only; operator gets
   inline status cycling, delete, and the add form. */
let actorEmail = "";
let govFormOpen = false;

const GOV_COLORS = { entity: "#6B4E71", covenant: "#1E4F3C", deadline: "#A87E2F", record: "#5F6E64" };
const ymdPlus = (ymd, days) => new Date(Date.parse(ymd + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);

function govDueHTML(g, today) {
  if (g.status === "satisfied") return '<span class="mono mute" style="font-size:11px">✓ satisfied</span>';
  if (g.status === "waived") return '<span class="mono mute" style="font-size:11px">waived</span>';
  if (!g.due_on) return "";
  const shown = g.recurring === "annual" ? (nextAnnual(g.due_on, today) || g.due_on) : g.due_on;
  const color = shown < today ? "var(--brick)" : shown <= ymdPlus(today, 60) ? "var(--brass)" : "var(--slate)";
  const label = g.recurring === "annual"
    ? "annual · next " + fmtDay(shown)
    : (shown < today ? "⚠ due " : "due ") + fmtDay(shown);
  return '<span class="mono" style="font-size:11px;color:' + color + '">' + esc(label) + '</span>';
}

function govRowHTML(g, today, operator) {
  const chip = '<span style="background:' + (GOV_COLORS[g.kind] || GOV_COLORS.record) +
    ';color:#fff;border-radius:3px;padding:0 5px;font-size:10px">' + esc(GOV_KINDS[g.kind] || g.kind) + '</span>';
  const controls = !operator ? "" :
    '<span style="display:flex;gap:4px;align-items:center">' +
    (g.status === "open"
      ? '<button class="chip gov-st" data-id="' + esc(g.id) + '" data-st="satisfied" style="cursor:pointer">✓ satisfied</button>' +
        '<button class="chip gov-st" data-id="' + esc(g.id) + '" data-st="waived" style="cursor:pointer">waive</button>'
      : '<button class="chip gov-st" data-id="' + esc(g.id) + '" data-st="open" style="cursor:pointer">reopen</button>') +
    '<button class="safe-del gov-del" data-id="' + esc(g.id) + '" title="Remove">✕</button></span>';
  return '<div class="safe-row" style="flex-wrap:wrap;gap:8px">' + chip +
    '<span class="safe-name">' + esc(g.title) + '</span>' +
    (g.entity ? '<span class="safe-meta mono">' + esc(g.entity) + '</span>' : "") +
    (g.ref ? '<span class="safe-meta mono">' + esc(g.ref) + '</span>' : "") +
    govDueHTML(g, today) + controls +
    (g.notes ? '<span class="led-note mute" style="flex-basis:100%;padding:0">' + esc(g.notes) + '</span>' : "") +
    '</div>';
}

function govFormHTML() {
  const opts = Object.entries(GOV_KINDS).map(([k, label]) =>
    '<option value="' + k + '"' + (k === "record" ? " selected" : "") + '>' + label + '</option>').join("");
  return '<div id="govForm" style="margin:6px 0;padding:8px;border:1px dashed #A87E2F;border-radius:4px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
    '<select id="govKind">' + opts + '</select>' +
    '<input type="text" id="govTitle" placeholder="Title (required)" style="flex:1;min-width:160px">' +
    '<input type="text" id="govEntity" placeholder="Entity" style="min-width:140px">' +
    '<input type="text" id="govRef" placeholder="Ref #" style="min-width:90px">' +
    '<input type="date" id="govDue" title="Due date">' +
    '<label class="mono" style="font-size:11px;display:flex;align-items:center;gap:4px">' +
    '<input type="checkbox" id="govAnnual">annual</label></div>' +
    '<input type="text" id="govNotes" placeholder="Notes (optional)" style="width:100%;font-size:12px">' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<button class="chip" id="govSave" style="cursor:pointer;font-weight:600">Save</button>' +
    '<button class="chip" id="govCancel" style="cursor:pointer">Cancel</button></div></div>';
}

function renderGov() {
  const el = document.getElementById("safeGov");
  if (!el || !el.isConnected) return;
  const head = '<div class="safe-cat-head"><span class="safe-cat-name">Governance</span>';
  if (!REMOTE) {
    el.innerHTML = head +
      '<span class="led-note mute">hosted backend required — governance records unavailable in local-only mode</span></div>';
    return;
  }
  // same body.role-* idiom drawer.js uses (S-1 has no account param)
  const operator = !document.body.classList.contains("role-owner") &&
    !document.body.classList.contains("role-tenant") &&
    !document.body.classList.contains("role-vendor");
  const { items, loaded } = getGovernance();
  const rows = sortGov(items);
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = head +
    '<span class="safe-cat-n mono">' + rows.length + '</span>' +
    (operator ? '<button class="chip safe-add" id="govAddToggle" style="cursor:pointer">＋ Governance item</button>' : "") +
    '<span class="led-note mute" id="govNote"></span></div>' +
    (operator && govFormOpen ? govFormHTML() : "") +
    (rows.length
      ? rows.map(g => govRowHTML(g, today, operator)).join("")
      : '<div class="safe-empty mute">' + (loaded ? "no governance records filed" : "loading governance records…") + '</div>');
  wireGov(el);
}

function wireGov(el) {
  const note = el.querySelector("#govNote");
  const fail = (what, err) => { if (note) note.textContent = what + " failed: " + err.message; };
  const toggle = el.querySelector("#govAddToggle");
  if (toggle) toggle.onclick = () => { govFormOpen = !govFormOpen; renderGov(); };
  const cancel = el.querySelector("#govCancel");
  if (cancel) cancel.onclick = () => { govFormOpen = false; renderGov(); };
  const save = el.querySelector("#govSave");
  if (save) save.onclick = async () => {
    const title = el.querySelector("#govTitle").value.trim();
    if (!title) { alert("Give the governance item a title."); return; }
    save.disabled = true;
    try {
      await addGovItem({
        kind: el.querySelector("#govKind").value,
        title,
        entity: el.querySelector("#govEntity").value.trim(),
        ref: el.querySelector("#govRef").value.trim(),
        due_on: el.querySelector("#govDue").value || null,
        recurring: el.querySelector("#govAnnual").checked ? "annual" : "",
        notes: el.querySelector("#govNotes").value.trim(),
      }, actorEmail);
      govFormOpen = false; // refreshGovernance → onGovernanceChange repaints without the form
    } catch (err) { save.disabled = false; fail("Save", err); }
  };
  el.querySelectorAll(".gov-st").forEach(b => b.onclick = async () => {
    try { await updateGovItem(b.dataset.id, { status: b.dataset.st }, actorEmail); }
    catch (err) { fail("Update", err); }
  });
  el.querySelectorAll(".gov-del").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this governance record?")) return;
    try { await deleteGovItem(b.dataset.id); }
    catch (err) { fail("Delete", err); }
  });
}

async function renderLog() {
  const el = document.getElementById("safeLog");
  if (!el) return;
  const rows = await listLog(30);
  if (!el.isConnected) return;
  el.innerHTML = rows.length
    ? rows.map(r =>
      '<div class="safe-log-row mono"><span>' + fmtWhen(r.at) + '</span>' +
      '<span class="safe-log-act safe-log-' + esc(r.action) + '">' + esc(r.action) + '</span>' +
      '<span class="safe-log-who">' + esc(r.email || "") + '</span>' +
      '<span class="safe-log-path">' + esc(r.path) + '</span></div>').join("")
    : '<div class="safe-empty mute">no access recorded yet</div>';
}

export function initSafe() {
  render();
  renderLog();
  if (REMOTE) {
    getSession().then(s => { actorEmail = (s && s.user && s.user.email) || ""; }).catch(() => {});
    onGovernanceChange(renderGov); // block-only repaint; renderGov guards isConnected
    refreshGovernance();
  }
}
