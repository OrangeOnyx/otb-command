/* Evidence is an append-only source snapshot attached to a permanent asset.
   It is not a model placement, inspection, or assertion of field verification. */
import { newPhysicalId, validPhysicalAssetId } from './physical-assets-model.js';

export const PHYSICAL_ASSET_EVIDENCE_KINDS = {
  source: 'Source link', 'dated-view': 'Dated reference view', 'verification-note': 'Verification note',
};
export const PHYSICAL_ASSET_EVIDENCE_STATUSES = {
  reference: 'Reference only', 'needs-verification': 'Needs verification', 'field-observation': 'Field observation',
};
export const PHYSICAL_ASSET_EVIDENCE_SCOPES = { 'site-context': 'Site context', 'asset-specific': 'Asset specific' };
export const PHYSICAL_ASSET_EVIDENCE_DATE_MEANINGS = {
  unknown: 'Date meaning unknown', 'imagery-selector': 'Imagery selector date', 'imagery-range': 'Imagery date range',
  'source-year': 'Source year', 'layer-updated': 'Layer last updated', 'observed-on': 'Observed on', 'document-date': 'Document date',
};
export const PHYSICAL_ASSET_EVIDENCE_MODEL_ID = 'otb-evidence';
export const PHYSICAL_ASSET_EVIDENCE_VERSION = 'evidence-v1';
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function text(value, max, name) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${name} must be no more than ${max} characters`);
  return result;
}
function option(value, choices, fallback, name) {
  const result = value == null || value === '' ? fallback : value;
  if (!Object.hasOwn(choices, result)) throw new Error(`Select a supported evidence ${name}`);
  return result;
}
function date(value, required, name) {
  if (!required && (value == null || value === '')) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new Error(`${name} must be a real YYYY-MM-DD date`);
  return value;
}
function evidenceId(value) {
  if (typeof value !== 'string' || !idPattern.test(value)) throw new Error('Invalid evidence ID');
  return value;
}
export function cleanPhysicalAssetEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Evidence must be an object');
  const id = evidenceId(input.id == null ? newPhysicalId('pae') : input.id);
  const title = text(input.title, 200, 'Evidence title');
  if (!title) throw new Error('Evidence title is required');
  const kind = option(input.kind, PHYSICAL_ASSET_EVIDENCE_KINDS, 'source', 'kind');
  const status = option(input.status, PHYSICAL_ASSET_EVIDENCE_STATUSES, 'reference', 'status');
  const scope = option(input.scope, PHYSICAL_ASSET_EVIDENCE_SCOPES, 'site-context', 'scope');
  let url = text(input.url, 8192, 'Evidence URL');
  if (url) {
    // Check raw input too: URL parsing otherwise silently strips control characters.
    if (/[\u0000-\u0020\u007f\\]/.test(input.url)) throw new Error('Evidence URL must be HTTPS without credentials, spaces, or control characters');
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Evidence URL must be a valid HTTPS address'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error('Evidence URL must be HTTPS without credentials');
    url = parsed.href;
  }
  if (!url && kind !== 'verification-note') throw new Error('A source or dated view requires an HTTPS URL');
  const notes = text(input.notes, 6000, 'Evidence notes');
  if (kind === 'verification-note' && !notes) throw new Error('A verification note requires notes');
  return {
    id, title, url, kind, status, scope,
    sourceDate: date(input.sourceDate, false, 'Source date'),
    sourceDateLabel: text(input.sourceDateLabel, 240, 'Source date label'),
    dateMeaning: option(input.dateMeaning, PHYSICAL_ASSET_EVIDENCE_DATE_MEANINGS, 'unknown', 'date meaning'),
    reviewedAt: date(input.reviewedAt, true, 'Review date'),
    provider: text(input.provider, 240, 'Evidence provider'), notes,
  };
}
export function physicalAssetEvidenceSourceKey(assetId, id) {
  if (!validPhysicalAssetId(assetId)) throw new Error('Invalid physical asset ID');
  return `evidence:${assetId}:${evidenceId(id)}`;
}
export function physicalAssetEvidenceBinding(assetId, input) {
  const evidence = cleanPhysicalAssetEvidence(input);
  return { sourceKey: physicalAssetEvidenceSourceKey(assetId, evidence.id),
    modelId: PHYSICAL_ASSET_EVIDENCE_MODEL_ID, modelVersion: PHYSICAL_ASSET_EVIDENCE_VERSION,
    objectId: '', sourceGuids: [], metadata: { evidence } };
}
export function physicalAssetEvidenceFromBinding(binding) {
  // Reading a malformed or unrelated binding never mints a new evidence ID.
  if (!binding || binding.model_id !== PHYSICAL_ASSET_EVIDENCE_MODEL_ID
    || binding.model_version !== PHYSICAL_ASSET_EVIDENCE_VERSION || binding.object_id !== ''
    || !binding.metadata?.evidence?.id) return null;
  try {
    const evidence = cleanPhysicalAssetEvidence(binding.metadata.evidence);
    if (binding.source_key !== physicalAssetEvidenceSourceKey(binding.asset_id, evidence.id)) return null;
    return { ...evidence, asset_id: binding.asset_id, binding_id: binding.id,
      created_at: binding.created_at, persisted: true };
  } catch { return null; }
}
