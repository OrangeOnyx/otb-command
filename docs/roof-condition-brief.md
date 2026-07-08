# Roof Condition Brief — On The Boulevard
**Source: Skydio VT300-L survey, 2025-10-15 (~11:30–12:10 CDT)** · Compiled 2026-07-08 from
`J:/Shared drives/AA & RR/Drone Photos/Arnould Boulavard/` (503 frames: 50MP RGB + 640×512 radiometric thermal).
Downscaled key frames in `docs/roof-brief-assets/`; full-resolution originals stay on the Drive.

> **The survey is now ~9 months old.** Both findings below predate two additional storm seasons.
> Priority is getting a roofer on the roof with this brief in hand — not more flying.

## Finding 1 — Membrane failure / saturated area, LONG BUILDING roof
**Evidence:** oblique telephoto sequence `S1002415–S1002442` (hover ~12:03), best frames
`S1002424` / `S1002427` (close-ups) and `S1002433` (context).
- Coating/membrane surface is **gone over a multi-foot irregular area**: exposed dark saturated
  substrate, granule loss, iridescent sheen consistent with trapped moisture/asphalt bleed,
  biological growth around the margins.
- Context frame `S1002433` places it **in the RTU row, between two rooftop units, beside the gas
  line** — surrounded by extensive ponding stain rings across that roof section.
- **Location confidence:** long building, toward the **Johnston/Arnould (south) end** — the
  documenting hover sits SE of the property and the same flight's near-nadir pass over that end
  (`S1002143–S1002155`) covers the 101-block. Exact bay attribution (≈101–109) to be confirmed
  on the roof walk; the RTU pair + gas-line geometry in `S1002433` makes the spot unmistakable
  from the roof.
- **Read:** this is past "watch" — saturated substrate means water is getting under the system.
  Interior leak check for the corresponding bays is warranted.

## Finding 2 — Thermal anomaly (probable subsurface moisture), SHORT BUILDING roof
**Evidence:** radiometric frame `S1002330` + paired RGB `S1002328` (true nadir, gimbal −87°,
11:59), drone directly over the roof at the **Patricia × Arnould (NE) end — 143/145/149 area**.
- Thermal shows a **distinct circular hot anomaly** plus irregular warm zones tracking panel
  seams — a classic wet-insulation signature. (Fastener-grid warm dots are normal thermal
  bridging; the circular blob is not.)
- Paired RGB shows staining/discoloration around and down-roof of an RTU at the same spot.
- **Caveat:** midday solar loading makes single-frame thermal indicative, not conclusive —
  confirm with a moisture scan or core cut before cutting a repair scope.

## Secondary observations (maintenance-grade)
- **Ponding stain rings** across large areas of the long-building section in `S1002433` —
  drainage review while the roofer is up there.
- **Rusted gas-line supports** (bright rust, e.g. `S1002146` near the 101 end) — corrosion at
  pipe supports on the membrane; standard remediation.
- The 101-end field (`S1002146`) otherwise reads serviceable: intact coating, walk pads, normal
  grime.

## Recommended actions (seeded on W-1)
1. **Roofer inspection** — walk both flagged areas with this brief; moisture scan / core cut at
   Finding 1 and Finding 2; interior ceiling check in the corresponding bays; quote repair scope.
   Finding 1 first — it is open to weather.
2. **Butcher Air conversation** — the Finding-2 RTU sits in the 143–149 area. If any of the
   staining traces to unit-149 equipment, Jason's Deli §9.01 (tenant maintains 100% of 149 HVAC,
   monthly PM with Butcher Air) governs who pays for the HVAC-side remediation. Pull the PM
   records for that unit.
3. After scope/repair, re-shoot the two spots (15-min Skydio hop) to close the loop.

## Frame localization notes (for whoever re-flies or re-analyzes)
- RGB frames are GPS-tagged (~0.15 m HPositioningError); gimbal pitch/yaw live in XMP
  (`Camera:` namespace, second Pitch/Yaw entry = gimbal).
- Nadir frames (pitch < −80°): subject = drone position. Oblique frames: subject is offset along
  the view ray — do not map them by GPS alone.
- The app's georeferenced footprints (`src/data/footprints-geo.json`) read **~25 m SW of
  ground truth** at the NE corner (known "eyeball tolerance" from P6c) — nadir frames that show
  roof directly below can plot just outside the polygons. See
  `docs/roof-brief-assets/07-flight-track.svg` for the full flight track over the footprints.

| Asset | Frame | What it shows |
|---|---|---|
| `01-membrane-failure-close.jpg` | S1002427 | Failure area, close telephoto |
| `02-membrane-failure-wider.jpg` | S1002424 | Same area, wider framing |
| `03-membrane-failure-context-rtu-row.jpg` | S1002433 | Locating context: RTU row + gas line + ponding rings |
| `04-thermal-anomaly.jpg` | S1002330 | Circular hot anomaly + warm seams (radiometric) |
| `05-thermal-rgb-companion.jpg` | S1002328 | Same spot, RGB: RTU staining, seams/fasteners |
| `06-nadir-101-end-good-condition.jpg` | S1002146 | 101-end field for contrast: serviceable + rusted gas supports |
| `07-flight-track.svg` | — | All 495 GPS-tagged frames over the unit footprints |
