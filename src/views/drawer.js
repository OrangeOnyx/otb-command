/* Unit detail drawer — shared by site plan, rent roll, and compliance matrix.
   Compliance cycling and note edits go through the store (write-through). */
import { byUnit, COMP_FIELDS, getComp, cycleComp, getNote, noteIsOverride, setNote, setSelected, getSelected, subscribe } from "../store.js";
import { fmt$, pDate, fDate, daysTo, esc, TODAY } from "../lib/format.js";
import { STATUS_META, hvacTier, TIER_LABEL } from "../lib/colors.js";
import { unitContacts, unitDocuments } from "../lib/directory.js";
import { mountRecords } from "../lib/recordsUI.js";
import { mountAssets } from "../lib/assetsUI.js";
import { mountLedger } from "../lib/ledgerUI.js";
import { mountEsign } from "../lib/esignUI.js";
import { mountLease } from "../lib/leaseUI.js";
import { mountPayHistory } from "../lib/payhistoryUI.js";
import { mountLeaseRef } from "../lib/leaserefUI.js";
import { logoUrl } from "../lib/logos.js";
import hvacData from "../data/hvac.json";
import { leaseEvidenceMarkup } from "../lib/lease-evidence-ui.js";
import { REMOTE, getSession } from "../lib/remote.js";
import {
  HVAC_FREQ, HVAC_STATUS, nextDue, sortHvac, hvacSystemsFor, covenant149Prefill,
  getHvacContracts, getHvacUnits, onHvacChange, refreshHvac, listHvacUnits,
  addHvacContract, updateHvacContract, deleteHvacContract, logHvacService,
} from "../lib/hvac.js";

const drawer = document.getElementById("drawer");
let editingNote = false;
let assetDispose = null; // tears down the previous Photos&Plans mount (URLs + listener)

// same body.role-* idiom leaseUI.js/plan.js use for role gating (RLS is the
// real boundary; this only decides what to paint)
const nonOperatorBody = () => document.body.classList.contains("role-owner") ||
  document.body.classList.contains("role-tenant") || document.body.classList.contains("role-vendor");

/* ── F-4 HVAC block: hvac_units system rows + PM contracts ──────────
   Block-only repaint idiom (safe.js governance / leaserefUI.js): the drawer
   mounts #dwHvac, this paints from the hvac.js caches and subscribes once
   to onHvacChange. Operator gets Log service / status / delete / add form
   (unit 149 prefilled from the §9.01 fact — a prefill, never a seed);
   owner and tenant faces are read-only. */
let hvacCurrent = null;    // latest mounted {el, unit} — the repaint target
let hvacListening = false; // one module-level change listener, ever
let hvacActor = "";
let hvacForm = null;       // open add-form prefill for the current unit, or null

const ymdToday = () => new Date().toISOString().slice(0, 10);
const ymdPlus = (ymd, days) => new Date(Date.parse(ymd + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
const fmtYmd = ymd => (ymd ? fDate(pDate(ymd)) : "");

function mountHvac(el, unit) {
  if (!el) return;
  if (hvacCurrent && hvacCurrent.unit !== unit) hvacForm = null; // form belongs to one unit
  hvacCurrent = { el, unit };
  if (!REMOTE) { paintHvac(el, unit); return; }
  if (!hvacListening) {
    hvacListening = true;
    onHvacChange(() => { if (hvacCurrent && hvacCurrent.el.isConnected) paintHvac(hvacCurrent.el, hvacCurrent.unit); });
    getSession().then(s => { hvacActor = (s && s.user && s.user.email) || ""; }).catch(() => {});
  }
  if (!getHvacContracts().loaded) refreshHvac();
  if (!getHvacUnits().loaded) listHvacUnits();
  paintHvac(el, unit);
}

function hvacSysHTML(s) {
  const bits = [];
  if (s.install_year) bits.push("installed " + esc(s.install_year));
  if (s.lease_responsibility) bits.push(esc(s.lease_responsibility));
  if (s.replacement_history) bits.push(esc(s.replacement_history));
  return '<div class="hvac-sys">' + esc(s.system_type || "HVAC system") +
    (s.system_index ? ' #' + esc(s.system_index) : "") +
    (bits.length ? ' <small>· ' + bits.join(" · ") + '</small>' : "") + '</div>';
}

function hvacRowHTML(c, today, operator) {
  const due = c.status === "active" ? nextDue(c) : null;
  const dueCls = due ? (due < today ? " over" : due <= ymdPlus(today, 14) ? " soon" : "") : "";
  const dueTxt = c.status !== "active" ? (HVAC_STATUS[c.status] || c.status)
    : due ? (due < today ? "⚠ due " : "due ") + fmtYmd(due) : "no service date";
  const meta = [HVAC_FREQ[c.frequency] || c.frequency, c.ref,
    "last service " + (c.last_service_on ? fmtYmd(c.last_service_on) : "never")].filter(Boolean).join(" · ");
  const id = esc(c.id);
  const controls = !operator ? "" :
    '<span class="hvac-acts">' +
    (c.status === "active"
      ? '<button class="chip hv-log" data-id="' + id + '">Log service</button>' +
        '<button class="chip hv-st" data-id="' + id + '" data-st="lapsed">lapsed</button>'
      : '<button class="chip hv-st" data-id="' + id + '" data-st="active">reactivate</button>') +
    '<button class="safe-del hv-del" data-id="' + id + '" title="Remove">✕</button></span>';
  return '<div class="hvac-row"><span class="hvac-vendor">' + esc(c.vendor_name || "PM contract") + '</span>' +
    '<span class="hvac-meta">' + esc(meta) + '</span>' +
    '<span class="hvac-due' + dueCls + '">' + esc(dueTxt) + '</span>' + controls +
    (c.scope ? '<span class="hvac-meta" style="flex-basis:100%">' + esc(c.scope) + '</span>' : "") + '</div>';
}

function hvacFormHTML(p) {
  const freq = Object.entries(HVAC_FREQ).map(([k, label]) =>
    '<option value="' + k + '"' + (k === (p.frequency || "monthly") ? " selected" : "") + '>' + label + '</option>').join("");
  return '<div class="hvac-form">' +
    '<input type="text" id="hvVendor" placeholder="Vendor (required)" value="' + esc(p.vendor_name || "") + '">' +
    '<select id="hvFreq" title="Frequency">' + freq + '</select>' +
    '<input type="date" id="hvStart" title="Contract start">' +
    '<input type="date" id="hvLast" title="Last service">' +
    '<input type="text" id="hvRef" placeholder="Ref (e.g. §9.01)" value="' + esc(p.ref || "") + '">' +
    '<input type="text" id="hvScope" class="wide" placeholder="Scope" value="' + esc(p.scope || "") + '">' +
    '<div class="acts"><button class="chip on" id="hvSave">Save</button><button class="chip" id="hvCancel">Cancel</button>' +
    '<span class="led-note" id="hvNote"></span></div></div>';
}

function paintHvac(el, unit) {
  if (!el || !el.isConnected) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">PM contract tracking requires the hosted backend.</div>'; return; }
  const operator = !nonOperatorBody();
  const units = getHvacUnits(), contracts = getHvacContracts();
  const systems = hvacSystemsFor(units.units, unit);
  const rows = sortHvac(contracts.items.filter(c => c.unit === unit));
  const today = ymdToday();
  let h = systems.length ? systems.map(hvacSysHTML).join("")
    : units.loaded ? "" : '<div class="led-note">Loading systems…</div>';
  h += '<div class="hvac-note">PM contract</div>';
  h += rows.length ? rows.map(c => hvacRowHTML(c, today, operator)).join("")
    : '<div class="led-note">' + (contracts.loaded ? "No PM contract on file." : "Loading PM contracts…") + '</div>';
  if (operator) {
    h += hvacForm ? hvacFormHTML(hvacForm)
      : '<div class="hvac-add"><button class="chip" id="hvAdd">' + (unit === "149" ? "From §9.01" : "＋ Add contract") + '</button>' +
        '<span class="led-note" id="hvNote"></span></div>';
  }
  el.innerHTML = h;
  wireHvac(el, unit);
}

function wireHvac(el, unit) {
  const note = el.querySelector("#hvNote");
  const fail = (what, err) => { if (note) note.textContent = what + " failed: " + err.message; };
  const add = el.querySelector("#hvAdd");
  if (add) add.onclick = () => { hvacForm = unit === "149" ? covenant149Prefill() : { unit }; paintHvac(el, unit); };
  const cancel = el.querySelector("#hvCancel");
  if (cancel) cancel.onclick = () => { hvacForm = null; paintHvac(el, unit); };
  const save = el.querySelector("#hvSave");
  if (save) save.onclick = async () => {
    const vendor_name = el.querySelector("#hvVendor").value.trim();
    if (!vendor_name) { alert("Name the PM vendor."); return; }
    // roster id only when the prefilled vendor was kept verbatim (the roster
    // itself is private — never shipped to the browser)
    const keptPrefill = hvacForm && hvacForm.vendor_name === vendor_name;
    save.disabled = true;
    try {
      await addHvacContract({
        unit, vendor_name,
        vendor_id: keptPrefill ? hvacForm.vendor_id || "" : "",
        frequency: el.querySelector("#hvFreq").value,
        starts_on: el.querySelector("#hvStart").value || null,
        last_service_on: el.querySelector("#hvLast").value || null,
        ref: el.querySelector("#hvRef").value.trim(),
        scope: el.querySelector("#hvScope").value.trim(),
      }, hvacActor);
      hvacForm = null; // refreshHvac → onHvacChange repaints without the form
    } catch (err) { save.disabled = false; fail("Save", err); }
  };
  el.querySelectorAll(".hv-log").forEach(b => b.onclick = async () => {
    const ymd = prompt("Service date (YYYY-MM-DD)", ymdToday());
    if (!ymd) return;
    try { await logHvacService(b.dataset.id, ymd.trim(), hvacActor); }
    catch (err) { fail("Log service", err); }
  });
  el.querySelectorAll(".hv-st").forEach(b => b.onclick = async () => {
    try { await updateHvacContract(b.dataset.id, { status: b.dataset.st }, hvacActor); }
    catch (err) { fail("Update", err); }
  });
  el.querySelectorAll(".hv-del").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this PM contract record?")) return;
    try { await deleteHvacContract(b.dataset.id); }
    catch (err) { fail("Delete", err); }
  });
}

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
  if (type === "scope") {
    closeDrawer();
    document.getElementById("dwBody").replaceChildren();
    document.getElementById("dwName").textContent = "";
    document.getElementById("dwUnit").textContent = "";
    return;
  }
  if (!drawer.classList.contains("open") || !getSelected()) return;
  if (type === "seed" || type === "comp" || type === "notes" || type === "import" || type === "contacts" || type === "documents") renderDrawer();
});

function renderDrawer() {
  const u = byUnit[getSelected()];
  if (!u) return;
  const sm = STATUS_META[u.status];
  document.getElementById("dwUnit").textContent = "UNIT " + u.unit + " · " + u.sf.toLocaleString() + " SF";
  document.getElementById("dwName").textContent = u.dba;
  const logo = document.getElementById("dwLogo"), lu = u.status === "vacant" ? null : logoUrl(u.unit);
  if (logo) {
    if (lu) { logo.src = lu; logo.removeAttribute("hidden"); } else { logo.setAttribute("hidden", ""); logo.removeAttribute("src"); }
    logo.parentElement.classList.toggle("has-logo", !!lu);
  }
  document.getElementById("dwPill").innerHTML = '<span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span>';

  const e = pDate(u.end), s = pDate(u.start);
  let leaseHtml = "";
  if (e) {
    const expired = e < TODAY;
    const pct = s ? Math.max(0, Math.min(100, (TODAY - s) / (e - s) * 100)) : 0;
    leaseHtml = '<div class="dw-sec">Lease term</div>' +
      '<div class="lease-line"><div class="lease-fill" style="width:' + (expired ? 100 : pct.toFixed(1)) + '%;background:' + (expired ? "var(--brick)" : "var(--green)") + '"></div></div>' +
      '<div class="lease-meta"><span>' + fDate(s) + '</span><span>' + (expired ? Math.abs(daysTo(e)) + " days past recorded term · current term unverified" : daysTo(e) + " days remaining") + '</span><span>' + fDate(e) + '</span></div>';
  }

  const facts = [
    ["Legal entity", esc(u.legal || "—")],
    ["Use", esc(u.use)],
    ["Base rent", u.base ? "$" + u.base.toFixed(2) + " <small>PSF</small>" : "—"],
    ["Total rent", u.total ? "$" + u.total.toFixed(2) + " <small>PSF</small>" : "—"],
    ["Monthly", u.monthly ? fmt$(u.monthly) : "—"],
    ["Term end", u.end ? fDate(e) : "—"]
  ].map(([k, v]) => '<div class="fact"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join("");

  const hv = hvacData.units[u.unit];
  let hvacHtml = "";
  if (hv) {
    const full = hv.repair === "100%" && hv.replace === "100%";
    const tier = hvacTier(u);
    const expoTag = tier ? ' <span class="expo-tag expo-' + tier + '">' + esc(TIER_LABEL[tier]) + '</span>' : "";
    hvacHtml = '<div class="dw-sec">HVAC responsibility' + expoTag + '</div>' +
      '<div class="facts">' +
        '<div class="fact"><div class="k">Tenant repair cap</div><div class="v">' + esc(hv.repair) + (full || hv.note ? "" : ' <small>/ occ.</small>') + '</div></div>' +
        '<div class="fact"><div class="k">Tenant replacement</div><div class="v">' + esc(hv.replace) + '</div></div>' +
      '</div>' +
      '<div class="hvac-note">' + (hv.note ? esc(hv.note) : (full
        ? "Tenant fully responsible for HVAC repair &amp; replacement."
        : "Tenant pays to the cap; landlord covers the excess.")) + "</div>";
  } else {
    hvacHtml = '<div class="dw-sec">HVAC</div>';
  }
  // F-4: systems (hvac_units) + PM contract lines paint from cache into this
  // container; block-only repaint via onHvacChange (see mountHvac below)
  hvacHtml += '<div class="hvac-block" id="dwHvac"></div>';

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

  // Lease assembly is operator-only (drafts an executable lease) — unlike
  // Ledger/E-Sign, owners/tenants/vendors get no read-only view of it at all,
  // so the section (header AND panel) must not render for them (same
  // body.role-* check leaseUI.js/plan.js already use for role gating).
  const nonOperator = nonOperatorBody();

  const body = document.getElementById("dwBody");
  body.innerHTML =
    '<div class="facts">' + facts + '</div>' +
    leaseHtml +
    leaseEvidenceMarkup(u.leaseEvidence) +
    hvacHtml +
    notesHtml +
    '<div class="dw-sec">Contacts</div><div class="recs" id="dwContacts"></div>' +
    '<div class="dw-sec">Documents</div><div class="recs" id="dwDocs"></div>' +
    '<div class="dw-sec">Photos &amp; Plans</div><div class="assets" id="dwAssets"></div>' +
    '<div class="dw-sec">Ledger</div><div class="led" id="dwLedger"></div>' +
    '<div class="dw-sec">Prior payments · AC</div><div class="led" id="dwPayHist"></div>' +
    (nonOperator ? "" : '<div class="dw-sec">Lease</div><div class="led" id="dwLease"></div>' +
      '<div class="dw-sec">Lease abstract · AC</div><div class="led" id="dwLeaseRef"></div>') +
    '<div class="dw-sec">E-Sign</div><div class="led" id="dwEsign"></div>' +
    '<div class="dw-sec">Compliance — click to cycle</div><div class="cl">' + clHtml + '</div>';

  mountRecords(body.querySelector("#dwContacts"), "contacts", unitContacts(u.unit), { unit: u.unit }, renderDrawer);
  mountRecords(body.querySelector("#dwDocs"), "documents", unitDocuments(u.unit), { unit: u.unit }, renderDrawer);
  mountLedger(body.querySelector("#dwLedger"), u.unit);
  mountPayHistory(body.querySelector("#dwPayHist"), u.unit);
  mountLease(body.querySelector("#dwLease"), u.unit);
  mountLeaseRef(body.querySelector("#dwLeaseRef"), u.unit);
  mountEsign(body.querySelector("#dwEsign"), u.unit);
  mountHvac(body.querySelector("#dwHvac"), u.unit);
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
