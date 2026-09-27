/* Pure physical identity and inspection rules. Model objects are source bindings,
   never asset identity; display labels are editable without changing identity. */
export const PHYSICAL_ASSET_TYPES = {
  unit: "Suite / unit", column: "Column", hvac: "HVAC", light: "Light",
  meter: "Meter", shutoff: "Shutoff", drain: "Drain", roof: "Roof",
  camera: "Camera", sign: "Sign", walkway: "Walkway", other: "Other",
};
export const PHYSICAL_ASSET_CONDITIONS = {
  uninspected: "Not inspected", good: "Good", monitor: "Monitor", repair: "Repair needed", urgent: "Urgent review",
};
export const validPhysicalAssetId = id => /^pa_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ""));
export const newPhysicalId = (prefix = "pa", uuid = () => globalThis.crypto.randomUUID()) => `${prefix}_${uuid()}`;
const text = (value, max) => String(value ?? "").trim().slice(0, max);
export const physicalAssetSourceKey = (column, modelId = "otb-floorplanner") => `model:${modelId}:column:${column.id}`;
export function cleanDimensions(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dimensions must be an object");
  const out = { unit: value.unit || "m" };
  if (!["m", "ft", "cm", "in"].includes(out.unit)) throw new Error("Unsupported dimension unit");
  for (const key of ["width", "depth", "height", "diameter"]) {
    if (value[key] === "" || value[key] == null) continue;
    const n = Number(value[key]);
    if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error(`${key} must be a positive finite dimension`);
    out[key] = n;
  }
  return out;
}
export function cleanPhysicalAsset(input, previous = null, now = new Date().toISOString()) {
  const data = { ...(previous || {}), ...input };
  const id = previous?.id || data.id || newPhysicalId();
  if (!validPhysicalAssetId(id)) throw new Error("Invalid physical asset ID");
  if (previous && input.id && input.id !== previous.id) throw new Error("Physical asset identity cannot change");
  if (!PHYSICAL_ASSET_TYPES[data.type]) throw new Error("Select a supported asset type");
  const label = text(data.label, 120);
  if (!label) throw new Error("Asset label is required");
  const verification = data.verification || "unverified";
  if (!["unverified", "field-verified"].includes(verification)) throw new Error("Invalid verification status");
  const status = data.status || "active";
  if (!["active", "retired"].includes(status)) throw new Error("Invalid asset status");
  return { id, type: data.type, label, unit: text(data.unit, 60) || null,
    notes: text(data.notes, 4000), material: text(data.material, 160), dimensions: cleanDimensions(data.dimensions || {}),
    verification, status, created_at: previous?.created_at || now, updated_at: now };
}
export function cleanAssetInspection(assetId, input, now = new Date().toISOString()) {
  if (!validPhysicalAssetId(assetId)) throw new Error("Invalid physical asset ID");
  const date = text(input.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    throw new Error("Inspection date must be a real YYYY-MM-DD date");
  const condition = input.condition || "uninspected";
  if (!PHYSICAL_ASSET_CONDITIONS[condition]) throw new Error("Select a supported condition");
  return { id: newPhysicalId("pai"), asset_id: assetId, date, condition,
    notes: text(input.notes, 6000), material: text(input.material, 160), dimensions: cleanDimensions(input.dimensions || {}),
    inspector: text(input.inspector, 160), created_at: now };
}
export function cleanSourceBinding(assetId, input, now = new Date().toISOString()) {
  if (!validPhysicalAssetId(assetId)) throw new Error("Invalid physical asset ID");
  const source_key = text(input.sourceKey ?? input.source_key, 350);
  const model_version = text(input.modelVersion ?? input.model_version, 160) || "unversioned";
  if (!source_key) throw new Error("Source key is required");
  return { id: newPhysicalId("pab"), asset_id: assetId, source_key,
    model_id: text(input.modelId ?? input.model_id, 160), model_version,
    object_id: text(input.objectId ?? input.object_id, 160),
    source_guids: [...new Set((input.sourceGuids ?? input.source_guids ?? []).map(v => text(v, 160)))].slice(0, 200),
    metadata: JSON.parse(JSON.stringify(input.metadata || {})), created_at: now };
}
export function latestInspection(inspections = []) {
  return [...inspections].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at).localeCompare(String(a.created_at)) || b.id.localeCompare(a.id))[0] || null;
}
export function derivePhysicalAsset(row, bindings = [], inspections = [], persisted = true) {
  const own = inspections.filter(i => i.asset_id === row.id);
  const latest = latestInspection(own);
  return { ...row, persisted, condition: latest?.condition || "uninspected", lastInspection: latest,
    bindings: bindings.filter(b => b.asset_id === row.id), inspections: own };
}
