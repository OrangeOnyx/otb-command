/* Vendor Portal store (P3) — per-vendor document folders in the private
   Supabase "vendor-docs" bucket. RLS: operator manages everything; a signed-in
   vendor (role assigned by email match against public.vendors) reads + uploads
   ONLY inside their own <vendorId>/ folder. Every view/upload/delete lands in
   vendor_log (operator-readable). Storage/audit plumbing = lib/bucketstore.js
   (2026-07-20); REMOTE-only — the portal is a hosted feature, local-only mode
   shows a note like AI-1.
   Roster seed: src/data/vendors.json (re-runnable: python tools/extract-vendors.py);
   the DB public.vendors table (same rows) drives login→vendor mapping. */
import { createBucketStore, MAX_FILE_BYTES, sanitizeName as sani, filePath, displayName as dn, folderOf } from "./bucketstore.js";

export const MAX_VENDOR_BYTES = MAX_FILE_BYTES;

/* ---- pure helpers (tested in test/vendors.test.mjs) ---- */
export const sanitizeName = sani;
export function vendorPath(vendorId, id, name) { return filePath(vendorId, id, name); }
export const displayName = dn;
export function vendorOf(path) { return folderOf(path); }
/* portal-capable = a magic-link login can reach a folder (needs an email) */
export function portalCapable(v) { return !!(v && v.email); }
/* roster ordered for the operator: service vendors first, then payees, people */
export function rosterOrder(list) {
  const rank = { service: 0, payee: 1, person: 2 };
  return [...list].sort((a, b) =>
    (rank[a.kind] ?? 3) - (rank[b.kind] ?? 3) || a.company.toLowerCase().localeCompare(b.company.toLowerCase()));
}
export function findVendorByEmail(list, email) {
  const e = String(email || "").trim().toLowerCase();
  return e ? list.find(v => v.email === e) || null : null;
}
/* Which V-1 face a role gets. Owners (and anything unknown) get the read-only
   roster face: RLS grants them vendors-table read ONLY — no vendor-docs, no
   vendor_log — so the operator console would just error at them. */
export function portalFace(role) {
  return role === "operator" ? "operator" : role === "vendor" ? "vendor" : "owner";
}

const store = createBucketStore({
  bucket: "vendor-docs", idPrefix: "v", ttl: 600, // 10 min
  audit: "vendor_log", // no local trail — REMOTE-only surface
});

/* audit surface */
export const logVendorAccess = (action, path) => store.audit.log(action, path);
export const listVendorLog = limit => store.audit.list(limit);

/* ================= storage API (REMOTE only) ================= */
export function addVendorDoc(file, vendorId) { return store.add(file, vendorId, file.name); }
export async function listVendorDocs(vendorId) {
  return (await store.list(vendorId)).map(r =>
    ({ path: r.path, vendor: vendorId, name: r.name, size: r.size, addedAt: r.addedAt }));
}
export function vendorDocURL(path) { return store.url(path); }
export function removeVendorDoc(path) { return store.remove(path); }
