# Tenant compliance sweep — 2026-09-22 (adopted 2026-09-23)

**Package:** `G:\My Drive\00 OTB\tenant-compliance-2026-09-22\` (per-suite folders + `MASTER_INDEX.md`
+ `OTB-C-1-2026-09-22.pdf`). The source PDFs stay out of git.
**Sources searched by the sweep:** Gmail adam@belle-realty.com + ap@belle-realty.com, Drive (belle-realty +
adamabdalla), the prior COI haul. The PC was **not** searched in the sweep. The local-drive pass is in §5.
The owners likely hold more of these files, and the request to Catherine is §4.

## 1. Fast Pass 139/141: renewal fully executed (Tier-1 change)

`FastPass_Lafayette_2026_EXECUTED.pdf` (e-mail 1a0b24ebdae1087a, thread 1a06d50b253b143e):
Lease Renewal and Extension Agreement, Suites 139 & 141. Lessee Kathy Trahan signed 9/10/2026. Lessor
Adam Anthony Abdalla, for Orange Ocean as manager of Belle Realty, signed 9/12/2026. Term is 8/1/2026 to
7/31/2029 at a level $14.25/SF. Base is $4,552.88 and additional rent is $1,597.50 (reconciled per the
Original Lease), for a total of **$6,150.38/mo**. Continued possession from 8/1 is ratified as
occupancy, not holdover.

Adopted into `src/data/units.json`. Each suite gets `start` 2026-08-01, `end` 2029-07-31, base 14.25,
total 19.25 and monthly **$3,075.19**. That is a reporting allocation of the combined amount, not a
separately billable one. `leaseEvidence` is set to document-reviewed and `plannedRenewal.includedInSchedule`
to true. **The scheduled monthly total moves from $88,070.71 to $88,310.33 (+$239.62).** 139/141 now feed
T-1 and W-1 again, with expiry 7/31/2029.

## 2. COIs actually on file (policy dates read from the certificates)

| Suite | Insured | Policy period | State 9/23 |
|---|---|---|---|
| 107 | Lafayette Cookies & Cream, LLC (State Farm) | 6/30/2020 – 6/30/2021 | Lapsed (stale) |
| 113 | Graze Acadiana | GL 4/30/2026 – 4/30/2027 (owner addl. insured, waiver of subrogation); **WC to 10/16/2026** | Expiring (the earliest line is tracked) |
| 119 | OUPAC Financial | 3/1/2025 – 3/1/2026 | **Lapsed** |
| 129 | Lexi Investments (HotWorx) | 10/20/2025 – 10/20/2026 | Expiring (27 d) |
| 145 | Upstream / RollCo, Clinic #2577 | 7/1/2025 – 7/1/2026 (cert issued 5/26/2026) | **Lapsed** |

The "Lockton link" Upstream file in the package is a **0-byte** download. No COI was found for the
other 20 occupied suites.

These five are seeded as unit document records (`directory.json` → `unitDocuments`, rendered via
`lib/directory.js`). The C-1 Document coverage table picks up the dates: 3 lapsed and 2 expiring. There
are no links yet; add the Drive links in the drawer once the files are in their final place. V-1 is
unchanged, because vendor COIs are a different register.

## 3. Evidence for the C-1 matrix (production `comp_state`), NOT YET ON PROD

The SQL door was blocked in this session. Run it once in the Supabase SQL editor (prod `kbhsghodquchkgfdzckc`):

```sql
with v(unit, field) as (values
  ('101','lease'),('103','lease'),('105','lease'),('119','lease'),('125','lease'),('127','lease'),
  ('129','lease'),('139','lease'),('141','lease'),('109','ach'),('129','ach'),('145','sign'))
update comp_state c set state = 'ok', origin = 'compliance-sweep-2026-09-22'
from v where c.unit = v.unit and c.field = v.field and c.state = 'u'
returning c.unit, c.field, c.state;
```

The basis for each row:
- **Executed lease:** Drive files for 101-103 (Pink Paisley), 105 (Painted Bayou), 119 (OUPAC +
  guaranty), 125/127 (Shoetique) and 129 (HotWorx), plus the Fast Pass renewal.
- **ACH:** executed authorizations for 109 JC Kate (Sep 2026) and 129 HotWorx.
- **Signage:** 145 Upstream owner authorization plus the signed Big Mouth proof (Aug 2026).

149 was already seeded all-ok. Leave `coi` at Unverified; the coverage table derives the COI state from
the document dates.

## 4. Still missing (request sent to Catherine as a draft)

The Gmail draft to catherine@belle-realty.com is in the adam@adamabdalla.com account and has **not** been
sent. It asks for:
- Current COIs for all suites.
- W-9s and occupational licenses. The sweep found none for any tenant.
- Grease trap and hood/Ansul records for 107, 113 and 149.
- Missing executed leases: 107, 115/117, 121, 123, 135A, 137, 143 base lease, and 145.
- Deposit receipts.
- Rent ACH authorizations for everyone except 109 and 129.

Tenant-direct requests go out only for what she doesn't have.

Cautions carried from the sweep:
- The 101 "ACH Electric Jan 2022" is a utility ACH, not a rent ACH.
- The Boulevard Nutrition leases in the 145 Drive tree belong to the prior tenant.
- The Esthi documents in 137 belong to the prior tenant, not Greek Expressions.
- Deposits are rent-roll amounts only, with no receipts.

## 5. Local PC sweep (Belle-Lenovo-Legion)

See `docs/tenant-compliance-2026-09-22-pc-sweep.md`.
