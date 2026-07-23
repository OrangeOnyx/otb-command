/* M-1 Maintenance — the work-order sheet, three faces on one page (A-2).
   TENANT: submit a request (title/detail/urgency + photos) for their unit,
   follow status, add notes. OPERATOR: full queue — assign a V-1 service
   vendor, flip status, note, file on a tenant's behalf, manage the tenant
   login roster. OWNER: read-only queue. Vendors never see M-1 — their
   assigned work orders surface on V-1 (vendorportal.js).
   Data/derivation lives in lib/maintenance.js; RLS scopes every query. */
import { REMOTE, sb } from "../lib/remote.js";
import {
  MR_STATUS, MR_URGENCY, MR_OPEN_STATES,
  getMaintCache, refreshMaint, onMaintChange, submitRequest, addMrEvent,
  addMrPhoto, listMrPhotos, mrPhotoURL, describeMrEvent,
  listTenantContacts, upsertTenantContact, deactivateTenantContact,
} from "../lib/maintenance.js";
import { UNITS } from "../store.js";
import { esc } from "../lib/format.js";

/* service-vendor roster for the assign dropdown (installed from the seed,
   operator/owner only — same channel as the V-1 roster) */
let vendors = [];
export function installMaintVendors(list) {
  vendors = (Array.isArray(list) ? list : []).filter(v => v.kind === "service");
}
const vendorNames = () => Object.fromEntries(vendors.map(v => [v.id, v.company]));

const tag = (label, color) =>
  '<span style="background:' + color + ';color:#fff;border-radius:3px;padding:0 5px;font-size:10px">' + esc(label) + '</span>';
const statusTag = s => tag(...(MR_STATUS[s] || [s, "#5F6E64"]));
const urgencyTag = u => tag(...(MR_URGENCY[u] || MR_URGENCY.routine));
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

function timelineHTML(req) {
  const names = vendorNames();
  const rows = req.events.map(e => {
    const d = describeMrEvent(e, names);
    return '<div class="mono mute" style="font-size:11px">' + esc(d.when + (d.who ? " · " + d.who : "") + " · ") + esc(d.line) + '</div>';
  }).join("");
  return '<div class="mono mute" style="font-size:11px">' + esc(fmtWhen(req.created_at)) + ' · filed by ' + esc(String(req.created_by).split("@")[0] || "operator") + '</div>' + rows;
}

/* photos strip fills in async; audit-free signed links */
function loadPhotos(el, requestId) {
  listMrPhotos(requestId).then(files => {
    if (!el.isConnected) return;
    el.innerHTML = files.length
      ? files.map(f => '<a class="rec-link mr-photo" data-path="' + esc(f.path) + '" href="#">📷 ' + esc(f.name) + '</a>').join(" ")
      : "";
    el.querySelectorAll(".mr-photo").forEach(a => {
      a.onclick = async e => {
        e.preventDefault();
        try { window.open(await mrPhotoURL(a.dataset.path), "_blank", "noopener"); }
        catch (err) { alert("Could not open photo: " + err.message); }
      };
    });
  });
}

async function uploadPhotos(requestId, fileList) {
  for (const f of fileList) {
    try { await addMrPhoto(f, requestId); }
    catch (err) { alert("Photo upload failed (" + f.name + "): " + err.message); }
  }
}

function requestCard(req, { controls = "", noteBox = true } = {}) {
  return '<div class="card" style="padding:10px 12px;margin:8px 0" data-mr="' + esc(req.id) + '">' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    '<span class="mono" style="font-weight:600">' + esc(req.unit) + '</span>' +
    statusTag(req.displayStatus) + urgencyTag(req.urgency) +
    '<span style="font-weight:600">' + esc(req.title) + '</span></div>' +
    (req.detail ? '<div style="font-size:12px;margin:4px 0">' + esc(req.detail) + '</div>' : "") +
    '<div class="mr-photos" style="margin:4px 0"></div>' +
    '<details style="margin:4px 0"><summary class="mono mute" style="font-size:11px;cursor:pointer">history (' + req.events.length + ')</summary>' + timelineHTML(req) + '</details>' +
    controls +
    (noteBox ?
      '<div style="display:flex;gap:6px;margin-top:6px">' +
      '<input type="text" class="mr-note" placeholder="Add a note… (Enter)" style="flex:1;font-size:12px">' +
      '<label class="chip" style="cursor:pointer">📷 Add photos<input type="file" class="mr-addphoto" accept="image/*" multiple hidden></label>' +
      '</div>' : "") +
    '</div>';
}

function wireCardBasics(host, email, rerender) {
  host.querySelectorAll("[data-mr]").forEach(card => {
    const id = card.dataset.mr;
    loadPhotos(card.querySelector(".mr-photos"), id);
    const note = card.querySelector(".mr-note");
    if (note) note.onkeydown = async e => {
      if (e.key !== "Enter" || !note.value.trim()) return;
      try { await addMrEvent(id, { kind: "note", note: note.value.trim() }, email); rerender(); }
      catch (err) { alert("Note failed: " + err.message); }
    };
    const photo = card.querySelector(".mr-addphoto");
    if (photo) photo.onchange = async e => {
      const files = [...e.target.files];
      e.target.value = "";
      if (files.length) { await uploadPhotos(id, files); rerender(); }
    };
  });
}

/* ---------- submit form (tenant fixes the unit; operator picks it) ---------- */
function submitFormHTML(unitFixed) {
  const unitField = unitFixed
    ? '<span class="mono" style="font-weight:600">Unit ' + esc(unitFixed) + '</span><input type="hidden" id="mrUnit" value="' + esc(unitFixed) + '">'
    : '<select id="mrUnit">' + UNITS.map(u => '<option value="' + esc(u.unit) + '">' + esc(u.unit) + (u.dba ? " · " + esc(u.dba) : "") + '</option>').join("") + '</select>';
  return '<div class="card" style="padding:10px 12px;margin:8px 0">' +
    '<div class="dw-sec">New request</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0">' + unitField +
    '<select id="mrUrgency"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">EMERGENCY</option></select>' +
    '<input type="text" id="mrTitle" placeholder="What needs fixing?" style="flex:1;min-width:180px"></div>' +
    '<textarea id="mrDetail" placeholder="Details — where, since when, anything the vendor should know" style="width:100%;min-height:50px;font-size:12px"></textarea>' +
    '<div style="display:flex;gap:8px;align-items:center;margin-top:6px">' +
    '<label class="chip" style="cursor:pointer">📷 Photos<input type="file" id="mrFiles" accept="image/*" multiple hidden></label>' +
    '<span id="mrFileCount" class="mono mute" style="font-size:11px"></span>' +
    '<button class="chip" id="mrSubmit" style="margin-left:auto">Submit request</button></div></div>';
}

function wireSubmitForm(host, email, rerender) {
  const files = [];
  const input = host.querySelector("#mrFiles");
  input.onchange = e => {
    files.push(...e.target.files);
    e.target.value = "";
    host.querySelector("#mrFileCount").textContent = files.length ? files.length + " photo(s) attached" : "";
  };
  host.querySelector("#mrSubmit").onclick = async () => {
    const title = host.querySelector("#mrTitle").value.trim();
    if (!title) { alert("Give the request a short title."); return; }
    try {
      const id = await submitRequest({
        unit: host.querySelector("#mrUnit").value,
        title,
        detail: host.querySelector("#mrDetail").value.trim(),
        urgency: host.querySelector("#mrUrgency").value,
      }, email);
      if (files.length) await uploadPhotos(id, files);
      rerender();
    } catch (err) { alert("Submit failed: " + err.message); }
  };
}

/* ---------- tenant face ---------- */
async function renderTenant(host, account) {
  const { data } = await sb.from("tenant_contacts").select("unit,name").limit(1);
  const me = data && data[0];
  if (!me) { host.innerHTML = '<div class="ai-note mute">Your login isn’t linked to a unit yet — contact management.</div>'; return; }
  const mine = getMaintCache();
  host.innerHTML =
    '<div class="dw-sec">Unit ' + esc(me.unit) + ' — maintenance</div>' +
    submitFormHTML(me.unit) +
    '<div class="dw-sec" style="margin-top:14px">Your requests</div>' +
    (mine.length ? mine.map(r => requestCard(r)).join("") : '<div class="safe-empty mute">nothing filed yet</div>');
  const rerender = () => renderTenant(host, account);
  wireSubmitForm(host, account.email, rerender);
  wireCardBasics(host, account.email, rerender);
}

/* ---------- operator face ---------- */
function operatorControls(req) {
  const opts = vendors.map(v =>
    '<option value="' + esc(v.id) + '"' + (v.id === req.vendorId ? " selected" : "") + '>' + esc(v.company) + '</option>').join("");
  const btn = (act, label) => '<button class="chip mr-status" data-status="' + act + '">' + label + '</button>';
  return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px">' +
    '<select class="mr-vendor"><option value="">— vendor —</option>' + opts + '</select>' +
    '<button class="chip mr-assign">Assign</button>' +
    (req.displayStatus !== "in_progress" && MR_OPEN_STATES.includes(req.displayStatus) ? btn("in_progress", "▶ Start") : "") +
    (MR_OPEN_STATES.includes(req.displayStatus) ? btn("done", "✓ Done") : "") +
    (req.status !== "closed" ? btn("closed", "Close") : "") +
    '</div>';
}

async function renderOperator(host, account) {
  const list = getMaintCache();
  const open = list.filter(r => MR_OPEN_STATES.includes(r.displayStatus));
  const finished = list.filter(r => !MR_OPEN_STATES.includes(r.displayStatus));
  const contacts = await listTenantContacts();
  if (!host.isConnected) return;
  host.innerHTML =
    '<div class="dw-sec">Work orders — ' + open.length + ' open</div>' +
    submitFormHTML(null) +
    (open.length ? open.map(r => requestCard(r, { controls: operatorControls(r) })).join("") : '<div class="safe-empty mute">queue is clear</div>') +
    (finished.length ?
      '<details style="margin-top:10px"><summary class="mono mute" style="cursor:pointer">finished (' + finished.length + ')</summary>' +
      finished.slice(0, 20).map(r => requestCard(r, { noteBox: false })).join("") + '</details>' : "") +
    '<details style="margin-top:16px"><summary class="dw-sec" style="cursor:pointer;display:inline-block">Tenant logins — ' + contacts.filter(c => c.active).length + '</summary>' +
    '<div class="mono mute" style="font-size:11px;margin:4px 0">A listed email signs in with the normal magic link and lands on this sheet scoped to their unit.</div>' +
    contacts.map(c =>
      '<div class="safe-row"><span class="safe-name mono" style="font-size:12px">' + esc(c.email) + '</span>' +
      '<span class="safe-meta mono">unit ' + esc(c.unit) + (c.name ? " · " + esc(c.name) : "") + (c.active ? "" : " · inactive") + '</span>' +
      (c.active ? '<button class="safe-del tc-off" data-email="' + esc(c.email) + '" title="Deactivate">✕</button>' : "") + '</div>').join("") +
    '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' +
    '<input type="email" id="tcEmail" placeholder="tenant@email.com" style="min-width:200px">' +
    '<select id="tcUnit">' + UNITS.map(u => '<option value="' + esc(u.unit) + '">' + esc(u.unit) + '</option>').join("") + '</select>' +
    '<input type="text" id="tcName" placeholder="name (optional)">' +
    '<button class="chip" id="tcAdd">+ Add tenant login</button></div></details>';

  const rerender = () => renderOperator(host, account);
  wireSubmitForm(host, account.email, rerender);
  wireCardBasics(host, account.email, rerender);
  host.querySelectorAll("[data-mr]").forEach(card => {
    const id = card.dataset.mr;
    const assign = card.querySelector(".mr-assign");
    if (assign) assign.onclick = async () => {
      const vid = card.querySelector(".mr-vendor").value;
      if (!vid) { alert("Pick a vendor first."); return; }
      try { await addMrEvent(id, { kind: "assign", vendorId: vid }, account.email); rerender(); }
      catch (err) { alert("Assign failed: " + err.message); }
    };
    card.querySelectorAll(".mr-status").forEach(b => b.onclick = async () => {
      try { await addMrEvent(id, { kind: "status", status: b.dataset.status }, account.email); rerender(); }
      catch (err) { alert("Status change failed: " + err.message); }
    });
  });
  host.querySelector("#tcAdd").onclick = async () => {
    const email = host.querySelector("#tcEmail").value.trim();
    if (!email) return;
    try { await upsertTenantContact(email, host.querySelector("#tcUnit").value, host.querySelector("#tcName").value.trim()); rerender(); }
    catch (err) { alert("Could not add: " + err.message); }
  };
  host.querySelectorAll(".tc-off").forEach(b => b.onclick = async () => {
    if (!confirm("Deactivate " + b.dataset.email + "? Their next sign-in parks as pending.")) return;
    try { await deactivateTenantContact(b.dataset.email); rerender(); }
    catch (err) { alert(err.message); }
  });
}

/* ---------- owner face: read-only queue ---------- */
function renderOwner(host) {
  const list = getMaintCache();
  const open = list.filter(r => MR_OPEN_STATES.includes(r.displayStatus));
  host.innerHTML =
    '<div class="dw-sec">Work orders — ' + open.length + ' open <span class="mute">(read-only)</span></div>' +
    (list.length ? list.map(r => requestCard(r, { noteBox: false })).join("") : '<div class="safe-empty mute">nothing filed yet</div>');
  host.querySelectorAll("[data-mr]").forEach(card => loadPhotos(card.querySelector(".mr-photos"), card.dataset.mr));
}

export function initMaintenance(account) {
  const host = document.getElementById("mtBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">Maintenance runs on the hosted backend — unavailable in local-only mode.</div>';
    return;
  }
  const paint = () => {
    if (account.role === "tenant") renderTenant(host, account);
    else if (account.role === "operator") renderOperator(host, account);
    else renderOwner(host);
  };
  onMaintChange(paint);
  refreshMaint(); // paint fires via onMaintChange
  paint();        // immediate skeleton while the fetch runs
}
