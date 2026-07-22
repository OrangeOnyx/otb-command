# 15 — Build Readiness Assessment

System code: **OTBC**. Scores 0–10, calibrated against "ready to rebuild as a
production multi-user PM web app".

| Category | Score | Rationale |
|---|---|---|
| Product definition | 8 | Crisp for its actual product (single-asset command center); the *rebuild target* (multi-property product) is undefined by design |
| Feature completeness | 6 | Deep on leasing/compliance/docs/AI/spatial; absent on maintenance, AP/AR beyond ledger-lite, CAM reconciliation, tenant-facing |
| Data model | 8 | Governed SOT + typed seams are excellent; JSONB layers schema-free; known label-format drift |
| Workflow definition | 7 | Implemented workflows are precise and idempotent; several core PM workflows exist only as manual procedure |
| UX quality | 7 | Distinctive, coherent, information-dense; no routing, no mobile, alert()-grade error surfaces |
| Code quality | 8 | Pure-seam discipline, single-source registries, 197 tests; some hardcoded facts and helper duplication |
| Security | 8 | RLS fails closed, no service key, audited, headers/CSP, secret-gated crons; fail-open rate limit, no CAPTCHA/MFA, client-side sheet hiding |
| Testing | 7 | Seam coverage superb; zero view/API-handler tests; no e2e/CI |
| Deployment readiness | 6 | Live and verified, but manual CLI deploys, no CI/CD, half the automation on one Windows box |
| Documentation | 9 | CLAUDE.md/HANDOFF/docs are exceptional (drift: "8 sheets"); security snapshot; per-tool self-documentation |
| Integration readiness | 6 | Clean seams for what exists; email/e-sign/accounting/tenant-payments absent |
| AI reliability | 9 | Guardrail fail-closed + deterministic engines + idempotent triggers; live-smoked; lacks eval fixtures |

## Reuse verdicts
- **Reuse immediately:** lib/calc/* + guardrail, ledger.js, coi.js,
  autotrigger.js, cards.js, bucketstore.js, layers/pages registry pattern,
  concierge.js helpers, security-model.sql, _auth/_supa, auto-trigger.mjs,
  SOT governance pack, split-seed pattern, test suite, print system,
  math/geometry seams.
- **Requires refactoring:** views (routing/componentization), store.js
  (typed layers), lease.js + brief.js (templating/branding), C3 pipeline
  (cloud-or-heartbeat), personas (externalize), vendor/safe UI (error surfaces).
- **Must be rebuilt:** anything multi-tenant (org scoping, per-layer RLS,
  capability RBAC), the absent modules (work orders, CAM reconciliation,
  invoicing/approvals, tenant portal), notification/email delivery, CI/CD.
- **Should be discarded:** knowledge-graph hook (keep as local dev tooling),
  exploratory poster variants, duplicated helpers, hardcoded view facts,
  probably one of the two massing lenses.

## Five highest-risk unknowns
1. **Supabase migration truth** — repo holds a snapshot; the authoritative
   migration history lives only in the hosted project. Export it before any
   rebuild.
2. **Concurrency semantics** — last-write-wins debounced sync has never been
   exercised by two simultaneous writers; unknown behavior under real
   multi-user load (B4 deferred).
3. **C3 pipeline durability** — sampler has died silently 3×; watchdog is new;
   stall-map indices are est-geometric pending the operator stall walk;
   classifier accuracy has spot-checks, not measured error rates.
4. **Unverified operator smokes** — a standing list (PDF attach, satellite
   click, Reality orbit, mesh toggle, lease-package assembly, vendor upload,
   plus the 07-20 additions) has never been human-confirmed end-to-end.
5. **Data completeness debts** — deposits 107/137/143/149, parking Δ −10,
   contact coverage ~16%, ElevenLabs-key rotation status — each is a landmine
   for any system that assumes the record is complete.
