# 14 — Recommended Canonical Architecture

System code: **OTBC**. Recommendation derived only from what this project
proved out — where its strongest features should sit in a modern modular
rebuild. This is a target map, not an implementation plan.

## 1. User interface
- Keep: sheet-based information architecture (dashboard / site plan / rent roll
  / financial / compliance / dates / board / directory / safe / AI desk /
  vendor portal), the universal unit drawer, heat-map lenses, plan-room design
  system, print-as-document-of-record.
- Change: add real routing (sheet = route, unit drawer = deep-linkable);
  replace alert()/confirm(); componentize the drawer; mobile-responsive pass.
  Framework optional — the vanilla + pure-seam split worked; if adopting one,
  keep views dumb and seams pure.

## 2. Domain services
One service module per domain, built from the proven seams:
- Leasing (units/leases/SOT projections, NER, assembler)
- Money (ledger algebra, aging, late-policy per lease, gross-up)
- Compliance (matrix defs, baselines, event log)
- Vendors (roster, COI, portal faces)
- Documents (bucket-store factory, doc:// links, safe categories)
- Spatial (geometry, georef, occupancy shaping)
All remain pure/deterministic with the existing test suite riding along.

## 3. Workflow & automation engine
- Generalize the auto-trigger pattern: detector functions → idempotent
  trigger_source keys → actions (open thread / post charges / generate report).
- Keep suggest-only as the default automation posture; a confirm queue replaces
  scattered chips.
- Move the C3-style local schedulers into cloud jobs where possible; anything
  that must stay on-prem (NVR sampling) reports heartbeats to the platform so
  silence becomes an alert instead of a discovery.

## 4. AI & agent layer
- Keep: persona registry + CORE grounding rules (externalized to versioned
  prompt files), run_calc single-tool contract, fail-closed numeric guardrail,
  cache-stable context weaving (static dossier + live digest in final turn),
  card-line protocol, operator-only tool gating, deterministic reports for
  anything owner-facing and periodic.
- Add: eval fixtures per persona; structured citations; Batches API for bulk
  vision classification.

## 5. Integration layer
- Adapter per external system behind a shaped seam (the unifi.js model):
  Supabase/DB, Anthropic, TTS, NVR/DW Spectrum, imagery (frozen-basemap
  contract), email (upgrade mailto → provider send behind the same
  human-confirm boundary), Drive links.
- All keys server-side; per-user usage caps kept (fix: fail-closed with an
  operator override rather than fail-open).

## 6. Data-access layer
- Replace schema-free property_state JSONB with typed tables per layer, but
  KEEP the layer-registry idea: one declarative table drives model, defaults,
  export, and sync. Export/Import JSON stays as the portability contract.
- Normalize with org_id/property_id on every row (multi-property from day one);
  junction lease↔unit as in the SOT; allocation_is_legal_charge carried into
  the app model.

## 7. Database
- Postgres + RLS as proven: fail-closed roles, trigger onboarding, no
  service-role key, secret-gated definer RPCs for automation, append-only
  policies for money/audit/event tables, deterministic idempotency keys.
- Version-control the actual migrations (not just a snapshot).

## 8. Document storage
- Private buckets + signed URLs + per-role policies as-is (bucket-store
  factory). Add: retention policy for camera frames, per-document owner scoping
  if multi-org, e-sign integration point at the DRAFT→execute boundary.

## 9. Authentication & permissions
- Magic link + role lattice kept; add CAPTCHA/MFA options and a capability
  table (view_financials, write_ledger, manage_users, vendor_scope) so owner
  variants don't require code changes. Server-enforce per-sheet/per-layer
  visibility (today client-only).

## 10. Audit & observability
- Keep append-only audit tables and JWT-stamped actor identity everywhere.
- Add the missing telemetry: error tracking, cron/job heartbeat dashboard,
  guardrail-trip and best-effort-write failure counters, deploy-verify
  automation ("prod bundle carries the change" as CI, not discipline).

## Fit of the top features into the layers
| Feature | Layers |
|---|---|
| Site plan + lenses + drawer | UI ← Spatial domain ← geometry data |
| Governed SOT | Data-access (import governance) + DB (validation rules as constraints/tests) |
| Ledger-lite | Money domain + DB append-only + Workflow (charges/suggestions) |
| AI desk + guardrail | AI layer ← Domain services (calc) ← Integration (Anthropic) |
| Auto-triggers + briefs | Workflow engine + AI layer (threads) + Document storage (briefs) |
| C3 occupancy | Integration (NVR) + Workflow (nightly) + Spatial domain + UI overlays |
| Vendor portal + COI | Auth/permissions + Documents + Vendors domain |
