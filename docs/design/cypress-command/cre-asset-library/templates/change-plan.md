# Proposed change plan

Status: DRAFT — listing an action here is not approval or proof of execution.

## Safe automated or isolated additive changes

List only concrete reversible actions authorized by the audit/implementation request: report generation in a new output directory, documentation, non-production adapters, source manifests, verified-source draft derivatives, isolated preview routes and appropriate tests. Preserve existing changes and canonical inputs. Link each action to a finding and migration/schema mapping row.

| Action ID | Exact paths / IDs | Purpose and evidence | Proposed action | Consumers | Risk | Validation | Rollback | Execution status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

## Changes requiring explicit scoped approval

Include deletion/archive/overwrite of originals, canonical source replacement, bulk rebranding, production schema or identity changes, live database writes, production viewer repointing, deployments/publication, destructive migrations and cache invalidations. Include any additional action whose impact becomes materially irreversible. Do not execute these rows until the exact change is approved.

| Action ID | Exact paths / IDs / environment | Reviewed proposed change | Reason approval is required | Consumer impact / risk | Validation evidence | Rollback and limits | Required decision | Approval evidence | Execution status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

## Implementation phases

| Phase | Dependencies | Deliverable | Safe actions | Approval actions | Acceptance checks | Risk / rollback | Exit condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Inventory and authority | Verified root and access | Reports and unresolved-source list | Read-only audit | None assumed | Coverage and evidence review | Preserve all sources | Scope and gaps documented |
| 2. OTB reference slice | Resolved source assertions | Source-to-viewer draft using existing data | Isolated additive work | List if any | Measured geometry and rendered/UI checks | Revert isolated additions | Slice verified for claimed scope |
| 3. Shared adoption | Verified slice and mappings | Reusable adapters/assets at actual integration seams | Scoped compatible additions | List consumer/production changes | Regression, link/ID and cross-property checks | Per-action rollback | Consumers reviewed |
| 4. Release / retirement | Accepted evidence and approvals | Approved production change only | As specifically authorized | Exact release/archive/delete rows | Post-change verification | Proven rollback with limits | Report actual result |

## Execution record and remaining work

Distinguish proposed, implemented in isolation, validated, approved, executed in production and deferred. Record approval scope and timestamp only when known. A passed build or accepted draft never implies approval to delete sources or deploy. List unresolved dependencies and the next concrete action without hiding source-access gaps.
