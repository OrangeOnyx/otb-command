# 07 — Screen and UX Inventory

System code: **OTBC**. All findings VERIFIED against source unless labeled.
Navigation source of truth: `src/lib/pages.js` — **12 sheets**, drawing-set
vernacular (sheet codes D-1 … V-1). No URL router: nav is DOM show/hide of
pre-rendered `.page` sections (`src/main.js:56-75`); state survives via the
store, not the URL. All views are vanilla-JS modules (`init*()` + `render*()`)
on a pub/sub store bus.

Role gating: `body.role-owner` / `body.role-vendor` classes; vendors see only
V-1 (auto-clicked); owners see the operator-configured `ownerSheets` whitelist
(defaults `dash/plan/roll/fin/safe`, `pages.js:34`). Operator gets "Preview
owner view" + "Sign-in access…" panels (`main.js:96-172`).

Print: every sheet prints via ⤓ SHEET / Ctrl+P with drawing-set footer stamp,
forced light palette, doc title = `OTB-<sheet>-<date>` (`main.js:77-93`,
`lib/printsheet.js`). Global JSON Export/Import in the topbar (`main.js:184-201`).

| # | Sheet | Route id | File | Purpose | Roles |
|---|-------|----------|------|---------|-------|
| 1 | D-1 Dashboard | `dash` | views/dashboard.js | KPI home + action queue | op, owner(default) |
| 2 | A-1 Site Plan | `plan` | views/plan.js | Interactive plat-exact SVG site plan | op, owner(default) |
| 3 | A-2 Spatial | `spatial` | views/spatial.js | Iso/3D/satellite/splat lenses | op, owner(opt-in) |
| 4 | R-1 Rent Roll | `roll` | views/rentroll.js | Sortable economics table | op, owner(default) |
| 5 | P-1 Financial | `fin` | views/financial.js | Income rollup + NOI worksheet + collections | op, owner(default) |
| 6 | C-1 Compliance | `comp` | views/compliance.js | 11×27 compliance matrix, event-sourced | op |
| 7 | T-1 Critical Dates | `dates` | views/dates.js | Expiration/instrument timeline | op |
| 8 | W-1 Action Board | `board` | views/board.js | Auto-seeding kanban | op |
| 9 | K-1 Directory | `dir` | views/directory.js | Property contacts + doc register + imagery | op |
| 10 | S-1 Owner Safe | `safe` | views/safe.js | Audited vault for sensitive docs | op, owner(default) |
| 11 | AI-1 Concierge | `ai` | views/concierge.js | 3-agent AI desk (chat/voice/tools) | op, owner(opt-in) |
| 12 | V-1 Vendor Portal | `vendors` | views/vendorportal.js | 3-faced vendor doc portal + COI | op, owner(RO), vendor |

## Per-screen detail

### D-1 Dashboard (`views/dashboard.js`)
- **Components:** KPI cards (`renderKPIs`:54-71) — Occupancy, Monthly Rent, In
  Holdover, Expiring ≤12mo, Vacant Bays, Parking; lease-runway timeline
  2025–2033 (`renderRunway`:98-115); Action Queue fed live from W-1's cards
  (`getActionCards()`), rendered last in init order for that reason
  (`main.js:232-245`). Remote-only cards: **Network (UniFi)** (`unifiKpi`:73-82,
  `/api/unifi`) and **Parking Occupancy (C3)** (`occKpi`:84-96, Supabase
  `occupancy_samples`).
- **Actions/mutations:** none — read-only rollup.
- **Empty/error:** UniFi/occupancy fetches best-effort (silent catch → card
  absent); empty queue → "All clear".
- **UX problem:** Parking KPI is the hardcoded literal `"324/344"` / 314 drawn
  (`dashboard.js:69`) — should derive from parking data (see 12-weaknesses).

### A-1 Site Plan (`views/plan.js`) — the flagship screen
- **Components:** native SVG plat from `geometry.json` primitives with layered
  render (base/remoteLot/parking/annotations/generalNotes/titleBlock,
  `drawPlan`:49-102); legend; unit rects with rotation-aware labels.
- **Toggleable overlay layers** (state :17-30): status/heat-map lenses
  (status/expiry/rent/use/hvac/**size**), scope main/full, 📷 photo badges
  (IndexedDB), 🅿 parking striping (`lib/parking.js`), 🎥 CCTV cameras + brass
  view cones with **drag-to-move/drag-to-aim/dbl-click-reset** persisted as
  store overrides (`setCamOverride`:185-209), 🚗 C3 occupancy (REMOTE, 5-min
  cache, `paintOcc`:109-129), 📍 asset pins (add/edit/delete,
  `addFeature`:285-294), roof/signage raster overlays, whole-center floor-plan
  image with opacity sliders.
- **Mutations:** camera overrides (`cameras` layer), feature pins (`features`
  layer), unit click → drawer.
- **Role gate:** `readOnlyRole()`:262 — owners get tooltips, not editors.
- **Strengths:** the single strongest interface idea in the system — a
  plat-proportioned, legally-faithful SVG site plan as the navigation hub, with
  operational data (occupancy, cameras, photos) layered onto the recorded plat.

### A-2 Spatial (`views/spatial.js`)
- **Four lenses** (`setLens`:179-198): Iso (native SVG prisms, real CAD heights
  from `heights.json`), ◧ 3D (Three.js massing + 🏗 photogrammetry-mesh toggle,
  lazy chunk), 🛰 Satellite (MapLibre + frozen Esri base + georef footprints +
  unit labels + asset pins), 🎥 Reality (3D Gaussian splat, clickable units).
- **Actions:** ⇅ true-height toggle (:207-216), ⤓ standalone SVG export
  (`exportIsoSvg`:99-126), unit click → drawer everywhere.
- **Notes:** heavy lenses lazy-import; scenes disposed on switch (:192-194).
  WebGL lenses don't rasterize into print — SVG export is the print path.

### R-1 Rent Roll (`views/rentroll.js`)
- 11-column sortable table (unit/tenant/SF/Base/CAM/Tax/Ins/Total/Monthly/
  TermEnd/Status) + totals footer. Single-source rule enforced in code: Base and
  Total PSF from units.json; CAM/Tax/Ins **only** from `recoveries.json`
  (`REC_KEYS`:14). Tenant logo chips. Row click → drawer. Read-only.

### P-1 Financial (`views/financial.js`)
- KPIs (in-place rent, effective rent PSF, occupancy, rent-weighted WALT,
  revenue at risk, anchor concentration), income composition/use/rollover/
  concentration bars, **NOI worksheet** (per-line OpEx inputs + NNN recovery
  hints + cap-rate input → indicated value; `setOpex`/`setCapRate` persist to
  `financials` layer), **Collections & aging** panel (REMOTE, FIFO aging from
  ledger, `paintCollections`:170-200).
- Empty/error: zero-OpEx explanatory note; ledger load/error/empty states all
  handled with copy.

### C-1 Compliance (`views/compliance.js`)
- 11-field × 27-unit dot matrix; cell click cycles state (`cycleComp`) **and**
  appends an immutable audit row (`logCompEvent` → `compliance_events`). ⏱
  History panel (REMOTE) lists who/when/what. Loading/empty/error copy present.

### T-1 Critical Dates (`views/dates.js`)
- Year-grouped timeline of lease ends + instrument deadlines, urgency-colored.
  UX problem: JD Bank easement expiry `2034-12-30` hardcoded (:17-21) rather
  than data-driven.

### W-1 Action Board (`views/board.js`)
- 4-lane kanban (Watch / Action Needed / In Progress / Cleared) that
  **auto-seeds from live data** (`seed()`:30-71): holdovers, renewal windows,
  vacancies (LOI regex), compliance flags, plus standing covenant cards
  (Jason's Deli HVAC §9.01, exclusive-use watch, JD Bank easement, parking
  Δ−10, roof brief). Store `actions` layer holds moves/dismissals/custom cards
  merged over the seed. Drag-drop, inline add, archive/restore. Exports
  `getActionCards()`/`ACTION_KIND` to D-1 (single source).
- **Strength worth preserving:** derived-seed + override-layer kanban — the
  board can never go stale on facts while still accepting human edits.

### K-1 Directory (`views/directory.js`)
- Thin orchestrator: property contacts + document register via shared
  `mountRecords` (`lib/recordsUI.js`), site imagery via `mountAssets`
  (`lib/assetsUI.js`). CRUD through the mounts into `contacts`/`documents`
  layers.

### S-1 Owner Safe (`views/safe.js`)
- Category folders (Proforma/Leases/Tax/Insurance/Banking/Other), per-file rows
  with Open 🔒 (10-min signed URL, view logged) and delete (confirm()).
  "Recent access" audit panel = operator-only. Owner face is read-only
  (CSS + RLS). Empty/error copy per category; `isConnected` guards on async
  paints.

### AI-1 Concierge (`views/concierge.js`)
- Agent chips (🏛 Concierge / 🤝 Leasing / 🔧 Property Manager), + New, 📊
  Briefs archive, 🗂 History; streaming replies; 🎙 mic (Web Speech, Chrome/Edge
  only, auto-hidden elsewhere); 🔊 per-reply TTS + persisted auto-speak.
  Card lines (`[[package:]]`, `[[brief:]]`) render as Open 🔒 / ✉ Email cards
  (mailto with OO signature block). Per-agent transcript + thread id persist in
  localStorage `otb-ai-state-v1`; server persists threads.
- Error states: local-mode note, `.ai-err` rows, interrupted streams keep the
  partial reply marked "⚠ interrupted", early failures drop the user turn for a
  clean retry (:340-353).

### V-1 Vendor Portal (`views/vendorportal.js`)
- **Three faces** by role: operator (filterable roster, per-vendor private
  folder upload/open/delete, COI date/note editor + badge, access log), vendor
  (own folder + "send a file to management" + own COI status), owner (read-only
  roster). Roster hydrates from auth-gated `/api/seed`, not the public bundle.
  Stale-async guards (`vendorRenderGen`). alert()-based error surfacing.

### Shared components
- **Unit Drawer** (`views/drawer.js`) — the universal detail surface, opened
  from A-1/A-2/R-1/C-1/W-1/search: title block, tenant + logo, status pill,
  lease-term progress with holdover math, facts grid, HVAC responsibility tiers
  (hvac.json), editable notes (draft preserved across re-renders :90-91),
  contacts, documents, photos/plans, **Ledger panel** (balance, entries,
  void ✕, add payment/charge/credit/NSF/write-off, late-fee suggestion chip),
  click-to-cycle compliance list. Esc/✕ to close; selection syncs across sheets.
- **Global search** (`views/search.js`) — topbar omni-search, `/` hotkey, over
  units/contacts/docs; Enter opens top hit.

## Strongest interface ideas worth preserving
1. Plat-exact SVG site plan as navigation hub with operational overlay layers.
2. Universal unit drawer — one detail surface shared by every sheet.
3. Auto-seeding action board (derived facts + human override layer).
4. Drawing-set vernacular (sheet codes, title blocks, print stamps) — gives an
   internal tool document-of-record gravitas.
5. Role-faced single deploy (operator/owner/vendor faces of the same app).
6. Heat-map lenses on the plan (status/expiry/rent/use/hvac/size).
7. Suggest-only automation surfaces (late-fee chip; AI packages as drafts).

## UX problems / recommended improvements
1. Hardcoded facts in views (parking `324/344`, JD Bank `2034-12-30`, covenant
   card prose in board seed) — move to data files.
2. Search→Directory nav located by button label text (`search.js:35`) — brittle;
   use the page id.
3. `alert()`/`confirm()` for error/confirm flows in safe/vendor views —
   fine solo-operator, poor for a product.
4. Duplicated `fmtSize`/`fmtWhen`/`todayISO` helpers in safe.js and
   vendorportal.js — consolidate into lib/format.js.
5. No URL routing — deep links, back button, and "send me a link to R-1"
   are impossible; a rebuild should map sheets to routes.
6. Mobile behavior: no responsive/mobile-specific handling observed in views
   (desktop-first plan-room layout) — PARTIALLY SUPPORTED (styles.css skim);
   treat mobile as unbuilt.
7. CLAUDE.md still says 8 sheets; code ships 12 — stale doc invariant.
