/* Directory helpers — merge seed records with the store's override layer, and
   derive per-unit contact/document seeds from the rent roll (units.json). */
import directory from "../data/directory.json";
import { byUnit, getCollection } from "../store.js";

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
  return [{
    id: "c:" + unit + ":tenant",
    unit, role: u.status === "owner" ? "Owner / occupant" : "Tenant of record",
    company: u.legal || u.dba, name: "", phone: "", email: "",
    note: u.dba + (u.use ? " — " + u.use : "")
  }];
}
function unitDocSeed(unit) {
  const u = byUnit[unit];
  if (!u) return [];
  const docs = [];
  if (u.status !== "vacant") docs.push({
    id: "d:" + unit + ":lease", unit, name: "Executed lease", type: "Lease",
    ref: u.legal || u.dba, link: "", note: u.end ? "Term to " + u.end : ""
  });
  return docs;
}

export const unitContacts = unit => merge("contacts", unitContactSeed(unit)).filter(r => r.unit === unit);
export const unitDocuments = unit => merge("documents", unitDocSeed(unit)).filter(r => r.unit === unit);
