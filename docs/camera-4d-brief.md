# Cameras → 4D Shopping Center — Investigation Brief

**Date:** 2026-07-15 · **Inputs:** operator's 17-camera NVR grid (night capture,
wide-angle/fisheye), Bilawal Sidhu "IronSight" video (FH4eS0oi4uE — fusing 2D videos
into a navigable 4D replay), Bilawal Sidhu WAMI video (cWbBsfwtCIo — persistent
wide-area imagery as a "living digital twin").

## Bottom line
The 17 fixed cameras are the missing **time dimension** of the OTB digital twin.
Everything built so far (splat, mesh, georef footprints, Lens B world) is a static
3D snapshot. The cameras run 24/7 from *fixed, known* positions — which makes the
hard part of IronSight (solving moving cameras every frame) trivial for OTB: each
camera is solved **once**, then every pixel it ever records is georeferenced forever.
3D twin + persistent registered video = 4D property.

## Why OTB is unusually well positioned
IronSight had to bootstrap 3D from the videos themselves. OTB already owns:
1. **A world coordinate system** — Lens B world, with `splat-align.json` proving the
   COLMAP→world transform pattern works (a `camera-align.json` is the same seam).
2. **Surveyed ground truth** — the plat geometry in `geometry.json` + georef
   footprints. Parking stripes, columns, and curb lines are *known coordinates*
   visible in nearly every camera frame → free ground-control points. Cameras can be
   registered by homography against the plat directly, likely without COLMAP at all.
3. **The 121-frame COLMAP solve + 3DGS splat** — the photoreal backdrop the 4D layer
   plays on top of (IronSight's "God's Eye View" = splat + tracked entities; OTB has
   the splat half already).
4. **Server-side AI plumbing** — `api/concierge.js` pattern + Anthropic key in Vercel
   env; the VLM-classification loop from the video (clip → model → verdict → human
   spot-check) maps directly onto existing seams (W-1 cards, K-1 register, AI-1).

## What each input contributes
- **IronSight (video 1):** the recipe — (a) time-sync streams, (b) solve cameras into
  one 3D space, (c) detect/track entities in 2D, project into 3D via the solve,
  (d) VLM classifies events from short clips, human reviews the low-confidence ones,
  (e) browser replay with camera presets + timeline scrub. Note his open-source
  **"God's Eye View" V1 drops July 2026 (this month)** — watch the repo; the replay/
  compositing UI may be harvestable (ideas-only, same discipline as the v9 harvest).
- **WAMI (video 2):** the concept ceiling and the warning label. Persistent imagery
  + tracking = "pattern of life" analytics. For a 4.84-acre private property this is
  *operational gold* (traffic, occupancy, incident rewind) — but the same video is a
  catalog of why identity-level tracking creates legal/PR exposure. Design rule below.
- **17-camera grid:** coverage inventory. Views observed: main parking field (multiple
  overlapping), colonnade/walkway, patio seating, rear service/Marie Antoinette side,
  landscaped corners, street approaches. Fisheye lenses → de-warp (one-time intrinsic
  calibration per camera) required before homography.

## Concrete payoffs, ranked by value-per-effort
1. **Camera layer in the twin (registry + frusta).** Every camera drawn as a view
   cone on A-1 / satellite / Lens B; click a cone → that feed (or latest snapshot).
   Instant coverage-gap audit (blind spots visible as unpainted plan area). This is
   the security-design payoff and needs zero CV — just camera poses.
2. **Parking occupancy analytics.** Vehicle detection per frame → ground-plane
   projection → per-zone stall counts over time. Directly serves the property's
   central constraint (variance 99-11797: 324 legal / 314 drawn): measured
   utilization per zone per hour turns every leasing/licensing/stall decision from
   estimate into evidence. Also validates/quantifies the "33,000+ VPD" marketing
   claim with owned data (measured entries/exits).
3. **Overnight VLM night-watch.** IronSight's exact loop pointed at operations:
   batch overnight clips → model flags dumpster overflow, lamp outages (visible in
   night frames), water pooling after rain, blocked fire lanes, loitering, gates/
   doors left open → auto-draft W-1 action cards for morning review. Low-confidence
   → human review queue (the annotation-tool pattern from the video).
4. **Incident rewind ("TiVo for the property").** Timeline scrub on the twin:
   pick a time, see tracked activity dots on the plan/splat. The Baltimore use-case
   at parking-lot scale: fender-benders, slip-and-fall claims, vandalism — walk
   backwards from the event. High liability value for an owner-operator.
5. **Tenant traffic intelligence.** Aggregate (not identified) foot-traffic counts
   per storefront zone → leasing collateral ("measured X customers/day past unit
   131") and anchor/co-tenancy analytics. Feeds P-1 and the marketing story.
6. **Change detection → capture triggers.** Fixed viewpoints make diffs trivial:
   striping fade, new equipment on roofs/pads, façade changes → flag "re-fly /
   re-photo needed" instead of discovering drift months later.
7. **Full 4D replay lens (the IronSight showpiece).** A-2 fifth chip: splat + live
   entity tracks + timeline. Demo-grade wow for buyers/lenders; built from parts
   1+2+4. This is the destination, not the first step.

## Honest constraints
- **Night-only sample:** the provided grid is nocturnal; detection quality and splat-
  refresh value need daytime samples to assess. (Night frames are *good* for lamp-
  outage detection, though.)
- **Fisheye:** every camera needs one-time undistortion calibration before its pixels
  can be projected. The plat's stripe grid doubles as the calibration target.
- **Interior/canopy cameras:** colonnade views have weak plat-feature visibility;
  those may register against the mesh/splat instead of the plat.
- **Not needed:** per-frame camera solving, full volumetric human reconstruction
  (stick figures), LiDAR/depth. Fixed cams + ground-plane homography ≈ 90% of the
  value at ~10% of IronSight's complexity.
- **Compute:** local 4070 SUPER handles detection/tracking; VLM classification runs
  as batched cloud calls (pennies at overnight-batch volume).

## Privacy / legal design rule (WAMI lesson, applied)
Private property surveilling itself is the clean case — but the *fusion* is what
changes category. Encode from day one:
- **Aggregate, don't identify:** store counts, tracks-as-anonymous-dots, dwell times.
  No face recognition, no plate-to-person resolution, no per-person history.
- **Short raw retention, long aggregate retention:** keep derived counts forever,
  raw tracks briefly, per NVR policy.
- **Signage + tenant notice** consistent with Louisiana practice; the operator (a
  former attorney) sets the retention policy line.

## Gated on operator (needed before any build)
1. **NVR make/model + access:** RTSP/ONVIF reachable? Recorded locally? Resolution
   and retention window? (The grid looks like a standard NVR web UI.)
2. **Daytime grab:** one daylight screenshot per camera (same grid view is fine).
3. **Camera map:** rough mount location + facing for each of the 17 (a marked-up
   A-1 print works; or drop them as A-1 asset pins — the pin layer already exists).
4. **Privacy stance:** confirm the aggregate-only rule above.
5. **Watch item:** God's Eye View OSS repo drop (July 2026) — evaluate on release.

## Suggested build order (each independently shippable)
Phase C1: camera registry + A-1/satellite/Lens B frusta layer — **SHIPPED 2026-07-15**
(A-1 only; registry `src/data/cameras.json`; NVR = DW Blackjack Cube, DW Spectrum
cloud system "Belle Reality"; positions estimated — operator walk to refine)
Phase C2: de-warp + plat-homography per camera → `camera-align.json`
Phase C3: parking occupancy counts → Supabase `activity` table → P-1/D-1 tiles
Phase C4: overnight VLM night-watch → W-1 card drafts
Phase C5: timeline-scrub activity layer (2D plan first, then splat overlay = 4D lens)
