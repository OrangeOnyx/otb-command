# PLATFORM CONSOLIDATION DECISION — 2026-08-25

**Status:** Adopted 2026-08-25 (operator-directed session, executed under `/goal complete all`). Reversible until Wave H1 cutovers begin.
**Companion docs (in the "Asset Command" Perplexity project folder, `C:\Users\adam\Projects\Asset Command`):** `AC-USAGE-AUDIT-2026-08-25.md` (prod row counts) · `RUNBOOK-2026-08-27-manus-and-scheduler.md` · `DECISION-2026-08-25-consolidation-direction.md` (AC-track copy of this record).

## Decision

**otb-command — the platform deployed at orangeoceanatlas.com, product name "Orange Ocean Atlas" — is the surviving platform.** It absorbs `orange-ocean-asset-command` (AC) via a usage-driven harvest; AC retires after its live organs cut over. The NestJS repo `orange-ocean-atlas` is archived as a schema/design reference — it was never deployed (DEMO seed, Vercel deploys disabled, idle since 2026-08-05).

This supersedes:
- `MIGRATION-PLAN-2026-08-23.md` (Atlas-as-target strangler plan, Perplexity track) — premises invalidated.
- The 2026-08-04 `docs/CONSOLIDATION.md` in the NestJS repo, which declared otb-command "frozen — no new features" on the same day otb-command shipped its multi-tenancy foundation, and rejected AC-as-base for Manus lock-in reasons that AC's own subsequent work eliminated.

It is consistent with the operator's prior rulings: 2026-07-22 (rebuild target = multi-property product, OTB = tenant #1) and 2026-07-26 (product name locked "Orange Ocean Atlas").

## Why (compressed; full analysis in the 2026-08-25 session)

1. **Three parallel AI tracks were building the same product** — Claude Code on otb-command, Perplexity on AC, and a stalled 8/04 consolidation repo that took the product's name. Each track planned another's retirement. The duplicate lease assemblers (AC v2.3 on 8/21; otb-command's on 8/23) proved the divergence cost had gone weekly.
2. **Proven beats broad.** otb-command's surface carries end-to-end proofs: ACH rent rail smoked, onboarding rail proven with a live pilot property + clean teardown, e-sign with UETA consent, voice agents with a truthful-booking guard, 387/387 tests, CI. AC's 305 procedures are wide but largely unexercised (see audit: CAM/QBO/governance/marketing/expenses = 0 rows).
3. **Security posture:** otb-command has no service-role key anywhere, ~90 membership-based RLS policies with a 5-persona assert suite, and committed rotation drills. AC has 9 known-exposed secrets and an open RLS advisory.
4. **Scale economics:** otb-command delivers the operational core in ~10.7k LOC / 6 runtime deps vs AC's 73k LOC — the whole surviving system fits in one agent context.

## What AC actually runs today (from the 2026-08-25 prod audit)

- **Live organs:** voice intake (43 events/30d, Vapi/Retell line), work orders (24/30d), SOP system (506 rows, 9 completions/30d), compliance events (698), documents (247).
- **Crown-jewel history:** `rent_payments` — 13 months (2025-07→2026-07), $1,133,492.20 paid. otb-command's ledger begins Aug 2026; this is the predecessor record.
- **Synthetic noise:** 64 bulk-created "owner" users (8/01, never returned) + 49 `trialing` subscriptions. Real accounts: ~12.
- **Empty shells (never used, no migration owed):** CAM reconciliation, QuickBooks, governance suite, marketing, payments/expenses/communications, work-order media, rent abatements, usage records.

## Harvest plan

### Wave H0 — immediate (this week)
- Execute `RUNBOOK-2026-08-27-manus-and-scheduler.md`: cancel Manus before the 8/27 renewal; **do not blanket-enable AC's scheduler** (`SCHEDULER_ENABLED` is all-or-nothing — nine jobs, several unwanted); rotate AC's 9 exposed secrets. AC holds live data throughout the harvest — its security debt stays urgent until decommission.

### Wave H1 — live organ cutovers (order of operational risk)
1. **Voice line.** Decide the single phone stack (otb-command's Twilio ConversationRelay bridge is the keeper — truthful-booking guard, tested). Repoint or port the number AC's Vapi/Retell agent answers; AC's `voice_intake` history imports as reference. Until cutover, AC's webhook path keeps working without its scheduler.
2. **Work orders.** Import AC `work_orders` (24 active) into otb-command `maintenance_requests` + `maintenance_events` (event-sourced; import as `note` events preserving timestamps). Tenants/vendors currently filing through AC move to M-1 (tenant logins via `tenant_contacts` already exist).
3. **SOP module.** The one AC feature with real adoption and no otb-command equivalent. Port the 5-table schema (procedures/steps/assignments/categories/completions) as typed tables + RLS, a new sheet (fits the W-1/K-1 family), and a reminder detector leg in the existing `auto-trigger` cron. Import all 506 rows.

### Wave H2 — history import
- `rent_payments` (313) → archival ledger context in otb-command (operator decision H-1 below on shape).
- `compliance_events` (698) → merge into otb-command's `compliance_events` (same append-only concept) with a `source:'ac'` marker.
- `documents` (247) + `floor_plans` (57) + register categories → K-1 register + `documents` bucket.
- `rent_escalations` (83) + `lease_abstractions` (24) → reference data for the lease assembler.
- Late-fee and invoice history → flat archive export (CSV/JSON) into S-1 vault; no live import.
- Invite the ~12 real AC users into `org_members` with mapped roles.

### Wave H3 — decommission
1. Per-organ verify (counts/checksums) → AC router read-only → monitor.
2. Final Supabase snapshot of `asset-command-prod`; export to `G:\My Drive\00 OTB\`.
3. Sunset assetcommand.orangeocean.com; Railway `ooac-web` teardown after a 30-day soak.
4. Let `orangeoceanassetcommand.com` lapse at the 2026-09-26 transferability date (no strategic value under this decision).
5. Archive `orange-ocean-asset-command` and `orange-ocean-atlas` repos with final tags. Keep both as design references (NestJS Prisma models for notices/1099/CoA/compliance-engine if a pilot ever needs them; AC schemas for CAM recon/QBO).

### Explicitly NOT ported
CAM reconciliation, QuickBooks sync, governance suite, marketing assets, subscription billing machinery, workflows-engine ambitions — all zero-usage. If a real pilot need arises, build fresh in otb-command idiom using the archived schemas as references.

## Open operator decisions

- **H-1 Rent-history shape:** import `rent_payments` as (a) pre-`ledger_start_ym` archival ledger entries, or (b) a dedicated read-only `payment_history` table surfaced in the unit drawer. (b) is cleaner — the append-only ledger stays born-clean.
- **H-2 Phone number:** port the AC voice number to the Twilio bridge vs publish the bridge's number and retire AC's. Depends on which number tenants actually have.
- **H-3 AC user invitations:** which of the 9 `user`-role accounts map to owner/vendor/tenant roles in `org_members`.
