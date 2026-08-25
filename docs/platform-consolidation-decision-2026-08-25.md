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

## North star (operator, 2026-08-25)

**"Open this program and not have to open another program for the operation of this shopping center."** Orange Ocean Atlas is the single pane for the property: money, leases, tenants, vendors, maintenance, compliance, communications, accounting, and *matters* — e.g., a proposed rezoning of the remote lot (Lot 7, Marie Antoinette) lives here with its planning documents, meeting notes, and deadlines. **ALL AC features transfer in some form.** The usage audit governs *sequencing and shape* (live organ → careful cutover; 0-row shell → rebuild clean in Atlas idiom, no data migration), never *whether*. Nothing is dropped for lack of usage.

## Capability transfer register (every AC surface → its Atlas destination)

Approach key: **PARITY** = Atlas already does it, verify + close gaps · **PORT** = move mechanism + data · **REBUILD** = build fresh in Atlas idiom (typed tables + RLS + seams), AC/NestJS schemas as design refs · **REF** = design reference only, capability delivered by another row.

| # | AC capability | Atlas destination | Approach | Data |
|---|---|---|---|---|
| 1 | Voice intake (Vapi/Retell line) | Existing Twilio bridge + voice-agent | PORT (Wave H1.1) | 62 rows import |
| 2 | Work orders + media + vendor upload tokens | M-1 + maintenance-photos bucket + V-1 sealed folders | PORT (H1.2); token-link UX for unauthenticated vendor uploads is the gap to add | 24 WOs import |
| 3 | SOP system (procedures/steps/assignments/completions, reminders, streaks) | NEW sheet + 5 typed tables + auto-trigger reminder leg | **PORTED 2026-08-25** (checksum-verified 506-row import; O-1 sheet + cron leg in repo, live on next deploy) | 506 rows ✓ |
| 4 | Rent payment tracking + AR | Ledger + P-1 | PARITY going forward; history per H-1 decision | 313 rows ($1.13M) |
| 5 | Invoices + invoice generation + late fees | Ledger family — add invoice generation/PDF + statement rendering; late-fee suggestions already exist | REBUILD | 18+108+36 rows archive |
| 6 | CAM reconciliation + per-tenant shares + statements | NEW: annual recon module in the P-1 family (recoveries.json + gross-up calc are the seeds) | REBUILD (0 rows — clean build) | none |
| 7 | Accounting / QuickBooks sync | NEW accounting layer: chart of accounts + expense capture + QBO export/sync (NestJS CoA/1099 models as refs) — "accounting" named in the north star | REBUILD | none |
| 8 | Governance (entities, covenants, calendar) | S-1 + T-1: make instruments.json dynamic — LLC records, covenant tracking, governance deadlines feeding T-1 | REBUILD | none |
| 9 | Tenant portal (ledger, docs, payments view) | EXPAND tenant role beyond M-1: tenant sees own ledger, lease docs, payment links | REBUILD | tenant_access_tokens → tenant_contacts |
| 10 | Lease abstraction (AI) + rent escalations | Unit drawer Lease panel — abstraction feeds assembler fields with provenance | PORT | 24+83 rows |
| 11 | Deal pipeline + waitlist prospects | NEW leasing-pipeline cards (W-1 family) wired to AI-1 leasing agent + tour_bookings | REBUILD | 2+1 rows |
| 12 | Board reports + stakeholder reports + owner brief analogs | owner_briefs family — add board-report generator (monthly brief engine is the seed) | REBUILD | none |
| 13 | NOI valuation + tenant health + calculators | P-1 (NOI/cap-rate exists) + run_calc (7 calculators exist) — add tenant-health scoring | PARITY + gap | none |
| 14 | Communications (cross-channel log) | NEW communications hub: log calls/emails/letters per unit/vendor/matter; AI-1 threads + voice_calls are the seeds — "communications" named in the north star | REBUILD | 0 rows |
| 15 | NL query (NL→SQL) | AI-1 grounded digest + run_calc; add read-only NL query over typed tables if the digest proves insufficient | PARITY "in some form" | none |
| 16 | Document expiration scanning | Generalize COI-expiry pattern to all K-1 register documents with dated fields | REBUILD | none |
| 17 | Documents / property documents / register categories | K-1 register + documents bucket | PORT | 247+57+54 rows |
| 18 | HVAC units + predictive maintenance | hvac.json → typed table; PM contract tracking (Butcher Air §9.01) with T-1 deadlines (NestJS HvacMaintenanceContract as ref) | REBUILD | 28 rows |
| 19 | Spatial: parcels, appraisals, recorded agreements, licenses, lots, stalls, signs, pylons, POIs, floor plans, views | A-1/A-2/K-1 native (geometry.json, instruments.json, stall-map) | PARITY — verify each dataset against AC rows; appraisals → S-1 | reconcile |
| 20 | Marketing assets | K-1 site imagery + orgs.brand kit | PARITY + gap | 0 rows |
| 21 | UniFi network card | D-1 UniFi card | PARITY (done) | — |
| 22 | SaaS billing (plans/subscriptions/usage) | Pilot monetization phase (post-C-3) — schema as ref | REF (deferred, not dropped) | synthetic only |
| 23 | SOT import tooling | onboard/intake rail + per-property data packages (Phase C) | PARITY + gap | — |
| 24 | Allowlist / superadmin / audit log | authorized_emails + org_members + per-domain audit trails | PARITY | audit_log archive |
| 25 | Predecessor depth never in AC (NestJS/belle refs): legal notices, 1099s, e-sign templates, workflow engine | Build when a real workflow demands; e-sign already live in Atlas | REF | none |

## New single-pane capabilities (north star, beyond AC parity)

- **N-1 Matters & Planning module:** a matter = named operational thread (e.g., "Lot 7 rezoning") holding documents (planning submissions, plats), meeting notes, correspondence (→ #14), deadlines (→ T-1), and status — S-1/K-1 machinery generalized from unit-keyed to matter-keyed. This is the container the rezoning example requires.
- **N-2 Meeting-notes ingestion:** drop-in (upload/paste/transcript) → attached to a matter/unit/vendor, digested into AI-1 grounding.
- **N-3 Accounting home:** row #7 grown until the operating books for the center live here (or sync losslessly to QBO) — the test is "no second program."

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

### Wave H2.5 — capability parity builds (REBUILD rows of the register)
Grouped for independent shipping, roughly by operational value: **Money & Accounting** (#5 invoices, #6 CAM recon, #7 accounting/QBO) → **Tenant & Leasing** (#9 tenant portal expansion, #10 abstraction, #11 pipeline) → **Documents & Matters** (#16 expiry scans, #8 governance, N-1 matters, N-2 meeting notes) → **Intelligence & Comms** (#12 board reports, #13 tenant health, #14 communications hub). Each lands as typed tables + RLS + pure seams + tests, per house style.

### Wave H3 — decommission (GATED on the register)
**AC does not retire until every register row is PARITY-verified, PORTED, or REBUILT — or the operator explicitly re-classifies it.** Zero-usage never waives a row; the operator's standing instruction (2026-08-25) is that all features and abilities transfer in some form.
1. Per-organ verify (counts/checksums) → AC router read-only → monitor.
2. Final Supabase snapshot of `asset-command-prod`; export to `G:\My Drive\00 OTB\`.
3. Sunset assetcommand.orangeocean.com; Railway `ooac-web` teardown after a 30-day soak.
4. Let `orangeoceanassetcommand.com` lapse at the 2026-09-26 transferability date (no strategic value under this decision).
5. Archive `orange-ocean-asset-command` and `orange-ocean-atlas` repos with final tags. Keep both as design references (NestJS Prisma models for notices/1099/CoA/compliance-engine if a pilot ever needs them; AC schemas for CAM recon/QBO).

### Nothing is dropped
Superseding the earlier draft of this section (operator instruction, 2026-08-25): there is no "not ported" list. Zero-usage features (CAM recon, QBO, governance, marketing, billing) are REBUILD/REF rows in the register — they transfer as clean builds in Atlas idiom with no data migration owed, on the Wave H2.5 schedule. The archived AC and NestJS schemas serve as their design references.

## Open operator decisions

- **H-1 Rent-history shape:** import `rent_payments` as (a) pre-`ledger_start_ym` archival ledger entries, or (b) a dedicated read-only `payment_history` table surfaced in the unit drawer. (b) is cleaner — the append-only ledger stays born-clean.
- **H-2 Phone number:** port the AC voice number to the Twilio bridge vs publish the bridge's number and retire AC's. Depends on which number tenants actually have.
- **H-3 AC user invitations:** which of the 9 `user`-role accounts map to owner/vendor/tenant roles in `org_members`.
