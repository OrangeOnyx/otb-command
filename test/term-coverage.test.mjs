import test from 'node:test';
import assert from 'node:assert/strict';
import { leaseTermCoverage } from '../src/lib/term-coverage.js';

const today = new Date('2026-09-10T00:00:00');
test('unknown terms suppress WALT and retain all current rent in rollover coverage', () => {
  const result = leaseTermCoverage([
    { unit: '101', monthly: 1000, end: '2027-09-10' },
    { unit: '119', monthly: 2000, end: null },
    { unit: '145', monthly: 500, end: 'invalid' },
    { unit: '131', monthly: 0, end: null },
  ], today);
  assert.equal(result.walt, null);
  assert.deepEqual(result.unknownUnits, ['119', '145']);
  assert.equal(result.unknownAnnualRent, 30000);
  assert.equal(result.coveredRentShare, 1000 / 3500);
  assert.deepEqual(result.buckets.find(row => row.label === 'Term unresolved'), { label: 'Term unresolved', n: 2, rent: 30000 });
  assert.equal(result.buckets.reduce((sum, row) => sum + row.rent, 0), 42000);
});

test('complete term coverage yields WALT without inventing holdover status', () => {
  const result = leaseTermCoverage([
    { unit: '101', monthly: 1000, end: '2027-09-10' },
    { unit: '109', monthly: 1000, end: '2025-09-10' },
  ], today);
  assert.ok(result.walt > 0.49 && result.walt < 0.51);
  assert.equal(result.coveredRentShare, 1);
  assert.equal(result.unknownAnnualRent, 0);
  assert.equal(result.buckets[0].label, 'Past recorded end');
  assert.ok(!result.buckets.some(row => row.label === 'Holdover'));
});

test('no current scheduled income leaves WALT and coverage unknown', () => {
  const result = leaseTermCoverage([{ unit: '131', monthly: 0, end: null }], today);
  assert.equal(result.walt, null);
  assert.equal(result.coveredRentShare, null);
  assert.deepEqual(result.buckets, []);
});
