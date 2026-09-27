import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPhysicalAsset, cleanSourceBinding } from '../src/lib/physical-assets-model.js';
import { cleanPhysicalAssetEvidence, physicalAssetEvidenceBinding, physicalAssetEvidenceFromBinding,
  physicalAssetEvidenceSourceKey } from '../src/lib/physical-asset-evidence-model.js';
import { latestLocatedBinding, sourceObjectForAsset } from '../src/lib/asset-twin-links.js';

const source = (id = 'earth:2026:review-v1') => ({ id, title: 'January 2026 site reference',
  url: 'https://earth.google.com/web/?reference=otb', kind: 'dated-view', status: 'reference', scope: 'site-context',
  sourceDate: '2026-01-27', sourceDateLabel: 'Older imagery–January 27, 2026', dateMeaning: 'imagery-range',
  reviewedAt: '2026-09-25', provider: 'Google Earth / Airbus', notes: 'Date range is not an asset observation date.' });

test('evidence validates link safety, date precision and independent reference semantics', () => {
  const evidence = cleanPhysicalAssetEvidence(source());
  assert.equal(evidence.sourceDateLabel, source().sourceDateLabel);
  assert.equal(evidence.dateMeaning, 'imagery-range');
  assert.equal(evidence.sourceDate, '2026-01-27');
  assert.equal(evidence.reviewedAt, '2026-09-25');
  for (const url of ['http://example.com', 'javascript:alert(1)', 'data:text/html,hi', 'file:///C:/secret',
    '//example.com', 'https://user:pass@example.com', 'https://user@example.com', 'https://example.com\\@evil.com',
    'https://example.com/\npath', 'https://example.com/a b', ' https://example.com'])
    assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), url }), /HTTPS/);
  for (const key of ['reviewedAt', 'sourceDate']) {
    for (const value of ['2026-02-30', '2026-02-29', '2024', '2026-09-25junk'])
      assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), [key]: value }), /real YYYY-MM-DD/);
  }
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), reviewedAt: undefined }), /Review date/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), kind: 'inspection' }), /kind/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), status: 'field-verified' }), /status/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), scope: 'all-assets-verified' }), /scope/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), dateMeaning: 'current' }), /date meaning/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), id: 'unsafe/key' }), /ID/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), id: 'a'.repeat(161) }), /ID/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), title: ' ' }), /title/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), url: '' }), /requires an HTTPS/);
  assert.throws(() => cleanPhysicalAssetEvidence({ ...source(), kind: 'verification-note', notes: '' }), /requires notes/);
  const yearOnly = cleanPhysicalAssetEvidence({ ...source(), sourceDate: null, sourceDateLabel: '2024', dateMeaning: 'source-year' });
  assert.equal(yearOnly.sourceDate, null);
  assert.equal(yearOnly.sourceDateLabel, '2024');
  assert.equal(cleanPhysicalAssetEvidence({ ...source(), sourceDate: '2024-02-29' }).sourceDate, '2024-02-29');
  const note = cleanPhysicalAssetEvidence({ title: 'Meter identity remains uncertain', kind: 'verification-note',
    reviewedAt: '2026-09-25', notes: 'Read the meter serial onsite.' });
  assert.match(note.id, /^pae_/); assert.equal(note.url, ''); assert.equal(note.status, 'reference');
});

test('evidence binding namespace cannot replace asset identity or model placement', () => {
  const asset = cleanPhysicalAsset({ type: 'column', label: 'C12' });
  const evidence = source();
  const input = physicalAssetEvidenceBinding(asset.id, { ...evidence, position: [99, 0, 99], objectId: 'C12',
    metadata: { position: [99, 0, 99] }, modelId: 'otb-floorplanner', verification: 'field-verified', condition: 'good' });
  assert.equal(input.sourceKey, `evidence:${asset.id}:${evidence.id}`);
  assert.equal(input.modelId, 'otb-evidence'); assert.equal(input.modelVersion, 'evidence-v1');
  assert.equal(input.objectId, ''); assert.deepEqual(Object.keys(input.metadata), ['evidence']);
  assert.equal(input.metadata.evidence.position, undefined); assert.equal(input.metadata.evidence.verification, undefined);
  const binding = cleanSourceBinding(asset.id, input);
  const result = physicalAssetEvidenceFromBinding(binding);
  assert.equal(result.id, evidence.id); assert.equal(result.asset_id, asset.id); assert.equal(result.persisted, true);
  assert.equal(physicalAssetEvidenceFromBinding({ ...binding, object_id: 'C12' }), null);
  assert.equal(physicalAssetEvidenceFromBinding({ ...binding, model_id: 'otb-floorplanner' }), null);
  assert.equal(physicalAssetEvidenceFromBinding({ ...binding, source_key: 'evidence:other-asset:key' }), null);
  assert.equal(physicalAssetEvidenceFromBinding({ ...binding, metadata: { evidence: { ...evidence, id: undefined } } }), null);
  assert.equal(physicalAssetEvidenceFromBinding({ ...binding, metadata: { evidence: { ...evidence, url: 'javascript:alert(1)' } } }), null);
  assert.throws(() => physicalAssetEvidenceSourceKey('C12', evidence.id), /physical asset ID/);
});

test('append-only evidence survives rename, model replacement and reload without changing inspection facts', async () => {
  const backing = new Map(); let blocked = false; let writes = 0;
  globalThis.localStorage = { getItem: key => backing.get(key) || null,
    setItem: (key, value) => { if (blocked) throw new Error('Quota exceeded'); backing.set(key, value); writes++; } };
  const lib = await import('../src/lib/physical-assets.js?evidence-register');
  const columns = [{ id: 'old-c12', label: 'C12', position: [1, 0, 2] }, { id: 'old-c13', label: 'C13', position: [3, 0, 4] }];
  await lib.initializePhysicalAssets({ propertyKey: 'evidence-a', columns });
  const a = lib.getPhysicalAssetForModelObject('old-c12');
  const b = lib.getPhysicalAssetForModelObject('old-c13');
  await lib.appendPhysicalAssetInspection(a.id, { date: '2026-09-24', condition: 'monitor', notes: 'Prior inspection.' });
  const originalLocation = latestLocatedBinding(lib.getPhysicalAsset(a.id));
  const beforeBatch = writes;
  const result = await lib.appendPhysicalAssetEvidenceBatch([
    { assetId: a.id, evidence: source() }, { assetId: b.id, evidence: source() },
    { assetId: a.id, evidence: { ...source(), notes: 'Must not overwrite the first snapshot' } },
  ]);
  assert.equal(writes, beforeBatch + 1, 'one atomic storage write for all new evidence');
  assert.equal(result.length, 3); assert.equal(result[0].binding_id, result[2].binding_id);
  assert.notEqual(result[0].binding_id, result[1].binding_id, 'same source ID belongs independently to each asset');
  assert.equal(result[2].notes, source().notes);
  await lib.appendPhysicalAssetEvidenceBatch([{ assetId: a.id, evidence: source() }, { assetId: b.id, evidence: source() }]);
  assert.equal(writes, beforeBatch + 1, 'repeated catalog attachment performs no storage write');
  const duplicate = await lib.appendPhysicalAssetEvidence(a.id, { ...source(), title: 'Changed catalog title', notes: 'New catalog text' });
  assert.equal(duplicate.title, source().title); assert.equal(duplicate.notes, source().notes);
  const [same1, same2] = await Promise.all([
    lib.appendPhysicalAssetEvidence(a.id, source('concurrent-source')), lib.appendPhysicalAssetEvidence(a.id, source('concurrent-source')),
  ]);
  assert.equal(same1.binding_id, same2.binding_id);
  assert.equal(lib.listPhysicalAssetEvidence(a.id).length, 2);
  result[0].notes = 'mutated returned copy';
  const list = lib.listPhysicalAssetEvidence(a.id); list[0].notes = 'mutated list';
  assert.equal(lib.listPhysicalAssetEvidence(a.id).find(e => e.id === source().id).notes, source().notes);
  const fieldNote = await lib.appendPhysicalAssetEvidence(a.id, { title: 'Reported onsite observation', kind: 'verification-note',
    status: 'field-observation', scope: 'asset-specific', reviewedAt: '2026-09-25', sourceDate: '2026-09-25',
    dateMeaning: 'observed-on', notes: 'Paint wear reported; no position or identity was measured.' });
  assert.match(fieldNote.id, /^pae_/);
  assert.equal(lib.getPhysicalAsset(a.id).verification, 'unverified');
  assert.equal(lib.getPhysicalAsset(a.id).condition, 'monitor');
  assert.equal(lib.listPhysicalAssetInspections(a.id).length, 1);
  assert.equal(latestLocatedBinding(lib.getPhysicalAsset(a.id)).id, originalLocation.id);
  assert.equal(sourceObjectForAsset(lib.getPhysicalAsset(a.id), columns), 'old-c12');
  await lib.savePhysicalAsset({ ...a, label: 'Renamed permanent support' });
  await lib.bindModelSource(a.id, { sourceKey: 'replacement-c12', modelId: 'otb-floorplanner', modelVersion: 'revision-2',
    objectId: 'new-c12', metadata: { position: [10, 0, 20] } });
  const reload = await import('../src/lib/physical-assets.js?evidence-reload');
  await reload.initializePhysicalAssets({ propertyKey: 'evidence-a', columns });
  assert.equal(reload.getPhysicalAsset(a.id).label, 'Renamed permanent support');
  assert.equal(reload.listPhysicalAssetEvidence(a.id).length, 3);
  assert.equal(reload.listPhysicalAssetEvidence(a.id).find(e => e.id === fieldNote.id).notes, fieldNote.notes);
  assert.equal(reload.getPhysicalAsset(a.id).condition, 'monitor');
  assert.equal(reload.getPhysicalAssetForSource('replacement-c12').id, a.id);
  assert.equal(sourceObjectForAsset(reload.getPhysicalAsset(a.id), [{ id: 'new-c12' }]), 'new-c12');

  const savedCount = reload.listPhysicalAssetEvidence(a.id).length;
  await assert.rejects(reload.appendPhysicalAssetEvidenceBatch([
    { assetId: a.id, evidence: source('not-saved-valid') },
    { assetId: b.id, evidence: { ...source('not-saved-invalid'), reviewedAt: '2026-02-30' } },
  ]), /Review date/);
  assert.equal(reload.listPhysicalAssetEvidence(a.id).length, savedCount, 'invalid later entry prevents earlier writes');
  blocked = true;
  await assert.rejects(reload.appendPhysicalAssetEvidenceBatch([
    { assetId: a.id, evidence: source('quota-a') }, { assetId: b.id, evidence: source('quota-b') },
  ]), /Quota/);
  assert.equal(reload.listPhysicalAssetEvidence(a.id).length, savedCount);
  assert.equal(reload.listPhysicalAssetEvidence(b.id).length, 1);
  assert.equal(reload.getPhysicalAssetsStatus().persistence, 'error');
  blocked = false;
  // An incompatible namespace occupant must be surfaced, not silently replaced.
  await reload.bindModelSource(a.id, { sourceKey: physicalAssetEvidenceSourceKey(a.id, 'occupied'), modelVersion: 'other', objectId: 'old-c12' });
  await assert.rejects(reload.appendPhysicalAssetEvidence(a.id, source('occupied')), /incompatible source/);
  await reload.initializePhysicalAssets({ propertyKey: 'evidence-b' });
  assert.deepEqual(reload.listPhysicalAssetEvidence(a.id), []);
  await assert.rejects(reload.appendPhysicalAssetEvidence(a.id, source('wrong-property')), /does not exist/);
  backing.set('otb-physical-assets:v1:evidence-corrupt', 'broken-json');
  await assert.rejects(reload.initializePhysicalAssets({ propertyKey: 'evidence-corrupt' }));
  assert.equal(backing.get('otb-physical-assets:v1:evidence-corrupt'), 'broken-json');
});
