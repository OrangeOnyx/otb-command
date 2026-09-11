# Rent-roll authority — supersession memo (2026-09-11)

**Operator ruling (Adam, 2026-09-11):** the September 9–10, 2026 lease review is the
new Tier-1 for lease economics and terms on the suites it names. It supersedes the
owner-corrected signed rent roll of 2026-07-16 (`docs/sot-2026-07/`) for those suites
only; every other suite keeps the July authority.

| Layer | Source | Covers |
|---|---|---|
| Tier-1 (new) | `docs/lease-population-2026-09-10.md` · `src/data/units.json` → `leaseEvidence` per suite · `recoveries.json` / `hvac.json` notes | 105, 109, 117.5, 119, 119.5, 121, 139, 141, 143, 145 |
| Tier-1 (prior) | `docs/sot-2026-07/` (signed rent roll, reconciled 2026-07-16) | every other suite; still the source for CAM/Tax/Ins components where the review left them untouched |
| Tier-2 | workbook, HVAC PDF, plat | unchanged |

## What changed in the data (old → new)

- 143 1st Franklin: total $19.95 → **$21.00/SF**, $3,187.01 → **$3,354.75/mo**, term 2026-02-01 → 2031-01-31; CAM/Tax/Ins components → null (amendment states additional rent as an aggregate).
- 145 Upstream: base $14.95 → **$0**, total $19.95 → **$5.00/SF**, $3,187.01 → **$798.75/mo** (Jul–Dec 2026 abatement; $3,035.25 from 2027-01 per owner schedule); `start`/`end` → blank (contractual dates unresolved); components → null.
- 119 OUPAC/Daco: `start`/`end` → blank (signed effective date 2022 conflicts with 2021–2024 term clauses); $2,890.42 retained.
- 139 / 141 Fast Pass: `end` 2027-04-30 → blank; prior term ended 2026-07-31; tenant-signed renewal 2026-08-01 → 2029-07-31 at $6,150.38 combined recorded as `plannedRenewal`, landlord signature pending.
- 105 / 117.5 / 119.5 / 121: `start` moved to the confirmed renewal start; `end` unchanged; signed copies pending.
- 117.5 tax component → null (printed components conflict); HVAC caps 117.5 and 119.5 → "Pending verification".
- Scheduled monthly total $90,291.23 → **$88,070.71**.

Consequences accepted with the ruling: T-1 Critical Dates and the W-1 renewal
auto-triggers omit the four blank-`end` suites until their terms are resolved;
P-1 WALT reads "—" with a "Term unresolved" bucket; D-1 "Expiring ≤ 12 mo" counts
seven suites, not ten.

## Provenance

Owner confirmations of 2026-09-09/10 (recorded in each suite's `leaseEvidence.sources`
as `owner-confirmation`), Belle Realty emails cited by Gmail message id only
(deep links with the operator's mailbox address were removed from the repo on
2026-09-11), and the OTB Master Lease Package PDF of 2026-08-01 by page. The
raw source package lives in the protected local backup, not in this repo.

## Open owner items (from the review)

- 119: confirm the current expiration or supply the signed correction/renewal.
- 139/141: countersign the renewal, then move `plannedRenewal` into the schedule.
- 145: confirm contractual commencement/expiry; reconcile bank receipts.
- 105 / 117.5 / 119.5 / 121: attach the signed renewals; 117.5 HVAC clause.
