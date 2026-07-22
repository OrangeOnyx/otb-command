# 06 — Business Rules

System code: **OTBC**. Every rule below is VERIFIED at the cited file:line
unless labeled. Confidence: HIGH = pure function with unit tests; MED = code
verified, no dedicated test observed. Recommended tests reference the existing
`node --test` harness (`test/*.test.mjs` — many rules already covered there).

## Money & ledger

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-001 | Late fee: 5-day grace, $100 flat + $25/day thereafter ("OTB standard schedule") | `daysLate = max(0, daysPastDue − 5)`; fee = 100 + 25×(daysLate−1) | lib/ledger.js:12,23-33 | HIGH (test/ledger) |
| OTBC-RULE-002 | Late fees are suggest-only; one suggestion per open rent charge past grace, silenced by posted fee's deterministic id `late:YYYY-MM:unit` | suggestLateFees | lib/ledger.js:133-155 | HIGH |
| OTBC-RULE-003 | Uniform late policy assumed across tenants unless a lease says otherwise (flag exceptions → per-unit policy) | operator decision 2026-07-21 | HANDOFF ledger section | DISCUSSED/POLICY |
| OTBC-RULE-004 | Ledger is append-only; a void is its own entry (`void_of` → target); nothing updated/deleted | entry algebra `effectiveEntries` | lib/ledger.js:8-9,42-45; RLS (no update/delete policies) | HIGH |
| OTBC-RULE-005 | One TOTAL-rent charge per occupied unit per month, id `rent:YYYY-MM:unit`, idempotent (on-conflict-do-nothing) | monthRentCharges + post_rent_charges RPC | lib/ledger.js:67-79; security-model.sql:122-125 | HIGH |
| OTBC-RULE-006 | Ledger go-live gate: no charges before `LEDGER_START_YM = 2026-08` (never fabricate receivables for rent already paid off-system) | guard in cron path | lib/ledger.js:84; api/auto-trigger.mjs | HIGH |
| OTBC-RULE-007 | Aging: FIFO application of credits, buckets ≤30 / 31-60 / 61-90 / 90+ | aging() | lib/ledger.js:88-127 | HIGH |
| OTBC-RULE-008 | Money writes fail LOUD (throw); audit-log writes are best-effort (swallowed) | remote.js write families | lib/remote.js:78-105 | HIGH |
| OTBC-RULE-009 | Bare monthly amounts in owner/tenant-facing output = TOTAL rent (base + additional); components only as explicit PSF breakdown | presentation convention enforced in ledger/brief/lease builders | lib/ledger.js:6-7, lib/brief.js:49-52, CLAUDE.md | HIGH (operator-locked) |
| OTBC-RULE-010 | Billing uses STATED monthly rent, not formula; the two documented variances (Pink Paisley −$4.84, Cat Clinic +$0.01) are stored, never "fixed" | validation_rules + known_exceptions | docs/sot-2026-07/*.csv; data-integrity tests pin them | HIGH |

## Lease economics & deal math

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-011 | NER: amortize all concessions (free rent at year-1 face rate, TI, LC) over term → level $/SF/yr; asset value = annualized NER / cap rate | computeDeal/compareDeals, pairwise deltas, ranked by nerPerSfPerYear | lib/calc/ner.js:11-92 | HIGH (test/calc) |
| OTBC-RULE-012 | Rent escalation compounds annually within NER gross-rent accrual | year-by-year loop | lib/calc/ner.js:23-30 | HIGH |
| OTBC-RULE-013 | CAM gross-up: variable lines only, to 95% stipulated occupancy, **never gross down** (factor floored at 1); fixed/tax/ins at actual | grossUp(target=0.95) | lib/calc/grossup.js:10-40 | HIGH |
| OTBC-RULE-014 | Partial-year proration for year-1 revenue on short terms | leaseMath | lib/lease.js:49-64 | HIGH |
| OTBC-RULE-015 | Every generated lease document stamped "DRAFT — subject to legal review" | builders | lib/lease.js:90,120,128,131 | HIGH |
| OTBC-RULE-016 | Lease proposals for vacant units fall back to `camFlatPsf` + median tax/ins when no unit-specific recoveries exist | assembler fallback | lib/lease.js (leaseMath), recoveries.json camFlatPsf | MED |

## Louisiana eviction sequencing (statute-grounded, from lease template + CCP)

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-017 | Sequence: CCP 4701 notice (5 days) → 4731 rule for possession (hearing ≥3d) → 4732 trial (~24h judgment) → 4733 warrant | step generator | lib/calc/eviction.js:32-77 | HIGH |
| OTBC-RULE-018 | Bankruptcy = automatic stay (11 USC §362) — short-circuits everything, blocker | guard first | lib/calc/eviction.js:20-29 | HIGH |
| OTBC-RULE-019 | Acceptance of rent after notice generally reinstates lease / voids notice — blocker | trap check | lib/calc/eviction.js:56-61 | HIGH |
| OTBC-RULE-020 | No self-help; only Sheriff executes removal (4733) — always appended | caution | lib/calc/eviction.js:79-82 | HIGH |
| OTBC-RULE-021 | Holdover rent = 200% of monthly rent (lease template §20.01) | ×2 | lib/calc/eviction.js:86 | HIGH |
| OTBC-RULE-022 | Commercial waiver-of-notice permitted → skip to filing | branch | lib/calc/eviction.js:34-38 | HIGH |

## KPIs, occupancy, proactive triggers

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-023 | NOI = collections − opex; occupancy = occupiedSf/totalSf; economic occ = collections/scheduled; expense ratio = opex/collections | periodKpis | lib/calc/kpi.js:15-30 | HIGH |
| OTBC-RULE-024 | MoM direction words precomputed with ε=0.0005 (model never infers sign) | computeKpis; brief momDeltas (OCC_EPSILON 0.0005, MONEY_EPSILON $1) | lib/calc/kpi.js:11-13,34-72; lib/brief.js:104-121 | HIGH |
| OTBC-RULE-025 | Holdover = leased (active|anchor) AND end < today; tracked in real time (live TODAY, audit M3) | detectHoldovers | lib/autotrigger.js:44-53; lib/format.js:6-7 | HIGH |
| OTBC-RULE-026 | Renewal window = expiry ≤180 days → seed leasing-agent thread | EXPIRY_HORIZON_DAYS | lib/autotrigger.js:56-66 | HIGH |
| OTBC-RULE-027 | Occupancy early warning at <85% SF-weighted GLA (month-keyed trigger) | OCCUPANCY_FLOOR | lib/autotrigger.js:70-83 | HIGH |
| OTBC-RULE-028 | Trigger idempotency: one thread ever per `trigger_source` key (unit+end or month — never run date), so re-runs/missed days are safe | unique partial index + RPC | lib/autotrigger.js; security-model.sql:111-116 | HIGH |
| OTBC-RULE-029 | Owner brief: monthly, deterministic (NO LLM), insert-once per month; NOI/cap value included only when the P-1 opex worksheet exists; expiration horizon 365d | brief.js + put_owner_brief | lib/brief.js:18,41-121; security-model.sql:100-107 | HIGH |

## Compliance, insurance, vendors

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-030 | Compliance baseline: `na` for vacant/owner units and non-food units on food-only fields (grease, ansul); else `u` unverified; seeded exceptions overlay | baselineComp | src/store.js:36-50 | HIGH |
| OTBC-RULE-031 | Cell cycle u → ok → flag → na; every flip logs an append-only compliance_event (who/when/what), best-effort — never blocks the click | cycleComp + logCompEvent | store.js:203-208; views/compliance.js:31-35; lib/compevents.js | HIGH |
| OTBC-RULE-032 | COI status: expired <0d, critical ≤30d, expiring ≤60d, else ok; `none` flagged only on service vendors | coiStatus | lib/coi.js:6-35 | HIGH |
| OTBC-RULE-033 | Vendor portal capability requires roster email; roster order service → payee → person | portalCapable/rosterOrder | lib/vendors.js:22-26 | HIGH |
| OTBC-RULE-034 | Anchor covenant: Jason's Deli (149) §9.01 monthly HVAC PM with Butcher Air; tenant maintains 100% of Unit 149 HVAC | standing W-1 card + hvac.json tier full | views/board.js seed; hvac.json | HIGH (data) |
| OTBC-RULE-035 | Exclusive-use watch: HotWorx (129) vs C. Wolf (135A); leasing agent screens prospects against exclusives + liquor line + parking variance | checklists in lease docs + persona | lib/lease.js:140,171-172; api/concierge.js personas | HIGH |

## Property invariants (audit-grade, locked)

| ID | Rule | Location | Conf |
|---|---|---|---|
| OTBC-RULE-036 | GLA headline 62,883 SF (audited) vs 62,810 demised sum — both labeled, never mixed in one figure | CLAUDE.md; printsheet.js footer; brief footnote | HIGH |
| OTBC-RULE-037 | Parking: cite **324/344** legally (variance 99-11797); plan operations on **314** plat striping (Δ −10 unreconciled; effective shortfall test = 344−314=30) | geometry.json parking; docs/parking-reconciliation-memo.md; parking.js zoneTotal invariant :33-35 | HIGH |
| OTBC-RULE-038 | Spellings immutable: street "Arnould Blvd"; subdivision "Arnold Heights Subd. Ext. No. 1" (distinct legal proper noun — never "correct") | CLAUDE.md; concierge CORE rules | HIGH |
| OTBC-RULE-039 | Liquor: church easement §3a waiver survives termination — restaurants OK within 175 ft; liquor line drawn on plat (geometry.liquorLine) | geometry.json; CLAUDE.md | HIGH (data) |
| OTBC-RULE-040 | JD Bank corner parcel SOLD — never render as Belle property ("NOT A PART" notch); easement $250/mo + 13 spaces expires 2034-12-30 | geometry.json boundary; views/dates.js:17-21 | HIGH |
| OTBC-RULE-041 | Occupancy classifier hygiene: unclear/stale samples never count toward occupied OR empty | occSummary | lib/occupancy.js:22-36 | HIGH |
| OTBC-RULE-042 | Interior cameras never accept position overrides | applyOverrides | lib/cameras.js:34-48 | HIGH |

## AI guardrails & security-adjacent rules

| ID | Rule | Logic | Location | Conf |
|---|---|---|---|---|
| OTBC-RULE-043 | The model never does arithmetic — must call `run_calc`; after any calc, every $/%/decimal in later rounds must trace to calc output (≤0.5% tolerance; years/CCP articles/ints ≤12 ignored); score <90 ⇒ FAIL CLOSED, reply with deterministic engine summaries | guardrail buffer + validateNumbers | lib/calc/guardrail.js:12-89; api/concierge.js:167-176 | HIGH (donor M1/M2 validator) |
| OTBC-RULE-044 | Card lines: `[[package:]]` https-only (blocks javascript:/data:); `[[brief:]]` strict YYYY-MM; invalid tokens stripped, never rendered | registry validators | lib/cards.js:22-54 | HIGH |
| OTBC-RULE-045 | Model/DB output escaped before render (untrusted stream) | mdToHtml escapes first | lib/concierge.js:113-116 | HIGH |
| OTBC-RULE-046 | Role fails closed to `pending`; concierge caps 200/day, voice 150/day per user (fail-open on infra error — accepted tradeoff) | getRole; check_and_bump_usage | lib/remote.js:24-34; api/_auth.mjs:14 | HIGH |
| OTBC-RULE-047 | Chat sanitization: ≤20 turns, ≤4,000 chars/msg, digest ≤3,500; live-state digest woven into final user turn to keep the cached system prefix byte-stable | sanitizeMessages/digestState | lib/concierge.js:7-91 | HIGH |

## Rules explicitly NOT present (do not invent on rebuild)
No proration-on-commencement engine (only year-1 partial-year in the assembler),
no percentage rent, no CAM reconciliation/true-up engine (gross-up calculator
exists but no annual reconciliation workflow), no security-deposit accounting,
no invoice/PO approval thresholds. These are gaps, not hidden features — see
12-strengths-weaknesses.

## Recommended automated tests
Most HIGH rules already have tests (test/ledger, calc, coi, autotrigger, brief,
cards, occupancy, parking, guardrail, compevents, seed round-trip,
data-integrity pins for the stated-rent exceptions). For a rebuild, port
`test/data-integrity.test.mjs` first — it pins the audit-grade invariants
(RULE-010, -036, -037) and is the cheapest defense against silent data drift.
