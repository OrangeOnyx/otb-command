/* Directory helpers — merge seed records with the store's override layer, and
   derive per-unit contact/document seeds from the rent roll (units.json). */
import directory from "../data/directory.json";
import { byUnit, getCollection } from "../store.js";

/* C1: tenant PII + executed-lease Drive URLs are NOT bundled — they arrive at
   boot via installDirectorySeed() from the auth-gated /api/seed. Empty until
   then (K-1 renders after boot hydration). */
let leaseLinks = {}, floorplanLinks = {}, contactsInfo = {};
export function installDirectorySeed(s) {
  if (s?.leaseLinks) leaseLinks = s.leaseLinks;
  if (s?.floorplanLinks) floorplanLinks = s.floorplanLinks;
  if (s?.contacts) contactsInfo = s.contacts;
}

export const UNIT_DOC_TYPES = directory.unitDocTypes;

function merge(name, seed) {
  const ov = getCollection(name);
  return seed.concat(ov.custom)
    .filter(r => !ov.dismissed[r.id])
    .map(r => ({ ...r, ...(ov.edit[r.id] || {}) }));
}

/* ---- property-level ---- */
export const propertyContacts = () => merge("contacts", directory.propertyContacts);
export const propertyDocuments = () => merge("documents", directory.propertyDocuments);

/* ---- per-unit (seed derived from the tenant of record) ---- */
function unitContactSeed(unit) {
  const u = byUnit[unit];
  if (!u || u.status === "vacant") return [];
  const ci = contactsInfo[unit] || {};
  return [{
    id: "c:" + unit + ":tenant",
    unit, role: u.status === "owner" ? "Owner / occupant" : "Tenant of record",
    company: u.legal || u.dba, name: ci.name || "", phone: ci.phone || "", email: ci.email || "",
    note: u.dba + (u.use ? " — " + u.use : "")
  }];
}
function unitDocSeed(unit) {
  const u = byUnit[unit];
  if (!u) return [];
  const docs = [];
  if (u.status !== "vacant") {
    const ll = leaseLinks[unit];
    const term = u.end ? "Term to " + u.end : "";
    docs.push({
      id: "d:" + unit + ":lease", unit, name: "Executed lease", type: "Lease",
      ref: ll ? ll.file : (u.legal || u.dba),
      link: ll ? (ll.url || "") : "", // Drive share URL → clickable "Open ↗"
      note: term
    });
  }
  const fp = floorplanLinks[unit];
  if (fp && (fp.url || fp.file)) {
    docs.push({
      id: "d:" + unit + ":floorplan", unit, name: "Floor plan", type: "Floor plan",
      ref: fp.file || "Floor plan", link: fp.url || "", note: ""
    });
    if (fp.url2) docs.push({
      id: "d:" + unit + ":floorplan2", unit, name: "Floor plan — 2nd floor", type: "Floor plan",
      ref: "Second floor", link: fp.url2, note: ""
    });
  }
  return docs;
}

export const unitContacts = unit => merge("contacts", unitContactSeed(unit)).filter(r => r.unit === unit);
export const unitDocuments = unit => merge("documents", unitDocSeed(unit)).filter(r => r.unit === unit);
