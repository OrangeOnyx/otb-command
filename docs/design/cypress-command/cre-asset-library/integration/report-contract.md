# Audit report contract

Write reports into a new local review directory. Restrict reports if repository names, storage locators or operational records are sensitive. Use relative locators where possible. Never claim the report templates or helper output are a completed repository audit.

## Required reports

| File | Required contents |
| --- | --- |
| `audit-report.md` | Verified root/HEAD/branch/time, dirty state, method, measured coverage by functional area, findings ranked by impact, source authority decisions, safe changes made, deferred changes and approval requests |
| `scope-ledger.csv` | Every root/nested boundary, tracked/untracked/ignored coverage, exclusions, access failures, links, archives, submodules, LFS/external sources, next action and completion evidence |
| `asset-inventory.csv` | Stable local inventory key, existing IDs, domain, property/suite association, native/derived/reference role, source lineage, paths, checksum, dimensions/units/CRS availability, privacy, current consumers, status |
| `source-register.csv` | Evidence locator/custodian/revision/date, observed/as-built/proposed state, domain authority, measurement definition, accuracy/tolerance evidence, derivative lineage and access state |
| `dependency-map.csv` | Source → transform/adapter → consumer, locator, type/ID/URL linkage, dynamic/static behavior, affected test, breakage risk and verification |
| `duplicate-conflict-register.csv` | Exact/semantic duplicate or data/style/geometry conflict; evidence, competing revisions/values, authority decision, open owner and disposition |
| `brand-reference-audit.csv` | Occurrence location, brand/name/asset, semantic context, current/historical/legal/contractual classification, consumers, recommendation and decision |
| `migration-map.csv` | Explicit old/new paths and IDs, consumers, authority, retain/alias/adapt/add/proposed archive/delete, risk, dependency order, validation, rollback and required approval |
| `schema-mapping.csv` | Existing schema/table/field and source location, canonical owner, library field, type/unit conversion, null/default/enum handling, ID/foreign-key mapping, compatibility, conflicts and validation |
| `target-architecture.md` | Audit-grounded target directory tree with retain/adapter/add/move annotations, canonical data ownership, schema/ID mapping, source-to-consumer flow, privacy boundaries and property-independent shared contracts |
| `change-plan.md` | Separate concrete safe automated/additive actions and explicit-approval actions, exact paths/IDs/environments, phases/dependencies, risk, validation, rollback, approval evidence and actual execution state |
| `geometry-validation.csv` | Compared sources, observation/measurement definition, coordinate spaces/units/transforms, source-derived tolerance and rationale, measured error, acceptance and reviewer |
| `release-checklist.md` | Runtime checks, source/visual fidelity, accessibility, package checks, remaining gaps, and draft/release status |

Empty fields must mean unknown and be called out; never fill with plausible values. Use `not_applicable` only with a reason. Record stable references to sensitive evidence rather than copying it into a report. Use ISO dates only where known. No fabricated timestamps, dimensions, imagery references or approval records.

## Completion states

- `enumerated`: location known; content and meaning not yet reviewed.
- `reviewed`: relevant content and consumers inspected with evidence.
- `validated`: defined checks passed; include evidence and scope.
- `excluded`: content intentionally omitted with reason and follow-up impact.
- `inaccessible`: needed source cannot be read or is unavailable.
- `unresolved`: a substantive conflict remains.

An area is complete only when its required artifacts, dependencies and rendered behavior have been reviewed and findings are resolved or explicitly accepted. A traversal has full enumeration coverage only when every directory/file boundary is accounted for. An audit has full semantic coverage only when the required functional areas have been reviewed. Report those as separate measures. Never represent an exclusion as inspected content.
