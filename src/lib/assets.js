/* Asset store — binary images (photos, floor plans, roof/HVAC, signage).

   Two backends behind one API (addAsset / listAssets / removeAsset /
   unitsWithAssets). When the Supabase backend is configured (REMOTE) images
   live in the hosted private "assets" bucket and travel across devices/users;
   otherwise they fall back to local IndexedDB. Views only touch this API, so
   the swap is contained here. listAssets() returns records with a ready `.url`. */
import { REMOTE, sb } from "./remote.js";

export const ASSET_KINDS = [
  ["photo", "Photo"],
  ["plan", "Floor plan"],
  ["roof", "Roof / HVAC"],
  ["signage", "Signage"]
];

const BUCKET = "assets";
const DB_NAME = "otb-assets";
const STORE = "assets";
const VERSION = 1;
const newId = () => "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

/* ---- change notification (shared) ---- */
const listeners = new Set();
export function onAssetChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(); } catch { /* listener owns its errors */ } }); }

/* caller MAY revoke object URLs; harmless no-op on signed URLs */
export function makeURL(blob) { return URL.createObjectURL(blob); }
export function revokeURL(url) { try { URL.revokeObjectURL(url); } catch { /* not an object URL */ } }

/* ================= IndexedDB backend (local fallback) ================= */
let _db = null;
function db() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: "id" });
      s.createIndex("unit", "unit", { unique: false });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function store(mode) { return (await db()).transaction(STORE, mode).objectStore(STORE); }

async function idbAdd(file, { unit = "property", kind = "photo", name } = {}) {
  const rec = {
    id: newId(), unit, kind, name: name || file.name || (kind + ".img"),
    mime: file.type || "application/octet-stream", size: file.size || 0,
    addedAt: new Date().toISOString(), blob: file
  };
  await wrap((await store("readwrite")).add(rec));
  emit(); return rec.id;
}
async function idbAll() { try { return await wrap((await store("readonly")).getAll()); } catch { return []; } }
async function idbList(scope) {
  const all = await idbAll();
  return all.filter(a => scope ? a.unit === scope : true)
    .sort((a, b) => (a.addedAt < b.addedAt ? -1 : 1))
    .map(a => ({ id: a.id, unit: a.unit, kind: a.kind, name: a.name, addedAt: a.addedAt, url: URL.createObjectURL(a.blob) }));
}
async function idbRemove(id) { await wrap((await store("readwrite")).delete(id)); emit(); }
async function idbUnits() {
  const set = new Set();
  (await idbAll()).forEach(a => { if (a.unit && a.unit !== "property") set.add(a.unit); });
  return set;
}

/* ================= Supabase Storage backend ================= */
const sani = s => (s || "img").replace(/[^\w.\-]+/g, "_").slice(0, 80);
async function sbAdd(file, { unit = "property", kind = "photo", name } = {}) {
  const path = `${unit}/${kind}__${newId()}__${sani(name || file.name || kind)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  emit(); return path;
}
async function sbList(scope) {
  const { data, error } = await sb.storage.from(BUCKET).list(scope, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
  if (error) { console.warn("asset list:", error.message); return []; }
  const files = (data || []).filter(f => f.id); // skip sub-folders
  return Promise.all(files.map(async f => {
    const path = `${scope}/${f.name}`;
    const parts = f.name.split("__");
    const kind = parts[0] || "photo";
    const name = parts.slice(2).join("__") || f.name;
    const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    return { id: path, unit: scope, kind, name, addedAt: f.created_at || "", url: (s && s.signedUrl) || "" };
  }));
}
async function sbRemove(path) { await sb.storage.from(BUCKET).remove([path]); emit(); }
async function sbUnits() {
  const { data, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) return new Set();
  const set = new Set();
  (data || []).forEach(e => { if (!e.id && e.name && e.name !== "property") set.add(e.name); }); // folders have null id
  return set;
}

/* one-time migration of any local IndexedDB images → hosted bucket (operator) */
export async function migrateLocalToRemote() {
  if (!REMOTE) return 0;
  const all = await idbAll();
  let n = 0;
  for (const a of all) {
    if (!a.blob) continue;
    try { await sbAdd(a.blob, { unit: a.unit, kind: a.kind, name: a.name }); n++; }
    catch (e) { console.warn("migrate skip", a.id, e.message); }
  }
  return n;
}

/* ================= public API (dispatch) ================= */
export async function addAsset(file, opts) { return REMOTE ? sbAdd(file, opts) : idbAdd(file, opts); }
export async function listAssets(scope) { return REMOTE ? sbList(scope) : idbList(scope); }
export async function removeAsset(id) { return REMOTE ? sbRemove(id) : idbRemove(id); }
export async function unitsWithAssets() { return REMOTE ? sbUnits() : idbUnits(); }
