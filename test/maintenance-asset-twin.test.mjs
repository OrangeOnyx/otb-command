import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import {
  COMMON_AREA_UNIT, LOCAL_MAINTENANCE_KEY, maintenanceLinkFields,
  maintenanceLocationLabel, createLocalMaintenanceStore,
} from '../src/lib/maintenance-model.js';
import { submitRequest, addMrEvent, addMrPhoto, maintenanceMode } from '../src/lib/maintenance.js';

const ASSET = 'pa_56aa18a4-17ec-4db1-9223-f7eb9a518a52';
const location = { modelId: 'otb-floorplanner', sourceKey: 'model:otb-floorplanner:column:C01', label: 'Column C01', position: { x: 3.1, y: 0, z: -4.2 }, units: 'm' };
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
};

test('permanent identity and model location remain separate from real suite/common area', () => {
  const fields = maintenanceLinkFields({ unit: COMMON_AREA_UNIT, assetId: ASSET, assetLabel: 'C01', spatialLocation: location });
  assert.equal(fields.unit, 'common-area');
  assert.equal(fields.asset_id, ASSET);
  assert.deepEqual(fields.spatial_location.position, location.position);
  assert.match(maintenanceLocationLabel(fields), /^Common area · C01/);
  assert.deepEqual(maintenanceLinkFields({ unit: '101' }), { unit: '101' });
  assert.throws(() => maintenanceLinkFields({ unit: 'C01', assetId: ASSET }), /column label is not a unit/);
  assert.throws(() => maintenanceLinkFields({ unit: 'common-area', assetId: 'C01' }), /permanent/);
  assert.throws(() => maintenanceLinkFields({ unit: '101', assetLabel: 'C01' }), /requires/);
  assert.throws(() => maintenanceLinkFields({ unit: 'common-area', spatialLocation: { position: { x: NaN, y: 0, z: 0 }, units: 'm' } }), /finite/);
  assert.throws(() => maintenanceLinkFields({ unit: 'common-area', spatialLocation: { position: { x: 1, y: 0, z: 0 } } }), /meters/);
});

test('local review survives a fresh store, appends history, and cannot mutate a prior request head', () => {
  const storage = memoryStorage();
  const store = createLocalMaintenanceStore(storage);
  const row = { id: 'mr-local', created_at: '2026-09-24T12:00:00Z', title: 'Observed issue', ...maintenanceLinkFields({ unit: 'common-area', assetId: ASSET, assetLabel: 'C01' }) };
  store.insertRequest(row);
  const before = JSON.parse(storage.getItem(LOCAL_MAINTENANCE_KEY)).requests[0];
  store.appendEvent(row.id, { kind: 'assign', vendorId: 'vendor-1' }, 'local-review');
  store.appendEvent(row.id, { kind: 'status', status: 'in_progress' }, 'local-review');
  store.appendEvent(row.id, { kind: 'note', note: 'Site review requested' }, 'local-review');
  const reloaded = createLocalMaintenanceStore(storage).list()[0];
  assert.equal(reloaded.status, 'in_progress');
  assert.equal(reloaded.vendorId, 'vendor-1');
  assert.equal(reloaded.asset_id, ASSET);
  assert.equal(reloaded.local_review, true);
  assert.equal(reloaded.events.length, 3);
  assert.deepEqual(JSON.parse(storage.getItem(LOCAL_MAINTENANCE_KEY)).requests[0], before);
  assert.throws(() => store.insertRequest({ ...row, title: 'Overwrite' }), /already exists/);
  assert.throws(() => store.appendEvent('missing', { kind: 'status', status: 'done' }), /not found/);
  assert.throws(() => store.appendEvent(row.id, { kind: 'status', status: 'fabricated' }), /Unknown maintenance status/);
});

test('corrupt or quota-blocked local storage fails without a successful-looking overwrite', () => {
  const storage = memoryStorage();
  storage.setItem(LOCAL_MAINTENANCE_KEY, '{broken');
  const store = createLocalMaintenanceStore(storage);
  assert.throws(() => store.list(), /unreadable/);
  assert.throws(() => store.insertRequest({ id: 'mr1' }), /unreadable/);
  assert.equal(storage.getItem(LOCAL_MAINTENANCE_KEY), '{broken');
  const full = createLocalMaintenanceStore({ getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } });
  assert.throws(() => full.insertRequest({ id: 'mr1' }), /Quota/);
});

test('plain offline mode cannot silently create local maintenance or upload photos', async () => {
  assert.equal(maintenanceMode(), 'unavailable');
  await assert.rejects(submitRequest({ unit: '101', title: 'No backend' }), /explicit local review/);
  await assert.rejects(addMrEvent('mr1', { kind: 'note', note: 'No backend' }), /explicit local review/);
  await assert.rejects(addMrPhoto(new Blob(['test'], { type: 'image/png' }), 'mr1'), /explicit local review/);
});

/* A minimal IDB test double retains records across separate bucket-store
   instances. Browser acceptance separately verifies actual IndexedDB reload. */
function fakeIndexedDB() {
  const databases = new Map();
  const resultRequest = compute => {
    const req = {};
    queueMicrotask(() => { try { req.result = compute(); req.onsuccess?.(); } catch (error) { req.error = error; req.onerror?.(); } });
    return req;
  };
  return { open(name) {
    const req = {};
    queueMicrotask(() => {
      const fresh = !databases.has(name);
      if (fresh) databases.set(name, new Map());
      const stores = databases.get(name);
      req.result = {
        createObjectStore(storeName) { stores.set(storeName, new Map()); return { createIndex() {} }; },
        transaction(storeName) { const data = stores.get(storeName); return { objectStore() { return {
          add: value => resultRequest(() => { if (data.has(value.id)) throw new Error('Duplicate'); data.set(value.id, structuredClone(value)); return value.id; }),
          get: id => resultRequest(() => structuredClone(data.get(id))),
          getAll: () => resultRequest(() => [...data.values()].map(value => structuredClone(value))),
          delete: id => resultRequest(() => data.delete(id)),
        }; } }; },
      };
      if (fresh) req.onupgradeneeded?.();
      req.onsuccess?.();
    });
    return req;
  } };
}

test('explicit Vite review creates linked work orders, persists workflow and request photos without a remote client', async () => {
  const priorStorage = globalThis.localStorage, priorIDB = globalThis.indexedDB;
  globalThis.localStorage = memoryStorage();
  globalThis.indexedDB = fakeIndexedDB();
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, envFile: false,
    define: { 'import.meta.env.VITE_LOCAL_REVIEW': '"1"' },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const remote = await server.ssrLoadModule('/src/lib/remote.js');
    const maint = await server.ssrLoadModule('/src/lib/maintenance.js');
    const assets = await server.ssrLoadModule('/src/lib/physical-assets.js');
    assert.equal(remote.LOCAL_REVIEW, true);
    assert.equal(remote.REMOTE, false);
    assert.equal(remote.sb, null);
    await assets.initializePhysicalAssets({ columns: [{ id: 'C01', label: 'C01' }] });
    const asset = assets.getPhysicalAssetForSource('model:otb-floorplanner:column:C01');
    assert.ok(asset?.id);
    await assert.rejects(maint.submitRequest({ unit: '101', title: 'Wrong suite', assetId: asset.id }, 'local-review'), /common-area/);
    const id = await maint.submitRequest({ unit: 'common-area', title: 'User-reported issue', assetId: asset.id, spatialLocation: location }, 'local-review');
    await maint.addMrEvent(id, { kind: 'assign', vendorId: 'service-vendor' }, 'local-review');
    await maint.addMrEvent(id, { kind: 'status', status: 'in_progress' }, 'local-review');
    await maint.addMrEvent(id, { kind: 'note', note: 'Review note' }, 'local-review');
    const req = (await maint.refreshMaint()).find(r => r.id === id);
    assert.equal(req.asset_id, asset.id);
    assert.equal(req.asset_label, 'C01');
    assert.equal(req.status, 'in_progress');
    assert.equal(req.vendorId, 'service-vendor');
    assert.equal(req.events.length, 3);
    assert.equal(createLocalMaintenanceStore(globalThis.localStorage).list()[0].id, id);
    const photo = new File(['image-bytes'], 'observation.png', { type: 'image/png' });
    const path = await maint.addMrPhoto(photo, id);
    assert.equal((await maint.listMrPhotos(id)).length, 1);
    assert.equal((await maint.listMrPhotos('other-request')).length, 0);
    const bucket = await server.ssrLoadModule('/src/lib/bucketstore.js');
    const reloadedPhotos = bucket.createBucketStore({ bucket: 'maintenance-photos', local: { db: 'otb-maintenance-photos-local-review-v1', store: 'photos' } });
    assert.equal((await reloadedPhotos.list(id))[0].path, path);
    const url = await maint.mrPhotoURL(path);
    assert.equal(await (await fetch(url)).text(), 'image-bytes');
    URL.revokeObjectURL(url);
    await assert.rejects(maint.addMrPhoto(photo, 'missing'), /not found/);
    await assert.rejects(maint.addMrPhoto(new File(['x'], 'x.html', { type: 'text/html' }), id), /image/);
    await assert.rejects(maint.upsertTenantContact('test@example.invalid', '101'), /hosted backend/);
    const saved = await assets.savePhysicalAsset({ id: asset.id, status: 'retired' });
    assert.equal(saved.status, 'retired');
    await assert.rejects(maint.submitRequest({ unit: 'common-area', title: 'Retired asset', assetId: asset.id }, 'local-review'), /active physical asset/);
  } finally {
    await server.close();
    if (priorStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = priorStorage;
    if (priorIDB === undefined) delete globalThis.indexedDB; else globalThis.indexedDB = priorIDB;
  }
});

test('prepared migration scopes asset identity and excludes common-area tenant writes without adding head mutations', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260924121000_maintenance_asset_links.sql', import.meta.url), 'utf8');
  assert.match(sql, /foreign key \(asset_id, org_id, property_id\)\s+references public\.physical_assets\(id, org_id, property_id\)/);
  assert.match(sql, /asset_id is null and asset_label is null and spatial_location is null/);
  assert.match(sql, /unit <> 'common-area'/);
  assert.match(sql, /a\.status <> 'active'/);
  assert.doesNotMatch(sql, /create policy[^;]+for (update|delete)/i);
});
