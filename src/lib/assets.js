/* Asset store — binary images (photos, floor plans, roof/HVAC, signage) for
   units and the property.

   Backend = IndexedDB (local blobs): works offline, no server or accounts,
   holds hundreds of MB, drag-drop straight in. Views talk ONLY to this module's
   API (addAsset / listAssets / getURL / removeAsset / unitsWithAssets), so
   growing to a hosted backend later — sync across devices, multiple properties,
   multiple users — is a single backend swap here, not a rewrite. JSON export
   stays metadata-only by design; blobs live in this store.

   KINDS are fixed now so future A-1 overlays (roof/HVAC, signage) need no
   schema change — only a new rendering toggle. */
export const ASSET_KINDS = [
  ["photo", "Photo"],
  ["plan", "Floor plan"],
  ["roof", "Roof / HVAC"],
  ["signage", "Signage"]
];

const DB_NAME = "otb-assets";
const STORE = "assets";
const VERSION = 1;

/* ---- IndexedDB backend (the only place that knows where bytes live) ---- */
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

/* ---- change notification ---- */
const listeners = new Set();
export function onAssetChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(); } catch { /* listener owns its errors */ } }); }

const newId = () => "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

/* ---- public API ---- */
export async function addAsset(file, { unit = "property", kind = "photo", name } = {}) {
  const rec = {
    id: newId(), unit, kind,
    name: name || file.name || (kind + ".img"),
    mime: file.type || "application/octet-stream",
    size: file.size || 0,
    addedAt: new Date().toISOString(),
    blob: file
  };
  await wrap((await store("readwrite")).add(rec));
  emit();
  return rec.id;
}
export async function listAssets(unit) {
  const all = await wrap((await store("readonly")).getAll());
  return all
    .filter(a => unit ? a.unit === unit : true)
    .sort((a, b) => (a.addedAt < b.addedAt ? -1 : 1));
}
export async function removeAsset(id) {
  await wrap((await store("readwrite")).delete(id));
  emit();
}
export async function unitsWithAssets() {
  const all = await wrap((await store("readonly")).getAll());
  const set = new Set();
  all.forEach(a => { if (a.unit && a.unit !== "property") set.add(a.unit); });
  return set;
}
/* caller MUST revokeURL() when the <img> is gone, to avoid leaking object URLs */
export function makeURL(blob) { return URL.createObjectURL(blob); }
export function revokeURL(url) { try { URL.revokeObjectURL(url); } catch { /* already revoked */ } }
