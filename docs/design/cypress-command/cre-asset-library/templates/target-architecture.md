# Proposed target architecture

Status: DRAFT — proposed architecture, not an executed migration.

## Existing authority and integration seams

Identify the current canonical property, site, suite, signage, geometry, media and brand sources. Link source-register.csv and dependency-map.csv. Record the exact viewer/application entry points and whether they are integrated with property records.

## Proposed target directory tree

Replace the placeholders below with paths grounded in the repository audit. Preserve existing useful roots; a new directory is justified only when it fills a documented gap. Annotate each path as existing/retain, alias/adapter, additive proposal or approval-required move.

```text
<verified-repository-root>/
  <existing-canonical-data-root>/          [retain; owner and consumers]
  <existing-native-source-manifests>/     [retain; large/private sources stay controlled]
  <existing-shared-component-root>/       [retain or adapt]
  <proposed-property-neutral-contracts>/  [only if no suitable contract exists]
  <otb-reference-implementation>/         [property-scoped sources and derivatives]
  docs/design/cypress-command/cre-asset-library/
```

For every proposed path, identify the migration-map.csv rows, source authority, consumer changes, storage/privacy requirement and reason the current location cannot serve the need. Do not duplicate raw scans or create a parallel production source of truth merely to match this tree.

## Schema and ID integration

Link schema-mapping.csv. Identify existing canonical schemas/tables/types, the owner of each assertion and any exchange adapters. Show old → canonical → library/export mappings, units, null/default/enum handling, identity aliases and foreign-key preservation. Explicitly state which production schemas remain unchanged and why. Unresolved conversions block dependent implementation; they do not authorize invented defaults.

## Data and rendering flow

Document source → validation → adapter/transform → derived geometry → asset manifest → map/model/UI/export consumers. Include source lineage, measured-source tolerances, CRS/transforms, light/dark styling and privacy boundaries. Reusable shared contracts must not bake in OTB suite counts, tenant labels, parcel geometry or coordinate assumptions.

## Alternatives and acceptance

Explain why the selected minimal architecture reuses the most existing capability. Identify unnecessary migrations or frameworks to ignore. List acceptance evidence and open conflicts; link change-plan.md for exact actions and approval boundaries.
