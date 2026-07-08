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

## Finding 2 — Thermal anomaly: **RETRACTED for Belle (2026-07-08) — it is on a NEIGHBOR'S roof**
**Original claim:** radiometric `S1002330` + paired RGB `S1002328` (true nadir, gimbal −87°)
show a circular hot anomaly + warm seams (wet-insulation signature) "on the short building
near 149."
**Correction:** after the satellite-lens georef was re-fitted computationally (2026-07-08,
`tools/fit-georef.py` — both Belle buildings register plat-rigid at the plat's own north-arrow
azimuth), the drone's GPS position for these frames falls on the **building NORTH of Patricia
St** (~75 m from Belle's unit 149). The Skydio flight was a photogrammetry sweep that covered
neighboring roofs for mesh context — that hover was not over Belle property. **No Belle action
required**; a courtesy heads-up to that neighbor is the operator's call. The thermal signature
itself remains real and textbook — kept here as reference imagery.

## Secondary observations (maintenance-grade)
- **Ponding stain rings** across large areas of the long-building section in `S1002433` —
  drainage review while the roofer is up there.
- **Rusted gas-line supports** (bright rust, e.g. `S1002146` near the 101 end) — corrosion at
  pipe supports on the membrane; standard remediation.
- The 101-end field (`S1002146`) otherwise reads serviceable: intact coating, walk pads, normal
  grime.

## Recommended actions (seeded on W-1)
1. **Roofer inspection — Finding 1** (the only Belle finding): walk the long-building RTU row
   with this brief; moisture scan / core cut at the failed area; interior ceiling check in the
   corresponding bays (~101–109); quote repair scope. It is open to weather.
2. While the roofer is up there: drainage review of the ponding rings + rusted gas-line
   supports (secondary observations below).
3. After repair, re-shoot the spot (15-min Skydio hop) to close the loop.

## Frame localization notes (for whoever re-flies or re-analyzes)
- RGB frames are GPS-tagged (~0.15 m HPositioningError); gimbal pitch/yaw live in XMP
  (`Camera:` namespace, second Pitch/Yaw entry = gimbal).
- Nadir frames (pitch < −80°): subject = drone position. Oblique frames: subject is offset along
  the view ray — do not map them by GPS alone.
- The app's georeferenced footprints (`src/data/footprints-geo.json`) were **re-fitted
  computationally 2026-07-08** (`tools/fit-georef.py` — the earlier eyeballed transform read
  ~25 m off and mislocated Finding 2). Nadir GPS positions can now be trusted against the
  footprints directly. The Skydio sweep also covered NEIGHBOR roofs (photogrammetry context):
  the building north of Patricia and 115 Foreman Dr — don't assume a frame is Belle roof
  without checking its position. See `docs/roof-brief-assets/07-flight-track.svg`.

| Asset | Frame | What it shows |
|---|---|---|
| `01-membrane-failure-close.jpg` | S1002427 | Failure area, close telephoto |
| `02-membrane-failure-wider.jpg` | S1002424 | Same area, wider framing |
| `03-membrane-failure-context-rtu-row.jpg` | S1002433 | Locating context: RTU row + gas line + ponding rings |
| `04-thermal-anomaly.jpg` | S1002330 | Circular hot anomaly + warm seams (radiometric) |
| `05-thermal-rgb-companion.jpg` | S1002328 | Same spot, RGB: RTU staining, seams/fasteners |
| `06-nadir-101-end-good-condition.jpg` | S1002146 | 101-end field for contrast: serviceable + rusted gas supports |
| `07-flight-track.svg` | — | All 495 GPS-tagged frames over the unit footprints |
