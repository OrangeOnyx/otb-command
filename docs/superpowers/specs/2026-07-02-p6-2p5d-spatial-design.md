# P6 · 2.5D + Spatial — Design Spec

**Date:** 2026-07-02
**Status:** Approved (design) — pending implementation plan
**Owner:** Adam (Orange Ocean, LLC)
**Repo:** `otb-command` (authoritative, plan-room Vite app)

---

## 1. Where this sits (roadmap context)

Audit produced a phased roadmap to take OTB Command from its current 8-sheet
state to an "elite" owner/operator platform. Three threads on the **already-live
Supabase foundation** (magic-link auth · private Storage buckets · RLS · row sync
· Vercel):

| Thread | Phases |
|--------|--------|
| **1 · Secure Documents** | P1 Document Repository → P2 Owner Safe → P3 Vendor Portal |
| **2 · AI Property Concierge** | P4 Knowledge engine (text RAG) → P5 Realtime voice + avatar |
| **3 · Spatial & 2.5D** | **P6 (this spec)** |

**Substrate decision (operator, 2026-07-02):** one app — the repo is authoritative.
v9 (`otbcommandv9kimi.html`) is a disposable concept; we **harvest its ideas**
(Mapbox satellite map, global search) into the repo. **Plan-room palette stays the
default**; the dark "kimi" theme becomes an **optional theme switch**. Do not fork
into two codebases.

**This spec covers P6 only.** P1–P5 remain on the roadmap for later specs.

---

## 2. Goal

A new **"A-2 Spatial"** sheet presenting On The Boulevard as a 2.5D / 3D / satellite
model, driven by the same live data as the rest of the app. Three "lenses" over one
shared geometry+data core, each shipped independently:

- **Lens A — SVG Isometric** (foundation)
- **Lens B — WebGL 3D Twin**
- **Lens C — Satellite Spatial** (harvested from v9)
- **Lens D — Reality capture** (photoreal drone twin; added 2026-07-02)

**Massing = uniform real** (audit-grade heights from CAD). **Color = live unit status.**
Click any unit in any lens → the existing unit drawer. Metric-driven height
(rent PSF / SF / NOI) is explicitly **out of scope** for P6 (future toggle).

**Two twins, complementary:** Lenses A/B are the *interactive data twin* (schematic,
clickable, exportable, ship without any capture). Lens D is the *photoreal reality
twin* from a real capture. They coexist; D does not replace the extruded model.

---

## 3. Shared core (`src/lib/iso.js`)

The single model all three lenses consume. Isolated, testable, no rendering inside it.

### 3.1 Footprints
- Source: `src/data/geometry.json` → `demising.longBuilding.bays` and
  `demising.shortBuilding.bays` (arrays of `[unit, width]`), plus the building
  envelopes.
- Derivation reuses the bay-rectangle logic already proven in `tools/poster.py`
  (`bay_rects()`), **ported to JS**: distribute bay widths across the envelope,
  split unit 135 into 135A/135B. Output per unit: `{ unit, x0, x1, y0, y1, vertical }`
  in plat feet.
- Single source of truth: geometry comes from `geometry.json`, never hard-coded in
  a renderer (repo Architecture rule #3).

### 3.2 Heights (audit-grade)
- Source: CAD `BLD_HT` layer text annotations, extracted once to
  `src/data/heights.json` via a small generator (`tools/extract-heights.mjs` or
  folded into `extract-geometry`). Known values: 16.4′ (typical long/short building),
  13.2′ / 13.5′ (ends), 20.6′ / 23.6′ (taller entry/anchor sections).
- Assignment: each unit's footprint centroid is matched to the **nearest** `BLD_HT`
  annotation coordinate; that height is the unit's parapet height. Default fallback
  16.4′ where no annotation is near.
- Heights are data, not literals — stored in `heights.json`, cited as CAD-derived.

### 3.3 Status → color
- Reuse `src/lib/colors.js` plan-room palette: green (occupied) / brick (holdover/
  vacant) / anchor / owner / vacant-hatch, per the locked design system.
- In dark theme, colors resolve from theme tokens (see §7).

### 3.4 Selection state
- One shared "selected unit" signal. Setting it from any lens opens the existing
  unit drawer (same code path as A-1). Lenses subscribe; no per-lens duplicate drawer.

### 3.5 Public interface
```
buildModel()        -> { units: [{unit, footprint, height, status, color}], envelope, north }
project.iso(pt3d)   -> {x,y}        // isometric screen projection helper
onSelect(unit)      // shared selection
```
A consumer can render any lens knowing only this interface, without reading iso.js internals.

---

## 4. Lens A — SVG Isometric "A-2" (P6a, foundation)

- Native SVG (matches A-1's rendering approach and the plan-room aesthetic).
- Each unit → an extruded prism: top face + two visible side faces as parallelograms,
  face shading (top lightest, sides stepped darker) over the status color.
- Isometric transform: standard 2:1 dimetric (30°); true-north indicator carried
  from the CAD orientation (−51.5° as in poster/plat).
- Labels: unit numbers on top faces; anchor/vacant styling per palette.
- Interaction: hover highlight; click → drawer. Keyboard focusable.
- Exportable to a standalone SVG (reuses the plat/poster save pattern) — this becomes
  the engine for the future marketing hero render (roadmap "B").
- Renders under a new sheet `A-2` in the sheet index nav.

---

## 5. Lens B — WebGL 3D Twin (P6b)

- `three` (WebGL). Same footprints extruded to `THREE.Mesh` boxes/prisms at real heights.
- Orbit controls (damped), sensible default camera framing the center.
- Materials colored by status; theme-aware (light/dark environment + ground).
- Click via raycaster → shared selection → drawer.
- Presented as a toggle within the A-2 sheet ("2D iso ↔ 3D"), not a separate sheet.
- Optional (later within P6b): a satellite/plan ground plane; not required for first ship.
- **Swappable geometry source:** Lens B loads its geometry through one interface —
  extruded prisms by default, a captured mesh (Lens D) as a drop-in. This seam is
  what lets the reality capture replace the schematic massing without rewiring
  selection, theming, or the drawer.

---

## 6. Lens C — Satellite Spatial (P6c, harvested from v9)

- `maplibre-gl` + **free Esri World Imagery** raster tiles (no token, no billing).
  Mapbox remains a drop-in alternative if the operator supplies a token later.
- Centered on the parcel (101–149 Arnould Blvd, Lafayette LA 70506; assessor parcels
  6026783/4/5/8 + remote 6009649).
- Overlay: building + unit footprints as GeoJSON polygons, status-colored, with the
  "NOT A PART" JD Bank corner notch respected (never render as Belle property).
- Popup / click → shared selection → drawer.

### 6.1 Georeferencing (the one real technical task)
- The CAD is in **local feet**, not geo. To place footprints on a real map we need an
  affine transform (translate + rotate + scale) from plat-feet to WGS84.
- Method: fit using a small set of known anchors — the street R/W geometry and a
  geocode of the address corner — solving for scale (feet→degrees at this latitude),
  rotation (plat is rotated; true north −51.5°), and origin. Store the resulting
  transform in `src/data/georef.json` so it is inspectable and adjustable, not magic.
- Acceptance: overlaid footprints visually register to the roofs on Esri imagery within
  a few feet; operator eyeball sign-off.

---

## 6b. Lens D — Reality capture (P6d, photoreal drone twin)

**Capture method (operator decision, 2026-07-02): one drone session → two outputs.**
A single drone orbit + nadir-grid flight over the center yields both:
- a **photogrammetry mesh** (textured glTF/OBJ, decimated for web) — the engineerable,
  georeferenceable geometry, usable as Lens B's drop-in mesh; and
- a **3D Gaussian Splat** (`.ply` → `.ksplat`/`.splat`) trained from the same footage —
  the photoreal hero/tour.

### 6b.1 Web delivery
- Splat: a three.js-compatible splat viewer/loader (e.g. a Gaussian-splats-3D loader),
  **lazy-loaded** only when Lens D is opened. Splat file lives in Supabase Storage
  (large; not committed to the repo), streamed via signed URL — reuses the existing
  asset seam / private-bucket pattern.
- Mesh: standard glTF loader; decimated target that holds framerate on a laptop.

### 6b.2 Clickability (the bridge)
- A capture is not segmented, so it has no notion of units. We keep click→drawer by
  **draping invisible, pickable unit polygons** (the georeferenced footprints from
  Lens C, extruded to CAD heights) as transparent hit-areas over the capture. A ray
  hit on a hit-area resolves to a unit → shared selection → drawer.
- This is why Lens C's georeferencing (`georef.json`) is a hard dependency of Lens D.

### 6b.3 Framing
- Owner/analytical use: mesh in Lens B (measure, inspect, clickable).
- Buyer/marketing use: splat as an immersive hero walkthrough.
- Both read the same selection + theme; splat imagery is physical (not theme-inverted).

### 6b.4 What this needs from the operator (real-world)
- A drone capture session (self-flown or a service). Deliverables we want back:
  the source imagery/video (for re-training), a decimated textured mesh, and the
  trained splat. Capture logistics, airspace, and processing are outside the app but
  gate P6d; P6a–c do not wait on them.

## 7. Cross-cutting — theme switch

- Add a plan-room ↔ dark ("command") theme toggle (the substrate decision).
- Implementation: CSS custom properties already drive the app; introduce a
  `data-theme` attribute on the root and a dark token set. All three lenses read
  theme tokens (no hard-coded colors except physical satellite imagery).
- **Plan-room is the default.** Dark is opt-in and persisted (localStorage, same
  pattern as other persisted layers).

---

## 8. Dependencies & non-goals

**New deps:** `three`, `maplibre-gl` (both standard, MIT/BSD; added to the Vite app).
A Gaussian-splat loader for Three.js is added only at P6d, **lazy-loaded** so lenses
A–C stay light. Capture assets (mesh, splat) live in Supabase Storage, not the repo.
**Not in P6:**
- Metric-driven extrusion height (rent PSF / SF / NOI) — future toggle.
- v9's global search — separate small harvest, its own later task.
- Marketing hero render (roadmap "B") — deferred; Lens A is designed to enable it.

---

## 9. Build sequence

1. **P6a** — shared core (`iso.js`, `heights.json` extractor) + Lens A (SVG iso A-2
   sheet) + theme switch. Independently shippable and demoable.
2. **P6b** — Lens B (Three.js 3D twin) toggle.
3. **P6c** — Lens C (MapLibre satellite) + georeferencing.
4. **P6d** — Lens D (reality capture): mesh into Lens B's swappable source + splat hero
   lens, with draped hit-areas for clickability. Gated on a drone capture session;
   does not block P6a–c.

Each step is usable on its own; no big-bang.

---

## 10. Verification

- Quality gate (repo convention): `node --check` each new/changed module + `npm run build`; console clean.
- Core: unit tests on `iso.js` — footprint count (27 demised, 135→135A/135B split),
  height assignment (nearest-annotation), status→color mapping.
- Lens A: renders in the login-gated app; click a unit → correct drawer; theme toggle
  flips palette; export produces a valid standalone SVG (validate like plat-render).
- Lens B: orbit works; click selects correct unit; no console errors.
- Lens C: footprints register to imagery within a few feet; popup opens correct drawer.
- Preview verification via Claude_Preview (`otb-command-dev`, port 5173) where observable.

---

## 11. Risks / open items

- **Georeferencing accuracy (Lens C):** biggest unknown; mitigated by storing an
  editable transform in `georef.json` and eyeball sign-off. If fit is poor, fall back
  to a manually-nudged transform.
- **Height annotation coverage:** if some units are far from any `BLD_HT` point, the
  16.4′ fallback applies; surfaced, not hidden.
- **Bundle size:** three + maplibre add weight; lenses B/C can be lazy-loaded so the
  A-2 sheet's SVG lens (A) stays light.
- **Rev label:** A-1 title-block Rev convention — A-2 gets its own rev label; any
  geometry change bumps it.
- **Capture (Lens D):** splat file size / streaming perf (mitigated: lazy-load +
  signed-URL streaming from Storage, decimated mesh target); clickability depends
  entirely on Lens C georef accuracy (shared risk); capture logistics/quality are
  real-world and out of app control.

---

## 12. Non-negotiables carried from repo memory

- Plat-verified facts (GLA 62,883 · 27 units · 324 parking / variance 99-11797 ·
  JD Bank corner SOLD "NOT A PART") must not be contradicted by any lens.
- Geometry lives in `geometry.json`/`heights.json`, never hard-coded in renderers.
- Plan-room aesthetic is the default; dark is an option.
