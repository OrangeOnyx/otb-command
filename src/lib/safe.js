/* Owner Safe store — the S-1 vault for sensitive financial documents.

   Mirrors docs.js/assets.js: one API over two backends. REMOTE → private
   Supabase "safe" bucket (read = owner+operator roles ONLY via RLS — a future
   vendor role is sealed out at the database layer; write = operator). Local →
   IndexedDB fallback. Every view/upload/delete is recorded to the safe_log
   audit table (operator-readable). Categories are folder prefixes. */
import { REMOTE, sb } from "./remote.js";

export const SAFE_CATEGORIES = [
  ["proforma", "Proforma"],
  ["leases", "Leases"],
  ["tax", "Tax"],
  ["insurance", "Insurance"],
  ["banking", "Banking"],
  ["other", "Other"]
];
export const MAX_SAFE_BYTES = 25 * 1024 * 1024;

/* ---- pure helpers (tested in test/safe.test.mjs) ---- */
const newId = () => "s" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
export function sanitizeName(s) { return (s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80); }
export function safePath(category, id, name) { return `${category}/${id}__${sanitizeName(name)}`; }
export function displayName(path) {
  const base = path.split("/").pop() || path;
  const parts = base.split("__");
  return parts.length > 1 ? parts.slice(1).join("__") : base;
}
export function categoryOf(path) { return path.split("/")[0] || "other"; }

/* ================= IndexedDB backend (local fallback) ================= */
const DB_NAME = "otb-safe", STORE = "safe", VERSION = 1;
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

/* ---- audit (fire-and-forget; local mode keeps a session-only trail) ---- */
const localLog = [];
export async function logAccess(action, path) {
  try {
    if (REMOTE) {
      const u = (await sb.auth.getUser()).data.user;
      await sb.from("safe_log").insert({ email: u?.email || "", action, path });
    } else {
      localLog.unshift({ at: new Date().toISOString(), email: "(local)", action, path });
    }
  } catch (e) { console.warn("safe log:", e.message); }
}
export async function listLog(limit = 30) {
  if (!REMOTE) return localLog.slice(0, limit);
  const { data, error } = await sb.from("safe_log").select("at,email,action,path").order("at", { ascending: false }).limit(limit);
  if (error) { console.warn("safe log read:", error.message); return []; }
  return data || [];
}

/* ================= public API ================= */
export async function addSafeDoc(file, category) {
  if (file.size > MAX_SAFE_BYTES) throw new Error("File exceeds the 25 MB limit");
  const path = safePath(category, newId(), file.name);
  if (REMOTE) {
    const { error } = await sb.storage.from("safe").upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw error;
  } else {
    await wrap((await store("readwrite")).add({ id: path, name: file.name, mime: file.type, size: file.size, addedAt: new Date().toISOString(), blob: file }));
  }
  logAccess("upload", path);
  return path;
}

export async function listSafe() {
  if (REMOTE) {
    const out = [];
    for (const [cat] of SAFE_CATEGORIES) {
      const { data, error } = await sb.storage.from("safe").list(cat, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) { console.warn("safe list:", error.message); continue; }
      (data || []).filter(f => f.id).forEach(f => out.push({
        path: `${cat}/${f.name}`, category: cat, name: displayName(f.name),
        size: f.metadata?.size || 0, addedAt: f.created_at || ""
      }));
    }
    return out;
  }
  const all = await wrap((await store("readonly")).getAll()).catch(() => []);
  return (all || []).map(r => ({ path: r.id, category: categoryOf(r.id), name: r.name, size: r.size || 0, addedAt: r.addedAt || "" }))
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

export async function safeURL(path) {
  logAccess("view", path);
  if (REMOTE) {
    const { data, error } = await sb.storage.from("safe").createSignedUrl(path, 600); // short-lived: 10 min
    if (error) throw error;
    return data.signedUrl;
  }
  const rec = await wrap((await store("readonly")).get(path));
  if (!rec) throw new Error("File not found locally");
  return URL.createObjectURL(rec.blob);
}

export async function removeSafeDoc(path) {
  if (REMOTE) { await sb.storage.from("safe").remove([path]); }
  else { await wrap((await store("readwrite")).delete(path)); }
  logAccess("delete", path);
}
