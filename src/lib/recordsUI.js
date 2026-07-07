/* Shared contacts/documents list UI with inline edit + add, writing through the
   store. Used by the unit drawer (per-unit) and the K-1 Directory (property).
   Edit/add forms are built on click as local DOM, so a store re-render only
   happens on Save (intended) — no cross-render draft state to manage. */
import { editRecord, addRecord, dismissRecord } from "../store.js";
import { esc } from "./format.js";
import { addDoc, docURL, buildDocLink, isDocLink, docPath } from "./docs.js";

const FIELDS = {
  contacts: [["role", "Role"], ["company", "Company"], ["name", "Contact"], ["phone", "Phone"], ["email", "Email"], ["note", "Note"]],
  documents: [["name", "Name"], ["type", "Type"], ["ref", "Reference"], ["link", "Link (paste a Drive / SharePoint URL)"], ["note", "Note"]]
};

function contactView(r) {
  const line2 = [r.phone, r.email].filter(Boolean).join("  ·  ");
  return '<div class="rec-main">' +
    '<div class="rec-t">' + esc(r.company || r.name || "—") + (r.role ? ' <span class="rec-role">' + esc(r.role) + '</span>' : "") + '</div>' +
    (r.name && r.company ? '<div class="rec-s">' + esc(r.name) + '</div>' : "") +
    (line2 ? '<div class="rec-s mono">' + esc(line2) + '</div>' : '<div class="rec-s mute">no phone / email on file</div>') +
    (r.note ? '<div class="rec-note">' + esc(r.note) + '</div>' : "") +
    '</div>';
}
function docView(r) {
  return '<div class="rec-main">' +
    '<div class="rec-t">' + esc(r.name) + (r.type ? ' <span class="rec-role">' + esc(r.type) + '</span>' : "") + '</div>' +
    (r.ref ? '<div class="rec-s mono">' + esc(r.ref) + '</div>' : "") +
    (r.note ? '<div class="rec-note">' + esc(r.note) + '</div>' : "") +
    (r.link
      ? (isDocLink(r.link)
        ? '<a class="rec-link rec-doclink" href="#" data-doc="' + esc(docPath(r.link)) + '">Open 📎</a>'
        : '<a class="rec-link" href="' + esc(r.link) + '" target="_blank" rel="noopener">Open ↗</a>')
      : '<span class="rec-s mute">no file linked</span>') +
    '</div>';
}

function formHTML(name, r) {
  return '<div class="rec-form">' + FIELDS[name].map(([k, label]) =>
    '<label class="rec-f"><span>' + label + '</span>' +
    '<input data-k="' + k + '" value="' + esc(r[k] || "") + '"></label>').join("") +
    (name === "documents"
      ? '<div class="rec-attachrow"><button class="chip rec-attach">📎 Attach file</button>' +
        '<input type="file" class="rec-file" hidden><span class="rec-attach-msg mono"></span></div>'
      : "") +
    '<div class="rec-formacts"><button class="chip on rec-save">Save</button>' +
    '<button class="chip rec-cancel">Cancel</button></div></div>';
}

/* render into el. name = "contacts"|"documents"; scope = {unit?} for adds; rerender = view's refresh fn */
export function mountRecords(el, name, records, scope, rerender) {
  const view = name === "contacts" ? contactView : docView;
  el.innerHTML = records.map(r =>
    '<div class="rec" data-id="' + esc(r.id) + '">' + view(r) +
    '<div class="rec-acts"><button class="rec-edit" title="Edit">✎</button>' +
    '<button class="rec-del" title="Remove">✕</button></div></div>').join("") +
    '<button class="rec-add">+ ' + (name === "contacts" ? "Contact" : "Document") + '</button>';

  const openForm = (anchor, r, isNew) => {
    const host = document.createElement("div");
    host.innerHTML = formHTML(name, r);
    const form = host.firstChild;
    if (isNew) anchor.replaceWith(form); else { anchor.style.display = "none"; anchor.after(form); }
    form.querySelector(".rec-save").onclick = () => {
      const patch = {};
      form.querySelectorAll("input[data-k]").forEach(i => patch[i.dataset.k] = i.value.trim());
      if (isNew) addRecord(name, { ...(scope.unit ? { unit: scope.unit } : {}), ...patch });
      else editRecord(name, r.id, patch);
      rerender();
    };
    form.querySelector(".rec-cancel").onclick = () => rerender();
    const attach = form.querySelector(".rec-attach");
    if (attach) {
      const fileIn = form.querySelector(".rec-file");
      const msg = form.querySelector(".rec-attach-msg");
      attach.onclick = e => { e.preventDefault(); fileIn.click(); };
      fileIn.onchange = async () => {
        const f = fileIn.files[0];
        fileIn.value = "";
        if (!f) return;
        attach.disabled = true; msg.textContent = "Uploading…";
        try {
          const path = await addDoc(f, scope.unit ? { unit: scope.unit } : {});
          form.querySelector('input[data-k="link"]').value = buildDocLink(path);
          msg.textContent = f.name + " attached — Save to keep it";
        } catch (err) { msg.textContent = "Upload failed: " + err.message; }
        attach.disabled = false;
      };
    }
  };

  el.querySelectorAll(".rec").forEach(row => {
    const r = records.find(x => x.id === row.dataset.id);
    row.querySelector(".rec-edit").onclick = () => openForm(row, r, false);
    row.querySelector(".rec-del").onclick = () => { dismissRecord(name, r.id); rerender(); };
  });
  el.querySelectorAll(".rec-doclink").forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      try { window.open(await docURL(a.dataset.doc), "_blank", "noopener"); }
      catch (err) { alert("Could not open file: " + err.message); }
    };
  });
  el.querySelector(".rec-add").onclick = e => openForm(e.target, {}, true);
}
