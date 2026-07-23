# OTB Property Command — System Transfer Package (OTBC)

Extracted 2026-07-22 from the full repo (390 tracked files, HANDOFF/CLAUDE
memory, security snapshot, SOT pack, git history) via four parallel source
sweeps. **Extraction and documentation only — no replacement system built.**

Reading order: `01` overview → `02` features → `05` data → `06` rules → the
rest as needed. Machine-readable mirrors: `*.json` (stable OTBC-* ids).

| Section | File |
|---|---|
| 01 Executive overview | 01-executive-overview.md |
| 02 Feature inventory (55) | 02-feature-inventory.md / feature-inventory.json |
| 03 Roles & permissions | 03-roles-permissions.md |
| 04 Workflow catalog (25) | 04-workflow-catalog.md / workflow-catalog.json |
| 05 Data model (21 entities) | 05-data-model.md / data-model.json |
| 06 Business rules (47) | 06-business-rules.md / business-rules.json |
| 07 Screens (12 sheets + shared) | 07-screen-inventory.md / screen-inventory.json |
| 08 Technical architecture | 08-technical-architecture.md |
| 09 Integrations | 09-integration-inventory.md / integration-inventory.json |
| 10 Prompts & agents | 10-agent-inventory.md / agent-inventory.json |
| 11 Source-code map | 11-source-code-map.md |
| 12 Strengths / weaknesses / debt | 12-strengths-weaknesses.md |
| 13 Reusable assets (35) | 13-reusable-assets.md / reusable-assets.json |
| 14 Canonical architecture | 14-canonical-architecture.md |
| 15 Build readiness | 15-build-readiness.md |
| 16 Competitive landscape (2026-07-22) | 16-competitive-landscape.md |
| 17 Final build plan (2026-07-22) | 17-final-build-plan.md |
| Manifest / open questions | system-manifest.json / open-questions.json |

---

## Top 10 Features Worth Preserving (ranked)

1. **Fail-closed AI numerics** — deterministic calc engines + numeric guardrail
   (OTBC-FEAT-038/015-017): the model talks, never computes. The single most
   transferable AI-product idea here.
2. **Governed source of truth** — authority-ranked sources, blocking validation
   rules, known-exceptions log (OTBC-FEAT-011).
3. **Plat-exact site plan with legal geometry as data** — variance, easements,
   liquor line drive UI and agent screening (OTBC-FEAT-001).
4. **Append-only ledger-lite** — void-as-entry, FIFO aging, idempotent
   deterministic charges, suggest-only late fees (OTBC-FEAT-021).
5. **Idempotent proactive automation** — one AI thread ever per trigger key;
   deterministic monthly owner brief (OTBC-FEAT-039/040).
6. **RBAC + RLS security model** — fail-closed roles, trigger onboarding,
   secret-gated RPCs, no service key, confidential-seed split
   (OTBC-FEAT-043/045).
7. **Derived-seed + override-layer surfaces** — the auto-seeding action board
   and camera corrections (OTBC-FEAT-027/004).
8. **Universal unit drawer + heat-map lenses** — one detail surface everywhere
   (OTBC-FEAT-012/002).
9. **Event-sourced operational memory** — compliance events, safe/vendor access
   logs (OTBC-FEAT-026/048).
10. **Camera→VLM occupancy loop** — the 4D-twin differentiator: NVR frames →
    Haiku stall classification → live plan overlay, hands-free
    (OTBC-FEAT-009).

## Top 10 Problems to Avoid Carrying Forward (ranked)

1. Single-property/single-writer hardcoding (`property_id="otb"`,
   last-write-wins sync, no conflict handling).
2. Client-side-only privacy for owner sheet visibility (RLS reads all layers;
   hiding is CSS/JS).
3. Automation split across Vercel cron and one Windows machine + Tailscale NVR
   with no heartbeat/alerting (sampler died silently 3×).
4. Hardcoded facts inside views (parking 324/344 KPI, JD Bank date, covenant
   card prose).
5. No URL routing — no deep links, back button, or shareable state.
6. Schema-free JSONB state layers (layers.js is the only schema).
7. Generated-file staleness footgun (split-seed / concierge-context /
   georef triple must be manually re-run after edits).
8. Fail-open rate limiting + no CAPTCHA/MFA on a magic-link-only front door.
9. Manual CLI deploys with no CI — prod silently stale if a step is skipped.
10. Data-format debt: money-as-string (hvac.json), `"true"` artifacts
    (lease_clauses), unit-label drift (`117 1/2` vs `117.5`), dual headline
    totals requiring tribal knowledge.

## Recommended Export Package (copy into a consolidation project)

**This folder** (`transfer-package/` — 16 md + 10 json), plus from the repo:

- Pure seams: `src/lib/calc/` (all), `src/lib/{ledger,coi,autotrigger,cards,
  bucketstore,layers,pages,concierge,lease,brief,occupancy,parking,cameras,
  unifi,geoproject,splat-align,iso,scene3d-layout,search,format,colors,
  compevents,printsheet}.js`
- Backend: `supabase/security-model.sql`, `api/_auth.mjs`, `api/_supa.mjs`,
  `api/auto-trigger.mjs`, `api/concierge.js`, `vercel.json`
- Data + governance: `docs/sot-2026-07/` (all), `src/data/` (all 19 JSON),
  `docs/c3-stall-zones.json`, `docs/{parking-reconciliation-memo,
  sot-reconciliation-2026-07,roof-condition-brief,camera-4d-brief,
  path-b-supabase-scope,marketing-package-2025}.md`
- Tests: `test/` (all 29 files — `data-integrity.test.mjs` first)
- Tools worth porting: `tools/{split-seed,export-package,
  build-concierge-context,c3-upload,cube-frames,cube-backfill}.mjs`,
  `tools/{c3-stalls,c3-overlay,fit-georef,extract-georef,build-sat-base,
  otb_brand,proforma,poster,poster-specials,vinyl-b1,case-study-c1}.py`,
  `tools/{c3-nightly,sampler-watchdog}.ps1`
- Context: `CLAUDE.md`, `HANDOFF.md`, `cad/Boulev_CLEAN.dxf`
- **From outside the repo (must be fetched):** the Supabase project's migration
  history (OTBC-Q-001) and Vercel env var inventory.

## Unresolved Questions

See `open-questions.json` (12). The five that most affect a rebuild:
migration-history export (Q-001) · rebuild target single-vs-multi-property
(Q-002) · canonical domain (Q-003) · missing deposits (Q-004) · unverified
operator smokes on shipped features (Q-008).
