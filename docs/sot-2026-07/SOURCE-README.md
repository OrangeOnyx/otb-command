# On The Boulevard — Source of Truth Data

These CSV + XLSX files are the **authoritative reference** for On The Boulevard Shopping Center
property, unit, tenant, lease, and charge data. They were extracted from the owner-corrected
signed rent roll and supersede any conflicting data from DoorLoop or earlier Adobe lease abstracts.

## Source ranking (highest → lowest authority)

| Rank | Source | Applies to |
|------|--------|------------|
| 1 | `owner_corrected_signed_rent_roll` | current tenant, economics, expiration, lease status |
| 2 | `all_units` (sheet) | physical unit split, unit labels, square footage |
| 3 | `lease_abstracts` (Adobe) | clauses — use clause, insurance, maintenance, late fees |
| 99 | `doorloop_reference_only` | reference only — **never authoritative** |

## Files

| File | Rows | Description |
|------|------|-------------|
| `properties.csv` | 1 | Property-level facts. 62,810 RSF, Belle Realty ownership |
| `units.csv` | 27 | Every physical unit with SF and current status |
| `tenants.csv` | 21 | Active legal entities (excl. owner-occupied) |
| `leases.csv` | 21 | All active + owner-occupied leases with PSF rates and **owner-corrected expiration dates** |
| `lease_units.csv` | 25 | Unit-to-lease junction with allocation percentages for combined lease groups |
| `lease_clauses.csv` | 21 | Use clauses, exclusives, insurance, late fees, HVAC, maintenance per lease |
| `recurring_charges.csv` | 105 | Base + CAM + tax + insurance + total per lease (formula-checked) |
| `parking_agreements.csv` | 2 | JD Bank + Our Saviors Church — unconfirmed parking references |
| `source_authorities.csv` | 4 | Authority ranking for conflict resolution |
| `validation_rules.csv` | 5 | Validation rules (e.g. unit SF total must = 62,810) |
| `known_exceptions.csv` | 2 | Documented variances (Pink Paisley stated vs formula, Cat Clinic $0.01 rounding) |
| `00-Final-On-The-Boulevard-Info.xlsx` | — | Original owner workbook |
| `Potential-Seed-Info.xlsx` | — | Working seed staging workbook with full change/decision logs |

## Validation rules currently enforced

- **Blocking**: `unit_sf_total_must_equal_62810` — Physical unit rentable SF must sum to 62,810
- **Blocking**: `doorloop_dates_cannot_override_signed_rent_roll` — DoorLoop dates must never overwrite signed rent roll expiration without manual owner approval
- **High**: `combined_lease_units_report_allocation_only` — For combined lease groups, allocated unit rent is reporting only, not a legal charge unless owner approves
- **High**: `billing_uses_stated_monthly_rent` — Default billing uses owner-confirmed stated monthly rent; formula rent is an audit check
- **Medium**: `owner_occupied_zero_rent_allowed` — Belle Realty Unit 135B is owner occupied. Zero rent + no expiration are intentional.

## Key facts the seed file must respect

- **Total RSF**: 62,810 — sum of all 27 unit SF values
- **Active tenants**: 20 (excludes Belle Realty owner-occupied unit 135B)
- **Active leases**: 20 (plus 1 OWNER_OCCUPIED)
- **Vacant units**: 131 (1,907 SF) and 133 (1,272 SF)
- **Combined lease groups**:
  - `101-103` — The Pink Paisley, LLC (9,931 SF combined; unit 101 = 6,877 SF, unit 103 = 3,054 SF)
  - `115-117` — The Clothing Loft, LLC (4,340 SF combined; 2,170 SF each)
  - `139/141` — Fast Pass Tag & Title (3,834 SF combined; 1,917 SF each)
  - `125-127` — Jordan Amanda (4,273 SF combined)
- **Owner-occupied**: Unit 135B (1,580 SF) — Belle Realty management office

## Do not

- Do not use DoorLoop expiration dates anywhere.
- Do not recompute monthly rent from PSF for The Pink Paisley (101-103) or Cat Clinic (119½) — both have owner-accepted variances vs. the PSF formula.
- Do not treat the per-unit allocations for combined lease groups as separate billable amounts.
