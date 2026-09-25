import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { cleanPhysicalAsset } from '../src/lib/physical-assets-model.js';

test('hosted evidence preserves scope, candidate gates, failed-write honesty and session isolation', async () => {
  const asset = cleanPhysicalAsset({ type: 'column', label: 'C12' });
  const ctx = { org_id: 'test-org', property_id: 'test-property', slug: 'otb' };
  const tables = { physical_assets: [{ ...asset, ...ctx }], physical_asset_bindings: [], physical_asset_inspections: [], physical_asset_photos: [] };
  let insertCount = 0, browserWrites = 0, rejectWrite = false, authCallback, holdWrite, enterWrite;
  const readScopes = [];
  const priorStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: () => { browserWrites++; throw new Error('Unexpected browser fallback'); } };
  globalThis.__otbEvidenceRemoteTest = {
    ctx,
    sb: {
      auth: { onAuthStateChange(fn) { authCallback = fn; }, getUser: async () => ({ data: { user: { email: 'operator@example.invalid' } } }) },
      from(table) {
        return {
          select: () => ({ eq: async (column, value) => {
            readScopes.push([table, column, value]); return { data: structuredClone(tables[table]), error: null };
          } }),
          insert: row => ({ select: () => ({ single: async () => {
            insertCount++; enterWrite?.();
            if (holdWrite) await holdWrite;
            if (rejectWrite) return { data: null, error: new Error('Hosted permission denied') };
            const saved = { ...structuredClone(row), created_at: '2026-09-25T18:00:00Z' };
            tables[table].push(saved); return { data: saved, error: null };
          } }) }),
        };
      },
    },
  };
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, envFile: false,
    plugins: [{ name: 'test-hosted-evidence-boundary', enforce: 'pre', load(id) {
      if (id.replaceAll('\\', '/').endsWith('/src/lib/remote.js')) return `
        export const REMOTE = true;
        export const LOCAL_REVIEW = false;
        export const sb = globalThis.__otbEvidenceRemoteTest.sb;
        export const propertyContext = async () => globalThis.__otbEvidenceRemoteTest.ctx;
      `;
    } }],
    server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
  });
  const source = id => ({ id, title: 'Site context', kind: 'source', url: 'https://earth.google.com/web/', reviewedAt: '2026-09-25' });
  try {
    const lib = await server.ssrLoadModule('/src/lib/physical-assets.js');
    await lib.initializePhysicalAssets({ propertyKey: 'otb', columns: [{ id: 'candidate-c13', label: 'C13' }] });
    assert.equal(readScopes.length, 4);
    assert.ok(readScopes.every(([, column, value]) => column === 'property_id' && value === ctx.property_id));
    const candidate = lib.getPhysicalAssetForModelObject('candidate-c13');
    assert.equal(candidate.persisted, false);
    await assert.rejects(lib.appendPhysicalAssetEvidence(candidate.id, source('candidate-ref')), /Save the physical asset/);
    await assert.rejects(lib.appendPhysicalAssetEvidenceBatch([
      { assetId: asset.id, evidence: source('batch-before-candidate') }, { assetId: candidate.id, evidence: source('candidate-ref') },
    ]), /Save the physical asset/);
    assert.equal(insertCount, 0, 'all gates are checked before a batch begins');
    const [first, second] = await Promise.all([
      lib.appendPhysicalAssetEvidence(asset.id, source('site-ref')), lib.appendPhysicalAssetEvidence(asset.id, source('site-ref')),
    ]);
    assert.equal(insertCount, 1); assert.equal(first.binding_id, second.binding_id);
    const binding = tables.physical_asset_bindings[0];
    assert.equal(binding.org_id, ctx.org_id); assert.equal(binding.property_id, ctx.property_id);
    assert.equal(binding.asset_id, asset.id); assert.equal(binding.object_id, '');
    assert.equal(binding.model_id, 'otb-evidence'); assert.equal(binding.metadata.evidence.status, 'reference');
    assert.equal(first.created_at, '2026-09-25T18:00:00Z');
    assert.equal(lib.getPhysicalAssetsStatus().persistence, 'remote');
    assert.equal(lib.getPhysicalAsset(asset.id).verification, 'unverified');
    assert.equal(lib.getPhysicalAsset(asset.id).condition, 'uninspected');
    rejectWrite = true;
    await assert.rejects(lib.appendPhysicalAssetEvidence(asset.id, source('write-denied')), /permission denied/);
    assert.equal(lib.listPhysicalAssetEvidence(asset.id).length, 1);
    assert.equal(lib.getPhysicalAssetsStatus().persistence, 'error');
    assert.equal(browserWrites, 0);
    rejectWrite = false;
    let releaseWrite;
    holdWrite = new Promise(resolve => { releaseWrite = resolve; });
    const entered = new Promise(resolve => { enterWrite = resolve; });
    const pending = lib.appendPhysicalAssetEvidence(asset.id, source('session-ended'));
    await entered;
    authCallback('SIGNED_OUT'); releaseWrite();
    await assert.rejects(pending, /session ended/);
    assert.equal(lib.getPhysicalAsset(asset.id), null);
    assert.deepEqual(lib.listPhysicalAssetEvidence(asset.id), []);
    assert.equal(lib.getPhysicalAssetsStatus().loaded, false);
    assert.equal(browserWrites, 0, 'hosted failure never writes browser fallback records');
  } finally {
    await server.close(); delete globalThis.__otbEvidenceRemoteTest;
    if (priorStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = priorStorage;
  }
});
