# 02 — Feature Inventory

System code: **OTBC**. Columns: Status (LIVE = deployed + verified; LOCAL =
operator-machine; PARTIAL; DESIGNED), Value/Complexity (H/M/L), Reuse
(DIRECT = portable as-is; ADAPT = needs decoupling; CONCEPT = pattern only),
Q = quality 1-10, Rec = Keep / Improve / Replace / Merge / Eliminate.
Evidence = file or HANDOFF section; all LIVE items are code-verified.

## Property, spatial & site intelligence

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-001 | Plat-exact SVG site plan (A-1) | Recorded-plat-traced interactive site plan; legal geometry (easements, liquor line, variance) as data | LIVE | views/plan.js, geometry.json REV 12 | H | H | ADAPT (geometry.json schema DIRECT) | 9 | Keep |
| OTBC-FEAT-002 | Heat-map lenses | status/expiry/rent/use/hvac/size unit fills + legends | LIVE | lib/colors.js | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-003 | Overlay layer system | photo badges, parking, cameras, occupancy, pins, floor-plan raster w/ opacity | LIVE | plan.js:17-30 | H | M | CONCEPT | 8 | Keep |
| OTBC-FEAT-004 | Camera registry + drag-to-place | 17-cam roster, view cones, operator drag corrections persisted as overrides | LIVE | cameras.json, lib/cameras.js | M | M | ADAPT | 8 | Keep |
| OTBC-FEAT-005 | Site-asset pins | operator-placed water/meter/bench pins, project onto satellite too | LIVE | plan.js:285-294, geoproject.js | M | L | DIRECT | 7 | Keep |
| OTBC-FEAT-006 | A-2 four-lens spatial twin | Iso SVG / Three.js massing+mesh / MapLibre satellite / 3DGS splat, shared drawer | LIVE | views/spatial.js + scene* libs | M | H | ADAPT | 8 | Keep (marketing-grade) |
| OTBC-FEAT-007 | Frozen-basemap georeferencing | computational georef fit + frozen Esri composite (kills tile-refresh drift) | LIVE | fit-georef.py, sat-base.json | M | H | DIRECT (pattern) | 9 | Keep |
| OTBC-FEAT-008 | Open 3DGS/mesh pipeline | COLMAP→Brush splat + Poisson mesh, $0, computational splat↔world alignment | LOCAL | tools/, splat-align.json | M | H | DIRECT (pipeline) | 8 | Keep |
| OTBC-FEAT-009 | C3 parking occupancy | cam frames → Haiku stall classify → append-only samples → A-1/D-1 surfaces; hands-free nightly | LIVE+LOCAL | c3-* tools, lib/occupancy.js | H | H | ADAPT | 8 | Keep (differentiator) |

## Lease administration & economics

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-010 | Rent roll (R-1) | 11-col sortable, PSF decomposition, single-source CAM/Tax/Ins | LIVE | views/rentroll.js | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-011 | Governed SOT pack | authority-ranked CSVs + validation rules + known-exceptions log | LIVE | docs/sot-2026-07/ | H | M | DIRECT | 9 | Keep (best-in-class idea) |
| OTBC-FEAT-012 | Unit drawer | universal detail surface: term progress, HVAC tiers, notes, contacts, docs, photos, ledger, compliance | LIVE | views/drawer.js | H | M | CONCEPT | 8 | Keep |
| OTBC-FEAT-013 | Critical dates (T-1) | expirations + instrument deadlines timeline | LIVE | views/dates.js | M | L | DIRECT | 6 | Improve (hardcoded easement) |
| OTBC-FEAT-014 | Holdover/renewal detection | live TODAY tracking; 180d renewal horizon; auto AI threads | LIVE | lib/autotrigger.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-015 | NER deal comparison | retain-vs-replace / blend-extend / free-rent-vs-TI, cap-rate asset value | LIVE | lib/calc/ner.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-016 | CAM gross-up calculator | variable-only to 95%, never down | LIVE | lib/calc/grossup.js | M | L | DIRECT | 8 | Keep |
| OTBC-FEAT-017 | LA eviction sequencer | CCP 4701→4733 + traps + 200% holdover | LIVE | lib/calc/eviction.js | M | M | DIRECT (LA-specific) | 8 | Keep |
| OTBC-FEAT-018 | Lease-package assembler | AI-collected terms → branded DRAFT proposal + owner summary, signed-URL card | LIVE | lib/lease.js | H | M | ADAPT | 8 | Keep |
| OTBC-FEAT-019 | Amendments/abstracting module | lease clause CSVs exist; no first-class amendment history | PARTIAL | lease_clauses.csv | M | — | — | 4 | Improve (rebuild as entities) |

## Financials

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-020 | P-1 income + NOI worksheet | composition/rollover/concentration charts; opex inputs → NOI → cap value | LIVE | views/financial.js | H | M | DIRECT | 8 | Keep |
| OTBC-FEAT-021 | Ledger-lite | append-only entries, void-as-entry, FIFO aging, idempotent month charges, suggest-only late fees | LIVE (charges live 2026-08) | lib/ledger.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-022 | Collections & aging card | month collected-vs-charged + per-unit aging | LIVE | financial.js:170-200 | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-023 | Owner Excel proforma | live formula model, EGI real, owner-overridable opex | LIVE (tool) | tools/proforma.py | M | M | ADAPT | 7 | Keep |
| OTBC-FEAT-024 | Budgeting / full GL / CAM reconciliation | not built | ABSENT | — | H | — | — | — | (gap) |

## Compliance, ops, vendors

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-025 | Compliance matrix (C-1) | 11×27 click-to-cycle w/ food-only fields, seeded baselines | LIVE | views/compliance.js | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-026 | Event-sourced compliance history | append-only who/when/what per flip, never blocks UI | LIVE | lib/compevents.js | H | L | DIRECT | 9 | Keep |
| OTBC-FEAT-027 | Action board (W-1) | derived-seed kanban + override layer | LIVE | views/board.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-028 | Vendor portal (V-1) | 3-faced (op/vendor/owner) doc exchange + audit | LIVE | views/vendorportal.js | H | M | ADAPT | 8 | Keep |
| OTBC-FEAT-029 | COI tracking | expiry classification + badges + vendor self-view | LIVE | lib/coi.js | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-030 | Work orders / PM schedules / inspections / incidents | not built (covenant cards only) | ABSENT | board.js seed | H | — | — | — | (gap) |
| OTBC-FEAT-031 | UniFi network card | infra up/down summary on D-1 | LIVE | lib/unifi.js, api/unifi.mjs | L | L | DIRECT | 8 | Keep |

## Documents & records

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-032 | Document repository | doc:// scheme, register rows carry real files, signed URLs, Drive links coexist | LIVE | lib/docs.js | H | M | DIRECT | 8 | Keep |
| OTBC-FEAT-033 | Owner Safe | role-sealed vault + access audit log | LIVE | lib/safe.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-034 | Bucket-store factory | one factory → docs/safe/vendors thin configs; IndexedDB fallback; audit factory | LIVE | lib/bucketstore.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-035 | Image asset store | per-unit photos/plans, IndexedDB↔Supabase seam, migration | LIVE | lib/assets.js | M | M | DIRECT | 8 | Keep |
| OTBC-FEAT-036 | Global search | "/" omni-search units/contacts/docs | LIVE | lib/search.js | M | L | DIRECT | 7 | Improve (brittle nav hop) |

## AI & automation

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-037 | 3-agent AI desk | grounded personas, streaming, thread persistence, history | LIVE | api/concierge.js | H | H | ADAPT | 8 | Keep |
| OTBC-FEAT-038 | Numeric guardrail | fail-closed validation of model numbers vs calc outputs | LIVE | lib/calc/guardrail.js | H | M | DIRECT | 10 | Keep (crown jewel) |
| OTBC-FEAT-039 | Auto-trigger cron | idempotent proactive thread seeding | LIVE | api/auto-trigger.mjs | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-040 | Owner Intelligence Brief | monthly deterministic branded report, MoM deltas, archive | LIVE | lib/brief.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-041 | Voice (TTS + mic) | ElevenLabs proxy + Web Speech input | LIVE | api/voice.js | M | L | DIRECT | 7 | Keep |
| OTBC-FEAT-042 | Card-line protocol | validated [[type:token|label]] rich cards in streams | LIVE | lib/cards.js | M | L | DIRECT | 9 | Keep |

## Platform & security

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-043 | 4-role RBAC + trigger onboarding | operator/owner/vendor/pending; RLS fails closed | LIVE | security-model.sql | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-044 | Persisted-layer registry | one table drives store/reset/export/remote-sync | LIVE | lib/layers.js | H | L | DIRECT | 9 | Keep |
| OTBC-FEAT-045 | Confidential seed split | public skeleton bundle + auth-gated seed hydration | LIVE | tools/split-seed.mjs, api/seed.js | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-046 | Export/Import portability | full-state JSON snapshot round-trip | LIVE | store.js:347-364 | H | L | DIRECT | 8 | Keep |
| OTBC-FEAT-047 | Print/sheet export | drawing-set stamped PDF per sheet | LIVE | lib/printsheet.js | M | L | DIRECT | 8 | Keep |
| OTBC-FEAT-048 | Audit logs | safe_log, vendor_log, compliance_events, api_usage, JWT-stamped emails | LIVE | security-model.sql | H | M | DIRECT | 9 | Keep |
| OTBC-FEAT-049 | Rate limiting | per-user daily caps on paid endpoints | LIVE | check_and_bump_usage | M | L | DIRECT | 8 | Keep (note fail-open) |
| OTBC-FEAT-050 | Theme switch | plan-room default ↔ dark, print-safe | LIVE | main.js:264-272 | L | L | DIRECT | 7 | Keep |
| OTBC-FEAT-051 | Mobile/PWA | none — desktop-first only | ABSENT | — | M | — | — | — | (gap; donor PWA schemas queued) |

## Marketing & reporting tools

| ID | Feature | Description | Status | Evidence | Val | Cx | Reuse | Q | Rec |
|---|---|---|---|---|---|---|---|---|---|
| OTBC-FEAT-052 | CAD-derived poster suite | DXF-driven leasing posters (5 variants + navy/white creative), pylon, vinyls w/ QR | LIVE (tools) | tools/poster*.py, vinyl-b1.py | M | M | ADAPT | 8 | Keep |
| OTBC-FEAT-053 | Brand kit module | palettes/fonts/contacts/esc in one Python module for all generators | LIVE | tools/otb_brand.py | M | L | DIRECT | 8 | Keep |
| OTBC-FEAT-054 | LLM export / buyer export | full dossier vs $-stripped buyer set | LIVE | tools/export-package.mjs | M | L | DIRECT | 8 | Keep |
| OTBC-FEAT-055 | Knowledge graph | 572-node repo graph, post-commit auto-refresh | LOCAL | docs/graph/ | L | M | CONCEPT | 7 | Keep (dev-tooling) |

## Designed / deferred (not implemented)
B2 public microsite · B3 twin fly-through · B4 public scoped leasing bot + realtime ·
C2 homography · C4 VLM night-watch · C5 timeline lens · avatar · in-app email
send · custom domain/SMTP · e-sign + tenant-portal schemas (merger queue #6) ·
capex/insurance/OCR engines (merger queue #5) · weekly occupancy rollup.
**Explicitly killed:** DoorLoop import (operator decision — do not re-propose);
federating the three sibling builds (harvest-into-OTB decided instead).
