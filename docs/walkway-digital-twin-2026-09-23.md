# Walkway digital twin — tonight's findings + tomorrow's capture plan (2026-09-23)

Goal (operator): a model of the center you can move through in 3D, where every column, bench, drain and meter
under the walkway canopy is visible and can take an exact pin.
Approach: a **measured layer** (columns and fixtures as data, snapped to the 24" module) for pins,
plus a **photoreal layer** (a splat with ground-level coverage) for the look.

## 1. Correction: the existing splat IS the 2020 flight

`E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\DJI_0001…0030.MOV` are byte-size-identical to the
Oct-15-2020 Bailey clips (`Belle Shared Drive\The Boulevard photos 2020\Drone Footage RAW\`:
319/1000/640/393/482/313/589/459/549 MB). The folder name is its copy date. So:
- `OTB-splat-v1.ply`, the Lens-B mesh and the dense cloud all show the center **as of October 2020**
  (visible signage: Victoria Nails, Clothing Loft, OUPAC Loans, Politics, Auto Title).
- There has been no 2026 DJI flight. Tomorrow's flight is the first current-state aerial capture.
  Treat the 2020 model as the historical time slice.

## 2. Column grid detected from the 2020 dense cloud (long building 101–133)

Tool: `tools/detect-columns.py`, output `src/data/walkway-columns.json`. It reads the 5.1M-point
COLMAP dense cloud, bakes `splat-align.json` into plan px, keeps points 3–9 ft above grade and
fits a regular column lattice along the storefront run.

| Result | Value | Confidence |
|---|---|---|
| Columns, long building | **19** (L01 at x 201.5 → L19 at x 1097.0) | lattice score 2.38; strongest at L17–L19 (129–133) |
| Center-to-center pitch | **26.67 ft ≈ 26'-8"** | ±2% — plan scale and alignment fit carry about 0.5 ft over one bay |
| Walkway depth, storefront → column line | **≈15.0 ft** | the storefront peak may be signage or glass; confirm with a tape |
| Per-column position | ±2 ft | L02 and L16 are weak (z < 0.7) |
| Cross-walkway position | seated 1 ft inside the CAD curb (y 310.7). The cloud read 5.8 ft nearer the storefront; the splat fit is roof-scored and biased on that axis | CCTV shows the columns on the curb |
| Short building 135–149 | **not resolved** | 2020 cloud too thin under that canopy; needs the ground capture |

**Module check (operator: 24" columns, 24" scored squares).** 26'-8" is 13⅓ squares, not a whole
number. Either (a) the bay is really 26'-0" = 13 squares (a 2.5% scale error, within tolerance), or
(b) the scoring isn't laid out on the column centers. **The tile counts in §3.4 settle it.** After
that, every column snaps to an exact square index and pins can be placed by square.

Cross-check, CCTV `suite-113-south`: the columns stand at the walkway/parking edge. The bay south of 113
has an ADA curb ramp that cuts through the scoring, so tile counts can't be taken from that frame.

### 2b. ADOPTED (operator ruling 2026-09-23): the Floorplanner columns

"The floor planner is a more accurate representation." A-2 now draws all **37 Floorplanner columns**:
- **26** on the long building (L01–L26, 101 end first, including the pairs at the 101 end).
- **7** on the short building (S01–S07).
- **4** wrapping around the 101 / Johnston end (W01–W04).

`tools/import-fp-columns.py` registers them to the plat by matching each building's Floorplanner envelope
to its plat footprint. The storefront wall run gives the ends and the collinear wall runs give the depths. It is a 180° rotation,
using the plan's documented px/ft (1.8515 x, 1.8866 y) and solving offsets only. Worst footprint residual: **3.8 ft**.
Sources are vendored in `reference/floorplanner/`. Column height is drawn at Floorplanner's 12'-9" wall height.
The scan detector (`tools/detect-columns.py`) is kept only as a cross-check and now writes `export/`.
The walk still confirms the count, the pairs and the wrap.

### 2a. Superseded analysis: the Floorplanner model vs the scan (kept for the record)

A Codex pass (`C:\Users\adam\Documents\Codex\2026-09-23\ca\work\column-analysis.json`) found **37**
walls in the Floorplanner model that look like 24" square column loops. It flags them as candidates
from the model only, with no count on site. They sit in three lines:
- **Long line: 26 columns** over about 520 ft. Bays run about 24.5–26 ft, with a 3.7 ft doublet near the middle.
  At one end there are **four pairs 8.8 ft apart**. Bailey photo #01 (2020) also shows paired columns
  under the canopy's small roof peaks.
- A perpendicular line of 7 at about 28 ft bays (150 ft), and one of 5 at 14.7–20.3 ft (72 ft), at opposite ends.

I tried registering that sequence to the plat by maximizing cloud density at every drawn column (scale held at 1.0).
It fit **worse than the plain regular lattice in either orientation** (score 1.22 or 0.96, against 2.38). It also
put the 5-column line inside suite 101 or off the ends of the CAD walkway strips. The Floorplanner layout
is hand-modeled, and its bay spacing doesn't hold up against the photogrammetry across the full run.
**A-2 therefore keeps the scan lattice.** The Floorplanner model is logged as a conflicting count, 26 against 19.
The walk settles it:
- Count the columns along the long building, end to end.
- Note where the **pairs** are and the gap inside each pair.
- Say whether a column line wraps around either end of the long building.

The CAD shows a walkway strip only in front of the long building (y 294.6–312.6) and in front of the short
building (x 1134.5–1152.5). It shows none at the Johnston end, where parking runs to the wall.

## 3. Capture plan — tomorrow (Insta360 + drone + phone)

Save everything to `E:\OTB-CAPTURE\2026-09-24\` (never the repo). Shoot in steady light, ideally early
morning or overcast, with few cars. Lock exposure and white balance on every device.

### 3.1 Insta360 — walkways (highest value; about 30 min)
- Invisible selfie stick or monopod at about 5 ft. 360 **video** at max resolution, walking slowly (about 1 ft/s).
  Don't pause and turn in place; keep walking in smooth lines.
- Long building, three passes, all the way from 101 to 133:
  1. about 4 ft off the storefront glass,
  2. about 2 ft inside the column line,
  3. outside the columns along the parking edge (this ties the ground capture to the drone frames).
- Short building 135–149: the same three passes. Also the 149 patio, the breezeway (12.3 ft) between
  the buildings, and the rear Marie Antoinette service side.
- Loop back to the starting point at the end of each pass. Closing the loop cuts drift in the solve.

### 3.2 Drone (the same day, straight after the walk)
- **Check authorization first:** use LAANC via B4UFLY or Aloft (the site may sit inside Lafayette Regional's controlled airspace; confirm before takeoff).
- Orbits of the whole center at about 60 ft and about 120 ft AGL, gimbal at −30° and −45°, video.
- **Low canopy pass:** fly along the parking edge of each walkway at about 15–20 ft, gimbal −10° to 0°,
  looking under the canopy. This pass links the air and ground data.
- Nadir grid at about 150 ft, 75% overlap (stills). This gives a current orthomosaic without gaps.

### 3.3 Units 131 and 133 (for marketing and the twin)
- Insta360 on a tripod at about 5 ft. 360 **photos** every 6–8 ft in a grid, at every doorway, and in each room corner zone.
  Then one slow video walk-through. Lights on, blinds open, doors propped.
- In each unit, tape and photograph one known dimension (for example, the storefront width). This fixes the scale.

### 3.4 Ground truth (phone, 5 min; the most important numbers)
1. **Tiles between two column centers**, counted along the walkway at three places: at 105, at 121 and
   at 131. Note any partial squares.
1a. **Total column count** along each building. Note which bays have **paired** columns, and the gap inside each pair
   (this settles the 19-vs-26 conflict in §2a).
2. **Storefront glass → column face**, taped, at the same three places.
3. **Whether the scoring lines up with the column faces** (yes or no, one photo).
4. Benches, trash cans, meters and drains: one photo each with a scored square in frame, then note
   the nearest column (for example, "bench, 2nd bay north of 113").

## 4. What happens with the capture (no licenses needed)

1. Split the Insta360 equirectangular frames into perspective views and extract frames from the drone video.
2. Solve everything in one COLMAP run: the ground passes and the drone's low canopy pass share views, so they land in one frame.
3. Retrain the splat (Brush) and build the dense cloud. Refit `splat-align.json` (`tools/fit-splat-align.mjs`).
4. Re-run `tools/detect-columns.py` on the new cloud. Snap to the confirmed module and add the short building.
5. Add a fixtures layer for benches, cans, meters and drains from §3.4, keyed to column/square indices,
   so pins land on exact squares.
6. Keep the 2020 splat as a time-slice layer you can switch on for comparison.
