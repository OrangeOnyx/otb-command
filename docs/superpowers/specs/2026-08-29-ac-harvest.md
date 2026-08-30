# AC Harvest — Waves H1.1/H1.2/H2 imports + H2.5 build wave (2026-08-29)

Autonomous `/goal` session ("run all waves and build everything you can to
completion"). Source: `asset-command-prod` (pegmtfjexdzuupubgggv) via MCP SQL —
RLS is disabled on AC so the MCP door reads everything; no keys were handled.
Dest: otb prod (kbhsghodquchkgfdzckc). All imports use deterministic
`ac:<source-id>` ids + `on conflict do nothing` (idempotent re-runs) and stamp
`source='ac'`. Naive AC timestamps are US Central → imported
`at time zone 'America/Chicago'`.

## Flat archive (register #24 + H2 "flat archive" row)

`docs/harvest/ac-archive-2026-08-29/` — all 39 AC tables, lossless, md5
manifest. `users.passwordHash` stripped; `auth_tokens` excluded;
`tenant_access_tokens` token values excluded (ids only). Rebuild drill:
`node tools/ac-archive.mjs <dumpDir> <outDir> <files...>` over saved MCP dumps.

## Live imports (verified)

| Source | Dest | Rows | Verification |
|---|---|---|---|
| rent_payments 313 | `payment_history` (NEW) | 313 | sum(amount_paid) = $1,133,492.20 exact; 25 units; 2025-07→2026-07 |
| voice_intake 62 | `comm_log` (NEW) | 62 | channel='voice', ac_kind folded into payload |
| work_orders 24 | `maintenance_requests`+events | **1** | 23 rows are cancelled "Test Tenant"/"PP Test" test tickets — archived only, NOT imported into the live M-1 queue (deliberate deviation; the one real order = Pothole Repair, Common Area, open 2026-07-27) |
| compliance_events 698 | `compliance_events` merge | **37** | 661 rows are an automated "Test User" COI-extraction loop (same 3 units, expiry sliding daily) — archived only. Merged: 22 SOT-import deposit rows + 11 AC seeds (149) + 4 real COI entries (145 TDC MFP-02533-25-01 · 129 Lloyd's HXG/HXP-000232-00). changed_by='ac:<author>' |
| hvac_units 28 | `hvac_units` (NEW) | 28 | responsibility caps + replacement history, all real |
| deals 2 + waitlist 1 | `deals` (NEW) | 3 | stage map: lead→inquiry, lease_drafting→lease_draft |
| lease_abstractions 24 | `lease_abstracts` (NEW) | 24 | long-tail fields in `fields` jsonb; rawResponse excluded (archive has it) |
| rent_escalations 83 | `rent_escalation_ref` (NEW) | 83 | linked to abstracts via abstract_id |

Known data caveats:
- payment_history 2026-07 rows were bulk-entered in AC (uniform timestamp
  2026-07-22T01:40:31, method null, amounts diverge from the signed roll) —
  lateness scoring must use `status`, never paid_at, and should treat 2026-07
  as informational.
- AC deposit amounts (compliance merge) predate the 2026-07-16 owner-corrected
  roll — informative for the open 107/137/143/149 deposit question, not SOT.

## Deferred (documented, not dropped)

- **documents 247 / floor_plans 57 / register categories 54** — metadata+binaries
  stay archive-only until a keyed one-time storage copy (AC storage access =
  operator/H3-gate step). K-1 already carries executed-lease + floor-plan Drive
  links for the same instruments.
- **AC users** (12 real) — exported to archive for the H-3 role-mapping
  decision; no invitations sent.
- **audit_log 2,622** — archived (register #24).

## New schema (both applied direct to prod; repo files are the record)

- `20260829170000_ac_harvest_tables.sql` — payment_history · lease_abstracts ·
  rent_escalation_ref (read-only: select owner/operator, NO write policies) +
  hvac_units (content tier).
- `20260829170500_comms_matters_deals.sql` — matters · comm_log · deals
  (content tier: owner+operator read · operator write · stamp trigger).
  comm_log is the #14 hub AND the H1.1 voice history landing AND the N-2
  meeting-notes surface (channel='meeting', matter_id link).

H-1 note: `payment_history` implements shape **(b)** from the decision doc (its
own recommendation: "the append-only ledger stays born-clean"). It is additive
and reversible — if the operator picks (a), drop the table and re-import into
the ledger from the archive.

## H2.5 build wave (this session)

New sheets: **L-1 Comm Log** (`comms`) and **N-1 Matters** (`matters`) between
K-1 and M-1. Data seams authored centrally (`lib/payhistory.js`,
`lib/leaseref.js`, `lib/deals.js` — sop.js cache-trio pattern); parallel agents
build: L-1 view · N-1 view + T-1 feed · drawer panels (Prior payments + Lease
abstract) · W-1 deals pipeline · K-1 document expiry (#16, reusing coi.js) ·
P-1 collections history + tenant health (#13).

**Wave 2** (same day): per-unit ⤓ Statement in the drawer Ledger panel (#5 v1,
`lib/statement.js`) · S-1 ⤓ quarterly Board report from stored owner_briefs
models (#12 v1, `lib/boardreport.js` — missing months named, never papered
over) · P-1 CAM/NNN reconciliation DRAFT card (#6 v1, `lib/camrecon.js` —
worksheet actuals vs billed recoveries, CAM-only gross-up; caps/base-year
clauses named as caveats, not modeled).

**Wave 3** (same day): `governance_items` table (migration
20260829210000) — operator-entered LLC records / covenants / deadlines on S-1
with a T-1 feed (#8; repo-locked facts.js instruments stay the facts SOT) ·
matter FILE ATTACHMENTS (N-2 v1.5): operator attaches docs via the existing
documents-bucket seam, entries land in comm_log with openable doc:// links.

Register rows still open after wave 3 — each gated, not skipped:
- **#7 accounting/QBO (N-3)**: its own program; needs an operator design
  session (chart of accounts, expense capture, QBO direction).
- **#9 tenant portal expansion**: changes what TENANTS see (own ledger, lease
  docs, payment links) — audience-facing scope the operator sets (cf. OWN-1);
  also RLS changes on money tables.
- **#2 vendor upload token-links**: architecturally blocked by the
  no-service-key posture — unauthenticated storage uploads need server-signed
  upload URLs (a service key) or a dedicated low-privilege upload identity.
  Operator call before introducing either.
- **#17 binaries**: keyed one-time AC storage copy (H3 step).
