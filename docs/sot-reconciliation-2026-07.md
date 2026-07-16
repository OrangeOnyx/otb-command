# SOT Reconciliation — 2026-07-16

**Authority:** owner-corrected signed rent roll, extracted as `docs/sot-2026-07/*.csv`
(harvested from `belle-realty-pwa @ 19f7c06` `data/source-of-truth/`; operator confirmed
2026-07-16: "owner corrections are authoritative"). Supersedes prior workbook dates.
DoorLoop dates ignored per the dataset's own validation rules.

## Applied to `src/data/units.json`

### Holdover renewals — all five flip expired → active
| Unit | Tenant | Old end (holdover since) | New end |
|---|---|---|---|
| 105 | Painted Bayou | 2026-03-17 | **2029-03-31** |
| 109 | JC Kate Boutique | 2025-09-17 | **2028-09-30** |
| 117.5 | Victoria Nails | 2026-02-14 | **2029-02-28** |
| 119 | OUPAC Financial | 2026-02-14 | **2027-02-28** |
| 143 | 1st Franklin Financial | 2026-01-17 | **2031-01-31** |

### Economics
| Unit | Field | Old | New |
|---|---|---|---|
| 145 | base PSF | 13.50 | **14.95** (inferred: owner confirmed $19.95 total; CAM 2.10 / tax 0.95 / ins 1.95 unchanged) |
| 145 | total PSF | 18.50 | **19.95** |
| 145 | monthly | 2,955.38 | **3,187.01** |
| 101 | monthly (alloc) | 11,089.16 | **11,085.81** (group stated $16,008.90; formula check 16,013.74, variance −4.84 = documented owner-accepted exception) |
| 103 | monthly (alloc) | 4,924.58 | **4,923.09** |
| 115/117 | monthly (alloc) | 3,327.33 | **3,327.34** each (group stated 6,654.67; allocation rounding) |

### Expiration-date corrections (owner-corrected dates are month-end; old dates were anniversary-derived)
101/103 → 2027-02-28 · 107 → **2027-03-31** (largest shift, was 2027-07-13) ·
111 → 2027-01-31 · 113 → 2027-06-30 · 115/117 → 2026-09-30 · 119.5 → 2029-02-28 ·
121 → 2031-12-31 · 123 → 2029-12-31 · 125/127 → 2028-04-30 · 129 → 2029-08-31 ·
135A → 2031-05-31 · 137 → 2030-10-31 · 139/141 → 2027-04-30 · 149 unchanged (2030-10-31 ✓)

### Applied to `src/data/recoveries.json`
145: base 13.5 → 14.95, total 18.5 → 19.95 (components sum verified 14.95+2.10+0.95+1.95 = 19.95).

## Invariants verified
- 27 units, SF sum = **62,810** (unchanged — 101=6,877, 103=3,054, 117.5=1,769, 135A/B=1,580 all confirmed by the corrected workbook; the old "workbook anomalies" for 101/117.5 are hereby CLOSED as owner-corrected values).
- Vacant: 131 (1,907), 133 (1,272). Owner-occupied: 135B. Anchor: 149.
- No holdovers remain as of 2026-07-16.

## Known exceptions carried from the dataset (do not "fix")
- Pink Paisley 101-103: stated monthly $16,008.90 vs formula $16,013.74 (−4.84) — owner-accepted.
- Cat Clinic 119.5: $0.01 formula rounding — owner-accepted.
- Per-unit allocations for combined groups (101-103, 115-117, 125-127, 139/141) are
  REPORTING allocations, not separately billable amounts.

## Not applied (no SOT source)
- Lease start dates (SOT carries expirations only; existing starts retained; renewed units keep original start with renewal noted).
- Deposits for 107/137/143/149 (still missing in source — anomaly remains open).
