# Cypress Command · Commercial Real Estate Asset Library

Version 1.0.0 · 2026-09-29 · Repo integration package

**Cypress Command is the forward system and visual authority. On The Boulevard (OTB) is the first reference property. Measured sources govern geometry; illustrations govern styling only.**

This package is ready to place in an existing repository. It supplies the reference, implementation contract, schemas, examples, prompts, and audit workflow. It does not claim that the OTB repository has already been audited or that its property model has been verified. No production code, property database, deployed UI, or original source drawing was changed to prepare it.

## Start from the actual repository root

1. Extract the ZIP to a temporary directory. It contains a `docs/` tree, with no enclosing release folder.
2. Confirm the destination with `git rev-parse --show-toplevel`. If this points above the actual OTB app, the audit must include the enclosing repository and identify all nested apps.
3. Copy the included `docs/design/cypress-command/cre-asset-library/` into the repository. If that directory already exists, compare files and merge deliberately; never extract over existing work blindly. Preserve originals and record supersession.
4. Paste [the master prompt](prompts/MASTER_IMPLEMENTATION_PROMPT.md) into Codex running at that root. It authorizes the full audit and isolated additive drafts, with explicit approval required for destructive production changes.
5. Review the generated coverage ledger, source map, dependencies, conflicts, and migration mappings before approving a bounded production migration.

No environment variables or service credentials are needed for this package. The optional inventory helper uses Python's standard library. Schema validation uses Python 3.10+ with `jsonschema>=4.18,<5`; use a temporary virtual environment, not the application's dependency files. See [schema validation](schemas/README.md) and [audit workflow](integration/README.md).

## Read in this order

| File | Purpose |
| --- | --- |
| [source-of-truth.md](source-of-truth.md) | Authority by field, source conflicts, precision, provenance, release rules |
| [style-spec.md](style-spec.md) | Normative visual and UI specification; measured model remains authoritative |
| [references/README.md](references/README.md) | Current board, supporting references, source identity and limits |
| [asset-taxonomy.md](asset-taxonomy.md) | Reusable objects and relationships |
| [naming-conventions.md](naming-conventions.md) | Stable IDs, filenames, variants and versioning |
| [integration/README.md](integration/README.md) | Whole-repository traversal, dependencies and migration procedure |
| [schemas/README.md](schemas/README.md) | Contract, examples, validation and cross-record limits |
| [prompts/README.md](prompts/README.md) | Reusable audit, derivation, illustration and release prompts |
| [RELEASE_AUDIT.md](RELEASE_AUDIT.md) | Package checks and remaining real-repository acceptance work |

## Package structure

```text
docs/design/cypress-command/cre-asset-library/
  README.md
  source-of-truth.md
  style-spec.md
  asset-taxonomy.md
  naming-conventions.md
  RELEASE_AUDIT.md
  MANIFEST.sha256
  references/       # current CRE board + supporting source images + manifest
  tokens/           # explicit implementation defaults, namespaced, opt-in
  schemas/          # source/property/site/building/suite/sign/panel/asset contracts
  examples/         # synthetic fixtures; never production OTB records
  integration/      # audit procedure, inventory helper and migration guidance
  templates/        # blank report contracts
  prompts/          # master prompt + reusable task prompts
  shared/           # reusable visual templates; no property-specific truth
  properties/
    on-the-boulevard/ # first implementation's reserved paths and intake brief
```

This is the design and contract home, not a mandate to relocate application code, CAD files, private leases, or live data into `docs/`. Map the repository's current source owners first. Keep native measured files in their governed stores; register immutable references and derive lightweight display assets. Prefer adapters to a second property database or wholesale schema replacement.

## What is included and what is intentionally unpopulated

The latest CRE master board was recovered from the original conversation's image viewer and is included unmodified. Seven reference images are included in total. Their hashes and provenance are in [reference-manifest.json](references/reference-manifest.json). The board contains generated examples; the apparent streets, dimensions, counts, tenant names, areas, status values, logos, and dates are not verified OTB records.

No CAD, survey, floor plan, scan, or real operational export was supplied to this packaging workspace. OTB's reserved folders are therefore empty except for intake guidance and a draft identity record. The user's statement that measured sources exist guides the audit, but is not evidence that any particular model has been calibrated. Do not fill gaps from the reference image.

## Completion standard

The next repo run is complete when every repository subtree is accounted for, accessible first-party assets and consumers are inspected, inaccessible/external sources are explicitly listed, proposed mappings preserve identities and lineage, and approval boundaries are clear. A filename listing, successful build, or schema pass alone does not establish source accuracy or complete integration.

For the first implementation, derive a single measured OTB site/suite/sign slice through the existing data and viewer seams. Prove provenance, selection, status binding and visual fidelity before expanding. Keep all shared components property-neutral.
