# Project Summary — On The Boulevard Signage Rendering System

## What Has Been Built

A complete, turnkey production pipeline for generating photoreal AI signage
renderings for every tenant at On The Boulevard:

- **Source-of-truth tenant database** with 25 records.
- **Modular prompt library** (3 layers + tenant overrides, 14+ prompt fragments).
- **Automation suite** (8 Python scripts behind one `signage_cli.py` entry point).
- **Production folder structure** at `/home/ubuntu/ON_THE_BOULEVARD/` with
  per-tenant directories, site plans, brand system, and export targets.
- **Production tracker workbook** (5 sheets, data validation, conditional
  formatting) plus CSV mirror.
- **Full operator documentation**: README, Operator Guide, Quick-Start,
  System Architecture, Directory Tree, this summary.

## Current Capabilities

- Generate layered prompts per tenant/scene from one command.
- Batch-render any subset (single tenant, single scene, all tenants, all scenes).
- Automated QC checks for resolution, aspect, integrity.
- One-command export to leasing, investor, or broker deliverable packs.
- Live production status via the tracker workbook.
- Versioned, audit-friendly file structure (timestamped renders, separate
  `revisions/` and `finals/`).

## Tenant Roster (25 units — 23 active, 2 vacant)

| Tenant | Unit | Category | Facade | Logo |
|--------|------|----------|--------|------|
| The Pink Paisley | 101-103 | Boutique | A | ✅ |
| Painted Bayou | 105 | Boutique | A | ✅ |
| Great American Cookie | 107 | Restaurant | B | ✅ |
| JC Kate Boutique | 109 | Boutique | A | ✅ |
| Lola Pink | 111 | Boutique | A | ✅ |
| Graze Acadiana | 113 | Restaurant | B | ✅ |
| The Clothing Loft | 115-117 | Boutique | A | ✅ |
| Victoria Nails | 117 1/2 | Salon | C | ✅ |
| Oupac | 119 | Financial | C | ✅ |
| Cat Clinic of Lafayette | 119 1/2 | Medical | C | ❌ |
| Magnolia Salon | 121 | Salon | A | ✅ |
| The Tux Shoppe | 123 | Retail | A | ✅ |
| Jordan Amanda | 125-127 | Boutique | A | ✅ |
| HotWorx | 129 | Fitness | B | ✅ |
| Vacant | 131 | Vacant | B | — |
| Vacant | 133 | Vacant | B | — |
| C Wolf Barber Shop | 135A | Salon | C | ✅ |
| Belle Realty | 135B | Services | C | ❌ |
| Greek Expressions | 137 | Retail | A | ✅ |
| Fast Pass Tag & Title | 139/141 | Services | C | ✅ |
| 1st Franklin Financial | 143 | Financial | C | ✅ |
| Blvd Nutrition | 145 | Restaurant | B | ❌ |
| Jason's Deli | 149 | Restaurant | B | ❌ |
| Mary Ellen's | Historic | Retail | A | ✅ |
| Rehabilitation Services | Historic | Medical | C | ✅ |

## Roster by Category

- **Boutique** (6): The Pink Paisley, Painted Bayou, JC Kate Boutique, Lola Pink, The Clothing Loft, Jordan Amanda
- **Financial** (2): Oupac, 1st Franklin Financial
- **Fitness** (1): HotWorx
- **Medical** (2): Cat Clinic of Lafayette, Rehabilitation Services
- **Restaurant** (4): Great American Cookie, Graze Acadiana, Blvd Nutrition, Jason's Deli
- **Retail** (3): The Tux Shoppe, Greek Expressions, Mary Ellen's
- **Salon** (3): Victoria Nails, Magnolia Salon, C Wolf Barber Shop
- **Services** (2): Belle Realty, Fast Pass Tag & Title
- **Vacant** (2): Vacant, Vacant

## Logo Asset Inventory

- **On file**: 19 tenants
- **Needed**: 4 tenants → Cat Clinic of Lafayette, Belle Realty, Blvd Nutrition, Jason's Deli
- **N/A (vacant)**: 2
- **Multi-variant logos**: Graze Acadiana, Great American Cookie, JC Kate Boutique

See `TENANTS/logo_mapping.json` for the full placement record.

## Next Steps for Production Use

1. **Acquire missing logos** for: Cat Clinic of Lafayette, Belle Realty, Blvd Nutrition, Jason's Deli.
2. **Generate prompts** for all active tenants: `signage_cli.py prompts --all`.
3. **Run the first hero batch**: `signage_cli.py render --all --scene hero_storefront`.
4. **QC pass** and log results in `PRODUCTION_TRACKER.xlsx → QC Log`.
5. **Promote approved renders** from `renders/ → finals/`.
6. **Build the first investor export**: `signage_cli.py export --all --target investor`.

## Maintenance Recommendations

- **Weekly**: snapshot `/home/ubuntu/ON_THE_BOULEVARD/` and `tenant_database.json`.
- **Per tenant change**: edit DB → re-run `build_otb.py` → update tracker row.
- **Per prompt-library edit**: regenerate prompts only for affected tenants.
- **Quarterly**: archive old `revisions/` contents to cold storage.
- **Audit**: keep the QC Log current — it's your evidence trail for investor decks.
