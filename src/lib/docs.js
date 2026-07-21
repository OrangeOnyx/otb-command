/* Document store — real files behind K-1 register / unit-drawer document rows.

   Thin config over lib/bucketstore.js (2026-07-20): private Supabase
   "documents" bucket (signed URLs 1h, auth read / operator write), IndexedDB
   fallback, no audit table. A row "has a file" when its existing link field
   holds a doc:// value (buildDocLink); external URLs are untouched. */
import { createBucketStore, MAX_FILE_BYTES } from "./bucketstore.js";

export const DOC_SCHEME = "doc://";
export const MAX_DOC_BYTES = MAX_FILE_BYTES; // matches the bucket's server-side limit

/* ---- pure link helpers (tested in test/docs.test.mjs) ---- */
export function buildDocLink(path) { return DOC_SCHEME + path; }
export function isDocLink(link) { return typeof link === "string" && link.startsWith(DOC_SCHEME); }
export function docPath(link) { return isDocLink(link) ? link.slice(DOC_SCHEME.length) : null; }

const store = createBucketStore({
  bucket: "documents", idPrefix: "d", ttl: 3600,
  local: { db: "otb-docs", store: "docs" },
});

/* ================= public API ================= */
// -> storage path (used inside the doc:// link)
export function addDoc(file, { unit = "property" } = {}) { return store.add(file, unit, file.name); }
// -> a URL that opens the file now (signed for 1h remote; object URL local)
export function docURL(path) { return store.url(path); }
export function removeDoc(path) { return store.remove(path); }
