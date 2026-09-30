# Wave 42 — OTB Master Workbook ↔ Live DB Reconciliation Report

**Property:** On The Boulevard (`ONTHEBLVD`, id `cmr9zg0cd0001w6p0keus23bx`)
**Source of truth:** `OTB-Master-Template-with-HVAC-and-Vendors-and-Logos.xlsx` (mirrored by `data/source-of-truth/*.csv`)
**Date:** 2026-07-08
**Author:** Adam Abdalla

## Summary

The live database had drifted materially from the OTB master workbook. Legacy demo-era units (rounded GLA, hyphenated/incorrect suite labels) and a stale lease set were present, and the `lease_units` reporting-allocation junction was completely empty. This wave reconciled the live DB back to the workbook as the single source of truth, with **zero remaining drift**.

## Drift found (before)

| Entity | Live (before) | Workbook (SOT) | Drift |
|---|---|---|---|
| Active units | 21 | 27 | 6 physical units missing; wrong labels (`115-117`, `117 1/2`, `119 1/2`, `135`) and rounded demo GLA (1200/2400/4800) |
| Unit GLA total | 62,810 (property field) but unit sum wrong | 62,810 | Property `totalGla` already correct; per-unit GLA was demo-rounded |
| Active leases | 14 (8 active) | 20 active | Stale lease set, wrong economics |
| `lease_units` (allocation junction) | 0 | 24 | Junction entirely empty — no reporting allocations existed |
| Active tenants | 12 | 20 | 8 tenants missing/inactive |
| Vacant units | not modeled | 2 (131, 133) | — |
| Owner-occupied | not flagged | 1 (135B, Belle Realty) | `isOwnerOccupied` not set |

## Corrections applied

All writes were made against the live Supabase DB via `execute_sql`, replicating the validated logic in `apps/api/prisma/reseed-otb.ts`:

1. **Wiped** the property's existing leases and all RESTRICT-dependent rows (`cam_reconciliations`, `invoices`, `late_fee_assessments`, `ledger_entries`, `payments`) plus CASCADE junctions (`lease_units`, `lease_options`, `schedule_g_entries`).
2. **Soft-deactivated** tenants left with no remaining leases (`isActive=false`, `deletedAt=now()`).
3. **Deactivated** the 6+ legacy units not present in the SOT (hyphenated/wrong-label demo rows).
4. **Upserted 27 physical units** by `(propertyId, suiteNumber)` — correct GLA, `sitePlanLabel`, `isOwnerOccupied` (135B), reactivated.
5. **Upserted 20 tenants** by `legalName` (Belle Realty owner row intentionally skipped).
6. **Created 20 active leases** (each `unitId` = primary unit by highest allocation) and **24 `lease_units`** rows. Combined groups apportioned:
   - `monthlyBase = round(monthlyTotal × basePsf/totalPsf, 2)`; `monthlyAdditional = monthlyTotal − monthlyBase`.
   - Group primaries: 101 (101-103), 115 (115-117), **127** (125-127, 0.594 > 0.406), 139 (139-141).
7. **Set** property `totalGla = 62,810`.

Combined lease groups (2 units → 1 lease): **101-103, 115-117, 125-127, 139-141** → 16 single-unit + 4 groups × 2 = **24 `lease_units`**. Owner-occupied 135B has no lease (by design).

## State after (verified — zero drift)

| Metric | Value | SOT target | Match |
|---|---|---|---|
| Active units | 27 | 27 | ✓ |
| Active unit GLA sum | 62,810 | 62,810 | ✓ |
| Property `totalGla` | 62,810 | 62,810 | ✓ |
| Active leases (all `w42_*`) | 20 | 20 | ✓ |
| `lease_units` rows | 24 | 24 | ✓ |
| Active tenants | 20 | 20 | ✓ |
| Vacant units | 2 (131 · 1,907 SF; 133 · 1,272 SF) | 2 | ✓ |
| Owner-occupied | 1 (135B · 1,580 SF, no lease) | 1 | ✓ |

## Notes / provenance retained in DB

- **Unit 103** GLA corrected 3,051 → 3,054 SF (owner correction); 101-103 group now 9,931 SF. Monthly stated rent retained from signed rent roll pending re-rate.
- **Cat Clinic (119½)** renewed 3 years; expiration updated to 2/28/2029.
- **Upstream (145)** signed at $19.95/SF; base PSF inferred to $14.95 holding CAM/tax/insurance constant.
- All combined-group physical units carry a note that lease economics are group-level and unit allocation is for reporting only.

## Idempotency

All apply blocks are safe to re-run: units upsert `ON CONFLICT (propertyId, suiteNumber)`, tenants use IF-EXISTS/UPDATE-else-INSERT by `legalName`, and lease creation is guarded by deleting existing `w42_lease_%` / `w42_lu_%` rows before insert. Re-running `reseed-otb.ts` (which reads the same SOT CSVs) reproduces this exact state.
