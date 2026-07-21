/* Owner Safe store — the S-1 vault for sensitive financial documents.

   Thin config over lib/bucketstore.js (2026-07-20): private Supabase "safe"
   bucket (read = owner+operator roles ONLY via RLS — the vendor role is
   sealed out at the database layer; write = operator), IndexedDB fallback,
   safe_log audit on every view/upload/delete (local mode keeps a
   session-only trail). Categories are folder prefixes. */
import { createBucketStore, MAX_FILE_BYTES, sanitizeName as sani, filePath, displayName as dn, folderOf } from "./bucketstore.js";
import { REMOTE } from "./remote.js";

export const SAFE_CATEGORIES = [
  ["proforma", "Proforma"],
  ["leases", "Leases"],
  ["tax", "Tax"],
  ["insurance", "Insurance"],
  ["banking", "Banking"],
  ["other", "Other"]
];
export const MAX_SAFE_BYTES = MAX_FILE_BYTES;

/* ---- pure helpers (tested in test/safe.test.mjs) ---- */
export const sanitizeName = sani;
export function safePath(category, id, name) { return filePath(category, id, name); }
export const displayName = dn;
export function categoryOf(path) { return folderOf(path) || "other"; }

const store = createBucketStore({
  bucket: "safe", idPrefix: "s", ttl: 600, // short-lived: 10 min
  audit: "safe_log", localTrail: true,
  local: { db: "otb-safe", store: "safe" },
});

/* audit surface (S-1 "Recent access" panel) */
export const logAccess = (action, path) => store.audit.log(action, path);
export const listLog = limit => store.audit.list(limit);

/* ================= public API ================= */
export function addSafeDoc(file, category) { return store.add(file, category, file.name); }

export async function listSafe() {
  if (!REMOTE) { // local mode: everything in one pass
    return (await store.list()).map(r =>
      ({ path: r.path, category: categoryOf(r.path), name: r.name, size: r.size, addedAt: r.addedAt }));
  }
  const out = [];
  for (const [cat] of SAFE_CATEGORIES) {
    (await store.list(cat)).forEach(r =>
      out.push({ path: r.path, category: cat, name: r.name, size: r.size, addedAt: r.addedAt }));
  }
  return out;
}

export function safeURL(path) { return store.url(path); }
export function removeSafeDoc(path) { return store.remove(path); }
