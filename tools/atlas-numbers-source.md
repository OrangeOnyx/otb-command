# Atlas numbers: private source publication

This report is a dated read-only publication of production Atlas records. The isolated Cypress database is not used as the financial source and receives no copied ledger rows. The report is not a live connection or a reconciliation ledger.

## Source capture

- Captured in one PostgreSQL statement on 2026-09-09 at 18:40:22.514055 UTC.
- Source project: `kbhsghodquchkgfdzckc`; organization/property filters are explicit below.
- Minimal ledger fields only: ID, suite, type/code, amount, date/due and void reference. Descriptions, contact details and entered-by identities are excluded.
- Imported payment history is captured only as per-month aggregates.
- The operating worksheet contributes an incomplete-input state, not expenses or NOI.
- Contractual rent reuses `api/_seed.json`, adopted from the July 16, 2026 owner-corrected source. SHA-256 `5fcddf0a2a1bf605f4c61d6ebc8398f22e1e7286b826976e24136f412f415662` matched the exact deployed Atlas source backup captured September 8. No new rent schedule is authored.

## Manual refresh

Run the following SELECT using an authorized read-only production connection. Save only its `snapshot` JSON to `api/_atlas-numbers-snapshot.json`. Review any new record types and source/period changes before publishing. Refresh the capture note and relevant fixture assertions; run `node --test test/atlas-numbers.test.mjs` and the normal build. Never import this publication into `ledger_entries` or enable production writes to refresh it.

```sql
select jsonb_build_object(
  'schemaVersion',1,
  'capturedAt',now(),
  'source',jsonb_build_object('application','Orange Ocean Atlas','projectRef','kbhsghodquchkgfdzckc','propertySlug','otb','propertyId','4918b2a2-2dcb-4f1d-8cb1-6ea3e5288977','method','Single read-only PostgreSQL statement; property-scoped extract'),
  'ledgerEntries',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'unit',unit,'type',type,'code',code,'amount',amount,'date',date,'due',due,'voidOf',void_of) order by date,id),'[]'::jsonb) from public.ledger_entries where org_id='4f914829-e99f-49ed-a468-9c0d6376a74b' and property_id='4918b2a2-2dcb-4f1d-8cb1-6ea3e5288977'),
  'historyPeriods',(select coalesce(jsonb_agg(row_to_json(p) order by period),'[]'::jsonb) from (select period,count(*)::integer as "recordCount",sum(amount_due) as "recordedDue",sum(amount_paid) as "recordedPaid",sum(late_fee) as "recordedLateFees",array_agg(distinct source) as sources from public.payment_history where org_id='4f914829-e99f-49ed-a468-9c0d6376a74b' and property_id='4918b2a2-2dcb-4f1d-8cb1-6ea3e5288977' group by period)p),
  'financialWorksheet',(select jsonb_build_object('state',case when exists(select 1 from jsonb_each_text(data->'opex')v where v.value::numeric<>0) then 'unverified-inputs' else 'not-entered' end,'updatedAt',updated_at,'capRateEntered',coalesce((data->>'capRatePct')::numeric,0)>0) from public.layer_settings where org_id='4f914829-e99f-49ed-a468-9c0d6376a74b' and property_id='4918b2a2-2dcb-4f1d-8cb1-6ea3e5288977' and key='financials')
) snapshot;
```

## Access and interpretation

`GET /api/atlas-numbers` requires fresh current OTB owner/operator membership through the existing caller-JWT gate. It returns `Cache-Control: private, no-store`, `Vary: Authorization` and `X-Content-Type-Options: nosniff`. Snapshot and private rent fields remain under `api/`; do not import either into a public browser bundle or allow unauthenticated downloads.

Ledger totals apply the existing append-only void semantics and group by entry date. A payment date does not establish the rent period it settled. No receipt entries is represented by `amount: null` and `state: no-entries`; it is not a statement of zero cash collected or unpaid rent. Historical paid values are source claims, with the July 2026 bulk-entry limitation retained. The report does not calculate receivables, collection rates, actual NOI or value.

