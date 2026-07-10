/* Vendor Portal store (P3) — per-vendor document folders in the private
   Supabase "vendor-docs" bucket. RLS: operator manages everything; a signed-in
   vendor (role assigned by email match against public.vendors) reads + uploads
   ONLY inside their own <vendorId>/ folder. Every view/upload/delete lands in
   vendor_log (operator-readable), mirroring the S-1 safe_log pattern.
   Roster seed: src/data/vendors.json (re-runnable: python tools/extract-vendors.py);
   the DB public.vendors table (same rows) drives login→vendor mapping. */
import { REMOTE, sb } from "./remote.js";

export const MAX_VENDOR_BYTES = 25 * 1024 * 1024;

/* ---- pure helpers (tested in test/vendors.test.mjs) ---- */
const newId = () => "v" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
export function sanitizeName(s) { return (s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80); }
export function vendorPath(vendorId, id, name) { return `${vendorId}/${id}__${sanitizeName(name)}`; }
export function displayName(path) {
  const base = path.split("/").pop() || path;
  const parts = base.split("__");
  return parts.length > 1 ? parts.slice(1).join("__") : base;
}
export function vendorOf(path) { return path.split("/")[0] || ""; }
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

/* ---- audit (fire-and-forget) ---- */
export async function logVendorAccess(action, path) {
  try {
    if (!REMOTE) return;
    const u = (await sb.auth.getUser()).data.user;
    await sb.from("vendor_log").insert({ email: u?.email || "", action, path });
  } catch (e) { console.warn("vendor log:", e.message); }
}
export async function listVendorLog(limit = 30) {
  if (!REMOTE) return [];
  const { data, error } = await sb.from("vendor_log").select("at,email,action,path").order("at", { ascending: false }).limit(limit);
  if (error) { console.warn("vendor log read:", error.message); return []; }
  return data || [];
}

/* ================= storage API (REMOTE only — the portal is a hosted
   feature; local-only mode shows a note like AI-1) ================= */
export async function addVendorDoc(file, vendorId) {
  if (file.size > MAX_VENDOR_BYTES) throw new Error("File exceeds the 25 MB limit");
  const path = vendorPath(vendorId, newId(), file.name);
  const { error } = await sb.storage.from("vendor-docs").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  logVendorAccess("upload", path);
  return path;
}

export async function listVendorDocs(vendorId) {
  const { data, error } = await sb.storage.from("vendor-docs").list(vendorId, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error) { console.warn("vendor list:", error.message); return []; }
  return (data || []).filter(f => f.id).map(f => ({
    path: `${vendorId}/${f.name}`, vendor: vendorId, name: displayName(f.name),
    size: f.metadata?.size || 0, addedAt: f.created_at || ""
  }));
}

export async function vendorDocURL(path) {
  const { data, error } = await sb.storage.from("vendor-docs").createSignedUrl(path, 600); // 10 min
  if (error) throw error;
  logVendorAccess("view", path); // log only after the URL was actually issued
  return data.signedUrl;
}

export async function removeVendorDoc(path) {
  const { error } = await sb.storage.from("vendor-docs").remove([path]);
  if (error) throw error; // don't write a "deleted" audit row on a failed delete
  logVendorAccess("delete", path);
}
