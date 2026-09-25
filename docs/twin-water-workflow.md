# Water and shutoff mapping — September 25, 2026

The asset twin now shows the 19 source-map locations as selectable blue city-meter and red tenant-shutoff references. Adam confirmed that the printed numbers are counts at each location: 24 city meters across 6 locations and 37 tenant shutoffs across 13 locations. The workbook's 28 unique water-meter IDs remain separate from those clusters until membership is verified.

## Use

Start the existing local review with `npm run dev:review`, open the asset twin, then choose **Water & shutoffs**. The **Water** tab also opens the map. Select a location from the model or list to see its count and source-map highlight; **Focus location** frames a close-up. The blue and red layers can be switched independently. **Source map** opens the original plan, and any selected annotation can be opened in 3D.

Search the water-meter register by exact ID, suite, or workbook location. The results distinguish the original suite association from the meter's location description. Unit 113 retains both meter IDs; Unit 123's W1276858 retains an unknown location. Opening a meter uses its existing permanent asset record, including its photos, inspections, and maintenance requests.

`?view=twin&water=all#spatial` opens the full water map. For a specific reference use, for example, `?view=twin&water=water-map%3Atenant-shutoff%3A05#spatial`.

## Editable exports

The Water pane exports JSON with the source controls, coordinate registration, circle-count confirmation, source hashes, and all 19 annotations. CSV exports stable reference IDs, M/S display codes, source labels, reported counts, and model positions. Coordinates are meters in the existing model's local Y-up frame; they are not geographic coordinates or utility depths. Both formats leave individual meter membership and served units empty.

The existing GLB download is unchanged. The water glyphs are symbolic map references and do not claim to model individual buried devices. No new physical assets or duplicate permanent records are seeded by this overlay.

## Evidence and limitations

See `twin-water-registration.md` for geometric controls and error reporting and `twin-water-source-review.md` for workbook reconciliation. The 24 mapped city meters versus 28 workbook IDs is an unresolved source discrepancy, not proof of four missing devices. Exact field positions, current device condition, membership, underground routes, and operating connections are unverified.

## Acceptance

- All 849 repository tests passed. Production build passed (existing bundle-size advisory remains).
- Browser checked all 19 visible references, separate 6/13 layer visibility, model-label selection, source-map-to-3D navigation, counts, and source highlight.
- Search checked distinct suite/location relationships, both Unit 113 IDs, and Unit 123's unknown location; opened its existing asset record.
- Asset count remained 175 in the existing local review browser, including the two pre-existing QA records.
- Upper-floor and presentation views hid water references. Reopening a selected cluster restored it; a legacy saved view cleared water selection and disabled the new layers.
- Phone layout checked at 390×844, including list selection, no horizontal control overflow, and no overlap between the expanded layer tools and record panel. Normal viewport restored.
- No browser console errors observed. No shared database writes, deployment, or pushes were performed.
