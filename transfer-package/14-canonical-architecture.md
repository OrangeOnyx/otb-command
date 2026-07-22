# 14 — Recommended Canonical Architecture

System code: **OTBC**. Recommendation derived only from what this project
proved out — where its strongest features should sit in a modern modular
rebuild. This is a target map, not an implementation plan.

> **DECISION 2026-07-22 (operator, confirmed — do not relitigate):
> the rebuild target is a MULTI-PROPERTY PRODUCT.** OTB becomes tenant #1 /
> the reference dataset, not the product boundary. The "Decision addendum"
> at the bottom of this file makes the layer map concrete for that target.

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

## Decision addendum (2026-07-22): multi-property product — concrete deltas

What the decision changes, per layer. Everything not listed ports as already
recommended above.

### Tenancy model
- `orgs` (management company, e.g. Orange Ocean) → `properties` (e.g. OTB) →
  everything else. Every row carries `org_id` + `property_id`; RLS derives from
  an `org_members(org_id, user_id, role)` table, replacing the global
  `profiles.role` string. The proven trigger-onboarding flow survives but
  resolves *membership*, not a global role.
- Roles become **capabilities per org/property** (view_financials,
  write_ledger, manage_members, vendor_scope, manage_property). The
  owner-no-financials buyer view and vendor folder-scoping fall out of this for
  free instead of being CSS.

### What generalizes cleanly (the OTB build already proved the seam)
- All pure calc engines, guardrail, ledger algebra, COI math, occupancy
  shaping, card protocol, search — zero property assumptions inside them.
- Bucket-store factory → bucket paths gain an `org/property/` prefix; policies
  key on membership. Audit-log/JWT-stamp pattern unchanged.
- Idempotency keys gain scope: `rent:ORG:PROP:YYYY-MM:unit`,
  `trigger_source = PROP:renewal:unit:end`.
- Auto-trigger cron iterates properties; per-property detector thresholds
  (renewal horizon, occupancy floor, late policy) become property settings rows
  with the OTB values as defaults.
- The SOT governance pack becomes the **onboarding product**: each property is
  imported as an authority-ranked package (sources, validation rules, known
  exceptions). This is the differentiator to productize, not just port.
- geometry.json / cameras / stall-map schemas become per-property data
  packages; the plan renderer takes them as input (it already does — only the
  import path is per-property).

### Single-asset hardcodes to purge (the migration hit-list)
1. `property_id text default 'otb'` on every table and in remote.js.
2. `open_trigger_thread` hardcodes `created_by = 'adam@adamabdalla.com'`.
3. `LEDGER_START_YM = '2026-08'` → per-property ledger go-live setting.
4. View literals: D-1 parking "324/344", T-1 JD Bank date, W-1 covenant prose
   → property-data records (covenants become first-class rows).
5. Concierge dossier is one generated file → per-property generated context +
   per-property immutable-facts list in CORE (the "Arnould/62,883" clause is
   OTB data, not product code).
6. OTB brand constants in brief/lease builders → per-org brand kit
   (tools/otb_brand.py already models the shape).
7. `property_state` JSONB single-property mirror → typed per-layer tables
   keyed `(org_id, property_id)`; layer registry stays as the code-side schema.
8. Sheet whitelist `ownerSheets` → per-member capability grants.

### New product-level requirements the decision activates
- **Property switcher + portfolio dashboard** (a D-0 above D-1: cross-property
  KPIs, expirations, delinquency — brief.js/kpi.js aggregate naturally).
- **Concurrency**: last-write-wins debounced sync is no longer acceptable —
  per-row updates on typed tables + realtime (the deferred B4) become
  foundation, not polish.
- **Onboarding pipeline**: DXF/plat trace, SOT import, georef fit, camera
  registry as guided per-property setup — today these are operator-run scripts;
  they become the activation funnel.
- **Ops observability**: per-property cron/job heartbeats and failure
  telemetry (the C3 lesson) — silent per-property breakage doesn't scale past
  one asset.
- Per-property data residency/retention policy (camera frames, PII) stated in
  product terms.

### Sequencing recommendation (rank-ordered)
1. Schema first: orgs/properties/membership + typed layer tables + ported RLS
   (migrations 1-17 as the seed corpus, de-OTB'd).
2. Port the pure seams + tests verbatim (they are the product core).
3. Rebuild shell with routing + property switcher; sheets as routes.
4. Onboarding pipeline (SOT import + geometry package) with OTB as the
   reference import proving the funnel.
5. AI layer last (per-property dossier generation + personas), guardrail
   unchanged.

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
