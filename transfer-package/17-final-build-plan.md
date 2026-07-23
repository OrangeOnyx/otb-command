# 17 · Final Build Plan — Multi-Property Product (drafted 2026-07-22)

Synthesizes: the OTBC-Q-002 decision (multi-property product, OTB = tenant #1),
the §14 decision addendum, the §16 competitive scan, and the operator's
2026-07-22 scope additions: **1–2 external properties interested in coming
onto the software** (pilot demand, validated), **SOP codification**,
**maintenance requests with photos**, and **call-in voice agents (tenant +
leasing-prospect lines) with transcripts**.

Rule of the plan: everything ships on the live OTB app first when it can —
each Phase A item is immediate operator value AND a product-schema prototype.
No throwaway work: A-items are built on seams that port per §14.

---

## Phase A — On the live OTB app (now; incremental ships)

**A-0 · Rotate the `auto_trigger` shared secret.** Standing security item
(value transited chat during the extraction). New hex → `app_secrets` →
Vercel `CRON_SECRET` → redeploy → cron smoke. First action of the next
build session; blocks nothing else.

**A-1 · AI COI parse (approved).** V-1 vendor panel gains "📎 drop cert PDF":
upload → server endpoint (existing auth gate + `api/_supa.mjs`) → Haiku
extracts carrier/coverage types/limits/effective/expiry/additional-insured →
pre-fills `coi_expires`/`coi_note` for operator confirm → files the PDF in the
vendor folder (bucket-store seam). Replicates Cove's headline feature at
pennies. Small build; all seams exist.

**A-2 · Maintenance requests with photos.** The operator's ask, and parity
with Pickspace's work-order module — built as the first *tenant-facing*
surface:
- New `maintenance_requests` table (append-only status events, not mutable
  rows — the compliance-event pattern) + `maintenance-photos` bucket via the
  bucket-store factory. RLS: tenant sees own unit's requests; operator all.
- New role `tenant` in the existing magic-link lattice (trigger onboarding
  matches a `tenant_contacts` roster like vendors do). Tenant face: submit
  request + photos + urgency; see status.
- Operator face: queue on W-1 (auto-seeded cards, existing derived-seed
  pattern), assign to a V-1 vendor (their portal face shows assigned work
  orders + the photos), status flow New → Assigned → Scheduled → Done →
  Verified, every transition event-logged.
- Auto-trigger: aging unassigned request → manager thread (existing
  idempotent trigger pattern).
- *Product note:* this schema IS the product's work-order module; build it
  `(org_id, property_id)`-shaped from day one even on OTB.

**A-3 · Voice ingress — call-in agents with transcripts.** Two numbers:
- **Tenant/maintenance line:** answers, triages, collects unit + issue +
  callback, offers photo-followup via SMS link into A-2, drafts a
  maintenance request (suggest-only; operator confirms).
- **Leasing line:** the existing 🤝 Leasing persona answers prospect calls —
  availability (131/133), sizes, general terms; never quotes binding numbers
  (guardrail posture); captures name/contact/need → lead card in a thread.
- **Transcripts land in `chat_threads`/`chat_messages`** tagged by line +
  caller — AI-1 History becomes the call log (the "otbops transcripts"
  experience, native).
- Stack decision gated below (D-1). Recommended: Twilio ConversationRelay
  streaming to our existing persona registry — we own the transcript, reuse
  personas/guardrail, one adapter seam per §14-§5. ElevenLabs Agents is the
  faster-standup alternative (account + voice already provisioned) at the
  cost of a second brain outside the guardrail.

**A-4 · SOP capture → executable operations manual.** The workflow catalog
(§04, 25 workflows) and business rules (§06, 47) already encode what the
*system* does. The gap is what the *operator* does — in his head. One
structured session (voice or chat), walking: rent-collection cadence ·
maintenance dispatch tree (who for HVAC/roof/plumbing/electrical, when to get
2 bids, spend thresholds) · make-ready/turnover · leasing funnel (inquiry →
tour → LOI → lease) · escalation rules (after-hours, emergency, legal) ·
vendor selection/COI enforcement · inspection schedule. Output, per SOP:
(a) a runbook page (K-1 register), (b) where automatable, an auto-trigger
detector or checklist template, (c) the phone agents' triage scripts in A-3
derive from these. *Product note:* per-property SOP config is exactly the
"property settings rows" of §14 — OTB's answers become the product defaults.

**A-5 · Payments seam v1 (gated D-3).** Stripe ACH invoice links attached to
ledger-lite charges (charge row → payment link → webhook posts the payment
entry). Closes the #1 competitive gap on the live asset and prototypes the
product's rails. Ledger go-live is already Aug 1 — natural pairing.

## Phase B — Product foundation (multi-tenant core)

Per §14 sequencing, unchanged by this plan:
1. **B-1 Schema first:** `orgs` → `properties` → `org_members` capabilities;
   typed layer tables; ported RLS; migrations 1–17 de-OTB'd (the §14 purge
   hit-list of 8 hardcodes). Server-enforced sheet/layer visibility (kills
   carry-forward problem #2).
2. **B-2 Port pure seams + tests verbatim** (calc, ledger, COI, occupancy,
   cards, bucketstore, layers… — zero property assumptions inside them).
3. **B-3 Shell rebuild:** URL routing (sheets = routes, drawer deep-links),
   property switcher, **D-0 portfolio dashboard** (cross-property KPIs,
   expirations, delinquency — brief.js/kpi.js aggregate naturally).
4. **B-4 Observability:** cron/job heartbeats (the C3 lesson — silence is an
   alert), error tracking, CI deploy-verify (kills problems #3 and #9).
5. **B-5 Concurrency:** per-row updates + realtime (B4 graduates from
   deferred polish to foundation).

## Phase C — Onboarding funnel + the two pilots

The demand signal (1–2 interested owners) sets the deadline shape: **pilots
onboard on Phase B foundations, not on the OTB single-tenant app.** Do not
fork OTB per-property in the interim — that recreates the donor-app problem
the 2026-07-16 consolidation killed.

1. **C-1 Onboarding pipeline productized:** the SOT governance pack (authority
   ranking, validation rules, known-exceptions log) as a guided import;
   brand kit per org; geometry/plat package as an optional premium step
   (site-plan tier), SOP questionnaire (from A-4's template) as settings.
2. **C-2 OTB re-imported as reference tenant** — proves the funnel end-to-end
   before any outsider touches it.
3. **C-3 Pilot #1, then #2** as design partners. Intake checklist per pilot:
   rent roll + leases (PDFs fine — A-1-style abstraction assists), plat/site
   plan if site-plan tier, vendor roster + COIs, bank/payment setup, SOP
   questionnaire, brand assets. Terms gated below (D-2).

## Phase D — Differentiator tiers (post-pilot)

Camera/occupancy module (C3 pipeline productized, per-property NVR adapter +
heartbeats) · spatial twin tier (georef/splat/mesh pipeline as a service) ·
per-property AI desk + deterministic owner briefs · percentage-rent +
tenant-sales module (Pickspace parity for true retail portfolios) · e-sign at
DRAFT→execute · white-label portals.

---

## Decision gates — **ALL DECIDED (operator, 2026-07-22: "1A 2A 3A 4A")**

- **D-1 = A** Twilio ConversationRelay + Claude personas.
- **D-2 = A** Free 6-month design-partner pilots (testimonial + data rights).
- **D-3 = A** Stripe ACH on OTB now, paired with the Aug 1 ledger go-live.
- **D-4 = A** QBO bi-directional sync; no own GL.
- D-5 (name/domain/pricing/entity) remains parked until Phase B.

Original options preserved below for the record.

### (original gates as presented)

- **D-1 Voice stack (blocks A-3):** **A** Twilio ConversationRelay + our
  Claude personas (recommended — owned transcripts, guardrail intact, one
  adapter) · **B** ElevenLabs Agents platform (fastest standup; account +
  "Jack John" voice already live; second brain outside the guardrail) ·
  **C** defer voice.
- **D-2 Pilot terms (blocks C-3):** **A** free 6-month design partner —
  testimonial + data rights + case study (recommended while product hardens) ·
  **B** discounted paid · **C** full price.
- **D-3 Payments timing:** **A** Stripe ACH on OTB now, alongside the Aug 1
  ledger go-live (recommended) · **B** wait for Phase B.
- **D-4 Accounting posture (Phase B decision):** **A** QBO bi-directional
  sync, no own GL (STRATAFOLIO model — recommended) · **B** build a GL
  (Pickspace model; much heavier).
- **D-5 Parked until Phase B:** product name/domain (relates to the standing
  canonical-domain punch-list item) · pricing model (per-unit, no per-user
  fees is the competitive read) · operating entity.

## Order of execution (recommended)

A-0 → A-1 → A-2 → A-3 (once D-1 picked; A-4's scripts feed it, so A-4's
capture session should happen before or during) → A-5 (if D-3=A) → Phase B
schema → seams → shell → C-2 reference import → C-3 pilots → D tiers.
Phase A is sequenced so every item is independently shippable; a pilot
conversation can proceed in parallel on D-2 terms while B builds.
