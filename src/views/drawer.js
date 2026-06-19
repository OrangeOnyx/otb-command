/* Unit detail drawer — shared by site plan, rent roll, and compliance matrix.
   Compliance cycling and note edits go through the store (write-through). */
import { byUnit, COMP_FIELDS, getComp, cycleComp, getNote, noteIsOverride, setNote, setSelected, getSelected, subscribe } from "../store.js";
import { fmt$, pDate, fDate, daysTo, esc, TODAY } from "../lib/format.js";
import { STATUS_META } from "../lib/colors.js";
import { unitContacts, unitDocuments } from "../lib/directory.js";
import { mountRecords } from "../lib/recordsUI.js";
import { mountAssets } from "../lib/assetsUI.js";

const drawer = document.getElementById("drawer");
let editingNote = false;
let assetDispose = null; // tears down the previous Photos&Plans mount (URLs + listener)

export function openDrawer(unit) {
  setSelected(unit);
  editingNote = false;
  renderDrawer();
  drawer.classList.add("open");
}

export function closeDrawer() {
  drawer.classList.remove("open");
  editingNote = false;
  if (assetDispose) { assetDispose(); assetDispose = null; }
  setSelected(null);
}

document.getElementById("dwX").onclick = closeDrawer;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

// keep the open drawer in sync with mutations made anywhere (e.g. matrix clicks)
subscribe((type) => {
  if (!drawer.classList.contains("open") || !getSelected()) return;
  if (type === "comp" || type === "notes" || type === "import" || type === "contacts" || type === "documents") renderDrawer();
});

function renderDrawer() {
  const u = byUnit[getSelected()];
  if (!u) return;
  const sm = STATUS_META[u.status];
  document.getElementById("dwUnit").textContent = "UNIT " + u.unit + " · " + u.sf.toLocaleString() + " SF";
  document.getElementById("dwName").textContent = u.dba;
  document.getElementById("dwPill").innerHTML = '<span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span>';

  const e = pDate(u.end), s = pDate(u.start);
  let leaseHtml = "";
  if (e) {
    const expired = e < TODAY;
    const pct = s ? Math.max(0, Math.min(100, (TODAY - s) / (e - s) * 100)) : 0;
    leaseHtml = '<div class="dw-sec">Lease term</div>' +
      '<div class="lease-line"><div class="lease-fill" style="width:' + (expired ? 100 : pct.toFixed(1)) + '%;background:' + (expired ? "var(--brick)" : "var(--green)") + '"></div></div>' +
      '<div class="lease-meta"><span>' + fDate(s) + '</span><span>' + (expired ? Math.abs(daysTo(e)) + " days past term — holdover" : daysTo(e) + " days remaining") + '</span><span>' + fDate(e) + '</span></div>';
  }

  const facts = [
    ["Legal entity", esc(u.legal || "—")],
    ["Use", esc(u.use)],
    ["Base rent", u.base ? "$" + u.base.toFixed(2) + " <small>PSF</small>" : "—"],
    ["Total rent", u.total ? "$" + u.total.toFixed(2) + " <small>PSF</small>" : "—"],
    ["Monthly", u.monthly ? fmt$(u.monthly) : "—"],
    ["Term end", u.end ? fDate(e) : "—"]
  ].map(([k, v]) => '<div class="fact"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join("");

  const note = getNote(u.unit);
  // a compliance click can re-render mid-edit — keep the unsaved draft
  const draft = editingNote ? (document.getElementById("noteTa")?.value ?? note) : note;
  let notesHtml;
  if (editingNote) {
    notesHtml = '<div class="dw-sec">Notes</div>' +
      '<textarea class="note-ta" id="noteTa">' + esc(draft) + '</textarea>' +
      '<div class="note-actions"><button class="chip on" id="noteSave">Save</button><button class="chip" id="noteCancel">Cancel</button></div>';
  } else {
    notesHtml = '<div class="dw-sec">Notes' + (noteIsOverride(u.unit) ? " · edited" : "") +
      '<button class="note-edit-btn" id="noteEdit">' + (note ? "Edit" : "Add note") + '</button></div>' +
      (note ? '<div class="note-box">' + esc(note) + '</div>' : '');
  }

  const clHtml = COMP_FIELDS.map(([k, label]) => {
    const st = getComp(u.unit, k);
    const cls = st === "ok" ? "ok" : st === "flag" ? "flag" : st === "na" ? "na" : "";
    const mark = st === "ok" ? "✓" : st === "flag" ? "!" : st === "na" ? "–" : "";
    const stt = st === "ok" ? "On file" : st === "flag" ? "Flag" : st === "na" ? "N/A" : "Unverified";
    return '<div class="cl-row ' + cls + '" data-u="' + u.unit + '" data-k="' + k + '"><span class="st">' + mark + '</span><span class="nm">' + label + '</span><span class="stt">' + stt + '</span></div>';
  }).join("");

  const body = document.getElementById("dwBody");
  body.innerHTML =
    '<div class="facts">' + facts + '</div>' +
    leaseHtml +
    notesHtml +
    '<div class="dw-sec">Contacts</div><div class="recs" id="dwContacts"></div>' +
    '<div class="dw-sec">Documents</div><div class="recs" id="dwDocs"></div>' +
    '<div class="dw-sec">Photos &amp; Plans</div><div class="assets" id="dwAssets"></div>' +
    '<div class="dw-sec">Compliance — click to cycle</div><div class="cl">' + clHtml + '</div>';

  mountRecords(body.querySelector("#dwContacts"), "contacts", unitContacts(u.unit), { unit: u.unit }, renderDrawer);
  mountRecords(body.querySelector("#dwDocs"), "documents", unitDocuments(u.unit), { unit: u.unit }, renderDrawer);
  if (assetDispose) assetDispose();
  assetDispose = mountAssets(body.querySelector("#dwAssets"), u.unit);

  body.querySelectorAll(".cl-row").forEach(row => {
    row.onclick = () => cycleComp(row.dataset.u, row.dataset.k);
  });

  if (editingNote) {
    const ta = body.querySelector("#noteTa");
    ta.focus();
    body.querySelector("#noteSave").onclick = () => { editingNote = false; setNote(u.unit, ta.value); };
    body.querySelector("#noteCancel").onclick = () => { editingNote = false; renderDrawer(); };
  } else {
    body.querySelector("#noteEdit").onclick = () => { editingNote = true; renderDrawer(); };
  }
}
