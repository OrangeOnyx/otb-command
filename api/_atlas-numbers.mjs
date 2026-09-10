/* Private, immutable publication of a dated Atlas extract. This module never
   reads/writes a database or treats the extract as a second ledger. */
import { effectiveEntries } from '../src/lib/ledger.js';

export const ATLAS_SOURCE = Object.freeze({
  projectRef: 'kbhsghodquchkgfdzckc',
  propertyId: '4918b2a2-2dcb-4f1d-8cb1-6ea3e5288977',
  propertySlug: 'otb',
});
const SOURCE_IDS = Object.freeze({ scheduled: 'current-lease-schedule', ledger: 'atlas-ledger', history: 'atlas-payment-history', expenses: 'atlas-expenses' });
const ALLOCATIONS = Object.freeze({ '101': '101/103', '103': '101/103', '115': '115/117', '117': '115/117', '125': '125/127', '127': '125/127', '139': '139/141', '141': '139/141' });
const UNIT = /^\d{3}(?:\.5|[AB])?$/;
const TYPES = new Set(['charge', 'payment', 'void', 'late_fee', 'nsf', 'adjustment', 'credit', 'write_off']);
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const validPeriod = value => typeof value === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
const fail = () => { throw new Error('Atlas source extract is invalid or unavailable.'); };
function cents(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) fail();
  return Math.round(value * 100);
}
const total = values => values.reduce((sum, value) => {
  const next = sum + cents(value);
  if (!Number.isSafeInteger(next)) fail();
  return next;
}, 0) / 100;
function entryTotal(rows) {
  return { amount: rows.length ? total(rows.map(row => row.amount)) : null, count: rows.length, state: rows.length ? 'recorded' : 'no-entries', sourceId: SOURCE_IDS.ledger };
}

export function buildAtlasNumbers(snapshot, unitsPrivate) {
  if (snapshot?.schemaVersion !== 1 || !snapshot.source ||
      Object.entries(ATLAS_SOURCE).some(([key, value]) => snapshot.source[key] !== value) ||
      typeof snapshot.capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(snapshot.capturedAt) ||
      !Number.isFinite(Date.parse(snapshot.capturedAt)) || !Array.isArray(snapshot.ledgerEntries) || !Array.isArray(snapshot.historyPeriods) ||
      !unitsPrivate || typeof unitsPrivate !== 'object') fail();

  const units = {};
  const reviewDates = Object.values(unitsPrivate).map(row => row?.leaseEvidence?.reviewedAt).filter(Boolean);
  if (reviewDates.some(day => !validDay(day))) fail();
  const scheduleAsOf = reviewDates.sort().at(-1) || '2026-07-16';
  for (const [unit, row] of Object.entries(unitsPrivate)) {
    if (!UNIT.test(unit) || !row || typeof row !== 'object') fail();
    const monthly = cents(row.monthly) / 100;
    units[unit] = {
      monthly, annualized: cents(monthly) * 12 / 100,
      sourceId: row.leaseEvidence ? `lease-review-${unit}` : SOURCE_IDS.scheduled,
      ...(row.leaseEvidence ? { leaseEvidence: structuredClone(row.leaseEvidence) } : {}),
      allocationNote: ALLOCATIONS[unit] ? `Reporting allocation within the combined ${ALLOCATIONS[unit]} lease; not separately billable.` : null,
    };
  }
  if (!Object.keys(units).length) fail();

  const ids = new Set();
  for (const row of snapshot.ledgerEntries) {
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 200 || /[<>\u0000-\u001f]/.test(row.id) || ids.has(row.id) ||
        !UNIT.test(row.unit) || !Object.hasOwn(units, row.unit) || !TYPES.has(row.type) || !validDay(row.date) ||
        (row.due !== null && row.due !== undefined && !validDay(row.due)) ||
        (row.voidOf !== null && row.voidOf !== undefined && (typeof row.voidOf !== 'string' || row.voidOf.length > 200 || /[<>\u0000-\u001f]/.test(row.voidOf)))) fail();
    cents(row.amount);
    ids.add(row.id);
  }
  // Use the application's append-only void semantics before period aggregation.
  const effective = effectiveEntries(snapshot.ledgerEntries);
  const periods = [...new Set(snapshot.ledgerEntries.map(row => row.date.slice(0, 7)))].sort().map(period => {
    const rows = effective.filter(row => row.date.startsWith(period));
    const grouped = {};
    for (const unit of Object.keys(units)) {
      const matched = rows.filter(row => row.unit === unit);
      grouped[unit] = { charges: entryTotal(matched.filter(row => row.type === 'charge')), payments: entryTotal(matched.filter(row => row.type === 'payment')) };
    }
    return {
      period, sourceId: SOURCE_IDS.ledger, dateBasis: 'entry-date',
      charges: entryTotal(rows.filter(row => row.type === 'charge')),
      payments: entryTotal(rows.filter(row => row.type === 'payment')),
      otherEntryCount: rows.filter(row => !['charge', 'payment'].includes(row.type)).length,
      units: grouped,
    };
  });

  const historyPeriods = snapshot.historyPeriods.map(row => {
    if (!validPeriod(row.period) || !Number.isSafeInteger(row.recordCount) || row.recordCount < 0 || !Array.isArray(row.sources) || row.sources.some(source => source !== 'ac')) fail();
    return {
      period: row.period, recordCount: row.recordCount,
      recordedDue: cents(row.recordedDue) / 100,
      recordedPaid: cents(row.recordedPaid) / 100,
      recordedLateFees: cents(row.recordedLateFees) / 100,
      sourceId: SOURCE_IDS.history,
    };
  }).sort((a, b) => a.period.localeCompare(b.period));
  if (new Set(historyPeriods.map(row => row.period)).size !== historyPeriods.length) fail();
  const monthly = total(Object.values(units).map(row => row.monthly));
  const expensesState = snapshot.financialWorksheet?.state === 'not-entered' ? 'not-entered' : 'unverified-inputs';
  const sources = [
    {
      id: SOURCE_IDS.scheduled, title: 'Cypress lease schedule · reviewed records', asOf: scheduleAsOf,
      path: 'src/data/units.json → authenticated api/_seed.json; per-suite leaseEvidence; docs/sot-2026-07/',
      kind: 'Owner-adopted roster with dated lease review updates',
      excerpt: `Schedule reviewed through ${scheduleAsOf}: $${monthly.toFixed(2)} per month. This carries forward the owner-adopted July roster with explicitly sourced corrections and owner confirmations. It is separate from the unchanged dated Atlas ledger extract. Unreviewed amounts retain July roster authority. Proposed or tenant-signed renewals are excluded until activated; the schedule includes the owner-confirmed current abatement for suite 145. Annualized rent multiplies this dated monthly snapshot by 12 and is not a forecast of stepped rent. Current-term conflicts and component gaps remain visible in each suite review. Owner-reported payments are not bank-reconciled receipts. Combined-suite figures are reporting allocations, not separately billable amounts.`,
    },
    {
      id: SOURCE_IDS.ledger, title: 'Atlas ledger · dated production extract', asOf: snapshot.capturedAt,
      path: 'Atlas public.ledger_entries → api/_atlas-numbers-snapshot.json',
      excerpt: `Read-only extraction of ${snapshot.ledgerEntries.length} OTB ledger entries from the production Atlas database at ${snapshot.capturedAt}. Entry IDs, suite, type, amount, date and void references were captured in one database statement. Totals apply the existing void rules and group by entry date; payment dates do not prove allocation to that month's rent. This is a saved extract, not a live connection. No bank settlement records were supplied. No recorded payment entries does not establish zero collections, unpaid rent or arrears.`,
    },
    {
      id: SOURCE_IDS.history, title: 'Asset Command payment history · recorded amounts', asOf: snapshot.capturedAt,
      path: 'Atlas public.payment_history; docs/superpowers/specs/2026-08-29-ac-harvest.md',
      excerpt: `Per-period aggregates read from Atlas at ${snapshot.capturedAt}; source field ac. The imported record covers July 2025 through July 2026. July 2026 was bulk-entered with a uniform timestamp and no payment method, and its amounts diverge from the adopted roll. Recorded paid amounts and statuses are historical source claims, not newly reconciled bank receipts. Do not derive actual payment dates or lateness from the July paid_at values.`,
    },
    {
      id: SOURCE_IDS.expenses, title: 'Atlas operating-expense worksheet · incomplete', asOf: snapshot.capturedAt,
      path: 'Atlas public.layer_settings, key financials',
      excerpt: expensesState === 'not-entered'
        ? 'The saved worksheet contains zero/default operating-expense values and does not establish zero actual expense. A dated P&L, verified expenses and bank reconciliation were not supplied. Actual NOI, valuation and full receivables are unavailable.'
        : 'The saved operating worksheet has unverified inputs, without an accounting period or source reconciliation. Actual expenses, NOI, valuation and full receivables are unavailable.',
    },
  ];
  for (const [unit, row] of Object.entries(units)) {
    if (!row.leaseEvidence) continue;
    sources.push({id: row.sourceId, title: `Suite ${unit} · lease review`, asOf: row.leaseEvidence.reviewedAt,
      kind: row.leaseEvidence.label, path: row.leaseEvidence.sources.map(source => source.reference).join('\n'),
      excerpt: JSON.stringify(row.leaseEvidence, null, 2)});
  }
  return {
    schemaVersion: 1, mode: 'dated-production-extract', capturedAt: snapshot.capturedAt,
    sourceLabel: 'Orange Ocean Atlas · dated production extract', refreshMode: 'manual-reviewed-extract',
    caveats: [
      'This is a dated read-only extract from production Atlas, distinct from the isolated Cypress test database. It does not refresh automatically.',
      `Rent schedule reviewed through ${scheduleAsOf}; unchanged suites retain July roster authority. This schedule is separate from the dated Atlas entries and is not collected income. Proposed renewals are not included.`,
      'Annualized rent is twelve times the dated monthly snapshot, not a forward forecast; suite 145 has a separately recorded next rent phase.',
      'Ledger totals group records by entry date, not reconciled rent period. Receipt completeness and bank settlement are unverified; no entries does not mean zero collections or delinquency.',
      'Combined-suite monthly amounts are reporting allocations, not separate bills.',
      'Actual operating expenses, NOI, valuation and complete receivables are unavailable.',
    ],
    scheduled: { asOf: scheduleAsOf, basis: 'reviewed-lease-schedule', monthly, annualized: cents(monthly) * 12 / 100, unitCount: Object.keys(units).length, rentPayingUnitCount: Object.values(units).filter(row => row.monthly > 0).length, sourceId: SOURCE_IDS.scheduled, units },
    periods,
    historical: { from: historyPeriods[0]?.period || null, to: historyPeriods.at(-1)?.period || null, recordCount: historyPeriods.reduce((sum, row) => sum + row.recordCount, 0), recordedPaid: total(historyPeriods.map(row => row.recordedPaid)), sourceId: SOURCE_IDS.history, periods: historyPeriods },
    expenses: { state: expensesState, noi: null, actualExpenses: null, value: null, sourceId: SOURCE_IDS.expenses },
    sources,
  };
}
