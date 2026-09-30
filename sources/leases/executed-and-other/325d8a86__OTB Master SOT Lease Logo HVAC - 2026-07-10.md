---
id: source.otb-master-sot-lease-logo-hvac-2026-07-10
type: source-review
status: leading-current-sot-candidate-requires-designation
domain: real_estate
privacy_zone: business
owner: Adam Abdalla
confidence: high
verification_status: read-only-workbook-inspection
evidence_grade: B-source-artifact
created: 2026-07-31
last_verified: 2026-07-31
source_refs:
  - "[[60 Projects/OTB Unit and Lease Reconciliation Import Guide]]"
  - "[[90 Review/OTB Occupancy and Unit Authority Reconciliation Queue]]"
retrieval_scopes:
  - business
---

# OTB Master SOT Lease Logo HVAC — 2026-07-10

## Assessment

This supplied workbook is the leading current-SOT candidate. It is materially stronger than the prior metadata candidates because it combines 27 unit rows with occupancy, tenant/entity, rent and term fields, lease pointers, HVAC allocation, floor plans, logos, vendors, and a draft contact sheet.

It is **not yet promoted as current authority**. Adam must confirm that it is the current OTB source of truth and supply its as-of date or designation basis. Until then, it may generate reconciliation candidates only.

## Provenance

- File: `OTB_Master_SOT_Lease_Logo_HVAC.xlsx`
- Size: `43903` bytes
- Modified UTC: `2026-07-11T00:28:11.4960000Z`
- SHA-256: `c935b2f297d92fce401dfa79c7578ceaba3693dcf8c5420368a26a0ec386888d`
- Inspection: read-only; eight sheets; eight tables; original unchanged

## Authority warnings

- **formula-error-ac22** — Main OTB SOT AC22 displays #VALUE! for Unit 135B.
- **sf-conflict-unit-101** — Unit 101 SF is 6,877 on Main OTB SOT and 6,677 on Lease Location.
- **sf-conflict-unit-117-5** — Unit 117.5 SF is 1,769 on Main OTB SOT and 1,789 on Lease Location/HVAC Split.
- **draft-lease-unit-121** — Unit 121 points to a file labeled Draft while the master carries operating terms.
- **term-anomaly-unit-145** — Unit 145 shows 1,572 current-term months with no start date.

The contact sheet is restricted. Its values were reviewed for structure but are not stored in the machine assessment or this note.

## One-step decision

Adam confirms whether this workbook is the current OTB SOT and states its as-of date or designation basis. Even after designation, the five warnings remain reconciliation exceptions and no fact is activated automatically.

No source mutation, canonical write, account action, communication, publication, or external action is authorized.
