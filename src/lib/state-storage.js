/* Storage boundaries for the existing mutable-state store. Legacy snapshots
   remain intact. Only explicit local modes may adopt one; an authenticated
   session always starts from remote truth, never from a browser recovery copy. */
import { LAYER_KEYS } from "./layers.js";

export const LEGACY_STATE_KEY = "otb-command-state-v1";
export const SCOPED_STATE_PREFIX = "otb-command-state-v2:";
const VERSION = 2;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validId = value => typeof value === "string" && ID.test(value);

export function normalizeStateScope(scope) {
  if (!record(scope)) return null;
  if (["local-review", "offline"].includes(scope.mode) && scope.propertyId === "otb")
    return { mode: scope.mode, propertyId: "otb" };
  if (scope.mode === "authenticated" && [scope.userId, scope.orgId, scope.propertyId].every(validId))
    return { mode: "authenticated", userId: scope.userId, orgId: scope.orgId, propertyId: scope.propertyId };
  return null;
}

export function sameStateScope(left, right) {
  const a = normalizeStateScope(left), b = normalizeStateScope(right);
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
}

export function stateStorageKey(scope) {
  const clean = normalizeStateScope(scope);
  if (!clean) return null;
  return SCOPED_STATE_PREFIX + (clean.mode === "authenticated"
    ? [clean.mode, clean.userId, clean.orgId, clean.propertyId].join(":")
    : [clean.mode, clean.propertyId].join(":"));
}

function snapshotOf(value) {
  if (!record(value) || !LAYER_KEYS.some(key => Object.hasOwn(value, key))) return null;
  return Object.fromEntries(LAYER_KEYS.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
}

function storageOf(storage) {
  const target = typeof storage === "function" ? storage() : storage;
  if (!target || typeof target.getItem !== "function" || typeof target.setItem !== "function") throw new Error("Storage unavailable");
  return target;
}

const unavailable = error => ({ status: "unavailable", reason: error?.name === "QuotaExceededError" ? "storage-quota" : "storage-blocked" });

export function createScopedStateStorage({ scope, storage } = {}) {
  const binding = normalizeStateScope(scope), key = stateStorageKey(binding);
  const save = (snapshot, { source = "local" } = {}) => {
    if (!binding) return { status: "locked" };
    // Keep the latest user-edited snapshot for deliberate recovery. Boot and
    // realtime reads cannot overwrite it, including an empty server response.
    if (binding.mode === "authenticated" && source === "remote") return { status: "retained" };
    const clean = snapshotOf(snapshot);
    if (!clean) return { status: "invalid", reason: "invalid-snapshot" };
    try {
      storageOf(storage).setItem(key, JSON.stringify({ version: VERSION, scope: binding, savedAt: new Date().toISOString(), snapshot: clean }));
      return { status: "saved" };
    } catch (error) { return unavailable(error); }
  };
  return {
    save,
    load() {
      if (!binding) return { status: "locked" };
      if (binding.mode === "authenticated") return { status: "remote-required" };
      let raw, legacy = false;
      try {
        const target = storageOf(storage);
        raw = target.getItem(key);
        if (raw === null) { raw = target.getItem(LEGACY_STATE_KEY); legacy = true; }
      } catch (error) { return unavailable(error); }
      if (raw === null) return { status: "empty" };
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return { status: "invalid", reason: "corrupt-snapshot" }; }
      if (!record(parsed) || parsed.version !== (legacy ? 1 : VERSION)) return { status: "invalid", reason: "wrong-version" };
      if (!legacy && !sameStateScope(binding, parsed.scope)) return { status: "invalid", reason: "wrong-scope" };
      const snapshot = snapshotOf(legacy ? parsed : parsed.snapshot);
      if (!snapshot) return { status: "invalid", reason: "invalid-snapshot" };
      if (legacy) {
        // One-time COPY into this local mode, never a move or deletion. Even
        // blocked/quota-limited storage can keep using the legacy data in memory.
        const copied = save(snapshot);
        return { status: "legacy-local", snapshot, copied: copied.status === "saved" };
      }
      return { status: "loaded", snapshot };
    },
  };
}
