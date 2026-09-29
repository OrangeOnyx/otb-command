# Source of truth and provenance

Normative contract for this library. Authority is **field-specific**, not a universal newest-file rule. A verified source can govern one fact and be silent about another.

## Authority hierarchy

| Domain | Governing evidence | Must never override it |
| --- | --- | --- |
| Geometry, coordinates, dimensions, spatial relationships | Applicable CAD drawings, surveys/plats, floor plans, accurate verified property data, measured dimensions, calibrated digital-twin/LiDAR/photogrammetry/scan data | Generated illustrations, traced reference-board silhouettes, UI mockups, uncalibrated viewer models |
| Parcel boundary and survey control | Applicable survey/plat and verified coordinate/control information, with revision and scope recorded | Decorative site plan, generic GIS basemap, imagery alone |
| Existing physical conditions | Dated verified as-built records and field/scan evidence applicable to that condition | A design drawing assumed to be an as-built, or the newest export assumed to be a newer measurement |
| Tenant, suite assignment, lease terms, operational status | Applicable executed leases/amendments and verified operational records; respect effective dates and record owner | Board labels, generated tenant names, a cached card, filenames, sign occupancy alone |
| Visual language and organization | This package's style contract and current CRE board; supporting Cypress references for unspecified brand details | Old Orange Ocean/Cypress Review UI or an older palette silently promoted over current direction |
| Rendering and delivery | Deterministic derivatives linked to the governing sources and approved transformation | A render promoted to a measured record because it looks precise |

Measured inputs are authoritative **within their documented scope and verification**. File extensions, visual realism, a `final` filename, or a digital-twin label do not confer accuracy. A recorded property area may be a lease/rentable area; a geometric area may be gross/interior/usable. Preserve the definitions separately.

## Conflict resolution

1. Identify the disputed field/object, both values, units, coordinate frames, source hashes/revisions, capture/effective dates and consumers.
2. Determine whether the sources describe design intent, as-built condition, a lease definition, survey boundary, or current field condition. A survey and a recent scan can govern different questions.
3. Normalize only through documented unit/frame transformations. Preserve original values and source precision.
4. Compare against an evidence-based tolerance selected for the intended use. Do not invent a universal accuracy threshold or resolve conflicts by averaging.
5. Record the proposed governing source, reason, reviewer and affected outputs. If authority remains unresolved, mark the field conflicted/unverified and block its release as verified; continue unrelated work.

Dates break ties only after authority, scope and suitability are established. Do not auto-select the largest file, newest timestamp, prettiest model, or majority value. Keep superseded sources traceable.

## Required source register

For every usable source, record a stable ID, native location (repo-relative path or durable governed-store reference), type, immutable revision or content hash, owning party/system, document/capture/effective date when known, units, coordinate system, verification status and usage restrictions. Record page/sheet/layer/object/scan-region locators for field-level claims. Never invent dates, surveyor credentials, CRS codes, scales, control points, or measurement accuracy.

Large scans, licensed CAD, private leases and credentials do not belong in a public asset bundle. Store durable references without secrets or expiring signed URLs. A local source path can be recorded in the private audit; avoid committing machine-specific paths to reusable shared templates.

## Geometry pipeline

```text
Native measured sources + field authority decisions
  -> canonical property objects and coordinate frames
  -> deterministic conversion / simplification with recorded settings
  -> SVG plans/elevations + glTF/GLB display models + raster previews
  -> Cypress presentation components + live operational adapters
```

Keep CAD/BIM/scan originals immutable. Every derived geometry asset records input source IDs/revisions/hashes, conversion tool/version, selection/layers, scale/unit conversion, transforms, output hash, source verification state and QA evidence. Regeneration creates a new derivative revision; it does not erase the prior provenance.

Explicitly distinguish international feet from US survey feet. Record horizontal and vertical datum separately where relevant. Local coordinates require a stated origin, axes/handedness and unit; georeferencing requires verified control/transform, not a guessed map overlay. Keep world units independent of SVG screen units, viewport size and camera zoom. An isometric camera must never deform the model. Scale bars and north arrows require known scale/orientation and appropriate projection.

Scan registration, control alignment and floor-level placement must be reviewed before geometry is marked verified. Uncalibrated meshes, holes filled by reconstruction and uncertain occlusions remain marked as such. A verified source does not automatically verify every conversion or simplification made from it.

## Release gates

- **Draft:** traceable but incomplete or unverified; visibly labeled in previews.
- **Candidate:** intended sources selected, transformations documented and checks ready; no implication of operational approval.
- **Verified/released:** source authority accepted for each used field, geometry and operational joins checked, tolerances documented, visual acceptance passed, and release scope recorded by the responsible reviewer.

Use the exact schema enum names when serializing records; these prose stages describe the workflow, not extra schema states. Source verification, asset geometry verification and publication state are different facts.

Generated imagery can be accepted as a visual reference without ever becoming a geometry source. Verification of its file integrity does not verify the property it depicts. Unknown is never zero, vacant, unavailable, occupied, or compliant.

## Operational joins and historical brand names

Use stable property/building/suite/sign/panel IDs, independent of tenant names and file paths. Tenant movement and lease amendments are effective-dated relations in the existing operational source. A panel can be blank while its suite is occupied; sign marketing state is not lease status.

Cypress Command governs forward brand and library architecture. Preserve Orange Ocean or other legacy names when they are legal entities, executed document text, historical provenance, external integration identifiers, domains, storage keys, or contractual facts. Classify those references before proposing changes. Preserve aliases until all affected consumers are migrated and approved.
