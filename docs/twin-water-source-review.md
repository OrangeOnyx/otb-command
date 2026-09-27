# Water source review

Read-only review on 2026-09-25 of `Water Meter Number Reference.xlsx`,
`Sheet1!A1:H32`, the supplied water map, and their existing extracted inventory.
The workbook remains unchanged. All 28 water IDs and their approximate-location
strings were checked against the workbook with no extraction differences found.

## Inventory and search groups

There are 28 distinct water meter IDs. Twenty-seven have descriptive approximate
location text. One has `?`: Unit 123, meter `W1276858` (`E18`, `H18`). Location text
supports searching and candidate grouping, not exact individual coordinates.

| Source location text | Meter records | Source address labels |
| --- | ---: | --- |
| Behind 105 | 2 | 101, 103 |
| Behind 107 | 1 | 105, qualifier `#2` |
| Behind 109 | 4 | 107, 109, 111, 113 |
| Behind 119 | 7 | 113, 115, 117, 117.5, 119, 119.5, 121 |
| Behind 131 | 4 | 125, 127, 129, 131 |
| Back Right of 149 | 2 | 135 `#A`, 135 `#B` |
| Right of 149 | 6 | 137, 139, 141, 143, 145, 149 |
| Grass near Blvd | 1 | 101 House; purpose explicitly `Sprinkler` |
| ? | 1 | 123 |

The first seven location groups are relative to another suite or storefront.
The workbook address and the physical location reference must remain separate.
For example, searching 105 should distinguish meter records assigned to address
105 from records whose approximate location is behind 105.

## Numeric labels on the water map

The two supplied water-map files are byte-identical. They contain six blue city
meter annotation points and thirteen red tenant-shutoff annotation points.
The legend identifies colors. Adam confirmed on 2026-09-25 that each number is
the count at that location. The interpretation is owner-confirmed, while the
individual members and current field inventory remain unverified.

| Color / source legend | Counts at mapped locations | Mapped total |
| --- | --- | ---: |
| Blue / City meter | 8, 1, 8, 4, 1, 2 | 24 |
| Red / Tenant Shut Off | 2, 1, 4, 1, 10, 2, 4, 2, 4, 2, 1, 3, 1 | 37 |

The map therefore reports **24 city meters** and **37 tenant shutoffs**. Its 24
city meters do not reconcile to the workbook's **28 distinct water meter IDs**:
there is a four-meter difference between the source totals. Coverage, dates,
individual membership, and the reason for the difference remain unconfirmed.
The sources do not establish that four specific meters are missing from the map
or that either source is a complete current field inventory.

Some group sizes offer matching clues. For example, the blue count of 8 near
Unit 149 is compatible with the eight workbook records described as Right of 149
or Back Right of 149. This is corroborating context, not proof of membership.
Behind 119 contains seven named workbook meters whereas the nearby blue circle
says 8. Behind 131 has four workbook meters but the nearby blue circle says 1.
The missing Unit 123 location must not be assigned to a count gap. No automatic
meter-to-cluster or shutoff-to-meter matches follow from the confirmed counts.

## Mapping aids and limits

- Search existing records by exact/partial water ID, source address, and source
  location text. Show both address and approximate location beside each result.
- Selecting a cluster may suggest location groups for review. Make the selected
  associations explicit and retain the source workbook cell references.
- A meter-to-cluster association and a shutoff-to-meter association are different
  relationships. Neither a neighboring marker nor equal counts proves which
  valve isolates a tenant, meter, or sprinkler service.
- Preserve Unit 113's two distinct water records: `W1252003` at `E10`, Behind 109,
  and `W1202593` at `E11`, Behind 119. Preserve 117.5 and 119.5 separately.
- House water `W1217102` is explicitly Sprinkler. The 125 House and 137 House rows
  have electric IDs but blank water cells. Do not invent missing water IDs.
- The workbook has no address-133 row. Do not infer that 131 supplies 133 from a
  separate shared time-clock label or the plan's combined storefront label.
- Keep physical asset IDs independent of later model position, grouping, or
  relationship edits. Source evidence and field verification remain separate.
