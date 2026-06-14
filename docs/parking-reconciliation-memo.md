# MEMO — Parking Count Reconciliation (Δ −10)
**On The Boulevard Shopping Center · 101–149 Arnould Blvd, Lafayette, LA 70506**
**Prepared:** June 10, 2026 · OTB Property Command, geometry REV 11
**Status:** OPEN — pending variance file pull

---

## Issue
The recorded plat's own striping labels (Montagnet & Domingue, last rev. 7/19/2019)
total **314 spaces** across all zones. Variance **Entry 99-11797** states
**324 provided / 344 required**, and conditions floor space as
"limited to available parking spaces." The 10-space gap is unexplained.

This matters because the variance figure is the legal ceiling that every lease,
license, and stall-removal decision is assessed against. If actual striping is
314, the effective cushion against the 344 requirement is thinner than the
variance suggests; if the variance counted zones differently, we should know
which definition controls.

## Zone-by-zone (plat labels, raster-verified at 200 dpi)
| # | Zone | Count | Source detail |
|---|---|---|---|
| 1 | Main field — two angled double-loaded bands (9.00' × 23.70' stalls) | 100 | 36+36 west segments, 14+14 east segments |
| 2 | Arnould frontage head-in row | 38 | modules 7 + 11 + 11 + 9; none at Jason's frontage |
| 3 | Storefront row (long building) | 56 | one angled row, labeled "56 SPACES" twice |
| 4 | Lot 6 west-field zone | 28 | 16 island module + 12 at short-bldg walkway |
| 5 | Lot 8 pocket (Patricia × M.A.) | 19 | 10 + 5 + 4 |
| 6 | Rear M.A. parallel row | 18 | 4+4+4+4+2; gap at electric easement 577566 |
| 7 | Johnston strip (Lot 1) | 10 | 8 head-in + 2 at pylon sign |
| 8 | Lot 7 Block M remote (110 Marie Antoinette) | 32 | 6 + 8 + 10 + 8 |
| 9 | JD Bank parcel (reciprocal easement) | 13 | 6 + 7 — matches the easement's 13 exactly |
| | **TOTAL** | **314** | vs variance **324** → **Δ −10** |

## Candidate explanations (ranked by likelihood)
1. **Vintage mismatch.** The variance is 1999; the plat striping shown is the
   7/19/2019 revision. A re-stripe between 1999 and 2019 (e.g., adding the
   handicap loading pad in Lot 6, the electric-easement gap in the rear row,
   or island additions in the field) could have removed ~10 stalls after the
   variance count was fixed.
2. **Different inclusion rules.** The 1999 count may have included zones the
   plat doesn't label as striped spaces — e.g., the 75.12' Arnould apron
   module, the breezeway apron, or unstriped overflow on Lot 7 (gravel lot;
   1999 layout may have been counted at a higher yield than the 32 striped
   today).
3. **Handicap conversion.** ADA restriping typically consumes ~1 stall per
   van-accessible pair. Three handicap symbols appear in Lot 6 alone; a
   post-1999 ADA pass could account for several spaces.
4. **Count error in one document.** Either the variance application's tally or
   the plat's zone labels could simply be wrong; the plat labels internally
   reconcile (e.g., JD Bank 6+7 = the easement's 13), which favors the plat.

## What to pull (action list)
- [ ] **Variance file, Entry 99-11797** — Lafayette Consolidated Government,
      Planning, Zoning & Codes. Request the site plan exhibit attached to the
      1999 application — its stall layout is the authoritative "324."
- [ ] Any **re-stripe / parking-lot permits** for 101–149 Arnould Blvd,
      1999–2019 (and ADA upgrade permits).
- [ ] **Current aerial count** (parish GIS or recent ortho) — what is actually
      striped today vs both documents.
- [ ] JD Bank easement instrument — confirm whether its 13 spaces were inside
      or outside the 1999 "324 provided."
- [ ] Lot 7 (remote) — confirm whether the 1999 count included it, and at what
      yield (today's plat stripes 32).

## Interim guidance (until resolved)
- Continue citing **324 / 344 per Entry 99-11797** in legal and leasing
  contexts — it is the recorded figure.
- For *operational* capacity planning (events, church overflow, construction
  staging), use the **314 striped** figure — it is what exists on the ground
  per the latest plat.
- Any proposal that removes stalls (outdoor seating, dumpster relocation,
  drive-thru queue) should be tested against the **larger deficit**:
  344 required − 314 striped = **30-stall effective shortfall**, not 20.

---
*Sources: recorded plat (Montagnet & Domingue, Inc., 5/20/1994, last rev.
7/19/2019), raster-traced at 200 dpi — evidence crops in `reference/park-*`,
zone audit in `src/data/geometry.json → parking`.*
