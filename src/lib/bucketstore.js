/* Bucket-store factory — the shared plumbing behind every file store
   (2026-07-20 horizontal layer; assets/docs/safe/vendors each hand-copied
   ~30-40 lines of this: id/sanitize/path helpers, the IndexedDB promise
   boilerplate, Supabase upload/list/sign/remove, and the audit-log pattern).

   Two layers:
   - PRIMITIVES (newId/sanitizeName/filePath/displayName/folderOf, makeIDB,
     makeAudit) — importable piecemeal (assets.js keeps its own kind-embedded
     path convention and only takes these).
   - createBucketStore(cfg) — the STANDARD store shape used by docs/safe/
     vendors (path = folder/id__name; 25 MB cap; signed URLs; optional
     IndexedDB fallback; optional audit table). A NEW file surface (COI docs,
     thread attachments, …) is a one-line config, not a module copy.

   Audit default is (b): log ONLY where a table is configured — adopting the
   factory changes no store's existing behavior (operator decision 2026-07-20). */
import { REMOTE, sb } from "./remote.js";

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches the buckets' server-side caps

/* ---- pure path helpers (shared naming convention: folder/id__name) ---- */
export const newId = prefix =>
  (prefix || "f") + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
export function sanitizeName(s) { return (s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80); }
export function filePath(folder, id, name) { return `${folder}/${id}__${sanitizeName(name)}`; }
export function displayName(path) {
  const base = path.split("/").pop() || path;
  const parts = base.split("__");
  return parts.length > 1 ? parts.slice(1).join("__") : base;
}
export function folderOf(path) { return path.split("/")[0] || ""; }

/* ---- IndexedDB micro-backend (local fallback) ---- */
export function makeIDB(dbName, storeName, { keyPath = "id", index } = {}) {
  let _db = null;
  const db = () => _db ? Promise.resolve(_db) : new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(storeName, { keyPath });
      if (index) s.createIndex(index, index, { unique: false });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
  const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const store = async mode => (await db()).transaction(storeName, mode).objectStore(storeName);
  return {
    add: async rec => wrap((await store("readwrite")).add(rec)),
    get: async key => wrap((await store("readonly")).get(key)),
    all: async () => { try { return await wrap((await store("readonly")).getAll()); } catch { return []; } },
    del: async key => wrap((await store("readwrite")).delete(key)),
  };
}

/* ---- audit-log factory (REMOTE table; optional local session trail) ---- */
export function makeAudit(table, { localTrail = false } = {}) {
  const local = [];
  return {
    async log(action, path) {
      try {
        if (REMOTE) {
          const u = (await sb.auth.getUser()).data.user;
          await sb.from(table).insert({ email: u?.email || "", action, path });
        } else if (localTrail) {
          local.unshift({ at: new Date().toISOString(), email: "(local)", action, path });
        }
      } catch (e) { console.warn(table + ":", e.message); }
    },
    async list(limit = 30) {
      if (!REMOTE) return local.slice(0, limit);
      const { data, error } = await sb.from(table)
        .select("at,email,action,path").order("at", { ascending: false }).limit(limit);
      if (error) { console.warn(table + " read:", error.message); return []; }
      return data || [];
    },
  };
}

/* ---- the standard store shape ---- */
export function createBucketStore({
  bucket, idPrefix = "f", maxBytes = MAX_FILE_BYTES, ttl = 600,
  audit = null, localTrail = false, local = null, // local: { db, store }
}) {
  const auditLog = audit ? makeAudit(audit, { localTrail }) : null;
  const idb = local ? makeIDB(local.db, local.store) : null;
  const useLocal = () => !REMOTE && idb;

  return {
    audit: auditLog, // { log, list } or null

    /* upload → storage path (folder/id__name). Throws over maxBytes. */
    async add(file, folder, name) {
      if (file.size > maxBytes) throw new Error("File exceeds the 25 MB limit");
      const path = filePath(folder, newId(idPrefix), name || file.name);
      if (useLocal()) {
        await idb.add({ id: path, name: file.name, mime: file.type, size: file.size, addedAt: new Date().toISOString(), blob: file });
      } else {
        const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw error;
      }
      if (auditLog) auditLog.log("upload", path);
      return path;
    },

    /* list one folder → [{ path, folder, name, size, addedAt }] newest-first.
       Local mode: pass no folder to get everything. */
    async list(folder) {
      if (useLocal()) {
        const all = await idb.all();
        return all
          .filter(r => !folder || folderOf(r.id) === folder)
          .map(r => ({ path: r.id, folder: folderOf(r.id), name: r.name, size: r.size || 0, addedAt: r.addedAt || "" }))
          .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
      }
      const { data, error } = await sb.storage.from(bucket)
        .list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) { console.warn(bucket + " list:", error.message); return []; }
      return (data || []).filter(f => f.id).map(f => ({
        path: `${folder}/${f.name}`, folder, name: displayName(f.name),
        size: f.metadata?.size || 0, addedAt: f.created_at || "",
      }));
    },

    /* open-now URL (signed for ttl remote; object URL local).
       Audit "view" only after the URL was actually issued. */
    async url(path) {
      if (useLocal()) {
        const rec = await idb.get(path);
        if (!rec) throw new Error("File not found locally");
        if (auditLog) auditLog.log("view", path);
        return URL.createObjectURL(rec.blob);
      }
      const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, ttl);
      if (error) throw error;
      if (auditLog) auditLog.log("view", path);
      return data.signedUrl;
    },

    /* delete. Throws BEFORE the audit row on a failed remote delete. */
    async remove(path) {
      if (useLocal()) {
        await idb.del(path);
      } else {
        const { error } = await sb.storage.from(bucket).remove([path]);
        if (error) throw error;
      }
      if (auditLog) auditLog.log("delete", path);
    },
  };
}
