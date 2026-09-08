/* Tab-scoped draft recovery only. Never add this to LAYER_DEFS: that registry
   syncs business records remotely. Callers supply sessionStorage (or a getter,
   so browser storage-access exceptions are caught here), not localStorage. */
export const COMMAND_DRAFT_SESSION_PREFIX = "cypress-command:owner-draft:";
export const MAX_COMMAND_DRAFT_TEXT = 50_000;
const VERSION = 1;
const MAX_RECORD = 100_000;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;

const ownKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function bindingOf(scope, issueId, sourceFingerprint) {
  if (!scope || typeof issueId !== "string" || !ID.test(issueId)
      || typeof sourceFingerprint !== "string" || !SHA256.test(sourceFingerprint)) return null;
  if (scope.mode === "local-review" && scope.propertyId === "otb")
    return { mode: "local-review", userId: null, propertyId: "otb", issueId, sourceFingerprint };
  if (scope.mode === "authenticated" && typeof scope.userId === "string" && ID.test(scope.userId)
      && typeof scope.propertyId === "string" && ID.test(scope.propertyId))
    return { mode: "authenticated", userId: scope.userId, propertyId: scope.propertyId, issueId, sourceFingerprint };
  return null;
}

function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function timestamp(value) {
  if (typeof value !== "string" || value.length !== 24) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function storageOf(storage) {
  const target = typeof storage === "function" ? storage() : storage;
  if (!target || !["getItem", "setItem", "removeItem", "key"].every(method => typeof target[method] === "function"))
    throw new Error("Storage unavailable");
  return target;
}

const unavailable = error => ({ status: "unavailable", reason: error?.name === "QuotaExceededError" ? "storage-quota" : "storage-blocked" });
const rejected = reason => ({ status: "rejected", reason });

/**
 * scope: { mode: "local-review", propertyId: "otb" }, or
 *        { mode: "authenticated", userId: session.user.id, propertyId: ctx.property_id }.
 * sourceFingerprint: lowercase SHA-256 of the exact issue/source evidence.
 * load: restored + draft, empty, rejected + reason, or unavailable + reason.
 * save: saved + updatedAt, rejected + reason, or unavailable + reason.
 * remove: removed, rejected + reason, or unavailable + reason.
 * No method throws or changes the caller's editor text.
 */
export function createCommandDraftSession(options = {}) {
  const { storage, scope, issueId, sourceFingerprint } = options && typeof options === "object" ? options : {};
  const binding = bindingOf(scope, issueId, sourceFingerprint);
  const key = binding ? COMMAND_DRAFT_SESSION_PREFIX + "v1:" +
    [binding.mode, binding.userId || "local", binding.propertyId, binding.issueId].join(":") : null;
  return {
    load() {
      if (!binding) return rejected("invalid-binding");
      let raw;
      try { raw = storageOf(storage).getItem(key); }
      catch (error) { return unavailable(error); }
      if (raw === null) return { status: "empty" };
      if (typeof raw !== "string" || raw.length > MAX_RECORD) return rejected("oversize-record");
      let record;
      try { record = JSON.parse(raw); }
      catch { return rejected("corrupt-record"); }
      if (!ownKeys(record, ["version", "binding", "text", "generatedAt", "updatedAt"])) return rejected("invalid-record");
      if (record.version !== VERSION) return rejected("wrong-version");
      if (!ownKeys(record.binding, Object.keys(binding))) return rejected("wrong-binding");
      if (["mode", "userId", "propertyId", "issueId"].some(field => record.binding[field] !== binding[field]))
        return rejected("wrong-binding");
      if (record.binding.sourceFingerprint !== binding.sourceFingerprint) return rejected("source-changed");
      if (typeof record.text !== "string" || record.text.length > MAX_COMMAND_DRAFT_TEXT) return rejected("invalid-text");
      if (!dateOnly(record.generatedAt) || !timestamp(record.updatedAt)) return rejected("invalid-date");
      return { status: "restored", draft: { text: record.text, generatedAt: record.generatedAt, updatedAt: record.updatedAt } };
    },
    save(payload = {}) {
      const { text, generatedAt } = payload && typeof payload === "object" ? payload : {};
      if (!binding) return rejected("invalid-binding");
      if (typeof text !== "string" || text.length > MAX_COMMAND_DRAFT_TEXT) return rejected("invalid-text");
      if (!dateOnly(generatedAt)) return rejected("invalid-date");
      const updatedAt = new Date().toISOString();
      const raw = JSON.stringify({ version: VERSION, binding, text, generatedAt, updatedAt });
      if (raw.length > MAX_RECORD) return rejected("oversize-record");
      try { storageOf(storage).setItem(key, raw); }
      catch (error) { return unavailable(error); }
      return { status: "saved", updatedAt };
    },
    remove() {
      if (!binding) return rejected("invalid-binding");
      try { storageOf(storage).removeItem(key); }
      catch (error) { return unavailable(error); }
      return { status: "removed" };
    },
  };
}

/* Sign-out cleanup owns this prefix only; auth/session data and unrelated app
   preferences are untouched. Collect keys first because removal shifts indices. */
export function clearCommandDraftSessions(storage) {
  let removed = 0;
  try {
    const target = storageOf(storage), keys = [];
    for (let index = 0; index < target.length; index++) {
      const key = target.key(index);
      if (typeof key === "string" && key.startsWith(COMMAND_DRAFT_SESSION_PREFIX)) keys.push(key);
    }
    for (const key of keys) { target.removeItem(key); removed++; }
    return { status: "cleared", removed };
  } catch (error) { return { ...unavailable(error), removed }; }
}
