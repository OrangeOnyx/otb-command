# Site Access Inventory — Ingress / Egress, Aisles, Median (A-1 REV 13)
**On The Boulevard Shopping Center · 101–149 Arnould Blvd, Lafayette, LA 70506**
**Prepared:** September 5, 2026 · OTB Property Command, geometry REV 13 · REV 14 addendum September 6 (Arnould frontage islands)
**Status:** DRAWN on A-1 (⇆ Access chip, on by default) · depicts what is physically there per the architect CAD, confirmed against satellite imagery

---

## Purpose
The A-1 site plan showed the property boundary, buildings, stalls and streets but no
curb cuts — nothing said where a car enters or leaves. Leases (exclusive/reserved
parking, signage, common-area definitions, delivery routes) and operations (event
parking, construction staging, a second monument sign) need the actual access
geometry. REV 13 adds a persisted **access** layer and moves the liquor line and
recorded easements onto their own **easements** layer so either can be switched off.

## Sources and method
- **Architect CAD** `cad/Boulev_CLEAN.dxf` (feet). The drawing is plat-axis-aligned, so
  plat feet are `a = CAD X − 423.75`, `b = CAD Y − 459.67` (Arnould R/W = CAD y 459.67;
  POB = CAD x 423.75). Curb returns and sidewalks: layers LINCONC / LINCON2; edge of
  asphalt: LINEDGRD; lanes: TRAVLAN; flow arrows: the plat's "TF" inserts.
- **Recorded plat** (Montagnet & Domingue, last rev. 7/19/2019) — dimension strings,
  "N SPACES" labels, drive arrows; `reference/plat-full-72.png` + crops.
- **Satellite** — frozen Esri z19 base (`public/OTB-sat-base.jpg`) with the CAD projected
  through the footprints georef (`src/data/footprints-geo.json`). Every cut below has a
  visible apron on the imagery. The georef is icon-grade (±~8 ft), so widths come from
  the CAD, not the photo.
- "Throat" = curb-to-curb at the R/W line. "Flare" = width where the returns meet the
  street's edge of pavement.

## Driveways (Belle)
| # | Street | Name | Throat (plat ft) | Throat w | Flare w | Movement |
|---|---|---|---|---|---|---|
| A | Arnould Blvd | Driveway A — main entrance | 187.3 → 218.7 (a) | 31.4 | 56.6 | two-way |
| B | Arnould Blvd | Driveway B — east entrance, shared with JD Bank | 512.8 → 552.5 (a) | 39.7 | 53 | two-way |
| J | Johnston St / US 167 | Johnston driveway — south of the bank notch | -130.4 → -100.0 (b) | 30.4 | 63.9 | two-way |
| P1 | Patricia St | Jason's Deli service drive (149 rear) | -74.5 → -37.7 (b) | 36.8 | 66.7 | two-way service |
| P2 | Patricia St | 135B / 137 rear service pad | -213.6 → -190.7 (b) | 22.9 | 42.8 | two-way service |
| P3 | Patricia St | Lot 8 entrance (Patricia) | -275.5 → -254.5 (b) | 21 | 41 | two-way |
| M1 | Marie Antoinette St | Lot 8 entrance (Marie Antoinette) | 45.5 → 70.5 (a) | 25 | 45 | two-way |
| M2 | Marie Antoinette St | Breezeway apron — pedestrian connector | 89.0 → 98.8 (a) | 9.8 | 13.3 | pedestrian |

Bank context (NOT A PART): JD Bank's own Arnould driveway (NOT A PART) — throat a 637.05 → 656.75, 19.7'. bank parcel; straddles the bank's R=30 Johnston corner return (tangent a 644.7); shown as context only — bank customers also use Driveway B and the Johnston driveway through the notch aisles

### Notes per cut
- **A — Driveway A — main entrance.** Serves: main field N-S aisle (a 186–217) between the 7-space and first 11-space head-in modules; aligned with the raised-median opening (a 172.5–227.8, 55') → full movement; a driveway on the far side of Arnould lines up with it. CAD: throat = curb ends x 611.0 / 642.4; returns c(591.7,458.5) R20 and c(659.5,457.6) R17; plat boundary dimension 187.98' breaks exactly at the west throat edge.
- **B — Driveway B — east entrance, shared with JD Bank.** Serves: notch N-S aisle (a 513–550) along the bank parcel's west line down to the storefront aisle; the bank's drive-thru and Johnston-side circulation ride this cut — the east throat edge sits 2.3' past the notch corner (a 550.12) on the bank parcel. Shared: JD Bank reciprocal access & parking servitude (plat exception 28, Entry 2004-00057697; $250/mo to Belle; expires 12/30/2034). CAD: curb ends x 936.6 / 976.2; returns c(916.3,459.3) R20 and c(1002.8,456.7) R27; median ends at x 930 (a 506.3) → no median across this cut.
- **J — Johnston driveway — south of the bank notch.** Serves: notch E-W aisle (b −100…−122) west to the notch N-S aisle and Driveway B; the pylon-sign pocket (b −130…−141) sits immediately south of the cut. CAD: returns c(1098.9,392.1) R33 (north, lands on the notch corner) and c(1089.5,300.8) R28.5 (south, on the sign-pocket curb); plat arrows: inbound b −104 westbound, outbound b −118/−121 eastbound.
- **P1 — Jason's Deli service drive (149 rear).** Serves: 149 service yard between the Patricia R/W and the short building's Patricia face — FREEZER pad + 6' wood fence per plat topo; culvert apron across the open-ditch shoulder. CAD: curb lines y 385.2 and 422.0 from the asphalt edge to the building face x 425.7; returns c(385.7,372.2) R13 and c(397.0,442.0) R20.
- **P2 — 135B / 137 rear service pad.** Serves: 18' pad behind 135B (Belle office rear door) and 137, curbed at CAD x 407.7 from y 227.3 to 284.0. CAD: curb lines y 246.1 and 269.0; returns c(381.9,236.1) R10 and c(381.3,279.0) R10; R5 returns into the pad curb at x 402.7.
- **P3 — Lot 8 entrance (Patricia).** Serves: Lot 8 pocket — 19 spaces (10 nosing the 135 end walk + 5 nosing M.A. + 4 nosing the breezeway walk). CAD: curb lines y 184.2 and 205.2; returns c(382.7,174.2) R10 and c(382.1,215.2) R10; south edge coincides with the Patricia × M.A. corner-return tangent (b −275).
- **M1 — Lot 8 entrance (Marie Antoinette).** Serves: Lot 8 pocket from the M.A. side, between the 5 M.A.-nosing stalls (a 20–45) and the breezeway curb. CAD: returns c(459.2,159.4) R10 and c(504.2,159.3) R10 onto the asphalt edge y 149.3.
- **M2 — Breezeway apron — pedestrian connector.** Serves: 12.3' breezeway between the short and long buildings (5' sidewalk per plat topo) — connects Lot 8 / M.A. to the storefront aisle; too narrow for a marked drive lane. CAD: breezeway curbs x 512.7 and 522.5 (long-building west wall extended to y 154.2); R5 return c(517.5,154.2) to the asphalt edge.

## Arnould Boulevard median
- Raised median 10.8' wide on the 80' R/W centerline (b 34–44.8).
- Segments (plat ft along Arnould from the Patricia POB): 70–172.5 and 227.8–506.3.
- Opening: a 172.5–227.8 (55.3') — Driveway A — full movement; aligned with a far-side driveway (CAD far-curb returns x 611–648).
- no median east of a 506.3 — Driveway B and the bank drive are full-access up to the Johnston signal; west nose at a 70 leaves the Patricia intersection open.

## Arnould frontage islands (REV 14 — the "skinny islands")
Traced from the CAD LINCONC curbs after the operator flagged them missing (2026-09-06).
Satellite pixels are ~0.85 ft, so 3 ft strips do not read there; the CAD is the source.
- **3.1 ft planting strip** between the stall curb and the property line along the three
  eastern modules (a 218.65–512.85); the 4 ft public sidewalk sits just outside the line.
- **Four curbed end caps**, 3–4 ft × 17 ft with rounded noses toward the aisle: east of
  Driveway A (a 218.65–221.65), between the 11|11 modules (321.55–324.55), between the
  11|9 modules (425.35–428.35), west of Driveway B (509.75–512.85).
- **7-space module** (a 119.75–182.75): stalls set 9 ft back behind a deeper strip
  (b 0…−8.8), stall depth 18 ft → back of stall at b −27.4; a 4 ft island nose at its east
  end (a 183.25–187.25) abuts Driveway A's west curb.
- **149 frontage**: landscape from the 5 ft walk (a 25.85–30.85, Arnould → the 149 corner)
  to the first module (a 119.25); no stalls, matching the plat's "sidewalk/landscape only".
- Stall depth everywhere on this row is 18 ft (CAD), not "to the property line" as REV 12–13
  drew it; the Arnould-side aisle is therefore 21 ft (b −21.6…−42.9), 15.5 ft at the
  7-space module.

## Aisle flow (plat "TF" arrows — every aisle carries an opposed pair → two-way throughout)
| Aisle | a (ft) | b (ft) | Flow | Plat evidence |
|---|---|---|---|---|
| Driveway A aisle | 186 → 217 | 0 → -166 | two-way | TF arrows at (a 197.5 in / 211 out) b −32…−119 |
| Notch aisle (bank west line) *(shared: JD Bank traffic)* | 513 → 550.12 | 0 → -166 | two-way | TF arrows a 526 in / 538.6 out, b −24…−132; 37' between the 9-space row curb and the notch line |
| Johnston-side aisle (101 end) | 623 → 651 | -122 → -281 | two-way | TF arrows a 632.5 / 641 at b −200/−205 |
| Arnould frontage aisle | 100 → 513 | -18.5 → -42.9 | two-way | TF pairs at a 308/317 and 446/455 |
| Middle aisle (between the herringbone bands) | 118 → 513 | -78.2 → -103.7 | two-way | TF pairs at a 316/324 and 443/452 — the plat draws both directions despite the angled stalls |
| Storefront aisle | 118 → 651 | -139.7 → -166 | two-way | TF pairs at a 322/327, 450/454, 561/566 |
| Notch E-W aisle (Johnston drive) *(shared: JD Bank traffic)* | 550.12 → 668 | -100 → -122 | two-way | TF inbound b −104 (a 601, 660) / outbound b −118…−121 (a 616, 643) |

Note: geometry.parking's main-field zone text formerly read "one-way aisles" (raster-era
wording); corrected to two-way in the extractor and regenerated, matching the plat's arrows in all
three east-west aisles and the drawn access layer.

## Streets as built
- **arnould** — 80' R/W concrete boulevard: 4' sidewalk on the R/W, curb 15' out, 19' near lanes each side of the 11' raised median
- **patricia** — 50' R/W asphalt: ~20' pavement on the far half, 26' open-ditch shoulder on the site side (plat: 'DRAINAGE — OPEN DITCH (EXISTING)'); cuts are culvert aprons with R10–R20 returns
- **johnston** — US 167, ±100' R/W: 4 through lanes (2 each way) + center line per TRAVLAN; asphalt edge 24.9' out from the R/W arc; near lanes flow SW (Arnould → Marie Antoinette)
- **marieAntoinette** — 40' R/W asphalt: 20' pavement (b −310.4…−330.4), 10' shoulder on the site side; rear parallel bays open directly to the street

## Open frontages (no discrete curb cut)
- **rear Marie Antoinette strip** — 5 curbed parallel bays (4+4+4+4+2) between islands — no single curb cut; 10' utility easement under the row; electric easement 577566 explains the gap
- **Lot 7 (remote, across M.A.)** — paved area meets the Patricia R/W for 80' (Lot-7 frame CAD y 4.3–84.1, b −455…−375) — uncurbed; no cut onto M.A. (13' landscape setback)

## JD Bank relationship (the notch)
- The excluded corner parcel (sold) is served by **three** routes: its own Arnould drive
  (context only), **Driveway B** (shared cut — the east throat edge lands 2.3' onto the bank
  parcel at the notch corner), and the **Johnston driveway** through the notch E-W aisle.
- Instrument of record per the plat's exception list: Reciprocal Access and Parking
  Easement and Servitude Agreement, Entry 2004-00057697 (plat note 28); the operating terms
  the app carries are $250/mo to Belle, 13 bank spaces, expires 12/30/2034.
- **Not drawn:** the servitude's legal area. The plan labels the shared cut and the two notch
  aisles as "shared access" from the plat's arrows, not from the instrument's exhibit. Pull
  the recorded exhibit before asserting an easement boundary in a lease or dispute.

## Parking reconciliation — candidate resolution surfaced by this trace
The CAD stripes an **11-line head-in row (10 stalls at 9.0' pitch) nosing the Johnston R/W
south of the pylon-sign pocket** (CAD x 1073–1093, y 189–279.5 → a 651–669.5, b −172…−271).
No "N SPACES" label sits on it, so the raster label tally (314) never counted it.
314 + 10 = **324 = the variance "provided" figure exactly.** Recorded in
`geometry.parking.cadUnlabeled` / `totalStriped`; the label tally stays 314 and the
Δ −10 memo stays open until the 10 stalls are confirmed on the ground or a current aerial.

## What changed on A-1 (REV 13)
- New **⇆ Access** chip (default on): aprons with throat widths, two-way arrow pairs at
  every cut and along the aisles, the Arnould raised median + its 55' opening, edge-of-
  pavement lines for all four streets, the Patricia service pads, Lot 7's open frontage.
- New **§ Easements** chip (default on): liquor line (§3a) + notes, church easement note,
  10' utility easements, electric easement 577566, 5×5' guy easement.
- Arnould head-in stalls re-registered to the CAD so no tick crosses a driveway (REV 12's
  last module ran through Driveway B).
- Johnston-frontage row of 10 drawn and labeled "UNLABELED ON PLAT · CAD-STRIPED"; paving
  added for the two notch aisles.
- Asset-pin types added for lease/ops designations: reserved parking, monument-sign site,
  common area, loading zone, dumpster pad (📍 Pins → ＋ Pin).
- Extractor now reproduces REV 12 (perpendicular storefront ticks) — geometry.json is fully
  generated again by `npm run extract-geometry`.

## Imagery check (Google Earth, operator-supplied 2026-09-06)
Five Google Earth captures (one rotated 2D view, four 3D obliques) were compared against
A-1 REV 14. Confirmed: rear Marie Antoinette parallel bays; Lot 8 pocket at the Patricia ×
M.A. corner butting 135A/B; tree islands at the main-field module breaks; the Arnould
frontage strip with trees in the end caps; landscape with no stalls along 149's Arnould
face; the median continuous between Driveway A and its Johnston-end terminus; the JD Bank
drive-thru at the corner with the Johnston drive immediately west of it; cars parked in
the unlabeled Johnston head-in row south of 101; a separate shopping center with angled
parking across Arnould. The 2D view's compass confirms the ~38° rotation from north.

**Lot 7 — RESOLVED (operator, 2026-09-06):** the imagery shows no lot across Marie
Antoinette at the Patricia corner because mature oaks on the parcel hide it from above.
Lot 7 is directly across from Lot 8 on the corner, exactly where the recorded description
puts it (POB 25' along S38°32'E from the M.A. × Patricia R/W corner, 75' × 150.17'). A-1's
placement stands. The striped lot mid-block beside the hip-roofed complex is a different
property (reads as the church's). Aerial imagery cannot be used to verify Lot 7 striping.

**Operator also confirms** the brick paver aprons and the parking areas visible in the
imagery and in the ChatGPT render are real, and that the Patricia and Marie Antoinette
sides carry the rear doors (fronts face the main field toward Arnould and Johnston). No
parking is depicted or expected along the short building's Patricia face; the CAD shows
only the P1 service yard, the P2 pad, and Lot 8 there, which matches.

## Open items for the operator
1. Confirm the 10 Johnston-frontage stalls exist as striped today (a walk or the next drone
   pass); if so, close the Δ −10 memo and update CLAUDE.md to "324 striped = variance".
2. Pull Entry 2004-00057697's exhibit to draw the JD Bank servitude area exactly.
3. Decide whether Driveway A's median opening should carry a "left-turn ingress" note in
   the leasing package (it is the only full-movement cut on Arnould).
4. The breezeway apron is drawn as pedestrian; confirm it is not used as a vehicle lane.
5. ~~Lot 7 location vs. the Google Earth imagery~~ — closed 2026-09-06 (corner, under oaks).
