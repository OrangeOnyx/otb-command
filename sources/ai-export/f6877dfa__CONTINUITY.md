# Orange Ocean Asset Command — Continuity / Handoff File

**Purpose:** Resume work on this project in a fresh chat with zero re-discovery. Paste the "Kickoff prompt" (bottom of this file) into the new chat.

_Last updated: 2026-06-20. Latest checkpoint: `4ab4ec16`. Live domain: https://otbops-intel-xjbuolgy.manus.space_

---

## 1. What this project is

**Orange Ocean Asset Command — Property Operations Intelligence.** A single-screen internal web app for managing **On The Boulevard**, a family-owned open-air shopping center at 101–149 Arnould Blvd, Lafayette, LA. Owner/operator: **Adam** (Belle Realty of Lafayette, LLC). It is an operator's cockpit, not a public site.

- **Project name:** `otb-ops`
- **Project path:** `/home/ubuntu/otb-ops`
- **Stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle (MySQL/TiDB) + Manus OAuth. Template default.
- **Features enabled:** db, server, user
- **Hosting:** Autoscale (serverless). Published to `otbops-intel-xjbuolgy.manus.space`.
- **Tests:** Vitest, scoped to `server/**` only (see Gotchas). Currently **92 passing**.

---

## 2. Property facts (ground truth — do not re-derive)

- 27 units total (101–149 Arnould Blvd), ±62,810 SF leasable (appraisal says ±62,749).
- Occupancy ~95%; 2 vacant (131, 133); 1 anchor (149 Jason's Deli); ~$90,064/mo rent.
- 5 units show expired/over lease dates in the rent roll (105, 109, 117.5, 119, 143).
- Owner-occupied: 135B = Belle Realty of Lafayette (the OTB office).
- Marie Antoinette Street runs along the north; **remote parking Lot 7** is across it (only visible in the Full Parcel site-plan view, not the default building view — this is intentional).

### Unit → tenant roster (DBA)
101 & 103 The Pink Paisley · 105 Painted Bayou · 107 Great American Cookies/Hershey's · 109 JC Kate Boutique · 111 BERNINA Lafayette (Lola Pink) · 113 Graze Acadiana · 115 & 117 The Clothing Loft Exchange · 117.5 Victoria Nails · 119 OUPAC Financial · 119.5 Cat Clinic of Lafayette · 121 Magnolia Salon · 123 The Tux Shoppe (a.k.a. Mary Ellen's) · 125 & 127 Jordan Amanda by Shoetique · 129 HotWorx · 131 VACANT · 133 VACANT · 135A C. Wolf Barber Shop · 135B Belle Realty of Lafayette (owner office) · 137 Greek Expressions · 139 & 141 Fast Pass Tag & Title · 143 1st Franklin Financial · 145 Upstream Rehabilitation · 149 Jason's Deli (anchor).

---

## 3. App structure — workspaces (top toolbar tabs)

The whole app is one page (`client/src/pages/OtbApp.tsx`) with a top-toolbar workspace switcher and a left tenant list + right detail drawer.

1. **Site Plan** — interactive SVG plat. `SitePlanCanvas.tsx`. Layers: Units / Parking / Signs / POIs. Two viewBoxes: default "building" (tightened, no dead space) and "Full Parcel" (shows remote Lot 7). Click a unit → opens detail drawer. 39 POI maintenance categories.
2. **Rent Roll** — table of all 27 units (SF, monthly rent, lease expiry).
3. **Center Plan** — whole-center composite interior plan (2048×1448 image), drag-pan + ctrl/⌘-scroll zoom (40–500%), center-wide POI placement. Uses `__center__` sentinel to reuse floorPlan/POI procedures.
4. **Pylon** — interactive pylon sign tracker (`PylonViewer.tsx`). 14 panels (Panel 1 full-width, Panel 2 full premium, then 6 paired rows 3–14) under a fixed "ON THE BOULEVARD" header. Click a panel → assign tenant/unit + status (occupied/vacant/reserved); logo auto-shows. **All 14 currently read vacant — not yet pre-seeded.**
5. **Documents** — property-wide Lease/COI gap report (`DocumentsRollup.tsx`). Summary chips, worst-first table, filters (Gaps/No Lease/No COI/COI Lapsed/Complete/All), COI expiry column, Bulk Import + CSV + PDF export. Row click → opens unit drawer on Documents tab.
6. **Appraisal** — read-only reference panel (`AppraisalPanel.tsx`) showing 2019 Broussard appraisal figures + PDF link.

### Unit detail drawer (opens on unit click)
Three tabs: **Detail** / **Floor Plan** / **Documents** (`DocumentsTab.tsx`). Drawer header shows the tenant's primary logo. Documents tab: categories Lease / Logo / Insurance / Marketing / Other, with upload dropzone (PDF/images/Office, ≤15MB, multi-file) and COI expiry date input on Insurance uploads.

---

## 4. Data model (Drizzle — `drizzle/schema.ts`)

Key tables: `units`, `documents` (unitId, category enum, fileName, fileUrl, fileKey, mimeType, sizeBytes, **expiresAt** nullable, uploadedBy), `signs` (type incl. pylon), `pylon_slots` (slotNumber, tenantName, linkedUnitId, status), `appraisals` (value figures, dates, etc.). Migrations 0003 (documents+logo), 0004 (documents.expiresAt + appraisals) applied.

- Files: bytes live in **S3 via `storagePut`** → served at `/manus-storage/...`. DB stores key/url only. NEVER store bytes in DB.
- `PROPERTY_ID` constant from seedData identifies the single property.

### Seeded data already loaded
- **26 tenant logos** uploaded to S3 + attached as primary `logo` documents across 18+ units. Unit 123 has 2 logos (Tux Shoppe primary, Mary Ellen's secondary).
- **2019 appraisal** record seeded (see figures below) + PDF at `/manus-storage/2019Appraisal-101-149ArnouldBlvd_953afecd.pdf`.
- Pylon image at `/manus-storage/otb_pylon_35559785.png`.
- **Still unassigned logos:** `Screenshot2026-03-23204604.png` and `grok-image-...png` — Adam hasn't said where they go.

### 2019 Appraisal figures (Broussard Appraisal Services, Terry J. Broussard MAI/CCIM, LA Cert #G0454)
As-Is (10/1/2019) **$6.0M** · As-Developed & Stabilized (8/31/2020) **$6.7M** · Income approach $6,712,000 · Sales comp $6,725,000 · Cost $6,535,000 · Cap **8.50%** · Stabilized NOI **$570,498** · Land ±210,830 SF @ $10.26 ≈ **$2.16M** · Building ±62,749 SF · 2019 tax $54,176 (102.05 mills) · Owner: Belle Realty of Lafayette, LLC.
NOTE: Treated as **historical reference only** — NOT a live benchmark (2019, pre-Jason's-Deli anchor). Do not build live rent-roll cross-checks against it.

---

## 5. Key files (only edit files below the "← edit" markers; never touch `server/_core/**`)

```
client/src/pages/OtbApp.tsx              ← main page: workspace switcher, tenant list, drawer
client/src/components/SitePlanCanvas.tsx ← site plan SVG (viewBox, unit labels, layers)
client/src/components/PylonViewer.tsx    ← pylon sign tracker
client/src/components/DocumentsRollup.tsx← gap report (uses shared/bulkImportParse helpers)
client/src/components/DocumentsTab.tsx   ← per-unit documents tab (upload, COI expiry)
client/src/components/BulkImportDialog.tsx← bulk file import (uses shared parser)
client/src/components/AppraisalPanel.tsx ← appraisal reference view
client/src/components/ImportTemplates.tsx← CSV template downloads + column dictionary
client/src/components/UnitDetailPanel.tsx← drawer Detail tab + logo header
client/src/hooks/useOtbData.ts           ← shared data bundle (units, logos, etc.)
client/src/lib/otb.ts                    ← shared client types (PoiCategory, Document, PylonSlot…)
shared/bulkImportParse.ts                ← PURE testable logic: filename routing + CSV builder
server/db.ts                             ← query helpers (documents, pylon, appraisal, coverage)
server/routers/otb.ts                    ← tRPC procedures (otb.* namespace: floorPlans, pois, documents, pylon, appraisals)
drizzle/schema.ts                        ← tables
scripts/seed_logos.ts, seed_logos2.ts, seed_appraisal.ts ← one-off seeders (already run)
todo.md                                  ← full phase history (Phases A–O); read its tail for latest
```

tRPC namespace is **`trpc.otb.*`** (e.g. `trpc.otb.documents.coverage`, `trpc.otb.pylon.list`, `trpc.otb.floorPlans`, `trpc.otb.pois`).

---

## 6. Conventions & gotchas (learned the hard way)

- **Vitest only runs `server/**`.** Pure logic that needs testing goes in `shared/` and its test goes in `server/*.test.ts`. (That's why `bulkImportParse.ts` lives in `shared/`.)
- **Bulk import filename convention:** `<unit>_<category>[_<date>].ext` → e.g. `149_lease.pdf`, `149_coi_2026-12-31.pdf`, `117.5_lease.pdf`, `135A_coi.pdf`. Category keywords: lease, coi/insurance/acord/cert, logo, marketing/flyer. Date parsed as ISO (YYYY-MM-DD) or US (MM-DD-YYYY) → sets COI expiresAt.
- **Keyword boundary bug (fixed, don't reintroduce):** never use `\b` for keyword matching against underscore-delimited filenames (`_` is a word char, so `\bcoi` fails on `_coi`). Use separator-aware boundaries: leading `(?<![a-z0-9])`, trailing `(?![a-z])`.
- After moving/renaming a client lib, **restart the dev server** (`webdev_restart_server`) to clear stale Vite pre-transform cache, or you'll see phantom "Failed to load url" console errors.
- Sandbox browser **cannot** trigger a real file-save dialog reliably for inspection, but CSV downloads DO land in `/home/ubuntu/Downloads/` — verify exports there. Print popups (PDF export) are suppressed; confirm handler runs without console error, then ask Adam to confirm print layout in his real browser.
- Don't store images/media in `client/public` or `client/src/assets` — upload via `manus-upload-file --webdev` and use the returned `/manus-storage/...` URL. Static dir for originals: `/home/ubuntu/webdev-static-assets/`.
- Schema changes: edit `drizzle/schema.ts` → `pnpm drizzle-kit generate` → read the generated `.sql` → apply via `webdev_execute_sql`.
- **One checkpoint per delivery**, at the end — not mid-build.
- Relevant skill: `abdalla-brand-system` (Belle Realty / OTB branding; OTB logo asset lives there).

---

## 7. Adam's working style (apply to all responses)

Busy operator. Direct, analytical, high-signal. No filler/flattery. Challenge weak reasoning. Force-rank options and say what to ignore. Make opportunity cost explicit. Default to reusable assets (SOPs, drafts, frameworks). Separate: directly-supported vs inferred vs alternatives vs what-would-change-the-answer. Proactively flag higher-leverage moves and hidden risks.

---

## 8. Status: done vs open

### Done (checkpoint `4ab4ec16`)
- Site plan: tightened default crop, fixed Unit 133 label, click-through to drawer.
- Per-unit Documents tab (S3-backed, 5 categories, COI expiry input).
- 26 tenant logos seeded + shown in drawer header.
- Import Templates dialog (rent-roll/compliance/POI CSVs + column dictionary).
- Pylon sign tracker (interactive, click-to-assign) — built, NOT pre-seeded.
- Documents rollup gap report (chips, filters, COI expiry, CSV+PDF export, click-through).
- Bulk import (filename auto-routing) — live-verified end-to-end.
- 2019 appraisal panel + figures + PDF.
- Parser + CSV builder extracted to `shared/`, 92 tests passing.

### Open / suggested next (force-ranked)
1. **Load real leases + COIs in bulk** (`unit_category[_date].pdf`) → turns the all-red gap report into a live signal. Highest leverage.
2. **Pre-seed the 14 pylon panels** to match the physical sign (Adam to specify panel→tenant mapping, or auto-assign occupied units top-down as a draft).
3. **Confirm PDF chase-list print layout** in Adam's real browser, then use it for tenant document-request letters.
4. Assign the 2 leftover logos (`Screenshot2026-03-23...`, `grok-image-...`) once Adam says where.
5. Possible: COI "expiring within 30 days" dashboard alert; export gap report straight to a tenant email/letter; deposit-coverage column on rent roll (security deposit ÷ monthly).

---

## 9. How to resume (IMPORTANT — read this)

**Resume by starting a new TASK *inside the `otb-ops` webdev project*, NOT a brand-new chat.** A webdev project tree + its S3 assets live in the project's own sandbox. A fresh chat opened outside the project gets an empty sandbox and cannot see the code or seeded assets. To save tokens, start a new task within the same project (this preserves the tree, DB, and `/manus-storage/` assets) rather than opening an unrelated chat.

Kickoff prompt to paste into the new in-project task:

> Resume work on my Orange Ocean Asset Command webdev project (`otb-ops`, path `/home/ubuntu/otb-ops`). First read `/home/ubuntu/otb-ops/CONTINUITY.md` in full, then read the tail of `/home/ubuntu/otb-ops/todo.md`. Do not re-scaffold or re-verify completed work. Latest checkpoint is `4ab4ec16`, live at otbops-intel-xjbuolgy.manus.space. [Then state what you want to do next — e.g. "Let's pre-seed the pylon panels" or "I'm uploading the real leases and COIs."]

This CONTINUITY.md (plus todo.md and the schema doc) is also stored in the **project's shared files**, so every task in the On The Boulevard project can see it even before the webdev sandbox loads.
