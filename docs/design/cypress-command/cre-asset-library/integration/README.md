# Repository integration and audit

This package supplies the audit procedure; it is **not evidence that OTB Command has already been audited or migrated**. Execute it against the actual checkout. OTB is the first implementation property. Keep shared contracts independent of OTB paths, tenant names, suite counts, coordinate systems, and application framework.

## 1. Establish the working boundary

1. Read applicable repository instructions and this library's source-of-truth hierarchy. Run `git rev-parse --show-toplevel`, `git status --short`, and `git branch --show-current`. Record the resolved root, branch, HEAD, worktree state, and audit time. A shell starting in a nested project is not proof that it is the repository root.
2. Preserve uncommitted work. Create an isolated branch/worktree for implementation using available managed-worktree tooling; inventory the original checkout as well when its untracked/ignored files may hold sources. Do not silently omit those files because a fresh worktree lacks them.
3. Enumerate root entries including dotfiles, tracked files, untracked files, ignored files, nested app/package boundaries, submodule entries, symlinks/junctions, Git LFS pointers, archives, storage manifests, and external data links. Do not follow links automatically. Resolve targets only within authorized data locations.
4. Build `scope-ledger.csv` before claiming coverage. Every excluded, inaccessible, offline, pointer-only, nested, oversized, encrypted, or externally hosted source needs a row with reason, affected deliverables, follow-up, and coverage status. Git internals, credentials, dependency caches, and generated caches may be excluded from content review, but their boundaries must be recorded. A cache containing the only surviving source is a recovery question, not a reason to delete it.
5. Never emit credentials, connection strings, `.env` contents, private keys, or tenant/private financial records into reports. Configuration review should record variable names and integration roles only. Live databases and cloud resources are read-only during this procedure. Do not fetch paid/private external services, pull large scan datasets, initialize submodules, or download LFS objects automatically.

## 2. Traverse every functional area

Review both file inventory and behavior. Search extensions, names, imports, module routes, manifests, embedded data, content references, database schema, and running UI. Inspect nested packages and every directory at the verified root; match each to a ledger row. `rg` is a discovery tool, not a semantic audit.

| Area | Required inspection |
| --- | --- |
| Property / site / building | Master records, identity aliases, property boundaries, addresses, site plans, building footprints, orientation, elevations, façades, parking, circulation, landscaping, equipment, utility routes |
| Suite / tenant / lease links | Suite IDs, outlines, floor plans, access, demising walls, area definitions, tenant joins, vacancy/occupancy data, suite overlays; do not conflate measured area with contractual rentable area |
| Signage | Pylons, monument signs, cabinets, faces, posts, tenant panels, mounts, electrical/service records, permitted versus installed condition, artwork and blank templates |
| Maps / GIS | CRS, EPSG codes, datum, vertical datum, units, basemap licenses, survey/plat boundaries, georeferenced imagery, local-to-world transforms, GeoJSON and map layers |
| CAD / BIM / floor plans | Native sources and derivative exports, revisions, drawing units, scale, layers, blocks, dimensions, sheet/viewport identifiers, as-built versus proposed status |
| Scans / digital twins / models | Raw scans, registration reports, point clouds, LiDAR, scan dates, transforms, mesh/texture lineage, decimation, LODs, cameras, clips, viewer entry points and host dependencies |
| UI and visual assets | Components, routes, map legends, SVGs, sprites, raster images, GLB/GLTF/OBJ/FBX, CSS variables, design tokens, light/dark modes, labels, loading/empty/error states, print/export flows |
| Data and integration | Existing schemas, types, migrations, API routes, repositories, importers, seeds, fixtures, derived caches, storage keys, attachment IDs, sync jobs, source links and update paths |
| Supporting surfaces | Tests, stories, docs, scripts, release bundles, deployment/configuration, public/private asset roots, old demos, screenshots, generated docs and archived source packages |

Inspect archive manifests safely without executing their contents or blindly extracting. A manifest is not content verification. Inventory each member if an archive is the only source, record archive/member provenance, and perform selective sandboxed extraction when authorized. For Git LFS distinguish a pointer blob from the actual geometry; record OID/size when available. For submodules record pinned commit, initialized state, nested root and access status; perform a separate bounded audit when available. For external scans record locator, custodian, access, revision and checksum when available without embedding private URLs or copying raw data into Git.

## 3. Build authority and dependency maps

- Identify the current source of truth for each domain and each disputed assertion. Geometry and measurements come from verified measured sources, never generated imagery. Review date, as-built/proposed status, scope, units, registration and source accuracy; newest filename is not sufficient evidence of authority.
- Inventory existing property/site/suite/signage/map/model contracts and consumers before creating new ones. Reuse or adapt the existing canonical source. The package schemas describe exchange records; do not introduce a parallel production database, rename IDs, or replace application schemas just to resemble the package.
- Trace each source through import/transform/storage/export to visible consumers. Include indirect references: dynamic imports, runtime URL construction, API response fields, DB/storage IDs, cache keys, CSS backgrounds, service workers, generated assets, documentation links and third-party viewer embeds. Identify the exact authoritative viewer and verify whether it is integrated with property records or merely a separate scene.
- Record exact duplicates by checksum, then assess semantic duplicates by identity, source revision, view, geometry, appearance, purpose and consumer. Identical bytes can legitimately serve different contexts; differently encoded files can represent the same source. Hashes alone never authorize removal.
- For conflicts, record the competing values/sources, authority decision, evidence, owner and downstream impact. Preserve both until resolved. Distinguish historical, proposed, approximate, generated and current verified values.

## 4. Review branding in context

Cypress Command is the forward authority for the product and reusable CRE library. Find `Orange Ocean`, `OrangeOcean`, `orange-ocean`, `orange_ocean`, old logos/tokens/domains, and contextual legacy names such as `Cypress Review`; include case and punctuation variants and image-only appearances. Inspect current Cypress Command references too for competing versions.

Classify each occurrence as active product UI, legacy product asset, historical evidence, actual legal entity/owner, third-party identity, external URL/domain, ID/integration contract, migration/audit history, fixture or unknown. Propose changes only for confirmed obsolete product identity. Preserve accurate legal names and historical records. Do not blanket-replace names, slugs, URLs, DB keys, migrations, secret names, or provider configuration. Renaming a display label is not authorization to change a contractual entity or external identifier.

## 5. Propose and implement a staged migration

Produce `migration-map.csv` and a readable plan before material changes. Each row links old and proposed paths/IDs, consumers, authority, disposition, source/destination checksum, risk, validation, rollback and approval status. Allowed dispositions: `retain`, `alias`, `adapt`, `add`, `proposed_archive`, `proposed_delete`. A proposal is not an executed move.

Proceed with reversible additive work in isolation: documentation, manifests, non-production adapters, verified-source-derived draft assets, isolated preview routes, meaningful tests. Preserve native measured sources and originals; link restricted/large files through controlled manifests. Build one OTB vertical slice first—source → canonical/adapted data → geometry → styled asset → actual viewer/UI → validation—then extend patterns. Never bake OTB-specific geometry into shared primitives.

Do not delete/archive originals, overwrite canonical sources, bulk-rebrand, change production IDs/contracts, write to live databases, deploy/publish, repoint production viewers, run destructive migrations, or invalidate production caches without explicit approval for the concrete reviewed change. Keep approvals scoped to listed actions. Routine audit and isolated additive drafts do not require a new approval request.

## 6. Verify and report

Use [geometry and visual validation](geometry-and-visual-validation.md), [report contract](report-contract.md), and the templates. Run existing repository checks appropriate to affected consumers. Inspect the rendered map/model/signage/UI, light/dark and relevant viewports; verify actual imported/exported coordinates and geometry as well as screenshots. Validate links, IDs, licenses, privacy, fallback behavior and source visibility.

Report measured coverage denominators by area, unresolved boundaries, conflicts, actions actually executed, actions only proposed, and exact approval needs. `rg` returning no old brand string does not prove a complete rebrand; a passing build does not prove accurate geometry; a manifest of external scans does not prove their contents were inspected. Mark the audit partial whenever required areas remain unreviewed.
