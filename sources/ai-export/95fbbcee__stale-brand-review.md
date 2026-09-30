# Stale-brand review — OTB / Orange Ocean vs Cypress Command

Status: REVIEWED (automated scan + prior brand sub-audit). No production replacements applied.
Finish pass: 2026-09-29T04:55:00-05:00. Forward authority for **this audit package**: Cypress Command CRE Asset Library.
Public brand elsewhere may still read “Cypress Review”; classify before change.

## Counts (brand-reference-audit.csv)

| Classification | Rows |
| --- | ---: |
| unknown | 3020 |
| historical_evidence | 92 |
| current_library_reference | 82 |
| actual_entity_owner | 77 |
| active_product_identity_candidate | 67 |
| external_integration_url_or_key | 65 |
| fixture | 12 |
| active_product_identity | 5 |
| conflicting_brand_system | 4 |
| current_approved_identity | 3 |
| legacy_product_asset | 2 |
| contractual_or_legal_context | 1 |
| property_identity | 1 |
| current_library_implementation_candidate | 1 |
| current_product_naming_contract | 1 |

Total occurrence rows: 3433.

## Authority rules applied

1. **Cypress Command** = forward product / library identity for new work.
2. **On The Boulevard (OTB)** = first reference property; keep property-specific labels where they name the asset.
3. **Orange Ocean / Orange Ocean, LLC** = preserve when legal entity, executed text, manager attribution, historical collateral, or external integration identifiers.
4. **Cypress Review** = may appear as forward public brand elsewhere; do not bulk-rewrite from this report.
5. No blind global replace.

## Material conflicts

See `evidence/brand-conflicts.csv` BR-CONFLICT-01..07:

- Visual tokens: plan-room vs 04C vs CRE Paper/Ink/Terra (scoped `.cc-cre` until approved).
- Typography stacks diverge; need licensed/local adapter.
- Owner export mastheads still Orange Ocean in `docbrand.js` / `brief.js` / `boardreport.js`.
- Logo: preserve approved 04C SVG bytes; board does not redefine mark.
- Status enums: occupancy ≠ sign-panel state.
- Marketing OO-* exports are historical; archive only with approval.
- Deploy workflow on master; historical “no auto-deploy” docs are stale evidence.

## OTB hardcodings vs reusable Cypress Command

| Area | Finding | Recommendation |
| --- | --- | --- |
| Paths / keys | `otb-command`, `otb-theme`, `otb-site-twin-status`, `OTB_Site_Twin` | Retain runtime keys; add Cypress-facing aliases; rename only with approved migration |
| Theme storage | `localStorage otb-theme` | Keep for compatibility; optional dual-read later |
| Property slug | on-the-boulevard / OTB shorthand | Library `property-on-the-boulevard`; production slug retained |
| Twin pack branding | dist-twin masthead OTB | Presentation rename approval-gated |
| Tools | `tools/otb_brand.py`, fetch-otb-lidar | OK as property tooling; shared contracts must not require OTB |
| CRE library folder | already Cypress Command scoped | Continue additive isolation |

## Safe vs approval-required

**Safe now:** this review, aliases, scoped `.cc-cre` previews in audit/isolation.
**Needs Adam approval:** default export mastheads; renaming `otb-theme`; rewriting marketing PNGs; global Orange Ocean string replace; production CSS token cutover; any deploy.

## Evidence

- `brand-reference-audit.csv`
- `evidence/brand-findings.md`
- `evidence/brand-conflicts.csv`
