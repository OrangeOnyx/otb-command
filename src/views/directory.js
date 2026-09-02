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
import { REMOTE, getPublishedLines } from "../lib/remote.js";
import { linesFromRow, lineRows } from "../lib/voicelines.js";

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

export function renderDirectory() {
  const c = document.getElementById("dirContacts");
  const d = document.getElementById("dirDocs");
  if (!c || !d) return;
  mountRecords(c, "contacts", propertyContacts(), {}, renderDirectory);
  mountRecords(d, "documents", propertyDocuments(), {}, renderDirectory);
  renderExpiryStrip(d);
  renderLinesBlock(c);
  const img = document.getElementById("dirImagery");
  if (img && !imageryDispose) imageryDispose = mountAssets(img, "property"); // self-refreshing; mount once
}

export function initDirectory() {
  renderDirectory();
  subscribe(type => { if (type === "contacts" || type === "documents" || type === "import") renderDirectory(); });
  document.addEventListener("otb:lines", () => { const c = document.getElementById("dirContacts"); if (c) renderLinesBlock(c); });
}
