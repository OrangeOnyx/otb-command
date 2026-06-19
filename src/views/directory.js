/* K-1 Directory — property-level contacts (vendors, counterparties, agencies)
   and the document register (recorded instruments + key files). Per-unit
   contacts/documents live in each unit's drawer; this sheet holds everything
   that isn't tied to a single tenancy. */
import { subscribe } from "../store.js";
import { propertyContacts, propertyDocuments } from "../lib/directory.js";
import { mountRecords } from "../lib/recordsUI.js";
import { mountAssets } from "../lib/assetsUI.js";

let imageryDispose = null;

export function renderDirectory() {
  const c = document.getElementById("dirContacts");
  const d = document.getElementById("dirDocs");
  if (!c || !d) return;
  mountRecords(c, "contacts", propertyContacts(), {}, renderDirectory);
  mountRecords(d, "documents", propertyDocuments(), {}, renderDirectory);
  const img = document.getElementById("dirImagery");
  if (img && !imageryDispose) imageryDispose = mountAssets(img, "property"); // self-refreshing; mount once
}

export function initDirectory() {
  renderDirectory();
  subscribe(type => { if (type === "contacts" || type === "documents" || type === "import") renderDirectory(); });
}
