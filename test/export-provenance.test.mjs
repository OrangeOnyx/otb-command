import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { SENSITIVE_UNIT_FIELDS } from '../tools/split-seed.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const units = JSON.parse(readFileSync(join(root, 'src/data/units.json'), 'utf8'));
const latestReview = ['2026-07-16', ...units.map(u => u.leaseEvidence?.reviewedAt).filter(Boolean)].sort().at(-1);
const monthly = Math.round(units.reduce((sum, u) => sum + u.monthly, 0) * 100) / 100;

function exportIntoScratch(t, nofin = false) {
  const scratch = mkdtempSync(join(tmpdir(), 'otb-provenance-'));
  t.after(() => {
    const target = resolve(scratch);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert.ok(basename(target).startsWith('otb-provenance-'));
    rmSync(target, { recursive: true, force: true });
  });
  execFileSync(process.execPath, [join(root, 'tools/export-package.mjs'), ...(nofin ? ['nofin'] : [])],
    { env: { ...process.env, OTB_EXPORT_DIR: scratch }, stdio: 'pipe' });
  return {
    md: readFileSync(join(scratch, nofin ? 'OTB-Property-Overview.md' : 'OTB-Property-Dossier.md'), 'utf8'),
    data: JSON.parse(readFileSync(join(scratch, nofin ? 'OTB-Property-Data-NoFinancials.json' : 'OTB-Property-Data.json'), 'utf8')),
  };
}

test('financial export preserves current review authority, exact schedule, unknown components and pending renewals', t => {
  const { md, data } = exportIntoScratch(t);
  assert.equal(data.meta.dataAsOf, latestReview);
  assert.equal(data.meta.rosterBaselineAsOf, '2026-07-16');
  assert.equal(data.derived.monthlyIncome, monthly);
  assert.match(md, /not a restatement of the July Atlas snapshot/);
  assert.doesNotMatch(md, /recoveries reconcile to in-place rent|paying tenancies/);
  assert.match(md, /Bank settlement has not been reconciled/);
  assert.equal(data.derived.incomeComposition.cam, null);
  assert.equal(data.derived.incomeComposition.tax, null);
  assert.equal(data.derived.incomeComposition.ins, null);
  assert.equal(data.derived.incomeComposition.nnnRecoveries, null);
  assert.equal(data.derived.incomeComposition.status, 'unresolved-components');
  for (const u of units.filter(u => u.leaseEvidence)) {
    assert.ok(md.includes(u.leaseEvidence.label), `${u.unit} review status`);
    for (const item of u.leaseEvidence.openItems || []) assert.ok(md.includes(item), `${u.unit} open item`);
    for (const source of u.leaseEvidence.sources || []) assert.ok(md.includes(source.reference), `${u.unit} source reference`);
  }
  assert.match(md, /Combined suites 139\/141: 2026-08-01 to 2029-07-31; \$6,150\.38\/month combined total/);
  assert.match(md, /Excluded from the current scheduled amount/);
  assert.match(md, /Owner-mapped full rent: 2027-01-01 to contractual end unresolved; \$3,035\.25\/month/);
});

test('NOFIN export omits all private unit fields and the source-review section', t => {
  const { md, data } = exportIntoScratch(t, true);
  for (const u of data.units) for (const key of SENSITIVE_UNIT_FIELDS) assert.equal(Object.hasOwn(u, key), false, `${u.unit} ${key}`);
  assert.equal(Object.hasOwn(data, 'rentComposition'), false);
  assert.equal(Object.hasOwn(data.derived, 'monthlyIncome'), false);
  assert.doesNotMatch(md, /Lease review and source authority|Owner-reported current payment|mail\.google\.com|\$6,150\.38|\$3,035\.25/);
  assert.doesNotMatch(JSON.stringify(data), /leaseEvidence|ownerReportedPayment|plannedRenewal|rentPhases|mail\.google\.com/);
});
