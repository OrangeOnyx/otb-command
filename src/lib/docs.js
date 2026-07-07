/* Document store — real files behind K-1 register / unit-drawer document rows.

   Mirrors assets.js: one API over two backends. REMOTE → private Supabase
   "documents" bucket (signed URLs, auth read / operator write); local →
   IndexedDB fallback. A row "has a file" when its existing link field holds
   a doc:// value (buildDocLink); external URLs are untouched. */
import { REMOTE, sb } from "./remote.js";

export const DOC_SCHEME = "doc://";
export const MAX_DOC_BYTES = 25 * 1024 * 1024; // matches the bucket's server-side limit

/* ---- pure link helpers (tested in test/docs.test.mjs) ---- */
export function buildDocLink(path) { return DOC_SCHEME + path; }
export function isDocLink(link) { return typeof link === "string" && link.startsWith(DOC_SCHEME); }
export function docPath(link) { return isDocLink(link) ? link.slice(DOC_SCHEME.length) : null; }

const BUCKET = "documents";
const newId = () => "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const sani = s => (s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80);

/* ================= IndexedDB backend (local fallback) ================= */
const DB_NAME = "otb-docs", STORE = "docs", VERSION = 1;
let _db = null;
function db() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function store(mode) { return (await db()).transaction(STORE, mode).objectStore(STORE); }

/* ================= public API ================= */
// -> storage path (used inside the doc:// link)
export async function addDoc(file, { unit = "property" } = {}) {
  if (file.size > MAX_DOC_BYTES) throw new Error("File exceeds the 25 MB limit");
  const path = `${unit}/${newId()}__${sani(file.name)}`;
  if (REMOTE) {
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw error;
  } else {
    await wrap((await store("readwrite")).add({ id: path, name: file.name, mime: file.type, blob: file }));
  }
  return path;
}

// -> a URL that opens the file now (signed for 1h remote; object URL local)
export async function docURL(path) {
  if (REMOTE) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  const rec = await wrap((await store("readonly")).get(path));
  if (!rec) throw new Error("File not found locally");
  return URL.createObjectURL(rec.blob);
}

export async function removeDoc(path) {
  if (REMOTE) { await sb.storage.from(BUCKET).remove([path]); }
  else { await wrap((await store("readwrite")).delete(path)); }
}
