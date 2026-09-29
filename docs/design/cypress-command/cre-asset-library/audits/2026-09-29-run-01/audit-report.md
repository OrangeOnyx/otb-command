# Audit report · Cypress Command Platform CRE Asset Library → OTB Command

| Run | Root | Branch / HEAD | State at start | Date |
|---|---|---|---|---|
| 2026-09-29-01 | `otb-command` (confirmed with `git rev-parse --show-toplevel`) | master @ 4483d6e | Only untracked item was `docs/design/` (the package) | 2026-09-29 |

**Status: PARTIAL.** Enumeration covers the whole repo. The semantic review covers the data, assets, viewers, brand and sources. It does not cover `.claude/worktrees`, `node_modules`, `dist` or `.cache` contents, or external stores; those are listed as boundaries only.

## Method

1. Ran the package's read-only inventory helper. Output went outside the repo: 4,514 files, 169 boundaries and 237 exact-duplicate groups.
2. Ran four parallel review passes:
   - sources and geometry
   - consumers and schemas
   - brand
   - scope and visual inventory
3. Built one OTB vertical slice and validated it.

## Coverage

| Measure | Result |
|---|---|
| Enumeration | 4,514 files: 1,042 tracked, 105 untracked, 3,367 ignored. Excluded: `dist/` (93), `node_modules/` (5,745), `.cache/` (318) |
| Scope ledger | 85 boundaries: every root entry, 34 nested, 8 external |
| Source register | 70 rows: 59 sources and 11 transforms |
| Asset inventory | 246 visual and spatial rows. Metadata and consumers were reviewed; image content was not |
| Dependency map | 523 source→consumer links across `src/data`, `public`, `src/assets`, 54 Supabase tables and 7 buckets |
| Schema mapping | 58 rows, all read-only adapters |
| Brand audit | 120 occurrences classified |
| Conflicts | 25 (17 open) |

## Findings, ranked by impact

1. **Three live entity-ID spaces with no shared key.**
   - Raw unit IDs (`117.5`) are used by the A-1 drawer, A-2 and B-1.
   - Register IDs (`unit-117.5`, `rtu-117.5`) are used by the A-1 register and A-5.
   - `pa_<uuid>` IDs are used by A-3.

   The library IDs are now the proposed join key, through alias rows. No existing ID changes.
2. **Suite geometry is only partly measured.** Plat strings measure 17 of 26 frontage bays directly. The others (101, 103, 109–113, 131/133, 139–145) are split from lease SF. The slice's area check backs this up: for every plat-measured bay, plat footprint and lease SF agree within about 0.5 SF. The derived bays diverge, by up to −486 SF (101).
3. **Parapet heights cannot be trusted as measured.** 22 of 27 units read 16.4 ft, which is also the extractor's fallback value, and the output does not record which values defaulted.
4. **No measured sign drawing is in the repo.** `pylon.json` gives only panel order and nominal sizes. Two renderers draw invented, conflicting spacing. The only dimensioned drawing is on Drive (Guidry Beazley PA1.01, 1999).
5. **Open geometry conflicts:**
   - Long building length: plat 522.31 ft vs CAD 528.93 ft.
   - Foot definition never stated.
   - North rotation: 51.5° vs 52.25°.
   - LiDAR labelled EPSG:26915 vs twin frame EPSG:6344.
   - Parking: 314 vs 324.
   - Column count: 37 vs 39.
   - Meter count: 24 vs 28.
6. **Live data conflict.** Pylon P13 physically reads "Boulevard Nutrition", but the tenant of record for 145 is Upstream Rehabilitation.
7. **Brand.** No retired "Orange Ocean Atlas" appears in the UI. There are 19 naked "Cypress Command" strings in market-facing output. All 31 "Orange Ocean" uses are the legal entity and are retained.
8. **Three token systems** (package, 04C, plan-room). Choosing between them is decision B1.
9. **Hygiene:**
   - `tour.html` favicon returns 404.
   - The `public/elevation` hillshade is gitignored, so production builds don't have it.
   - `marketing$name.png` and `marketing$n.pdf` are stray files.
   - Large twin binaries are stored twice.
   - The `.cache/twin-*` PLY files may be the only copies.
   - `site-register` `rtu.sub` embeds HVAC cost caps, which must be removed before any library export.

## Authority decisions applied (none new)

- Geometry comes from `geometry.json` (the plat transcription) and `heights.json` (CAD). Both are registered as `unverified`.
- Tenancy and panel content come from `units.public.json` and `pylon.json`. They are bound as an overlay only.
- The master board is `appearance` only.
- No field was verified, averaged or overwritten.

## Changes

- **Made:** see `change-plan.md` §A.
- **Proposed:** see `change-plan.md` §B and `migration-map.csv`.
- **Blocked on evidence:** see `change-plan.md` §C.

## Report files

| File | What it holds |
|---|---|
| `scope-ledger.csv` | Every scanned boundary: 85 rows |
| `asset-inventory.csv` | Visual and spatial files: 246 rows |
| `source-register.csv` | Sources and transforms: 70 rows |
| `dependency-map.csv` | Source → consumer links: 523 rows |
| `duplicate-conflict-register.csv` | Duplicates and conflicts: 25 findings |
| `exact-duplicates-visual.csv` | Byte-identical image and model groups: 67 |
| `brand-reference-audit.csv` | Brand-name occurrences: 120 |
| `schema-mapping.csv` | Existing fields → library schema: 58 rows |
| `migration-map.csv` | Proposed moves and aliases: 13 rows |
| `geometry-validation.csv` | Geometry checks: 30 rows |
| `target-architecture.md` | Where everything sits |
| `change-plan.md` | What was done, and what still needs approval |
| `release-checklist.md` | Release gates |

These reports are private to the repo, and no credentials, rent values or contact data appear in them.
