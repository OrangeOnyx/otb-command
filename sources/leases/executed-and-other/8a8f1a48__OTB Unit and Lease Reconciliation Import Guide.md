---
id: project.otb-unit-lease-reconciliation-import-guide
type: operating-guide
status: template-ready-current-authority-unresolved
domain: projects
privacy_zone: business
owner: Adam Abdalla
confidence: high
verification_status: contract-verified
evidence_grade: A-design-decision
created: 2026-07-31
last_verified: 2026-07-31
source_refs:
  - "[[60 Projects/OTB Atlas and Asset Command Operating Evidence Pilot]]"
  - "[[60 Projects/OTB Intelligence and Operations]]"
  - "[[90 Review/OTB Occupancy and Unit Authority Reconciliation Queue]]"
retrieval_scopes:
  - business
---

# OTB Unit and Lease Reconciliation Import Guide

## What this does

This package accepts a future current DoorLoop roster or another Adam-designated Grade A/B authority and creates review-only reconciliation candidates. It does not activate Atlas or Asset Command records.

## Safe sequence

1. Export the current unit, tenant, and lease roster without changing the source system.
2. Preserve the raw export unchanged and record its SHA-256, export time, as-of date, account reference, and authority designation.
3. Map the export into the blank JSON or CSV template. Null means unknown; absence is never inferred.
4. Validate headers, authority, unique unit IDs, occupancy states, evidence links, and executed-versus-draft status.
5. Review conflicts unit by unit against executed leases, amendments, and the current operating authority.
6. Promote only human-approved, evidence-backed records through the existing Atlas/Asset Command gate.

Historical rent rolls, tenant lists, screenshots, marketing packages, duplicate count, and file recency are comparison evidence only. They cannot establish current truth.

No canonical write, live activation, payment, communication, publication, permission change, or external action is authorized.
