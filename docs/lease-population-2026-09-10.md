# Cypress lease population — September 10, 2026

Published to the existing isolated Cypress preview at https://otb.cypresscommand.com/#spatial.
Deployment: `dpl_4XZuMN48nH4dVENHAfwvDx3UfXEd` (preview, not original Atlas production).

## Adopted changes

- 105 Painted Bayou: owner-confirmed signed three-year extension, same $3,231.16 monthly, through March 31, 2029; executed copy pending.
- 109 JC Kate: September 10 fully executed ownership consent and replacement guaranty reviewed; commercial terms expressly unchanged. $3,808.39 and September 30, 2028 remain July owner-roster authority; separate renewal evidence pending.
- 117.5 Victoria Nails: owner-confirmed signed renewal March 2026–February 2029, stated $2,800.92 retained. Updated HVAC split pending; supplied renewal omits that clause and has a conflicting tax calculation.
- 119 DACO: current dates blank because the signed effective and term clauses conflict. Existing $2,890.42 retained, current applicability qualified.
- 119.5 Cat Clinic: owner-confirmed three-year renewal, same $3,035.03, through February 2029. Signed copy pending; conflicting historic replacement clauses remain unresolved.
- 121 Magnolia: owner confirms signed lease, correctly identified copy pending. Intended July 2025–December 2031 term and existing $2,527.90 retained; escalation calendar mapping not assumed.
- 139/141 FastPass: September 10 tenant-signed renewal, landlord signature blank. Proposed combined $6,150.38 for August 2026–July 2029 is visible but excluded from adopted current rent. Existing combined reporting allocations retained; current expiration unresolved.
- 143 First Franklin: signed amendment establishes $3,354.75 and February 2026–January 2031. Owner confirms paying updated amount; no bank reconciliation claimed.
- 145 Upstream: owner-confirmed current $798.75 during abatement, owner-mapped January 2027 step $3,035.25 separately disclosed. Exact contractual commencement/expiry unresolved.

Current monthly schedule snapshot: **$88,070.71**, as of September 10. Annualized amount is monthly times twelve, not a phased forecast. No billing, payment, bank, production database, or email records were changed. Future phases require reviewed activation; they are not silently posted as charges.

## Source and privacy boundaries

`src/data/units.json` remains canonical; per-suite `leaseEvidence` contains status, references, owner confirmations and pending items. Generated private seed carries evidence and recoveries only through the existing authenticated endpoint. Public output excludes both. Null recovery components remain unknown; lease assembly and CAM reconciliation do not substitute zeros. Unresolved lease dates suppress WALT and appear in rollover coverage.

Raw source package and downloaded email originals remain in the protected backup directory, not public assets. Principal sources: supplied August 1 master PDF and Belle emails `1a08cdf8cb4dcdca` (FastPass), `1a08a1f11c1470d2` (JC Kate), `1a03e4d8e98cd265` (Upstream executed lease), `1a0648c053afb0dd` (owner rent calendar). Owner confirmations dated September 9–10 are explicitly attributed.

Geometry SHA256 remains `0382977543319ba189d54185585be4579d2b76829f42d1bd73f8814034ee7b51`.
Historical Atlas snapshot SHA256 remains `8af8882a9549497c8b967a7490d7237ac3309f9a1ef31ff026a1c63991a18d40`.
The historical ledger is unchanged; revised schedule metadata no longer claims to be the July deployed Atlas seed.

## Acceptance

- 609 tests passed; local and Vercel builds passed.
- Live seed/report: operator 200, pending 403, anonymous 401; raw private JSON URLs 404.
- Live report verified $88,070.71, First Franklin $3,354.75, Upstream $798.75 and pending FastPass $6,150.38.
- Browser verified property suite selection, live evidence dialog, FastPass pending status and Upstream phases; rendered panel inspected with no browser errors. Local maintenance owner draft generation verified.
- Original Atlas production remains `dpl_JD3a5JRiaG1jTbkk5y4z422u8seR`.
- Backup/evidence: `C:/Users/adam/Backups/OTB/20260908-135228/lease-population-20260910/`.
- Reviewed dossier/data copied to `G:/My Drive/00 OTB/Cypress-Review-2026-09-10/`.

Remaining owner facts: DACO current expiration and Victoria Nails exact HVAC split. Additional signed copies/renewal instruments remain attachment follow-ups, not grounds to discard the owner's explicit confirmations.


## Addendum 2026-09-30: executed-document review (operator-approved items 1–10)

The signed copies are now in `sources/leases/` (see `sources/INDEX.csv`). Each change below is recorded in `units.json` `leaseEvidence`, with document path, page and excerpt.

| Suite | Change | Signed source |
|---|---|---|
| 149 Jason's | $7,765.22 → **$8,553.27/mo** ($17.25 base / $22.25 total). Term unchanged (11/1/2025–10/31/2030). Option: 60 months at $9,083.78. Deposit $0 (no clause). | Fifth Addendum pp. 78–81, both parties signed 4/7/2025 |
| 137 Greek Expressions | $3,165.04 → **$2,493.21/mo**, with Schedule G phases (abatement Oct 2025–Feb 2026, March steps to $3,062.88). Term **10/1/2025–9/30/2030**. Deposit $1,922.63. | Lease signed 9/25/2025: §3.01 p.2, §35.01 p.13, Schedule G p.36 |
| 115/117 Clothing Loft | Start **8/1/2023**. Deposit $4,941.37 is one combined deposit, recorded on 115. | Original lease §3.01 p.2, §35.01 p.17 (DocuSign) |
| 123 Tux Shoppe | Term **5/1/2024–4/30/2029**. Deposit $4,008.38. | §3.01 p.3, §35.01 p.17 |
| 125/127 Jordan Amanda | Term **5/1/2024–8/31/2029**. Deposit $2,500 combined. **Lessor-signed copy only.** | §3.01 p.3, §35.01 p.16; p.17 lessee line blank |
| 107 Great American | Term **4/1/2022–9/30/2027**. Deposit $0 by contract. | Fully executed 10/3/2022: §3.01 p.3, §35.01 p.19 |
| 145 Upstream | Legal name **Upstream Growth Partners, LLC**. **Lessor-signed copy only.** No deposit (§35.01). Start/end stay blank. | Lease pp. 1, 19 |
| 143 1st Franklin | No change: the 12/22/2025 amendment matches. Deposit unresolved (lease p.17 missing from both scans). | pp. 36–37 |

**Rent effect.** The schedule moves from $88,346.48 to **$88,462.70** from 10/1/2026. September is $88,426.55.

**Still open (operator):**
- **113 Graze:** no lessee signature on any copy, and the signed term ended 4/30/2024. Was the option exercised?
- **149 §9.01 HVAC:** Lessor repairs/replaces after the tenant's first $500, versus the "tenant maintains 100%" fact.
- **Billing reconciliation for 149 and 137:** were the documented amounts actually billed since 11/2025 and 3/2026?
- **Lessee-signed copies:** still needed for 113, 125/127 and 145.
