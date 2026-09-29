# Geometry and visual validation

## Establish evidence before comparing

Record source revision, field of application, units, coordinate reference system, local origin, vertical datum where relevant, orientation/north, transform matrix, registration method and uncertainty. Distinguish survey property boundaries, measured physical dimensions, scan-observed condition, design intent, permit records and contractual area definitions. A CAD file is not automatically current as-built truth; a scan does not establish a legal parcel boundary. Escalate unresolved source conflicts; do not average them away.

Use the strongest applicable measured evidence for the assertion. Retain native geometry and make deterministic derivatives with recorded tool/version/settings, parent hashes and transformations. Freeze or checksum the source used for validation. Generated imagery is styling reference only: never infer missing dimensions, panel counts, setbacks, parcel lines, door positions or suite divisions from it. If geometry is unavailable, produce a clearly marked illustrative placeholder without fabricated measurements.

## Define tolerances from evidence

Set numerical tolerances only after reviewing source accuracy, survey/scan registration reports, rounding rules, required use and export precision. Record the tolerance's unit, derivation, reviewer and affected measurement; no universal invented millimeter/percentage threshold. Rendering simplification may require a separately justified screen-space criterion, but cannot alter the canonical geometry. Unknown source accuracy means `unresolved` for measurement-grade claims, even if pictures look similar.

## Required comparisons

1. **Coordinates and topology:** known control points, transforms, axis handedness/up-axis, units, footprint bounds, parcel/site boundaries, closed contours, disconnected components and expected holes. Detect meter/foot and millimeter/meter mistakes, mirrored layouts and shifted origins.
2. **Geometry:** building/suite extents, openings, wall alignments, elevations, roof/parapet profile, sign cabinet/post/panel count and proportions; site circulation and equipment placement only as supported by sources. Keep measured versus proposed distinctions visible.
3. **Areas and dimensions:** use the same measurement definition and datum at both ends. Verify units, calculation inputs, rounding and linked source assertions. Do not substitute computed floor area for lease rentable area.
4. **Scans/models:** registration quality, scan date and coverage, occluded/unmeasured areas, mesh displacement from source, decimation error, texture alignment, LOD effects, source-point sampling and clipping artifacts. A photorealistic model is not proof of measurement accuracy.
5. **Round trip and consumers:** test source → import → canonical/adapted model → export → viewer. Recheck control points and dimensions in output formats. Verify model/map overlays, hit targets, suite IDs, labels, selection, camera reset, accessible alternatives and print/export.
6. **Style:** compare the actual current reference image and approved Cypress Command tokens. Verify hierarchy, material/line treatment, annotation density, lighting and light/dark behavior. Styling must not conceal inaccuracies, add fictitious operational state, or deform measured geometry.

Record `pass`, `fail`, `unresolved`, or `not_applicable` for each required check with evidence. A release can be visually accepted but geometry unverified; state both independently. Only claim measurement-grade geometry for the inspected scope supported by measured-source evidence and successful checks.
