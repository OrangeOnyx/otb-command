import test from 'node:test';
import assert from 'node:assert/strict';
import generatedSite from '../public/twin/site-context.json' with { type: 'json' };
import { siteAreaSeeds, siteZoneSourceKey, siteZoneForAsset } from '../src/lib/asset-twin-site-records.js';
import { sourceItemForAsset, sourceMetadata, sourceAssetKind, sourceItems } from '../src/lib/asset-twin-source-data.js';
import { cleanPhysicalAsset, cleanSourceBinding } from '../src/lib/physical-assets-model.js';

const zone = (overrides = {}) => ({
  id: 'grass-west', label: 'West planting area', kind: 'landscape',
  position: [12, 0, 23], boundsMeters: { min: [10, 0, 20], max: [14, 0, 26] },
  source: 'Recorded plat / CAD planting boundary', geometryStatus: 'Source-derived; not field surveyed',
  provenance: { files: ['geometry.json'], registration: { status: 'approximate' } }, ...overrides,
});
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
function assetForSeed(seed) {
  const asset = cleanPhysicalAsset(seed);
  return { ...asset, bindings: [cleanSourceBinding(asset.id, seed)] };
}

test('site surfaces seed independent permanent-record candidates without claiming inspection or served units', () => {
  const data = { zones: ['parking', 'landscape', 'sidewalk', 'service'].map(kind => zone({ id: `area-${kind}`, kind })) };
  const seeds = siteAreaSeeds(data);
  assert.equal(seeds.length, 4);
  assert.equal(new Set(seeds.map(seed => seed.sourceKey)).size, 4);
  for (const seed of seeds) {
    assert.equal(seed.sourceKey, siteZoneSourceKey(seed.objectId));
    assert.equal(seed.modelId, 'otb-site-context');
    assert.equal(seed.type, 'other');
    assert.equal(seed.unit, null);
    assert.equal(seed.metadata.assetKind, 'site_area');
    assert.equal(seed.metadata.siteZoneId, seed.objectId);
    assert.equal(seed.metadata.positionStatus, 'source-derived-approximate');
    assert.equal(seed.metadata.geometryStatus, data.zones[0].geometryStatus);
    assert.deepEqual(seed.metadata.sourceRefs, [{ file: 'geometry.json · REV 14 / Boulev_CLEAN.dxf / recorded plat' }]);
    const asset = assetForSeed(seed);
    assert.match(asset.id, /^pa_/);
    assert.equal(asset.verification, 'unverified');
    assert.equal(asset.condition, undefined);
    assert.equal(seed.metadata.servedUnits, undefined);
  }
});

test('roads, off-parcel land and reference-only shapes never become owned common-area assets', () => {
  const zones = [zone(), zone({ id: 'road', kind: 'roads' }), zone({ id: 'bank', kind: 'off-parcel' }),
    zone({ id: 'reference-only', contextOnly: true }), zone({ id: 'not-an-asset', assetRecord: false }),
    zone({ id: 'unknown', kind: 'building' })];
  assert.deepEqual(siteAreaSeeds({ zones }).map(seed => seed.objectId), ['grass-west']);
});

test('packaged site geometry yields 41 uniquely keyed common areas and excludes every reference-only zone', () => {
  const seeds = siteAreaSeeds(generatedSite);
  assert.equal(seeds.length, 41);
  assert.equal(new Set(seeds.map(seed => seed.sourceKey)).size, 41);
  assert.equal(new Set(seeds.map(seed => seed.objectId)).size, 41);
  for (const reference of generatedSite.zones.filter(zone => zone.contextOnly || zone.assetRecord === false || ['roads', 'off-parcel'].includes(zone.kind))) {
    assert.equal(seeds.some(seed => seed.objectId === reference.id), false, reference.id);
  }
  for (const seed of seeds) {
    const reference = generatedSite.zones.find(zone => zone.id === seed.objectId);
    assert.ok(reference);
    assert.equal(seed.sourceKey, siteZoneSourceKey(reference.id));
    assert.equal(siteZoneForAsset(assetForSeed(seed)), reference.id);
    assert.deepEqual(seed.metadata.boundsMeters, reference.boundsMeters);
    assert.deepEqual(seed.metadata.position, reference.position);
  }
});

test('malformed geometry is skipped, valid flat ground is accepted, and a bad duplicate cannot hide a later valid zone', () => {
  for (const zones of [undefined, null, {}, 'zones']) assert.deepEqual(siteAreaSeeds({ zones }), []);
  assert.deepEqual(siteAreaSeeds(null), []);
  const malformed = [null, {}, zone({ id: '' }), zone({ id: '   ' }), zone({ id: 3 }),
    zone({ id: 'short-position', position: [1, 2] }), zone({ id: 'infinite-position', position: [1, Infinity, 2] }),
    zone({ id: 'string-position', position: ['1', 0, 2] }), zone({ id: 'no-bounds', boundsMeters: null }),
    zone({ id: 'reversed', boundsMeters: { min: [14, 0, 20], max: [10, 0, 26] } }),
    zone({ id: 'nan-bound', boundsMeters: { min: [NaN, 0, 20], max: [14, 0, 26] } }),
    zone({ id: 'short-bound', boundsMeters: { min: [10, 20], max: [14, 26] } }),
    zone({ id: 'grass-west', position: [NaN, 0, 0] })];
  const seeds = siteAreaSeeds({ zones: [...malformed, zone(), zone({ label: 'Duplicate should not replace first source' })] });
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0].label, 'West planting area');
  assert.deepEqual(seeds[0].metadata.boundsMeters, { min: [10, 0, 20], max: [14, 0, 26] });
});

test('seed conversion does not mutate inputs or expose their nested provenance to later edits', () => {
  const input = { zones: [zone()] };
  const original = structuredClone(input);
  const [seed] = siteAreaSeeds(freezeDeep(input));
  assert.deepEqual(input, original);
  seed.label = 'Operator label';
  seed.metadata.position[0] = 99;
  seed.metadata.boundsMeters.min[0] = 99;
  seed.metadata.provenance.files.push('later-reference.pdf');
  seed.metadata.provenance.registration.status = 'changed outside source';
  assert.deepEqual(input, original);
  const [fresh] = siteAreaSeeds(input);
  assert.equal(fresh.label, original.zones[0].label);
  assert.equal(fresh.metadata.position[0], 12);
  assert.deepEqual(fresh.metadata.provenance, original.zones[0].provenance);
});

test('site lookup uses the site source key and model namespace rather than labels, evidence or metadata alone', () => {
  const [seed] = siteAreaSeeds({ zones: [zone()] });
  const asset = assetForSeed(seed);
  const binding = asset.bindings[0];
  assert.equal(siteZoneForAsset(asset), 'grass-west');
  assert.equal(sourceItemForAsset(asset).sourceKey, seed.sourceKey);
  assert.equal(sourceMetadata(asset).siteZoneId, 'grass-west');
  assert.equal(sourceAssetKind(asset), 'site_area');
  for (const patch of [
    { model_id: 'otb-evidence' }, { source_key: 'site-area:another-zone' }, { source_key: 'manual:grass-west' },
    { metadata: { ...binding.metadata, assetKind: 'bench' } },
    { metadata: { ...binding.metadata, siteZoneId: '' } },
  ]) {
    const unrelated = { ...asset, label: seed.label, bindings: [{ ...binding, ...patch }] };
    assert.equal(siteZoneForAsset(unrelated), null, JSON.stringify(patch));
    assert.equal(sourceItemForAsset(unrelated), null, JSON.stringify(patch));
    assert.equal(sourceAssetKind(unrelated), 'other');
  }
  assert.equal(siteZoneForAsset(null), null);
  assert.equal(siteZoneForAsset({ label: seed.label, bindings: [] }), null);
});

test('existing fixture and infrastructure source authority remains ahead of the site fallback', () => {
  const [seed] = siteAreaSeeds({ zones: [zone()] });
  const asset = assetForSeed(seed);
  const water = sourceItems.find(item => item.sourceKey === 'utility-meter:water:W1204084');
  asset.bindings.unshift({ model_id: 'otb-evidence', source_key: 'evidence:reference', metadata: { evidence: { title: 'Grass reference' } } });
  asset.bindings.push({ source_key: water.sourceKey });
  assert.equal(sourceItemForAsset(asset), water);
  assert.equal(sourceAssetKind(asset), 'utility_meter');
  assert.equal(sourceMetadata(asset).meterIdRaw, 'W1204084');
});

test('common-area identity, site selection and source metadata survive operator rename, evidence append and reload', async () => {
  const backing = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => backing.get(key) || null, setItem: (key, value) => backing.set(key, value) };
  try {
    const register = await import('../src/lib/physical-assets.js?site-area-register');
    const initialData = { zones: [zone()] };
    await register.initializePhysicalAssets({ propertyKey: 'site-area-test', items: siteAreaSeeds(initialData) });
    const initial = register.getPhysicalAssetForSource('site-area:grass-west');
    assert.ok(initial);
    const originalSite = structuredClone(sourceMetadata(initial));
    await register.savePhysicalAsset({ ...initial, label: 'Grass beside the shutoff group' });
    await register.appendPhysicalAssetEvidence(initial.id, {
      id: 'site-field-check-pending', kind: 'verification-note', title: 'Location requires onsite measurement',
      status: 'needs-verification', scope: 'asset-specific', reviewedAt: '2026-09-25',
      notes: 'Confirm grass edge and individual shutoff positions against durable landmarks.',
    });
    const reload = await import('../src/lib/physical-assets.js?site-area-reload');
    await reload.initializePhysicalAssets({ propertyKey: 'site-area-test', items: siteAreaSeeds({ zones: [zone({ label: 'Changed catalog label' })] }) });
    const saved = reload.getPhysicalAssetForSource('site-area:grass-west');
    assert.equal(saved.id, initial.id);
    assert.equal(saved.label, 'Grass beside the shutoff group');
    assert.equal(saved.verification, 'unverified');
    assert.equal(saved.condition, 'uninspected');
    assert.equal(siteZoneForAsset(saved), 'grass-west');
    assert.equal(sourceAssetKind(saved), 'site_area');
    assert.deepEqual(sourceMetadata(saved), originalSite);
    assert.equal(reload.listPhysicalAssets().length, 1);
    assert.equal(saved.bindings.filter(binding => binding.model_id === 'otb-site-context').length, 1);
    assert.equal(reload.listPhysicalAssetEvidence(saved.id)[0].id, 'site-field-check-pending');
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
