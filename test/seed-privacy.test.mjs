import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNITS, byUnit, configureStoreScope, getRecoveries, installRecoveriesPrivate, installUnitsPrivate, exportJSON, subscribe } from '../src/store.js';
import { splitUnits, deriveSeed } from '../tools/split-seed.mjs';

// Execute the real hydration module against the real store. Stub only its
// browser UI sinks and Supabase singleton; loadSeed receives a test transport.
let seedSource = readFileSync(new URL('../src/lib/seed.js', import.meta.url), 'utf8');
seedSource = seedSource
  .replace('import { sb } from "./remote.js";', 'const sb = null;')
  .replace('from "../store.js"', `from ${JSON.stringify(new URL('../src/store.js', import.meta.url).href)}`)
  .replace('from "./state-storage.js"', `from ${JSON.stringify(new URL('../src/lib/state-storage.js', import.meta.url).href)}`)
  .replace(/import \{ (installDirectorySeed|installVendors|installMaintVendors|installAccessVendors) \} from "[^"]+";/g, 'const $1 = () => {};');
const { applySeed, loadSeed } = await import('data:text/javascript;base64,' + Buffer.from(seedSource).toString('base64'));

const scope = { mode: 'authenticated', userId: 'user-a', orgId: 'org-a', propertyId: 'property-a' };
const storage = { getItem: () => null, setItem() {} };
const setScope = value => configureStoreScope(value, { storage });
const recoveries = () => ({ camFlatPsf: 2, units: Object.fromEntries(UNITS.map(u => [u.unit, { cam: 2, tax: 1, ins: 1, base: 10, total: 14 }])) });
const payload = () => ({ recoveries: recoveries(), unitsPrivate: { 101: { monthly: 1234.56, leaseEvidence: { status: 'owner-confirmed', sources: [{ note: 'private source' }] } } } });
const client = userId => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'test-token', user: { id: userId } } } }) } });

test('split keeps lease evidence private and derives recovery economics only into private seed', () => {
  const unit = { unit: '101', dba: 'Public name', monthly: 1234.56, leaseEvidence: { note: 'private source' } };
  const split = splitUnits([unit]);
  assert.deepEqual(split.publicUnits, [{ unit: '101', dba: 'Public name' }]);
  assert.deepEqual(split.unitsPrivate['101'].leaseEvidence, unit.leaseEvidence);
  assert.ok(deriveSeed().seed.recoveries.units['101']);
  for (const file of ['src/views/rentroll.js', 'src/views/financial.js', 'src/lib/leaseUI.js']) {
    assert.doesNotMatch(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /import\s+[^;]*data\/recoveries\.json/, file);
  }
});

test('local or signed-out scopes cannot install private rents, evidence or recoveries', () => {
  for (const value of [null, { mode: 'local-review', propertyId: 'otb' }, { mode: 'offline', propertyId: 'otb' }]) {
    setScope(value);
    applySeed(payload());
    installUnitsPrivate(payload().unitsPrivate);
    assert.equal(installRecoveriesPrivate(recoveries()), false);
    assert.equal(getRecoveries(), null);
    assert.equal(byUnit['101'].monthly, undefined);
    assert.equal(byUnit['101'].leaseEvidence, undefined);
  }
});

test('scope reset erases held recovery and nested lease-evidence references without mutating source payload', () => {
  setScope(scope);
  const source = payload();
  applySeed(source);
  const record = getRecoveries(), row = record.units['101'];
  const evidence = byUnit['101'].leaseEvidence, nested = evidence.sources[0];
  assert.equal(row.cam, 2);
  assert.equal(byUnit['101'].monthly, 1234.56);
  assert.doesNotMatch(exportJSON(), /private source|1234\.56|camFlatPsf/);
  setScope(null);
  assert.equal(getRecoveries(), null);
  assert.deepEqual(record.units, {});
  assert.deepEqual(row, {});
  assert.deepEqual(evidence, {});
  assert.deepEqual(nested, {});
  assert.equal(source.recoveries.units['101'].cam, 2);
  assert.equal(source.unitsPrivate['101'].leaseEvidence.sources[0].note, 'private source');
});

test('invalid recoveries clear prior values; explicit unknowns remain unknown', () => {
  setScope(scope);
  assert.equal(installRecoveriesPrivate(recoveries()), true);
  const incomplete = recoveries(); delete incomplete.units['101'];
  assert.equal(installRecoveriesPrivate(incomplete), false);
  assert.equal(getRecoveries(), null);
  const negative = recoveries(); negative.units['101'].tax = -1;
  assert.equal(installRecoveriesPrivate(negative), false);
  const unknown = recoveries(); unknown.units['101'].tax = null;
  assert.equal(installRecoveriesPrivate(unknown), true);
  assert.equal(getRecoveries().units['101'].tax, null);
  setScope(null);
});

test('matching authenticated response hydrates after session check', async () => {
  setScope(scope);
  let headers;
  await loadSeed({ client: client(scope.userId), fetcher: async (url, options) => {
    assert.equal(url, '/api/seed'); headers = options.headers;
    return { ok: true, json: async () => payload() };
  } });
  assert.equal(headers.Authorization, 'Bearer test-token');
  assert.equal(byUnit['101'].monthly, 1234.56);
  assert.equal(getRecoveries().units['101'].cam, 2);
  setScope(null);
});

test('seed and scope events expose complete hydration or complete clearing', () => {
  setScope(scope);
  const observed = [];
  const unsubscribe = subscribe(type => {
    if (type === 'seed' || type === 'scope') observed.push({ type, monthly: byUnit['101'].monthly, cam: getRecoveries()?.units['101']?.cam });
  });
  try { applySeed(payload()); setScope(null); }
  finally { unsubscribe(); }
  assert.deepEqual(observed, [
    { type: 'seed', monthly: 1234.56, cam: 2 },
    { type: 'scope', monthly: undefined, cam: undefined },
  ]);
});

test('account mismatch is rejected before fetching any private data', async () => {
  setScope(scope);
  await loadSeed({ client: client('user-b'), fetcher: () => { throw new Error('must not fetch'); } });
  assert.equal(byUnit['101'].monthly, undefined);
  assert.equal(getRecoveries(), null);
  setScope(null);
});

test('responses completing after property changes, sign-out or same-account re-entry are discarded', async () => {
  for (const change of [
    () => setScope({ ...scope, propertyId: 'property-b' }),
    () => setScope(null),
    () => { setScope(null); setScope(scope); },
  ]) {
    setScope(scope);
    let resolvePayload;
    const pendingPayload = new Promise(resolve => { resolvePayload = resolve; });
    let decoding;
    const started = new Promise(resolve => { decoding = resolve; });
    const pending = loadSeed({ client: client(scope.userId), fetcher: async () => ({ ok: true, json: () => { decoding(); return pendingPayload; } }) });
    await started;
    change();
    resolvePayload(payload());
    await pending;
    assert.equal(byUnit['101'].monthly, undefined);
    assert.equal(getRecoveries(), null);
  }
  setScope(null);
});
