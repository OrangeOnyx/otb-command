/* Physical asset register. Browser review and hosted data never silently mix.
   Initialization reads hosted data only; explicit Save promotes source candidates.
   Photos reuse bucketstore with their own property-scoped bucket policies. */
import { REMOTE, LOCAL_REVIEW, sb, propertyContext } from "./remote.js";
import { createBucketStore, MAX_FILE_BYTES } from "./bucketstore.js";
import {
  cleanPhysicalAsset, cleanAssetInspection, cleanSourceBinding, derivePhysicalAsset,
  physicalAssetSourceKey, newPhysicalId,
} from "./physical-assets-model.js";
import { cleanPhysicalAssetEvidence, physicalAssetEvidenceBinding, physicalAssetEvidenceFromBinding,
  physicalAssetEvidenceSourceKey } from "./physical-asset-evidence-model.js";
export { PHYSICAL_ASSET_TYPES, PHYSICAL_ASSET_CONDITIONS, physicalAssetSourceKey } from "./physical-assets-model.js";
export { PHYSICAL_ASSET_EVIDENCE_KINDS, PHYSICAL_ASSET_EVIDENCE_STATUSES,
  PHYSICAL_ASSET_EVIDENCE_SCOPES, PHYSICAL_ASSET_EVIDENCE_DATE_MEANINGS } from "./physical-asset-evidence-model.js";
const clone = value => JSON.parse(JSON.stringify(value));
const empty = () => ({ version: 1, assets: [], bindings: [], inspections: [], photos: [] });
let data = empty(), candidates = empty(), initialized = false, storageKey = "", initPromise = null, sessionEpoch = 0;
let status = { mode: REMOTE ? "remote" : LOCAL_REVIEW ? "local-review" : "local", loaded: false,
  persistence: "not-loaded", error: null, message: "Asset register has not loaded." };
const listeners = new Set();
const pendingEvidence = new Map();
const notify = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.warn("physical assets listener:", e); } });
export const onPhysicalAssetsChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getPhysicalAssetsStatus = () => ({ ...status });
if (REMOTE) sb.auth.onAuthStateChange(event => {
  if (event !== "SIGNED_OUT") return;
  sessionEpoch++;
  data = empty(); candidates = empty(); initialized = false; storageKey = "";
  status = { ...status, loaded: false, persistence: "not-loaded", error: null, message: "Sign in to load this property's asset register." };
  notify();
});
const photos = createBucketStore({ bucket: "physical-asset-photos", idPrefix: "pap",
  local: { db: "otb-physical-asset-photos-v1", store: "photos" } });
function fail(error) {
  status = { ...status, error: error.message || String(error), persistence: "error",
    message: REMOTE ? "Hosted asset operation failed. No browser fallback or successful write is implied." : "Browser asset operation failed. Review the error; last saved records are retained." };
  notify(); return error;
}
function ready() { if (!initialized) throw new Error("Initialize the physical asset register first"); }
function localCommit(next) {
  // Commit storage before the visible cache, so quota/permissions failures cannot
  // appear successful. Never overwrite unreadable/corrupt prior records.
  globalThis.localStorage.setItem(storageKey, JSON.stringify(next));
  data = next;
  status = { ...status, error: null, persistence: "browser", message: "Saved in this browser only; not synchronized to OTB production." };
}
function allRows() { return [...data.assets, ...candidates.assets.filter(r => !data.assets.some(a => a.id === r.id))]; }
export function listPhysicalAssets({ type, unit } = {}) {
  return allRows().filter(a => (!type || a.type === type) && (unit === undefined || a.unit === unit))
    .map(a => derivePhysicalAsset(a, [...data.bindings, ...candidates.bindings], data.inspections, data.assets.some(r => r.id === a.id)))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true })).map(clone);
}
export const getPhysicalAsset = id => listPhysicalAssets().find(a => a.id === id) || null;
export function getPhysicalAssetForSource(sourceKey) {
  const binding = [...data.bindings, ...candidates.bindings].filter(b => b.source_key === sourceKey)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0];
  return binding ? getPhysicalAsset(binding.asset_id) : null;
}
export const getPhysicalAssetForModelObject = (objectId, modelId = "otb-floorplanner") => getPhysicalAssetForSource(physicalAssetSourceKey({ id: objectId }, modelId));
export const listPhysicalAssetInspections = assetId => clone(data.inspections.filter(i => i.asset_id === assetId)
  .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)));
export const listPhysicalAssetEvidence = assetId => data.bindings.filter(b => b.asset_id === assetId)
  .map(physicalAssetEvidenceFromBinding).filter(Boolean)
  .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt) || String(b.created_at).localeCompare(String(a.created_at)) || a.id.localeCompare(b.id))
  .map(clone);

async function readRemote() {
  const ctx = await propertyContext();
  const tables = ["physical_assets", "physical_asset_bindings", "physical_asset_inspections", "physical_asset_photos"];
  const results = await Promise.all(tables.map(table => sb.from(table).select("*").eq("property_id", ctx.property_id)));
  const error = results.find(r => r.error)?.error;
  if (error) throw new Error(`Asset database could not load (migration may be pending): ${error.message}`);
  return { version: 1, assets: results[0].data || [], bindings: results[1].data || [], inspections: results[2].data || [], photos: results[3].data || [] };
}
function stageSeeds({ units, columns, items, modelVersion, modelId }) {
  for (const u of units) {
    const unit = String(u.unit ?? u.id ?? u);
    const sourceKey = `unit:${unit}`;
    if (getPhysicalAssetForSource(sourceKey)) continue;
    const a = cleanPhysicalAsset({ type: "unit", label: `Unit ${unit}`, unit });
    candidates.assets.push(a);
    candidates.bindings.push(cleanSourceBinding(a.id, { sourceKey, modelId: "otb-unit-roster", modelVersion: "roster-v1", objectId: unit,
      metadata: { provenance: "Bundled unit roster; no inspection or present condition asserted", sourceUnit: unit,
        sourceLabel: String(u.dba || u.label || u.name || `Unit ${unit}`) } }));
  }
  for (const c of columns) {
    const sourceKey = physicalAssetSourceKey(c, modelId);
    if (getPhysicalAssetForSource(sourceKey)) continue;
    const a = cleanPhysicalAsset({ type: "column", label: c.label || c.id, unit: null });
    candidates.assets.push(a);
    candidates.bindings.push(cleanSourceBinding(a.id, { sourceKey, modelId, modelVersion, objectId: c.id,
      sourceGuids: c.sourceRefs?.wallGuids || [], metadata: {
        nodeName: c.nodeName, position: c.position, dimensionsMeters: c.dimensionsMeters,
        confidence: c.confidence, physicalVerification: "not-verified", sourceRefs: c.sourceRefs,
      } }));
  }
  for (const item of items) {
    if (!item.sourceKey) throw new Error("Imported inventory items require a stable sourceKey");
    if (getPhysicalAssetForSource(item.sourceKey)) continue;
    const a = cleanPhysicalAsset({ type: item.type, label: item.label, unit: item.unit || null });
    candidates.assets.push(a);
    candidates.bindings.push(cleanSourceBinding(a.id, { sourceKey: item.sourceKey,
      modelId: item.modelId || "external-inventory", modelVersion: item.modelVersion || "inventory-v1",
      objectId: item.objectId || item.sourceKey, sourceGuids: item.sourceGuids || [],
      metadata: item.metadata || {},
    }));
  }
}
export async function initializePhysicalAssets({ units = [], columns = [], items = [], modelVersion = "floorplanner-241952337", modelId = "otb-floorplanner", propertyKey = "otb" } = {}) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const epoch = sessionEpoch;
    const nextKey = `otb-physical-assets:v1:${encodeURIComponent(propertyKey)}`;
    try {
      if (REMOTE || !initialized || storageKey !== nextKey) {
        candidates = empty(); data = empty();
        if (REMOTE) {
          const loadedData = await readRemote();
          if (epoch !== sessionEpoch) throw new Error("The session ended before asset data finished loading");
          data = loadedData;
        }
        else {
          const saved = globalThis.localStorage.getItem(nextKey);
          data = saved ? JSON.parse(saved) : empty();
          if (data.version !== 1 || !["assets", "bindings", "inspections", "photos"].every(k => Array.isArray(data[k]))) throw new Error("Stored asset register is invalid; it was not overwritten");
        }
        storageKey = nextKey; initialized = true;
      }
      if (REMOTE && (await propertyContext()).slug !== propertyKey && (units.length || columns.length || items.length))
        throw new Error("Source inventory does not match the active property. No candidates were registered.");
      if (epoch !== sessionEpoch) throw new Error("The session ended before asset registration finished loading");
      stageSeeds({ units, columns, items, modelVersion, modelId });
      if (!REMOTE && candidates.assets.length) {
        localCommit({ ...data, assets: [...data.assets, ...candidates.assets], bindings: [...data.bindings, ...candidates.bindings] });
        candidates = empty();
      }
      status = { ...status, loaded: true, error: null, persistence: REMOTE ? "remote" : "browser",
        message: REMOTE ? "Hosted asset register. Source candidates require Save before inspection or work orders." : "Browser-only review data; not synchronized to OTB production." };
      notify(); return { assets: listPhysicalAssets(), status: getPhysicalAssetsStatus() };
    } catch (e) { initialized = false; status.loaded = false; throw fail(e); }
  })();
  try { return await initPromise; } finally { initPromise = null; }
}
function requireAsset(id) { ready(); const a = getPhysicalAsset(id); if (!a) throw new Error("Physical asset does not exist"); return a; }
async function actor() { return REMOTE ? ((await sb.auth.getUser()).data.user?.email || "") : "local-review"; }
function scopeRow(row, ctx) { return { ...row, org_id: ctx.org_id, property_id: ctx.property_id }; }

export async function savePhysicalAsset(input) {
  ready();
  const epoch = sessionEpoch;
  try {
    const prior = input.id ? getPhysicalAsset(input.id) : null;
    const row = cleanPhysicalAsset(input, prior);
    if (REMOTE) {
      const ctx = await propertyContext();
      const payload = scopeRow(row, ctx);
      const pending = candidates.bindings.filter(b => b.asset_id === row.id);
      const { data: saved, error } = await sb.rpc("save_physical_asset_with_bindings", {
        p_asset: payload, p_bindings: pending.map(b => scopeRow(b, ctx)),
      });
      if (error) throw error;
      if (epoch !== sessionEpoch) throw new Error("The session ended while saving. Reload the property to confirm the server result.");
      data.assets = [...data.assets.filter(a => a.id !== row.id), saved.asset];
      data.bindings.push(...saved.bindings);
      candidates.assets = candidates.assets.filter(a => a.id !== row.id);
      candidates.bindings = candidates.bindings.filter(b => b.asset_id !== row.id);
      status = { ...status, error: null, persistence: "remote", message: "Saved to the hosted asset register." };
    } else localCommit({ ...data, assets: [...data.assets.filter(a => a.id !== row.id), row] });
    notify(); return getPhysicalAsset(row.id);
  } catch (e) { throw fail(e); }
}
export async function bindModelSource(assetId, input) {
  const asset = requireAsset(assetId);
  const epoch = sessionEpoch;
  if (!asset.persisted) throw new Error("Save the physical asset before binding another source");
  try {
    let row = cleanSourceBinding(assetId, input);
    const otherOwner = [...data.bindings, ...candidates.bindings].find(b => b.source_key === row.source_key && b.asset_id !== assetId);
    if (otherOwner) throw new Error("This source object already belongs to another physical asset. Choose an unclaimed replacement object; asset reconciliation must be explicit.");
    const existing = data.bindings.find(b => b.source_key === row.source_key && b.model_version === row.model_version);
    if (existing) {
      if (existing.asset_id === assetId) return clone(existing);
      throw new Error("This source revision is already bound to another asset. Use a new source revision to preserve the correction history.");
    }
    if (REMOTE) {
      const { data: saved, error } = await sb.from("physical_asset_bindings").insert(scopeRow(row, await propertyContext())).select().single();
      if (error) throw error;
      if (epoch !== sessionEpoch) throw new Error("The session ended while binding. Reload the property to confirm the server result.");
      data.bindings.push(saved); row = saved;
      status = { ...status, error: null, persistence: "remote", message: "Source binding saved; prior revisions retained." };
    } else localCommit({ ...data, bindings: [...data.bindings, row] });
    notify(); return clone(row);
  } catch (e) { throw fail(e); }
}
function prepareAssetEvidence(assetId, input) {
  if (!requireAsset(assetId).persisted) throw new Error("Save the physical asset before attaching evidence");
  return { assetId, evidence: cleanPhysicalAssetEvidence(input) };
}
function existingAssetEvidence(assetId, evidenceId, bindings = data.bindings) {
  const sourceKey = physicalAssetEvidenceSourceKey(assetId, evidenceId);
  const binding = bindings.find(b => b.source_key === sourceKey);
  if (!binding) return null;
  const existing = physicalAssetEvidenceFromBinding(binding);
  if (!existing || existing.asset_id !== assetId) throw new Error("This evidence key is already used by an incompatible source record; choose a new evidence ID");
  return existing;
}
export async function appendPhysicalAssetEvidence(assetId, input) {
  try {
    const { evidence } = prepareAssetEvidence(assetId, input);
    const existing = existingAssetEvidence(assetId, evidence.id);
    if (existing) return clone(existing);
    // Collapse simultaneous UI requests too; the database unique source/revision
    // constraint remains the authority across separate clients.
    const key = `${sessionEpoch}:${storageKey}:${assetId}:${evidence.id}`;
    let pending = pendingEvidence.get(key);
    if (!pending) {
      pending = Promise.resolve().then(async () => {
        const binding = await bindModelSource(assetId, physicalAssetEvidenceBinding(assetId, evidence));
        const saved = physicalAssetEvidenceFromBinding(binding);
        if (!saved) throw new Error("Saved evidence could not be read; reload the asset to confirm the stored result");
        return saved;
      });
      pendingEvidence.set(key, pending);
    }
    try { return clone(await pending); }
    finally { if (pendingEvidence.get(key) === pending) pendingEvidence.delete(key); }
  } catch (e) { throw fail(e); }
}
export async function appendPhysicalAssetEvidenceBatch(entries) {
  ready();
  try {
    if (!Array.isArray(entries)) throw new Error("Evidence batch must be an array");
    // Validate every entry and persistence gate before any write. Catalog IDs
    // are stable; duplicate IDs always retain the original evidence snapshot.
    const prepared = entries.map(entry => prepareAssetEvidence(entry?.assetId, entry?.evidence));
    if (REMOTE) {
      const result = [];
      // Hosted writes use the existing scoped append path. This is not a
      // transaction: earlier successful entries remain if a later write fails.
      for (const { assetId, evidence } of prepared) result.push(await appendPhysicalAssetEvidence(assetId, evidence));
      return result;
    }
    const bindings = [...data.bindings];
    const result = prepared.map(({ assetId, evidence }) => {
      const existing = existingAssetEvidence(assetId, evidence.id, bindings);
      if (existing) return existing;
      const binding = cleanSourceBinding(assetId, physicalAssetEvidenceBinding(assetId, evidence));
      bindings.push(binding);
      return physicalAssetEvidenceFromBinding(binding);
    });
    if (bindings.length !== data.bindings.length) {
      localCommit({ ...data, bindings });
      notify();
    }
    return result.map(clone);
  } catch (e) { throw fail(e); }
}
export async function appendPhysicalAssetInspection(assetId, input) {
  const asset = requireAsset(assetId);
  const epoch = sessionEpoch;
  if (!asset.persisted) throw new Error("Save the physical asset before recording an inspection");
  try {
    let row = { ...cleanAssetInspection(assetId, input), created_by: await actor() };
    if (REMOTE) {
      const { data: saved, error } = await sb.from("physical_asset_inspections").insert(scopeRow(row, await propertyContext())).select().single();
      if (error) throw error;
      if (epoch !== sessionEpoch) throw new Error("The session ended while saving the inspection. Reload the property to confirm the server result.");
      data.inspections.push(saved); row = saved;
      status = { ...status, error: null, persistence: "remote", message: "Inspection saved to the hosted append-only history." };
    } else localCommit({ ...data, inspections: [...data.inspections, row] });
    notify(); return clone(row);
  } catch (e) { throw fail(e); }
}
export async function addPhysicalAssetPhoto(file, assetId, inspectionId = null) {
  const asset = requireAsset(assetId);
  const epoch = sessionEpoch;
  if (!asset.persisted) throw new Error("Save the physical asset before adding photos");
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("Choose a JPEG, PNG, WebP or GIF photo");
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error("Photo must contain data and be no larger than 25 MB");
  if (inspectionId && !data.inspections.some(i => i.id === inspectionId && i.asset_id === assetId)) throw new Error("Inspection does not belong to this asset");
  let path;
  try {
    path = await photos.add(file, assetId, file.name);
    let row = { id: newPhysicalId("pap"), asset_id: assetId, inspection_id: inspectionId, path,
      name: String(file.name || "Photo").slice(0, 240), mime: file.type, size: file.size, created_at: new Date().toISOString(), created_by: await actor() };
    if (REMOTE) {
      const { data: saved, error } = await sb.from("physical_asset_photos").insert(scopeRow(row, await propertyContext())).select().single();
      if (error) throw error;
      if (epoch !== sessionEpoch) throw new Error("The session ended while saving the photo. Reload the property to confirm the server result.");
      data.photos.push(saved); row = saved;
      status = { ...status, error: null, persistence: "remote", message: "Photo saved privately to this physical asset." };
    } else localCommit({ ...data, photos: [...data.photos, row] });
    notify(); return { ...row, url: await photos.url(path) };
  } catch (e) {
    // Remove only our just-created upload if metadata was not committed.
    if (epoch === sessionEpoch && path && !data.photos.some(p => p.path === path)) { try { await photos.remove(path); } catch { /* retain original failure */ } }
    throw fail(path && data.photos.some(p => p.path === path) ? new Error(`Photo saved, but its preview could not load: ${e.message}`) : e);
  }
}
export async function listPhysicalAssetPhotos(assetId) {
  requireAsset(assetId);
  try { return await Promise.all(data.photos.filter(p => p.asset_id === assetId).map(async p => ({ ...clone(p), url: await photos.url(p.path) }))); }
  catch (e) { throw fail(e); }
}
