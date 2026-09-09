import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAtlasNumbers, ATLAS_SOURCE } from '../api/_atlas-numbers.mjs';
import { createAtlasNumbersHandler } from '../api/atlas-numbers.js';
import { requireBundledPropertyAccess } from '../api/_seed-auth.mjs';

const snapshot = JSON.parse(await readFile(new URL('../api/_atlas-numbers-snapshot.json', import.meta.url), 'utf8'));
const seed = JSON.parse(await readFile(new URL('../api/_seed.json', import.meta.url), 'utf8'));
const gate = { user: { id: 'test-owner' }, property: { id: 'test-property', org_id: 'test-org', slug: 'otb' }, role: 'owner' };
function response() {
  return { headers: {}, statusCode: null, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function fixture() {
  return { schemaVersion: 1, capturedAt: '2026-09-09T18:40:22Z', source: { ...ATLAS_SOURCE }, ledgerEntries: [], historyPeriods: [], financialWorksheet: { state: 'not-entered' } };
}
const charge = (id, amount = 10, overrides = {}) => ({ id, unit: '101', type: 'charge', code: 'rent', amount, date: '2026-08-01', due: '2026-08-01', voidOf: null, ...overrides });

test('captured Atlas report distinguishes contractual rent, dated entries, historical claims and unknown actuals', () => {
  const report = buildAtlasNumbers(snapshot, seed.unitsPrivate);
  assert.equal(report.mode, 'dated-production-extract');
  assert.equal(report.capturedAt, snapshot.capturedAt);
  assert.equal(report.scheduled.asOf, '2026-07-16');
  assert.equal(report.scheduled.monthly, 90291.23);
  assert.equal(report.scheduled.annualized, 1083494.76);
  assert.equal(report.scheduled.unitCount, 27);
  assert.equal(report.scheduled.rentPayingUnitCount, 24);
  assert.equal(report.scheduled.units['101'].monthly, 11085.81);
  assert.match(report.scheduled.units['101'].allocationNote, /not separately billable/);
  assert.deepEqual(report.periods.map(period => [period.period, period.charges.count, period.charges.amount]), [['2026-08', 24, 90291.23], ['2026-09', 24, 90291.23]]);
  assert.equal(report.periods[0].payments.amount, 3808.39);
  assert.equal(report.periods[0].payments.count, 1);
  assert.equal(report.periods[0].units['109'].payments.amount, 3808.39);
  assert.equal(report.periods[1].payments.amount, null);
  assert.equal(report.periods[1].payments.state, 'no-entries');
  assert.equal(report.historical.recordCount, 313);
  assert.equal(report.historical.recordedPaid, 1133492.2);
  assert.equal(report.expenses.state, 'not-entered');
  assert.equal(report.expenses.noi, null);
  assert.equal(report.expenses.actualExpenses, null);
  assert.equal(report.expenses.value, null);
  assert.ok(report.caveats.some(text => /no entries does not mean zero collections/.test(text)));
  const sources = new Set(report.sources.map(source => source.id));
  for (const part of [report.scheduled, report.historical, report.expenses, ...report.periods]) assert.ok(sources.has(part.sourceId));
});

test('aggregation applies existing void semantics across periods and sums cents without assuming rent allocation', () => {
  const sample = fixture();
  sample.ledgerEntries = [charge('old', 50), charge('fraction-a', 0.1), charge('fraction-b', 0.2), charge('receipt', 2, { type: 'payment', date: '2026-09-02', due: null }), charge('void', 0, { type: 'void', voidOf: 'old', date: '2026-09-03', due: null })];
  const report = buildAtlasNumbers(sample, { '101': { monthly: 10 }, '103': { monthly: 0 } });
  assert.equal(report.periods[0].charges.amount, 0.3);
  assert.equal(report.periods[0].charges.count, 2);
  assert.equal(report.periods[0].payments.amount, null);
  assert.equal(report.periods[1].payments.amount, 2);
  assert.equal(report.periods[1].charges.amount, null);
  assert.equal(report.periods[1].dateBasis, 'entry-date');
  assert.equal(report.periods[1].units['103'].payments.count, 0);
  assert.equal(report.periods[1].units['103'].payments.amount, null);
  assert.ok(!('balance' in report.periods[1]));
});

test('publication fails closed on wrong property, malformed dates, duplicate entries and invalid money', () => {
  for (const mutate of [
    data => { data.source.propertyId = 'other-property'; },
    data => { data.source.projectRef = 'other-project'; },
    data => { data.capturedAt = 'not-a-date'; },
    data => { data.ledgerEntries = [charge('bad', -1)]; },
    data => { data.ledgerEntries = [charge('bad', NaN)]; },
    data => { data.ledgerEntries = [charge('bad', 0.001)]; },
    data => { data.ledgerEntries = [charge('bad', 2, { date: '2026-02-30' })]; },
    data => { data.ledgerEntries = [charge('same'), charge('same')]; },
    data => { data.ledgerEntries = [charge('bad', 2, { unit: '999' })]; },
  ]) {
    const data = fixture(); mutate(data);
    assert.throws(() => buildAtlasNumbers(data, { '101': { monthly: 10 } }), /invalid or unavailable/);
  }
});

test('publication excludes notes, contacts, raw rows and markup; hostile suite identifiers are rejected', () => {
  const data = fixture();
  data.ledgerEntries = [charge('safe', 10, { description: '<img src=x onerror=alert(1)>', entered_by: 'private@example.com' })];
  const report = buildAtlasNumbers(data, { '101': { monthly: 10, notes: '<script>alert(1)</script>', legal: 'private entity', email: 'private@example.com' } });
  const encoded = JSON.stringify(report);
  for (const omitted of ['<script', '<img', 'private@example.com', 'private entity', 'ledgerEntries', 'entered_by']) assert.ok(!encoded.includes(omitted), omitted);
  assert.throws(() => buildAtlasNumbers(data, { '<svg onload=alert(1)>': { monthly: 10 } }), /invalid/);
  assert.throws(() => buildAtlasNumbers({ ...data, ledgerEntries: [charge('<img>', 10)] }, { '101': { monthly: 10 } }), /invalid/);
});

test('endpoint checks authorization for every request and marks every response private and uncacheable', async () => {
  let readCount = 0, buildCount = 0;
  const handler = createAtlasNumbersHandler({ authorize: async () => { readCount++; return gate; }, build: () => { buildCount++; return { scheduled: { monthly: 10 } }; } });
  for (let i = 0; i < 2; i++) {
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer test' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
    assert.equal(res.headers.Vary, 'Authorization');
    assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
    assert.deepEqual(res.body.accessScope, { userId: 'test-owner', orgId: 'test-org', propertyId: 'test-property', role: 'owner' });
  }
  assert.equal(readCount, 2);
  assert.equal(buildCount, 2);
});

test('endpoint returns 405, 401, 403 and 503 without constructing or leaking a private report', async () => {
  for (const [method, authorization, expected] of [
    ['POST', gate, 405], ['GET', { error: 'sign in required', status: 401 }, 401],
    ['GET', { ...gate, role: 'pending' }, 403], ['GET', { ...gate, property: { ...gate.property, slug: 'other' } }, 403],
    ['GET', { error: 'membership verification unavailable', status: 503 }, 503],
  ]) {
    let built = false;
    const handler = createAtlasNumbersHandler({ authorize: async () => authorization, build: () => { built = true; return { private: 12345 }; } });
    const res = response(); await handler({ method, headers: {} }, res);
    assert.equal(res.statusCode, expected);
    assert.equal(built, false);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
    assert.ok(!JSON.stringify(res.body).includes('12345'));
  }
  for (const dependencies of [{ authorize: async () => { throw new Error('secret upstream token'); } }, { authorize: async () => gate, build: () => { throw new Error('private malformed financial input'); } }]) {
    const res = response(); await createAtlasNumbersHandler(dependencies)({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'Atlas source extract is currently unavailable.');
  }
});

test('actual membership gate rejects another property or tenant before report construction', async () => {
  for (const membership of [{ property_id: 'other-property', role: 'owner' }, { property_id: 'test-property', role: 'tenant' }, { property_id: 'test-property', role: 'operator' }]) {
    const calls = [];
    const authorize = req => requireBundledPropertyAccess(req, { ready: () => true, read: async (path, token) => {
      calls.push(token);
      if (path === '/auth/v1/user') return gate.user;
      if (path.startsWith('/rest/v1/orgs?')) return [{ id: gate.property.org_id }];
      if (path.startsWith('/rest/v1/properties?')) return [gate.property];
      return [{ user_id: gate.user.id, org_id: gate.property.org_id, ...membership }];
    } });
    let built = false;
    const res = response();
    await createAtlasNumbersHandler({ authorize, build: () => { built = true; return {}; } })({ method: 'GET', headers: { authorization: 'Bearer scoped-caller' } }, res);
    const allowed = membership.property_id === 'test-property' && membership.role === 'operator';
    assert.equal(res.statusCode, allowed ? 200 : 403);
    assert.equal(built, allowed);
    assert.deepEqual(calls, ['scoped-caller', 'scoped-caller', 'scoped-caller', 'scoped-caller']);
  }
});
