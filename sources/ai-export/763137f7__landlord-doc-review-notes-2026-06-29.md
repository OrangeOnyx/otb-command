# Landlord Document Review Notes — 2026-06-29

## Files reviewed so far

| File | Type | Key directly supported findings |
|---|---|---|
| `/home/ubuntu/upload/9323.hud1.pdf` | HUD-1 settlement statement | Borrower: **Belle Realty of Lafayette, L.L.C.**; Lender: **Investar Bank**; Property: **123 Arnould Blvd, Lafayette, LA 70506 (On The Boulevard Shopping Center)**; Settlement date: **October 30, 2019**; New loan amount: **$1,500,000**; Settlement charges: **$26,055.70**; Prior mortgage payoff: **$753,625.78**; Hold for construction: **$720,318.52**. |
| `/home/ubuntu/upload/ExecutedInvestarBankLoan20112019.pdf` | Loan package | From visual review of promissory note page: principal **$1,500,000.00**; loan date **10-30-2019**; maturity **04-30-2030**; borrower **Belle Realty of Lafayette, L.L.C.**; lender **Investar Bank, National Association**. |
| `/home/ubuntu/upload/26-27CPKGPol.pdf` | Hartford insurance packet | Policy number **43 SBM AL3XX2**; policy period **05/15/2026 to 05/15/2027**; insured **Belle Realty of Lafayette LLC**; agent/broker **TSL Insurance Group Inc**; insurer **Hartford Underwriters Insurance Company**; total premium shown as **$13,647**. The visible declarations reviewed so far show **business liability coverage** and state **"No property coverage at this location"** for LOC 1 (101-149 Arnould Blvd) and LOC 2 (110 Marie Antoinette St). This needs confirmation against the full packet because the user described it as the property insurance policy. |
| `/home/ubuntu/upload/title_extract/00 Executed commitment.pdf` | Title commitment | Unreviewed in detail yet. |
| `/home/ubuntu/upload/title_extract/belle.realty.policy.sched.pdf` | Title policy schedule | Text extraction failed; likely scanned. Unreviewed in detail yet. |
| `/home/ubuntu/upload/title_extract/28 Pledge scan.pdf` | Loan collateral doc | Unreviewed in detail yet. |
| `/home/ubuntu/upload/title_extract/29 Mortgage scan.pdf` | Mortgage doc | Unreviewed in detail yet. |

## Working conclusion

These are **landlord-side / ownership / financing / title** documents, not tenant COIs. They should not live only under the tenant Insurance workspace. They likely belong in a separate owner-documents area (Loan, Title, Landlord Insurance, Closing).

## Cautions

1. The Hartford packet appears to contain at least a liability declarations section; the visible pages currently say **no property coverage at this location**. That may mean either (a) this is not the property-building coverage packet, or (b) the property coverage is elsewhere in the packet and has not yet been located.
2. The Investar loan and title PDFs appear at least partly scanned, so visual inspection may be required for key fields not captured by text extraction.
3. Because these are landlord-level docs, if loaded into the app they should probably attach to the **property record** rather than a tenant/unit record.

## Next review targets

- First page / schedule of the title commitment
n- First page / schedule / coverage amount page of the title policy
- First pages of mortgage and pledge scans
- Additional pages in the Hartford packet to determine whether building/property coverage exists and what the limits are
- Key note terms beyond principal/maturity if needed (rate, payment terms, collateral references)

## Additional direct findings from visual review

| File | Key directly supported findings |
|---|---|
| `/home/ubuntu/upload/title_extract/00 Executed commitment.pdf` | Louisiana title insurance commitment dated **May 18, 2007** from **Property Title Life Insurance Company** via Beckett & Associates. Commitment effective date shown as **May 3, 2007**. Proposed insured includes **Protective Life Insurance Company** as lender. Commitment amount shown as **$250,000.00** in the viewed page. |
| `/home/ubuntu/upload/title_extract/belle.realty.policy.sched.pdf` | **Fidelity National Title Insurance Company** policy, **Policy No. 74102317**, **Date of Policy: July 25, 2007 @ 1:16:36 p.m.** Premium **$3,572.70**; **Amount of Insurance: $1,250,000.00**. Insured lender: **Protective Life Insurance Company** (successors/assigns as interests appear). Title vested in **Belle Realty of Lafayette, L.L.C.** The insured mortgage references an **Act of Mortgage and Security Agreement dated July 17, 2007** in the original amount of **$1,250,000.00**, recorded **July 25, 2007** as Entry No. **2007-00033813** in Lafayette Parish. |

## Updated recommendation

These files should be treated as **owner-level reference documents**:

| Bucket | Files |
|---|---|
| Landlord Insurance | `26-27CPKGPol.pdf` |
| Closing / Acquisition | `9323.hud1.pdf` |
| Loan / Financing | `ExecutedInvestarBankLoan20112019.pdf`, `28 Pledge scan.pdf`, `29 Mortgage scan.pdf` |
| Title | `00 Executed commitment.pdf`, `belle.realty.policy.sched.pdf` |

They should attach to the **property / entity record**, not to a tenant/unit record.

## Open question still unresolved

The Hartford packet reviewed so far still appears to show **liability declarations** and explicitly says **no property coverage at the location** on the viewed declarations pages. That conflicts with the user's description of it as the property insurance policy, so that item needs confirmation before relying on it as the building-coverage source.
