# Water evidence comparison — September 25, 2026

The Water pane's **Compare aerial & GIS** action combines the supplied historical GIS screenshots with an unchanged, bounded image from the [Louisiana DOTD 2024 Lafayette aerial service](https://maps.dotd.la.gov/imagery/rest/services/Imagery/2024_Lafayette_6IN_RGBI/ImageServer). The source describes approximately six-inch aerial imagery; its exact flight date is not established. This is aerial photography, not a new utility inventory.

## Use in the twin

Run the existing `npm run dev:review`, open the asset twin, and choose **Water & shutoffs**. Select a blue location to inspect candidate workbook meter records. **Compare aerial & GIS** opens the evidence viewer; use the image selector, location selector, overlay toggle, zoom, and **Center selected** controls. **View location in 3D** returns to the same stable map reference.

The historical overview projects all 19 existing water-map references using a documented approximate alignment. Its taskbar shows July 14, 2021; the aerial acquisition date is unknown. The two closeups remain context images. GIS line colors and boxed M symbols lack a verified legend, so they have not been turned into utility types, routes, or service connections.

The official 2024 image is georeferenced, but the trial alignment from this model's water references was too inconsistent for a pin overlay. It remains a context-only image. The withheld registration controls, residuals, and scale discrepancy are preserved in the aerial dataset for review, without renderable annotations. Existing model positions remain unchanged.

## Candidate associations

| Location | Candidate workbook group | Review status |
| --- | --- | --- |
| M01 | 8 meters described as right/back-right of 149 | Stronger area/count agreement; viewing direction and physical bank remain unconfirmed |
| M04 | 4 meters described as behind 109 | Stronger location/count agreement; individual membership remains unconfirmed |
| M02 | 4 meters described as behind 131 | Map reports 1 city meter; count conflict |
| M03 | 7 meters described as behind 119 | Map reports 8 city meters; count conflict |
| M05 | 1 meter described as behind 107 | Map point is behind plan-labeled 105; adjacent-suite discrepancy |
| M06 | 2 meters described as behind 105 | Map point is behind plan-labeled 103; adjacent-suite discrepancy |

These six proposals cover 26 distinct workbook IDs. Unit 123's `W1276858` remains unassigned because its location is `?`. House sprinkler meter `W1217102` remains unassigned because “Grass near Blvd” does not identify a mapped cluster. None of these proposals establishes which shutoff controls a meter or suite. All 13 shutoff references receive geographic descriptions only.

Candidate meter buttons open existing permanent asset records. No candidate membership is written into physical asset bindings, and no new individual meters or shutoffs are seeded.

## Editable evidence

**Export evidence & candidates** downloads the registered source map, six candidate groups with workbook-cell provenance, GIS registration, official-image provenance, image hashes, crop/projected bounds, and withheld registration diagnostics. Original location-only JSON/CSV exports remain available separately. Image files are referenced by relative asset name and are included in the local evidence package.

Implementation: `asset-twin-water-aerial.js`, `asset-twin-water.js`, `twin-water-candidates.json`, `twin-water-aerial.json`, and `twin-water-official-imagery.json`. No new application dependencies or environment variables are required. Rebuilding the historical registration uses the existing Python environment with numpy and Pillow: `python tools/register-twin-water-aerial.py --check`.

Supporting reviews: `twin-water-candidates.md`, `twin-water-aerial-registration.md`, and `twin-water-official-imagery.md`.

## Acceptance

- All 860 repository tests passed; production build passed. Existing bundle-size advisories remain.
- Historical overview displayed all 19 projected references. Overlay toggle removed all added markers; location selection, zoom, centering, and return to the same 3D reference worked.
- Official 2024 aerial and historical closeups showed no projected markers and disabled the overlay control.
- M04 displayed its four candidate meter records; M02 retained its four-versus-one conflict; M05 retained the adjacent-suite discrepancy. S05 showed geographic context without an inferred service connection.
- Phone comparison checked at 390×844: controls fit the dialog, location selection and 3× detail worked. Normal viewport restored.
- Existing individual asset records and source-map locations were not changed. No database writes, push, or deployment was performed.
