# Tenant compliance, local PC sweep (Belle-Lenovo-Legion), 2026-09-23

This pass covers what the 2026-09-22 sweep could not reach. It searched filenames on C:\Users\adam, D:, E:,
G:\My Drive, and I:\ (My Drive + the Belle Shared Drive) for COI / ACORD / W-9 / license / grease /
Ansul / walk-through / deposit / ACH / HVAC PM terms, and kept only files naming an OTB tenant or Belle.
That left 4,337 raw hits, 685 tenant-related and 112 distinct files. Old law-work and personal archives
were excluded. Most hits are duplicates of the same Belle Drive mirrors (D:/E:/I: backups of the 2021–2024
"00 - Current Leases" tree). The richest copy is `C:\Users\adam\Projects\AI OS\tmp\leases\`, a
suite-prefixed flattening of that tree. Its folder labels are the tenants of that era: "129-Oupac",
"121-123-Lola Pink", "135A-Edge Yoga", "137-The Esthi", "139-141-Dealer Track", "145-Boulevard Nutrition".

## New evidence (copied into the Drive package as `PC_*` in the suite folder)

| Suite | Item | File |
|---|---|---|
| 107 | Executed lease, Lafayette Cookies & Cream | `Lafayette Cookies and Cream - Belle Realty Boulevard Lease Fully Executed 10-3-22.pdf` |
| 107 | ACH (scan, Apr 2022), verify it is the rent ACH | `Xerox Scan_04262022135525.pdf` |
| 115/117 | Executed combined lease, Clothing Loft Exchange (2023) | `Executed Clothing Loft Lease 2023 Combined.pdf` |
| 143 | Base lease, fully executed + First Addendum executed | `143.0 - First Franklin Financial Corp. - Lease Agreement - Fully Executed.pdf`, `1st Franklin Addendum Executed..pdf` |
| 143 | ACH form, verify it is completed and signed | `ACH - Belle Realty.pdf` |
| 113 | ACH authorization (lease Schedule F), verify it is completed rather than a blank exhibit | `ACH Authorization Form.pdf` |
| 101/103 | Butcher HVAC agreement ("Butcher Red Agree") | `Butcher Red Agree-Ryan copy page 1 (4).pdf`, `SKM_C65819072511250.pdf` |

Also seen, but not tenant evidence:
- Belle's own COIs and W-9.
- DoorLoop and IC blank templates (walk-through, deposit receipt).
- `Belle Security Deposits as of 123119.xlsx` and `Security Deposit.xlsx`. These are a 2019 deposit
  ledger, useful background for the deposit column but not receipts.
- The Upstream `...23559222...Clinic#2577-COI.pdf`, which is the same 7/1/2025–7/1/2026 certificate.
- The 113 "COI Belle.pdf", which is the 2022 certificate.

## Still not found anywhere on the PC

- A current COI for any suite beyond the five in the main doc.
- A W-9 or occupational license for any tenant.
- Grease trap or hood/Ansul records.
- Walk-through reports.
- Executed leases for 121 Magnolia, 123 Tux Shoppe, 135A C. Wolf, 137 Greek Expressions and
  145 Upstream. The PC only holds the prior tenants' files for those bays.

These remain on the Catherine request.

## C-1 matrix additions (add to the SQL in the main doc §3)

`('107','lease'),('115','lease'),('117','lease'),('143','lease'),('101','hvac'),('103','hvac')`.
The ACH candidates for 107, 113 and 143 stay Unverified until someone opens them.
