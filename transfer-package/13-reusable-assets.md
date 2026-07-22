# 13 — Reusable Asset Register

System code: **OTBC**. Reuse grades: DIRECT (drop in), ADAPT (modify noted),
CONCEPT (pattern). IP note: all project-authored (operator's own IP); vendored
tenant logos are third-party marks — property-specific, do not redistribute.
Dependencies "none" = pure JS module runnable under node:test.

## Code modules (pure seams — the export crown)

| ID | Asset | What / why valuable | Reuse | Mods needed | Deps |
|---|---|---|---|---|---|
| OTBC-ASSET-001 | lib/calc/ner.js | NER deal comparison + cap-rate asset value; pairwise deltas | DIRECT | none | none |
| OTBC-ASSET-002 | lib/calc/grossup.js | CAM gross-up (never-down, variable-only) | DIRECT | make 95% configurable per lease | none |
| OTBC-ASSET-003 | lib/calc/eviction.js | LA CCP eviction sequencer + traps | DIRECT (LA only) | jurisdiction gate for reuse elsewhere | none |
| OTBC-ASSET-004 | lib/calc/kpi.js | NOI/occupancy/collections + precomputed MoM direction words | DIRECT | none | none |
| OTBC-ASSET-005 | lib/calc/guardrail.js | fail-closed numeric validator for LLM output | DIRECT | none — provider-neutral | none |
| OTBC-ASSET-006 | lib/ledger.js | append-only ledger algebra, FIFO aging, idempotent charges, suggest-only late fees | DIRECT | parameterize late policy per lease | none |
| OTBC-ASSET-007 | lib/coi.js | COI expiry classification | DIRECT | none | none |
| OTBC-ASSET-008 | lib/autotrigger.js | holdover/renewal/occupancy detectors w/ idempotent trigger keys | DIRECT | thresholds configurable | none |
| OTBC-ASSET-009 | lib/brief.js | deterministic branded owner report builder | ADAPT | rebrand; data adapter | none |
| OTBC-ASSET-010 | lib/cards.js | validated [[type:token|label]] stream-card protocol | DIRECT | none | none |
| OTBC-ASSET-011 | lib/bucketstore.js | file-store factory (Supabase/IndexedDB dual backend, audit factory, 25MB caps) | DIRECT | none | supabase-js optional |
| OTBC-ASSET-012 | lib/layers.js pattern | persisted-layer registry driving store/reset/export/sync from one table | DIRECT | none | none |
| OTBC-ASSET-013 | lib/concierge.js | chat sanitize / cache-stable digest weaving / md→html+speech | DIRECT | none | none |
| OTBC-ASSET-014 | lib/lease.js | strict lease-package tool schema + HTML builders + proration | ADAPT | rebrand, template swap | none |
| OTBC-ASSET-015 | lib/occupancy.js | classifier-hygiene occupancy shaping (unclear/stale never count) | DIRECT | none | none |
| OTBC-ASSET-016 | lib/geoproject.js + splat-align.js + iso.js + scene3d-layout.js | plan↔CAD↔WGS84 affines, quaternion kit, dimetric projection, 3D layout | DIRECT | none (math) | none |
| OTBC-ASSET-017 | lib/search.js | scored omni-search matcher | DIRECT | none | none |

## Backend / schema

| ID | Asset | What / why | Reuse | Mods |
|---|---|---|---|---|
| OTBC-ASSET-018 | supabase/security-model.sql | full RBAC: trigger onboarding, RLS matrix, secret-gated definer RPCs, usage caps, append-only policies | DIRECT | add org_id for multi-tenant |
| OTBC-ASSET-019 | api/_auth.mjs + _supa.mjs | JWT gate + two-family Supabase wrapper (no service key) | DIRECT | none |
| OTBC-ASSET-020 | api/auto-trigger.mjs | idempotent cron orchestrator (triggers/brief/rent) | DIRECT | none |
| OTBC-ASSET-021 | docs/sot-2026-07/ schema | authority-ranked SOT star schema + validation_rules + known_exceptions | DIRECT | none — this IS the data-governance product idea |
| OTBC-ASSET-022 | tools/split-seed.mjs pattern | public-skeleton / confidential-seed build split | DIRECT | none |

## AI assets

| ID | Asset | What / why | Reuse | Mods |
|---|---|---|---|---|
| OTBC-ASSET-023 | api/concierge.js CORE + personas | grounding rules, immutable-facts clause, never-do-arithmetic contract | ADAPT | property facts swap; externalize to prompt files |
| OTBC-ASSET-024 | run_calc tool contract | one dispatcher tool over N engines, never-throws, deterministic fallback | DIRECT | none |
| OTBC-ASSET-025 | guardrail buffering pattern (server) | buffer post-calc rounds, validate, substitute engine summaries on fail | DIRECT | none |
| OTBC-ASSET-026 | c3-stalls.py pipeline | quad-crop → per-frame VLM classify → strict JSON → idempotent JSONL | ADAPT | camera/zone config; Batches API |

## Data structures & geometry

| ID | Asset | What / why | Reuse | Mods |
|---|---|---|---|---|
| OTBC-ASSET-027 | geometry.json schema | plat-as-data: demising/bays w/ provenance, parking zones + variance object, easements, SVG primitive layers, unit rects | DIRECT (schema) | data is property-specific |
| OTBC-ASSET-028 | cameras.json + stall-map.json + c3-stall-zones.json schemas | camera registry → stall quads → physical rank mapping | DIRECT (schema) | |
| OTBC-ASSET-029 | frozen-basemap contract | sat-base corners + georef fit + regenerate-together rule | DIRECT (pattern) | |

## Workflows, tests, docs, templates

| ID | Asset | What / why | Reuse | Mods |
|---|---|---|---|---|
| OTBC-ASSET-030 | test/ suite (197) | pure-seam tests incl. data-integrity invariant pins | DIRECT with modules | |
| OTBC-ASSET-031 | tools/otb_brand.py + poster/vinyl/case-study generators | brand kit + CAD-driven marketing artifacts | ADAPT | rebrand |
| OTBC-ASSET-032 | printsheet.js + print CSS | drawing-set stamped PDF export | DIRECT | |
| OTBC-ASSET-033 | export-package.mjs / export-buyer | LLM dossier + financials-stripped buyer set | ADAPT | |
| OTBC-ASSET-034 | docs/parking-reconciliation-memo.md, sot-reconciliation, roof brief, camera-4d-brief | domain documents: how to reconcile conflicting records, phased camera roadmap | DIRECT (method) | |
| OTBC-ASSET-035 | Ops lessons ledger (HANDOFF) | CSP/WASM smoke rule, occluded-tab rAF, PYTHONUTF8, quoted --out, prompt-cache stability, "deployed means done" | CONCEPT | distill into runbook |

## Design patterns (portable regardless of stack)
Derived-seed + override layer · suggest-only automation · append-only +
void-as-entry money · idempotent deterministic ids · single-source registries ·
fail-closed roles / fail-soft assets · confidential-seed split · authority-
ranked SOT with exception log · deterministic-report-not-LLM · card-line
protocol for rich AI output.
