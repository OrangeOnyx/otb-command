import catalog from '../data/twin-site-research.json' with { type: 'json' };
import { sourceMetadata } from './asset-twin-source-data.js';

export { catalog as siteResearch };

const evidenceById = new Map(catalog.evidence.map(item => [item.id, item]));
const normalized = value => String(value ?? '').trim().toLowerCase();

// Suggestions only. Once attached, evidence belongs to the permanent asset ID;
// source-binding changes must not replace or filter that persisted history.
export function researchEvidenceForAsset(asset) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) return [];
  const metadata = sourceMetadata(asset);
  const type = normalized(asset.type);
  const kind = normalized(metadata.assetKind || type);
  const utility = normalized(metadata.utility);
  const unit = String(asset.unit ?? '').trim();
  const ids = [...catalog.siteEvidenceIds];
  const include = key => ids.push(...(catalog.assetEvidenceIds[key] ?? []));

  if ((type === 'meter' || kind === 'utility_meter') && utility === 'water') include('waterMeter');
  if (type === 'shutoff' && (!utility || utility === 'water')) include('waterShutoff');
  if (type === 'column') include('column');
  if (kind === 'bench' || kind === 'waste_bin') include(kind);
  if (type === 'unit' && (unit === '101' || unit === '103')) include(`unit${unit}`);

  return [...new Set(ids)].map(id => evidenceById.get(id)).filter(Boolean).map(item => ({ ...item }));
}
