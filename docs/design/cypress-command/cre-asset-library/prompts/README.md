# Reusable prompts

Use [MASTER_IMPLEMENTATION_PROMPT.md](MASTER_IMPLEMENTATION_PROMPT.md) first. Each focused prompt below inherits the source-of-truth and approval boundaries. Replace bracketed inputs from actual evidence; do not invent their contents. Pass private sources only to tools approved for those sources.

## 1. Intake and source conflict resolution

> For [property ID / scope], inspect the repository's existing records and these measured sources: [paths/IDs]. Register type, revision/hash, sheet/layer/object, capture/effective date, scope, units, coordinate frame, verification and usage restrictions. Identify competing claims field by field. Separate proposed design, measured as-built, survey boundary, contractual area and current operational state. Recommend authority with evidence; unresolved facts remain conflicted/unknown. Output source-register rows, a conflict decision table and affected consumers. Do not alter originals or claim the newest file wins.

## 2. Measured plan, elevation or twin derivative

> Derive [view/format] for [entity IDs] from [verified geometry sources]. Use the existing converter/viewer seam if suitable. Preserve coordinates, dimensions, boundaries, openings and entity IDs; record unit/frame transforms, camera, simplification, source hashes and tool versions. Apply Cypress style from the current CRE board after deterministic geometry creation. Render labels from verified data. Output editable geometry/display asset, provenance, source comparison and an isolated preview. Mark missing/uncertain areas; do not inpaint them as measured fact. No production overwrite or viewer cutover.

## 3. Modular signage component

> Build a reusable sign renderer with an OTB instance from [verified sign drawing/measurement]. The source determines frame, header, faces, panel count and dimensions. Keep each panel addressable by stable ID. Separate panel geometry, tenant artwork, content mode, availability/marketing state, maintenance state and verification. Implement the style-spec sign treatments and light/dark display; do not infer tenancy from a blank panel. Use approved artwork only. Produce editable output, mapping to existing sign/panel records, accessible interaction and provenance. Do not fabricate sign dimensions or tenant assignments.

## 4. Visual-only concept generation

> Create a Cypress Command styling concept for [asset family], using the current CRE reference board for architectural materials, warm neutral surfaces, restrained shadows, crisp edges and calm editorial presentation. Use [approved measured render] as visual input if available. This output is an illustration/concept only, never a measured geometry source. Do not add dimensions, tenant identities, operational statuses, accuracy claims or property facts. Use a transparent background for a standalone reusable cutout, or an intentional Paper/Night surface for a composition. Label the output “Visual concept — not measured geometry.” Any apparent geometry preservation must be checked against the native source before downstream use.

## 5. Bind the existing UI

> Audit [existing component/route/viewer] and its actual data dependencies. Propose the smallest adapter from canonical property/suite/sign IDs to Cypress renderers and state tokens. Preserve existing APIs, access checks and operational source ownership. Keep geometry independent of status and theme. Provide evidence links, unknown/conflict/stale states, keyboard interaction and a list/table alternative. Implement an isolated candidate with source-backed data or conspicuously synthetic fixtures. Verify light/dark, responsive rendering and affected consumer tests. Do not introduce a second database or silently replace the production route.

## 6. Duplicate and stale-brand review

> Review [inventory scope] for byte duplicates, semantic duplicates, obsolete geometry and legacy brand references. Trace every candidate's consumers, history, source authority, rights and intended use. Separate actual legal/historical Orange Ocean references from obsolete product UI; inspect raster/vector logos as well as strings. Output retain/alias/adapt/add/proposed_archive/proposed_delete mappings with evidence, affected IDs/URLs, risk, rollback and approval needs. Do not delete, rename or bulk-replace anything during this review.

## 7. Validate and prepare a bounded release

> Evaluate [candidate slice + proposed migration rows] against the release checklist. Validate record shapes AND referential integrity, source lineage, measured geometry tolerances, units/CRS, operational joins, safe SVG/model loading, actual UI/viewer behavior, light/dark, responsive and accessible states. Distinguish source accuracy, derivative fidelity and visual approval. Record failures and unresolved evidence without filling gaps. Prepare the concrete diff and rollback; request approval only for listed production/destructive actions after completing safe preparation. A candidate is not a production release.
