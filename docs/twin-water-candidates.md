# Water location candidates

`src/data/twin-water-candidates.json` proposes workbook meter groups for review
against the six blue map locations. It does not change the source map, meter
records, permanent asset IDs, confirmed membership, or service connections.
Adam's 2026-09-25 confirmation establishes that the numbers in the map circles
are counts at each location.

| Map location | Workbook location group | Proposed IDs | Map count | Review classification |
| --- | --- | ---: | ---: | --- |
| M01 | Right of 149 and Back Right of 149 | 8 | 8 | Stronger location and count |
| M02 | Behind 131 | 4 | 1 | Location with count conflict |
| M03 | Behind 119 | 7 | 8 | Location with count conflict |
| M04 | Behind 109 | 4 | 4 | Stronger location and count |
| M05 | Behind 107 | 1 | 1 | Needs review: point is drawn behind 105 |
| M06 | Behind 105 | 2 | 2 | Needs review: point is drawn behind 103 |

Every group has `status: candidate-not-confirmed` and
`supportedRelation: meter-to-map-location`. Even the stronger groups require an
individual meter identifier check. The classifications describe supporting
evidence and conflicts; they are not statistical confidence scores.

The M05 and M06 candidates have matching counts but are displaced by roughly one
suite relative to the workbook descriptions. The source plan was inspected at
its original 2500 x 1164 pixel resolution. That discrepancy is retained rather
than changing the plan point or workbook text. M02's neighboring red count of
four cannot replace its blue count of one because red refers to tenant shutoffs.

There are 26 distinct proposed meter IDs across these six candidate groups.
Unit 123 `W1276858` remains unassigned because its workbook location is `?`.
House sprinkler meter `W1217102` remains unassigned because `Grass near Blvd`
does not select a unique map location. The full workbook contains 28 distinct
water IDs versus 24 city meters reported on the map. The four-meter difference
does not establish four specific missing devices or complete source coverage.

## Geographic context for shutoffs

The thirteen red references have separate `shutoffContexts` entries describing
their nearby street/building features. A phrase such as "rear of the suite
labeled 109" identifies the area drawn on the plan. It does not mean the shutoff
serves Unit 109. No shutoff-to-meter, shutoff-to-tenant, or underground pipe
connection is proposed by this dataset.

## What the supplied GIS images add

The three original GIS screenshots were visually inspected. They show the
center's shape, named surrounding streets, roof address labels, utility
linework, and red boxed `M` symbols along several property edges. This supports
finding broad areas around the long-building rear and the 149 end. No legend
defining the boxed `M` symbols or line colors is visible. Their device types,
individual counts where symbols overlap, and relationship to private tenant
shutoffs therefore remain unestablished.

No workbook W-prefixed meter serial IDs are visible at the GIS symbols. Aerial
roof/address placement is not proof of an underground service connection.
The visible 2021-07-14 taskbar date is only the date displayed by Windows, not
the imagery acquisition date or a guaranteed utility survey date. Cursor
coordinates in the GIS status bar are not fixed image control points.

## Data contract and use

- `candidates` contains six review groups with map IDs, proposed meter IDs, source
  workbook address labels, exact meter/location cells, source map pixels,
  rationale, contradictions, and evidence-based classification.
- `unassignedMeters` preserves the two explicit gaps without choosing a group.
- `shutoffContexts` supplies geographic context only, with
  `serviceConnectionEstablished: false` for every location.
- `gisEvidence` records observations and limits for each original screenshot,
  including its SHA-256 hash.
- Candidate selection may help an operator plan a field check. It must not
  automatically write `memberMeterIds`, `servedUnits`, physical asset IDs,
  meter coordinates, or confirmed isolation relationships.

Source workbook: `Water Meter Number Reference.xlsx`, Sheet1, A3:H32.
Exact per-record cells and original source hashes are in the candidate JSON.
The water map files are byte-identical aliases of the same drawing.
