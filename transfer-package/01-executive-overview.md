# 01 — Executive Overview

**System code:** OTBC · Extraction date 2026-07-22 · Extraction basis: full
source read (390 tracked files), HANDOFF/CLAUDE project memory, security-model
snapshot, SOT pack, git history.

## Product
**OTB Property Command** — a full-stack, single-asset property command center
for **On The Boulevard Shopping Center** (101–149 Arnould Blvd, Lafayette, LA:
62,883 SF GLA, 27 demised units, 2 buildings, 4.84 ac). Live at
https://otb-command.vercel.app (magic-link gated).

**Purpose:** give an owner-operator one authoritative, visual, AI-assisted
surface for everything about one retail center — legal geometry, rent roll,
compliance, money, documents, vendors, cameras, and marketing — with
audit-grade data discipline.

**Primary users:** the operator (Adam Abdalla — Orange Ocean LLC, managing
Belle Realty of Lafayette LLC), read-oriented owners, and service vendors
(own-folder portal). No tenant-facing surface.

**Property types supported:** one multi-tenant retail strip center. Single
property by construction (`property_id="otb"` hardcoded).

## Current development status
Mature and **live in production**: 12 sheets deployed, 197 unit tests, Supabase
backend with RLS + audited storage, 3-agent AI desk with anti-hallucination
guardrail, daily automation cron, monthly deterministic owner briefs,
append-only ledger (charges go live 2026-08), and a hands-free camera→VLM
parking-occupancy loop (local Windows pipeline + cloud surfaces). Built in an
intensive ~5-week AI-paired sprint (first commits ~mid-June 2026 → 2026-07-22),
harvesting engines from two sibling builds (belle-realty-pwa, otb-ops).

## Most differentiated capabilities
1. **Governed source of truth** — authority-ranked sources, blocking validation
   rules, logged known-exceptions ("bill stated, store both").
2. **Fail-closed AI numerics** — the model may talk, never compute; every
   figure must trace to deterministic engines or the reply is replaced.
3. **Plat-exact legal geometry as data** — parking variance, easements, liquor
   line drive the UI and the leasing agent's screening.
4. **4D property twin** — plan → iso → 3D/mesh → satellite → photoreal splat →
   live camera-derived stall occupancy, one selection model throughout.
5. **Idempotent proactive automation** — renewal/holdover/occupancy triggers
   that each open exactly one AI thread, ever.
6. **Append-only operational memory** — compliance events, safe/vendor access
   logs, void-as-entry ledger.

## Biggest weaknesses
Single-property/single-writer assumptions; no maintenance module (work orders/
PM/inspections); no CAM reconciliation or full AR/AP; no tenant-facing surface;
no routing/mobile; automation split across Vercel cron and one Windows machine;
client-side-only sheet privacy for owners; fail-open rate limiter; manual
deploys.

## Best candidates for reuse
The pure-seam library (calc engines + guardrail, ledger, COI, triggers, cards,
bucket-store factory, layer registry), the Supabase security model, the SOT
governance pack, the confidential-seed split, and the design patterns
(suggest-only automation, derived-seed+override, deterministic owner reports).
Full register: 13-reusable-assets.md.

## Maturity score: **72 / 100**
Production-grade for its actual mission (one asset, one operator) with
exceptional data governance, security posture, and AI safety; loses points on
multi-user/multi-property generality, absent core PM modules, operational
observability, and the on-prem automation leg. Category detail:
15-build-readiness.md.
