# Asset taxonomy and reuse boundaries

The shared library belongs to Cypress Command. Each property supplies its own instances, geometry references and operational joins. Taxonomy describes what exists; it does not authorize creation of missing physical objects.

## Object families

| Family | Examples / relationships | Source and output expectations |
| --- | --- | --- |
| Property | Portfolio-owned logical property; contains sites/buildings | Stable property identity; verified facts stay linked to their source |
| Site / parcel | Boundaries, grades, circulation, roads, easements, access | Survey/CAD/GIS evidence with authority qualifiers; plan and model derivatives |
| Building | Footprint, shell, roof, front/rear/side elevation, floor/level | CAD/as-built/scan provenance; stable building ID |
| Suite / space | Unit outline, entrance, frontage, subdivision | Existing suite ID mapping; separate measured, rentable and lease areas |
| Sign | Pylon, monument, wall sign, directory, wayfinding | Physical instance with faces/panels; measured frame and positions |
| Panel | Individual sign face region / slot | Stable panel ID and parent sign; content mode separate from marketing state |
| Parking / circulation | Stall, aisle, access aisle, crosswalk, curb, loading | Measured geometry and verified classifications; drawn accessibility symbol is not compliance evidence |
| Landscape | Tree, bed, island, planted strip | Generic rendering template + evidence-backed placement/identity |
| Lighting | Pole, fixture, wall light, circuit relation | Asset inventory/location and source references |
| Mechanical | HVAC, roof equipment, exhaust, condenser | Equipment identity, location and service-record joins |
| Utilities / service | Electrical panel, meter, transformer, water/gas, waste enclosure, bollard | Controlled visibility for sensitive infrastructure; measured location and operational owner |
| Safety / inspections | Hydrant, alarm, fire equipment, inspection references | Verified records; no implied inspection or code approval |
| Views / maps / models | Orthographic, site plan, isometric, GLB, GIS layers, twin scene | Derivatives of canonical objects, never alternate masters |
| UI / icon | Card, status chip, list, map control, work-order/lease summary, icon | Shared visual components bind property-specific data through adapters |

## Relationship contract

```text
property -> site(s) -> building(s) -> suite(s)
property/site/building -> physical asset instance(s)
sign -> face/panel(s) -> effective-dated content assignment
entity ID -> measured geometry reference(s) -> derived visual asset(s)
entity ID -> existing tenant / lease / work / inspection record(s)
shared visual template -> many property-specific instances
source register -> claims and derivative lineage across all of the above
```

Building/suite membership and site relationships come from verified data, not a guessed one-to-one rule. Maintain a stable entity ID even if its address, tenant, display name or rendered filename changes.

## Three separate asset kinds

1. **Reference:** a visual board/photo/example that informs styling. Never import its example data as operational truth.
2. **Reusable template:** a property-neutral component, material, icon or parametrized asset. It has no implied installed location or measured dimension for OTB.
3. **Property instance / derivative:** binds a real entity and verified source to a renderable representation. Carries property ID, source lineage, verification and operational references.

Raw CAD/scan/source records form the measured evidence layer beneath these. Keep their canonical locations and access controls; the library registers references rather than duplicating their truth.

## Reserved folders

`shared/signage`, `shared/landscaping`, `shared/parking`, `shared/lighting`, `shared/hvac`, `shared/utilities`, `shared/icons`, `shared/ui` are template homes. `properties/on-the-boulevard/` reserves `property-overview`, `site-plan`, `elevations`, `suites`, `signage`, `site-assets`, `models`, `records` and `provenance` for integration candidates or governed links. Empty folders are deliberate; a placeholder is not a completed reusable asset.

Actual runtime locations are decided by the repo audit. Do not move files into these folders just to match a diagram. Preserve existing schema/table/route IDs and propose explicit adapters. Additional properties use the same contracts with new IDs and source registers; avoid `if property == OTB` inside shared rendering logic.
