/* K-1 Directory — property-level contacts (vendors, counterparties, agencies)
   and the document register (recorded instruments + key files). Per-unit
   contacts/documents live in each unit's drawer; this sheet holds everything
   that isn't tied to a single tenancy. Register row #16: an "Expiring" strip
   tops the register card whenever any dated document — property-level or
   per-unit — is inside the COI-style expiry window (lib/docexpiry.js). */
import { subscribe, UNITS } from "../store.js";
import { propertyContacts, propertyDocuments, unitDocuments } from "../lib/directory.js";
import { mountRecords } from "../lib/recordsUI.js";
import { mountAssets } from "../lib/assetsUI.js";
import { expiringDocs, expiryLine, isoDate } from "../lib/docexpiry.js";
import { esc, TODAY } from "../lib/format.js";
import { REMOTE, getPublishedLines, getPropertyFacts } from "../lib/remote.js";
import { linesFromRow, lineRows } from "../lib/voicelines.js";
import { TITLE_EXCEPTIONS, PYLON } from "../lib/facts.js";
import { groupIdentifiers, identifierSummary, displayValue } from "../lib/identifiers.js";
import { pylonSVG, pylonRoster, pylonSummary } from "../lib/pylonsvg.js";
import { openDrawer } from "./drawer.js";

let imageryDispose = null;

/* Property lines (decision H-2, 2026-09-01): the published tenant-service
   and leasing numbers top the contacts card, tap-to-call. Absent entirely
   until the operator publishes them (sidebar → Phone lines…); hosted-only. */
function renderLinesBlock(contactsEl) {
  if (!REMOTE) return;
  const card = contactsEl.parentElement;
  getPublishedLines().then(row => {
    if (!card.isConnected) return;
    const rows = lineRows(linesFromRow(row));
    let blk = card.querySelector("#dirLines");
    if (!rows.length) { if (blk) blk.remove(); return; }
    if (!blk) {
      blk = document.createElement("div");
      blk.id = "dirLines";
      card.querySelector(".panel-h").insertAdjacentElement("afterend", blk);
    }
    blk.innerHTML = '<div class="dw-sec" style="margin-top:0">Property lines</div>' +
      rows.map(r => '<div class="pl-line"><span class="pl-lbl">' + esc(r.label) + '</span>' +
        '<a class="pl-num mono" href="' + esc(r.href) + '">' + esc(r.display) + '</a>' +
        '<span class="pl-hint mute">' + esc(r.hint) + '</span></div>').join("");
  }).catch(() => {});
}

/* Every document on the property: register list + each unit's docs, deduped
   by id (merge() surfaces custom unit-scoped docs in both lists). */
function allDocuments() {
  const seen = new Map();
  propertyDocuments().concat(...UNITS.map(u => unitDocuments(u.unit)))
    .forEach(r => { if (!seen.has(r.id)) seen.set(r.id, r); });
  return [...seen.values()];
}

/* Quiet when nothing is due: the div is removed entirely. Re-rendered inside
   renderDirectory() so store subscriptions keep it fresh. */
function renderExpiryStrip(docsEl) {
  const card = docsEl.parentElement;
  let strip = card.querySelector("#dirExpiry");
  const due = expiringDocs(allDocuments(), isoDate(TODAY));
  if (!due.length) { if (strip) strip.remove(); return; }
  if (!strip) {
    strip = document.createElement("div");
    strip.id = "dirExpiry";
    card.querySelector(".panel-h").insertAdjacentElement("afterend", strip);
  }
  strip.innerHTML = '<div class="dw-sec" style="margin-top:0">Expiring · ' + due.length + '</div>' +
    due.map(x => '<div class="led-note" style="color:' + esc(x.color) + '">' + esc(expiryLine(x)) + '</div>').join("");
}

/* Recorded instruments of record (ruling D-19a, 2026-09-17): the 13 title
   exceptions from the archive, verbatim, under the document register. Rows
   already carried as register documents say so; the rest are "of record
   only" until the owner title policy is ordered and they can be pulled. */
function renderTitleBlock(docsEl) {
  const card = docsEl.parentElement;
  let blk = card.querySelector("#dirTitle");
  if (!blk) {
    blk = document.createElement("div");
    blk.id = "dirTitle";
    card.appendChild(blk);
  }
  const docs = new Set(propertyDocuments().map(r => r.id));
  const ofRecord = TITLE_EXCEPTIONS.filter(e => !(e.registerDoc && docs.has(e.registerDoc))).length;
  blk.innerHTML = '<div class="dw-sec">Recorded instruments of record · ' + TITLE_EXCEPTIONS.length +
    (ofRecord ? ' · ' + ofRecord + ' of record only (title policy not yet ordered)' : '') + '</div>' +
    TITLE_EXCEPTIONS.map(e => {
      const onReg = !!(e.registerDoc && docs.has(e.registerDoc));
      const dead = /^(Expired|SUPERSEDED)/.test(e.status);
      return '<div class="reg-row"><span class="reg-k">' + esc(e.entryNumber) +
        (e.titleExceptionNo != null ? ' · exc. #' + e.titleExceptionNo : '') + '</span>' +
        '<span class="reg-v">' + esc(e.title) + '</span>' +
        '<span class="reg-s' + (dead ? '' : onReg ? ' ok' : '') + '">' + (onReg ? "on register" : "of record only") + '</span>' +
        '<span class="reg-n">' + esc(e.status) + '</span></div>';
    }).join("");
}

/* Pylon sign register (ruling D-19b, 2026-09-17): panel → unit → tenant of
   record → status; a panel whose installed face differs from the tenant of
   record is flagged for reprint. */
function renderPylonBlock() {
  const el = document.getElementById("dirPylon");
  if (!el) return;
  const sub = document.getElementById("dirPylonSub");
  const byUnit = Object.fromEntries(UNITS.map(u => [u.unit, u]));
  const { rows, counts } = pylonRoster(PYLON, byUnit);
  if (sub) sub.textContent = PYLON.schedule.toUpperCase() + " · " + pylonSummary(counts, rows.length).toUpperCase() + " · ZONING " + PYLON.zoning.toUpperCase();
  el.innerHTML = '<div class="py-wrap"><div class="py-sign">' + pylonSVG(PYLON, byUnit) + '</div><div class="py-roster">' + rows.map(r =>
    '<div class="reg-row py-r" data-unit="' + esc(r.unit) + '" data-panel="' + esc(r.panel) + '"><span class="reg-k">' + esc(r.panel) + ' · ' + esc(r.size) + '</span>' +
    '<span class="reg-v">' + (r.unit ? '<b>' + esc(r.unit) + '</b>' + (r.tenant ? ' · ' + esc(r.tenant) : '') : '<span class="missing">available</span>') + '</span>' +
    '<span class="reg-s' + (r.state === "reprint" ? ' hot' : r.state === "occupied" ? ' ok' : '') + '">' + (r.state === "reprint" ? "reprint needed" : esc(r.state)) + '</span>' +
    (r.state === "reprint" ? '<span class="reg-n">Installed panel reads "' + esc(r.physicalReads) + '" — ' + esc(r.note) + '</span>'
      : r.note ? '<span class="reg-n">' + esc(r.note) + '</span>' : '') + '</div>').join("") + '</div></div>';
  wirePylon(el);
}

/* shared hover/click wiring for the sign + roster (B-1 reuses it) */
export function wirePylon(el) {
  const hi = panel => el.querySelectorAll(".py-panel, .py-r").forEach(n => n.classList.toggle("py-hi", !!panel && n.dataset.panel === panel));
  el.querySelectorAll(".py-panel, .py-r").forEach(n => {
    n.onmouseenter = () => hi(n.dataset.panel);
    n.onmouseleave = () => hi("");
    const go = () => { if (n.dataset.unit) openDrawer(n.dataset.unit); };
    n.onclick = go;
    n.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
}

/* Property identifiers (ruling D-23a, 2026-09-17): properties.facts rows of
   kind='identifier', grouped as AC grouped them; nulls read "not on file" so
   the gaps stay visible work items. Hosted-only; absent until the read lands. */
function renderIdentifiers() {
  const el = document.getElementById("dirIdentifiers");
  if (!el) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">Hosted only — identifiers live on the property record.</div>'; return; }
  getPropertyFacts().then(facts => {
    if (!el.isConnected) return;
    const groups = groupIdentifiers(facts);
    const sub = document.getElementById("dirIdSub");
    if (!groups.length) { el.innerHTML = '<div class="led-note">No identifiers on the property record yet.</div>'; return; }
    if (sub) sub.textContent = identifierSummary(groups).toUpperCase();
    el.innerHTML = groups.map(g =>
      '<div class="dw-sec reg-group">' + esc(g.group) + (g.missing ? ' · ' + g.missing + ' not on file' : '') + '</div>' +
      g.rows.map(r => '<div class="reg-row"><span class="reg-k">' + esc(r.label) + '</span>' +
        '<span class="reg-v' + (r.missing ? ' missing' : '') + '">' + esc(displayValue(r)) + '</span>' +
        '<span class="reg-s">' + (r.asOf ? 'as of ' + esc(r.asOf) : '') + '</span></div>').join("")
    ).join("");
  }).catch(() => {});
}

export function renderDirectory() {
  const c = document.getElementById("dirContacts");
  const d = document.getElementById("dirDocs");
  if (!c || !d) return;
  mountRecords(c, "contacts", propertyContacts(), {}, renderDirectory);
  mountRecords(d, "documents", propertyDocuments(), {}, renderDirectory);
  renderExpiryStrip(d);
  renderTitleBlock(d);
  renderLinesBlock(c);
  renderPylonBlock();
  renderIdentifiers();
  const img = document.getElementById("dirImagery");
  if (img && !imageryDispose) imageryDispose = mountAssets(img, "property"); // self-refreshing; mount once
}

export function initDirectory() {
  renderDirectory();
  subscribe(type => { if (type === "contacts" || type === "documents" || type === "import") renderDirectory(); });
  document.addEventListener("otb:lines", () => { const c = document.getElementById("dirContacts"); if (c) renderLinesBlock(c); });
}
