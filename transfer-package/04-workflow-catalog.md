# 04 — Workflow Catalog

System code: **OTBC**. Status per workflow: IMPLEMENTED (code-verified),
IMPLEMENTED-LOCAL (runs on operator's machine), MANUAL (operator procedure the
system supports but doesn't automate), DESIGNED (documented, unbuilt).
The system is operator-centric: most workflows have exactly one human actor
(the operator) and rely on RLS + append-only tables for the audit trail.

---

### OTBC-WF-001 · Sign in / role resolution — IMPLEMENTED
Trigger: any visitor opens the app. Actor: any user. Steps: magic-link email →
Supabase OTP → `handle_new_user()` trigger assigns role (vendor roster >
allowlist > pending) → client `getRole()` (fails closed to pending) → role-gated
shell (vendor: V-1 only; owner: whitelisted sheets; operator: everything).
Failure: unrecognized email lands in pending holding pen. Audit: profiles row.
Related: OTBC-WF-002.

### OTBC-WF-002 · Pre-authorize an owner — IMPLEMENTED
Trigger: operator wants to grant access. Actor: operator. Sidebar → "Sign-in
access…" → type email + "+ Owner" → `authorized_emails` row → their first magic
link lands them as owner. Pending users listed with one-click "make owner".
Revoke = ✕ (does not demote an existing profile — manual Supabase step).

### OTBC-WF-003 · Boot & data hydration — IMPLEMENTED
Trigger: page load. Steps (main.js:278-309): session check → role → **loadSeed**
(auth-gated `/api/seed` merges rents/PII/vendor roster over the public skeleton;
failure leaves skeletons, never leaks) → **loadState** (remote layers hydrate
the store; empty backend seeded from local by operator) → views init →
operator gets debounced (800ms) write-through sync on every store event.

### OTBC-WF-004 · Record a compliance state change — IMPLEMENTED
Trigger: operator clicks a C-1 matrix cell (or drawer compliance row). Steps:
cycle u→ok→flag→na → store `comp` layer persists → append-only
`compliance_events` row (who/when/from→to, best-effort — never blocks the
click) → ⏱ History panel shows the trail. Related: RULE-030/031.

### OTBC-WF-005 · Manage the action board — IMPLEMENTED
Trigger: facts change (auto) or operator edits. The board **seeds itself** from
live data (holdovers, renewal windows ≤12mo, vacancies/LOI, compliance flags,
standing covenants) and merges the operator's override layer (lane moves,
dismissals, custom cards). Outputs: D-1 Action Queue reads the same cards.
Failure state: none — seed recomputes every render.

### OTBC-WF-006 · Edit unit notes / contacts / documents — IMPLEMENTED
Trigger: operator edits in drawer or K-1. recordsUI inline add/edit/dismiss →
store collection layers (seed + custom − dismissed + edits). Documents may
attach a real file (📎 → `documents` bucket → row link becomes `doc://<path>`
→ "Open 📎" resolves a fresh signed URL). Local fallback: IndexedDB.

### OTBC-WF-007 · Attach photos / floor plans (assets) — IMPLEMENTED
Drag-drop or pick in drawer/K-1 → IndexedDB or `assets` bucket (25MB cap,
signed URLs) → A-1 📷 badges + drawer grids refresh via onAssetChange.
One-time local→cloud migration on operator login.

### OTBC-WF-008 · File to the Owner Safe — IMPLEMENTED
Actor: operator (owners read-only). Upload into category folder → `safe`
bucket → every view/upload/delete appends `safe_log` (operator-only "Recent
access" panel). 10-min signed URLs. Vendor sealed at DB layer.

### OTBC-WF-009 · Vendor document exchange — IMPLEMENTED
Actors: operator + vendor. Operator: pick vendor → upload/open/delete in their
private folder; audit in `vendor_log`. Vendor: magic-link with roster email →
one-sheet shell → sees own folder, uploads "to management". Inviting a vendor =
telling them to sign in with their roster email (operator's call).

### OTBC-WF-010 · Track certificates of insurance — IMPLEMENTED
Trigger: cert arrives / expires. Operator files the cert in the vendor folder,
sets `coi_expires` (+note) in the vendor panel → badge auto-classifies
(expired / ≤30d critical / ≤60d expiring / ok; missing flagged on service
vendors) → vendor face shows their own status + renewal nudge. No email
notifications yet (deferred).

### OTBC-WF-011 · Ask the AI desk / draft a notice — IMPLEMENTED
Actor: owner/operator (200/day cap). Pick agent chip → chat streams grounded
answers (dossier + live-state digest); any arithmetic routes through run_calc
with the fail-closed guardrail; 🔊 TTS on demand; thread persists (server +
client) and resumes on reload. Manager persona drafts tenant notices for the
operator to send manually.

### OTBC-WF-012 · Assemble a lease package — IMPLEMENTED (operator-only)
Trigger: operator asks 🤝 Leasing to assemble. Steps: conversational term
collection → strict tool call → HTML proposal (+ optional owner summary) built
from real unit/recoveries/HVAC data (vacant fallback: camFlatPsf + medians) →
uploaded to `documents/lease-packages/` → signed URL card [[package:]] →
operator opens 🔒 / ✉ emails via prefilled mailto. Every document DRAFT-stamped.
Approval boundary: server rejects non-operator; email send stays human.

### OTBC-WF-013 · Daily proactive scan (cron) — IMPLEMENTED
Trigger: Vercel cron 11:00 UTC. Steps: detectors (holdover / renewal ≤180d /
occupancy <85%) → `open_trigger_thread` RPC idempotently opens ONE AI-1 thread
per trigger_source with a seeded assistant message routed to the right persona
→ operator finds the thread in AI-1 History. Failure: per-candidate failures
counted in summary JSON; re-runs safe. Live catch: 115/117 renewal window.

### OTBC-WF-014 · Monthly owner report — IMPLEMENTED
Trigger: first cron run of the month. Deterministic (NO LLM) brief: occupancy +
scheduled-rent KPI tiles with stored-model MoM deltas, vacancies, holdovers,
12-month expiration table, worksheet NOI/cap value only if the P-1 opex
worksheet exists → `owner_briefs` (insert-once) → [[brief:]] card in the
monthly thread + 📊 Briefs archive panel. OO-branded HTML.

### OTBC-WF-015 · Monthly rent charges + collections — IMPLEMENTED (live 2026-08)
Trigger: cron (daily idempotent) posts the month's TOTAL-rent charges
(`rent:YYYY-MM:unit`) once LEDGER_START_YM arrives. Operator workflow: log each
rent check in the unit drawer → Ledger → "Payment received"; late-fee
suggestion chips appear past the 5-day grace ($100 + $25/day) and post only on
operator confirm; voids are append-only entries. P-1 shows collected-vs-charged
+ FIFO aging. Failure: money writes fail loud.

### OTBC-WF-016 · Parking occupancy (C3 loop) — IMPLEMENTED-LOCAL, hands-free
Trigger: continuous. Sampler (300s × 17 cams, watchdog-healed) → nightly Task
23:45 classifies banked frames (Haiku, hourly sampling, strict JSON) + uploads
JSONL idempotently via secret-gated RPC → A-1 🚗 chip (latest state over the
row-56 tick band) + D-1 card. Exceptions: sampler death (watchdog),
UTC-keyed day dirs, cp1252 stdout lesson. Next: lot8/field-149 overlay
geometry, stall-walk verification, weekly rollup (DESIGNED).

### OTBC-WF-017 · Update the source of truth — MANUAL (governed)
Trigger: signed lease / owner correction. Steps: update `docs/sot-2026-07/`
CSVs (authority rank 1) → regenerate app projections (`units.json` edits +
`npm run split-seed` + `npm run concierge-context`) → data-integrity tests pin
exceptions → deploy. Rules: DoorLoop never authoritative; stated-rent
exceptions stored, not fixed; combined-lease allocations reporting-only.

### OTBC-WF-018 · Marketing artifact generation — IMPLEMENTED (tooling)
Trigger: availability changes / campaign. `npm run poster` (5 variants — B
blessed) · `poster-specials.py` (navy/white X creative — blessed aesthetic) ·
`pylon.py` (sign panels) · `vinyl-b1.py` (QR window vinyls; QR=tel: until
domain lands) · `case-study-c1.py` (OO case study) · `proforma.py` (owner
Excel). All read live units/geometry — regenerate-on-change, disposable output.

### OTBC-WF-019 · Export / import / print — IMPLEMENTED
Topbar Export (full persisted-state JSON snapshot) / Import (validated, then
reload) — the portability + backup path. ⤓ SHEET / Ctrl+P prints any sheet with
drawing-set footer. `npm run export-package` (LLM dossier) /
`export-buyer` (financials stripped, anomalies trimmed).

### OTBC-WF-020 · Deploy — MANUAL (governed)
`node --check` + `npm run build` + tests → commit → `npx vercel deploy --prod`
→ **verify the prod bundle actually carries the change** (grep chunk) →
operator smoke round. Commits do NOT auto-deploy (deliberate).

### DESIGNED-ONLY (documented, unbuilt)
- OTBC-WF-021 Emergency/incident response — no module; W-1 cards only.
- OTBC-WF-022 CAM reconciliation/true-up cycle — gross-up calculator exists;
  no annual reconciliation workflow, no tenant statements.
- OTBC-WF-023 Work-order dispatch — vendors + docs exist; no WO object,
  no dispatch/close loop. (Queued merger #5 capex/insurance/OCR engines are
  gated on data surfaces.)
- OTBC-WF-024 Public leasing funnel (B2 microsite + B4 scoped bot + C2 sandbox
  login) — deferred pending footage/domain.
- OTBC-WF-025 Renewal execution — detection + AI thread exist; the negotiation/
  amendment/execution trail lives outside (email/paper), landing back as SOT
  updates (WF-017).
