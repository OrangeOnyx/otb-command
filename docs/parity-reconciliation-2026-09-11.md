# Parity reconciliation — register rows #4 · #15 · #19 · #20 · #23 · #24

**F-5 (Tier 1, operator pick 2026-09-11).** Six PARITY rows of the capability
transfer register (`docs/platform-consolidation-decision-2026-08-25.md` :36-64)
verified against the AC archive (`docs/harvest/ac-archive-2026-08-29/`,
39 tables, MANIFEST md5 + row counts) and the Atlas code as of branch
`claude/tier1-f5-parity`. Every count below was computed from the archive
files by script during this session, not retyped from earlier docs.

Method: archive JSON read row-by-row under Node; Atlas side read from the
repo (`src/`, `api/`, `supabase/migrations/`, `public/`). No live database
reads (SQL door closed this session) — anything that needs prod state says so.

## Verdicts

| Row | Capability | Verdict | Closed this session | Decisions owed |
|---|---|---|---|---|
| #4 | Rent tracking + AR | **GREEN-WITH-NOTE** | seam-month conflict quantified; AC late-fee double-run found | D-4a seam convention · D-4b late-fee policy |
| #15 | NL query | **GREEN-WITH-NOTE** | live digest extended to 8 typed tables (`digestTyped`) | D-15 read-only query tool |
| #19 | Spatial datasets | **GREEN-WITH-NOTE** | appraisal → S-1 + P-1 (`APPRAISAL_2019`); 11 datasets reconciled | D-19a title exceptions · D-19b pylon register · D-19c POI/view taxonomy |
| #20 | Marketing assets | **GREEN** | 25/25 logo parity proven; no AC marketing rows exist | none (brand runtime read = F-22) |
| #23 | SOT import tooling | **GREEN-WITH-NOTE** | identifiers migration written (not applied) | D-23a surface identifiers · D-23b owner-entity name |
| #24 | Allowlist / audit | **OPEN** | AC allowlist mapped 2 of 6; audit shape quantified | D-24a read-only role · D-24b sign-in audit · H-3 (operator, unchanged) |

### Register update (Schedule E, `docs/status/atlas-punch-list.html`)

| Row | Chip before | Chip proposed | Cell note |
|---|---|---|---|
| 4 | PARITY | PARITY (unchanged) | verified Sep 11 · 2 convention decisions |
| 15 | PARITY | PARITY (unchanged) | digest extended Sep 11 to ledger / M-1 / N-1 / S-1 / W-1 / O-1 |
| 19 | PARITY | PARITY (unchanged) | appraisal closed Sep 11 · title exceptions + pylon decisions |
| 20 | PARITY | **DONE** | 25/25 logos + 04C kit verified Sep 11 |
| 23 | PARITY | PARITY (unchanged) | identifiers SQL in repo, NOT applied |
| 24 | PARITY | PARITY (unchanged; OPEN in this doc) | viewer role + sign-in audit owed · H-3 |

Green count 8 → 9 of 25.

---

## #4 · Rent payment tracking + AR

**Register line (:43):** "Rent payment tracking + AR | Ledger + P-1 | PARITY
going forward; history per H-1 decision | 313 rows ($1.13M)".

**Atlas has:** `src/lib/ledger.js` (typed `ledger_entries`; one TOTAL-rent
charge per occupied unit per month, deterministic id `rent:<ym>:<unit>`;
`LEDGER_START_YM = "2026-08"`; `OTB_LATE_POLICY` grace 5 · flat $100 ·
$25/day; FIFO aging; late-fee *suggestions*, operator confirms), cron
`api/auto-trigger.mjs` (posts the month), `payment_history` (313 imported
rows), P-1 collections / aging / tenant-health / pay-history cards
(`src/views/financial.js`), tests `test/ledger.test.mjs`.

**AC has (archive):** `rent_payments` 313 · `ledger_entries` 108 ·
`invoices` 18 · `invoice_line_items` 108 · `late_fee_assessments` 36 ·
`late_fee_runs` 12.

**Verification performed:**

1. History parity — `rent_payments`: 313 rows, Σ amountPaid **$1,133,492.20**,
   25 units, periods 2025-07 → 2026-07, status paid 268 / late 25 /
   partial 12 / unpaid 8. Matches the harvest-spec import record for
   `payment_history` exactly (`docs/superpowers/specs/2026-08-29-ac-harvest.md`
   :20). History side is settled (H-1).
2. Seam month 2026-08 — AC posted **108 charge entries, all period 8/2026,
   18 units × 6 codes** (base_rent 18 = $46,420.99 · cam 18 = $7,525.40 ·
   tax 18 = $3,396.81 · insurance 18 = $5,895.86 · late_fee 36 = $1,800.00)
   = **$65,039.06**, and 18 invoices `INV-202608-<unit>` (subtotal
   $63,239.06 + late fees $1,800 = $65,039.06), **all status `draft`,
   `sentAt` null on every row** — never issued to a tenant. Atlas posts the
   same month as 24 single TOTAL-rent charges = **$88,070.71** (Sept-2026
   lease review schedule). Unit overlap: 18 both sides; **Atlas-only 105 ·
   109 · 117.5 · 119 · 143 · 149** (AC never invoiced them). Per-unit
   deltas (AC − Atlas): 12 units within ±$0.01; 101 +$3.36 (Pink Paisley
   stated-rent exception); 103 +$1.49; 113 −$108.57; 115 / 117 −$1,220.63
   each; 137 −$672.35; **145 +$2,236.50** (Upstream Jul–Dec abatement,
   $798.75 additional-only, absent in AC). Every divergence traces to the
   September lease review (Tier-1 SOT since 2026-09-11) that AC predates —
   Atlas is right by ruling; AC's August is a stale draft.
3. Charge-model convention — AC splits base / CAM / tax / insurance per
   invoice line; Atlas posts one TOTAL charge (operator rule 2026-07-17:
   bare monthly = total; PSF components only in the explicit breakdown).
   Not a parity gap — a deliberate convention; invoice line rendering is
   F-1's problem, not the ledger's.
4. Late-fee policy — AC per-unit settings are uniform across all 27 units:
   **flat $50 · $0/day · grace 5 · enabled**. 36 assessments = **2 per
   invoice** from two runs (2026-08-07 14:02 and 2026-08-08 14:01, each
   "18 fees / $900"): AC's engine had no per-month idempotency and
   **double-assessed every August invoice** ($100 per invoice is the sum of
   two $50 fees, not a $100 policy). Atlas's `late:<ym>:<unit>` id makes
   that impossible. The remaining divergence is the policy itself: Atlas
   $100 flat + $25/day vs AC $50 flat + $0/day (same grace). Neither figure
   is lease-cited in the repo (`ledger.js` :12 calls the Atlas set "donor
   constants (OTB standard schedule)").
5. 10 of 12 `late_fee_runs` assessed nothing (heartbeat runs) — no data.

**Verdict: GREEN-WITH-NOTE.** Mechanism parity holds going forward; history
is verified; the two remaining items are conventions, not capability gaps.

**D-4a — August 2026 seam convention** (recommendation first):
1. **Atlas ledger is the sole 2026-08 record; AC's 108 charges / 18 drafts
   stay archive-only** (never sent, superseded by the lease review, and
   importing them would double-book every overlapping unit). No code.
2. Import AC's August charges as *voided* history (`type: void`) so the
   ledger shows what AC would have billed — audit trail, zero balance effect.
   Cost: 108 rows of noise on 18 unit ledgers.
3. Import AC's August as live charges and void Atlas's — rejected: the AC
   figures contradict the Tier-1 SOT.

**D-4b — late-fee policy of record:**
1. **Keep Atlas `OTB_LATE_POLICY` ($100 flat + $25/day, grace 5) and cite
   its source** — the operator names the lease clause or schedule it comes
   from; recorded in `ledger.js` and `docs/`. The AC set is an unsourced
   default from the AC seed.
2. Adopt AC's $50 flat / $0 per day — only if the operator confirms that is
   what the leases actually say (then `OTB_LATE_POLICY` changes, tests pin
   it).
3. Per-unit policy (AC's `lateFee*` columns) — build only if leases differ
   per tenant; nothing in the archive shows they do (all 27 identical).

---

## #15 · NL query

**Register line (:54):** "NL query (NL→SQL) | AI-1 grounded digest +
run_calc; add read-only NL query over typed tables if the digest proves
insufficient | PARITY 'in some form' | none".

**Atlas has:** `api/concierge.js` (three agents over a prompt-cached dossier
`api/_context.mjs`, `run_calc` loop with the numeric guardrail),
`src/lib/concierge.js` `digestState(layers)`. Before this session
`liveDigest` read **only the 7 `LAYER_DEFS` tables** (`comp_state`,
`unit_notes`, `board_state`, `directory_state`, `layer_settings`,
`site_features`, `camera_overrides`) — the concierge saw nothing live about
the ledger, maintenance, matters, governance, deals or SOP. The row's own
trigger ("if the digest proves insufficient") was met.

**AC had:** an NL→SQL surface over its tables (no archive table — a runtime
feature, nothing to import).

**Closed this session (commit "Extend the concierge live digest…"):**
- `digestTyped(summary)` in `src/lib/concierge.js` — pure; renders a
  `TYPED RECORD DIGEST` block from `{ledger, maintenance, matters,
  governance, deals, sop}`; every organ optional (absent → "not loaded");
  counts + top-5 rows only; whitelisted fields; emails and phone numbers
  scrubbed from titles; never notes, assignees, prospect names or raw rows.
  Cap `MAX_TYPED_CHARS` 1,800.
- `api/concierge.js` `typedSummary()` — each organ in its own try/catch,
  reads as the caller (RLS), folds through the sheets' own seams so the
  digest cannot disagree with P-1 / M-1 / N-1 / S-1 / O-1: `aging()` over
  `ledger_entries`, `deriveRequest()` over `maintenance_requests` +
  `_events`, `matterDeadlines()`, `govDeadlines()`, deal counts by stage,
  `foldCompletions()` + `deriveOccurrence()` over `sop_assignments` +
  `sop_completions`. Appended after the operator-edit digest.
- Tests (`test/concierge.test.mjs` 13 → 16): shape, omission + top-5 cap,
  hostile-fixture PII (emails, phones, notes, EIN, names, assignees).

**Verdict: GREEN-WITH-NOTE.** The digest now covers 15 tables. True NL→SQL is
still not built — by design: the guardrail philosophy ("never do arithmetic
yourself; run_calc only") argues against free-form SQL from the model.

**D-15 — read-only query tool:**
1. **Do not build it now.** Log any question the extended digest cannot
   answer (AI-1 transcripts already persist); revisit when a real
   unanswered question appears, not before.
2. Add a `query_record` tool over a fixed whitelist of read-only views
   (unit ledger, unit lease abstract, matter detail) — bounded, no SQL from
   the model. ~1 day.
3. Full NL→SQL — rejected (unbounded reads, contradicts the numeric
   guardrail).

---

## #19 · Spatial datasets

**Register line (:58):** "Spatial: parcels, appraisals, recorded agreements,
licenses, lots, stalls, signs, pylons, POIs, floor plans, views |
A-1/A-2/K-1 native (geometry.json, instruments.json, stall-map) | PARITY —
verify each dataset against AC rows; appraisals → S-1 | reconcile".

**Dataset-by-dataset:**

| AC table | Rows | Atlas destination | Verification | State |
|---|---|---|---|---|
| appraisals | 1 | S-1 proforma card · P-1 cap hint | 2019 Broussard MAI: as-is $6,000,000 · as-developed $6,700,000 · income $6,712,000 · sales $6,725,000 · cost $6,535,000 · land $2,160,000 ($10.26/SF × 210,830 SF) · NOI $570,498 · cap 8.50% · bldg 62,749 SF · 2019 tax $54,176 @ 102.05 mills. All figures now in `instruments.json.appraisal2019` with `source: ac:appraisals:003b088b…`. **PDF binary not read** — it lives in AC storage (`fileKey 2019Appraisal-101-149ArnouldBlvd_953afecd.pdf`), copy pending F-9; the figures are the archive row's. Appraiser SF 62,749 ≠ GLA 62,883 — surfaced in the record, GLA stays the citation. | **CLOSED** |
| recorded_agreements | 13 | instruments.json · geometry.json · facts | By entry number — present in Atlas: `2004-00057697` (JD Bank supersedes), `99-11797` (variance of record), `03-060864` (cross easement, geometry), `577566` (10' LUS electric), `77-0783` + `77-000785` (expired drainage, geometry + directory), plus the two active agreements AC lists as "(2019 executed)" church and "(2020 executed)" JD Bank (instruments + facts + geometry liquor line) = **8 of 13**. **Absent: `98-18247`** (original variance, revised by 99-11797), **`99-041054`** (signage zoning, title exc. #25), **`286167`** (#11 church plat ref), **`97-012420`** (#20), **`445327`** (#13). | 8/13 — D-19a |
| licenses | 2 | instruments.jdBank · geometry.church | Church $350/mo, liquor waiver; JD Bank $250/mo, 13 spaces, term end 2034-12-30 — identical to `JD_BANK` / facts. | ✓ |
| parcels | 2 | geometry.json boundary | Main + Lot 7 remote (parcel 6009649, 14,375 SF) ✓. AC parcel1 `lotSf 105,851` is flagged estimated and contradicts 4.84 ac; not adopted. | ✓ |
| lots | 3 (1 deprecated) | geometry parking zones | AC: Main field, [deprecated] North Lot, Lot 7. Atlas (REV 9+): Main · Lot 8 · Lot 7 · rear M.A. row · Johnston strip · JD easement — superset. | ✓ |
| parking_stalls | 1 | stall-map.json | AC holds one unlabeled test rectangle; Atlas draws 314 stalls. | ✓ |
| signs | 2 (+1 belongs to AC's "Example Property") | geometry pylon pocket · K-1 `pd:pylon` | AC: pylon (photo on file, approval pending) + one exterior sign pin on 101 (pending). Atlas has the pylon geometry and artwork generator; **no per-unit sign-approval register**. | note |
| pylon_slots | 14 real (14 of 28; the rest belong to the example sign) | `tools/pylon.py PANEL_UNIT` | P2–P14 unit-for-unit identical (149, 123, 139, 109, 125, 115, 129, 119.5, 111, 143, 117.5, 145, 119). P1: Atlas 107, AC blank. **13/14** — Atlas is the more complete record; AC has no data Atlas lacks. | ✓ — D-19b |
| poi_categories · pois | 42 · 1 | `FEATURE_TYPES` (14) · `site_features` | AC placed exactly one POI (a water meter on 117.5's floor plan). Its 42-type / 8-group taxonomy (Site · Life Safety · Utilities · Plumbing · Building · HVAC · Network · Other) is a design reference; Atlas's 14 types cover the placed data. | ✓ — D-19c |
| views | 7 | A-2 property workspace | AC views = audience-scoped layer presets (Daily Ops, Building Systems, Common Areas, Hardscape, Leasing, Roof, Signage). Atlas A-2 has the workspace + "Capture & legacy views"; no audience presets. Nothing to import (no data rows behind them). | REF — D-19c |
| floor_plans | 57 (28 units) | `floorplan-links.json` (Drive) · F-9 | Binaries in AC storage — F-9, out of scope here. | deferred |
| property_identifiers | 25 | properties.facts | see #23 | #23 |
| property_register_categories | 54 | K-1 register | row #17 PORT — deferred with the binaries. | #17 |

**Verdict: GREEN-WITH-NOTE.** The named deliverable (appraisal → S-1) is
closed; 11 of 13 datasets are at parity or superseded by richer Atlas data.

**D-19a — the 5 recorded agreements absent from Atlas:**
1. **Add a `titleExceptions` list to `instruments.json`** (entry number ·
   title · exception no. · status, verbatim from the archive) and render it
   as a K-1 register block — cheap, keeps the recorded-instrument set whole,
   and gives the "MISSING — order needed" title policy (#23) something to
   reconcile against when it arrives.
2. Leave archive-only until the owner title policy is ordered, then port
   from the policy itself.
3. Drop — rejected (register rule: nothing dropped).

**D-19b — sign / pylon register:**
1. **Encode `PANEL_UNIT` as data** (`src/data/pylon.json`: panel → unit →
   approval status), read by `tools/pylon.py` and a K-1 card; P1 stays 107.
   Small.
2. Leave in `pylon.py` — the artwork already reflects the sign; approval
   tracking waits for a real signage request.

**D-19c — POI taxonomy + audience views:** REF only. 1. Adopt AC's 8 groups
as an optional `group` on `FEATURE_TYPES` when the next A-1 feature pass
happens; 2. nothing now. (Recommend 2.)

---

## #20 · Marketing assets

**Register line (:59):** "Marketing assets | K-1 site imagery + orgs.brand
kit | PARITY + gap | 0 rows".

**Atlas has:** `public/brand/cypress/` (04C v1.0.1 lockups, mark, favicon,
app icon, fonts; byte-verified — `docs/cypress-command-brand-provenance.md`),
`public/tenant-logos/` 25 files, `orgs.brand` jsonb (seeded by purge #6,
validated at intake by `src/lib/onboard.js` :25).

**AC has:** no `marketing_assets` table in the archive (the manifest's 39
tables do not include one — the register's "0 rows" is literal);
`documents` 247 rows in three categories only (`insurance` · `lease` ·
`logo`), of which **25 carry `isPrimaryLogo`**.

**Verification performed:** both logo sets listed and compared as sets —
AC units {101 103 105 107 109 111 113 115 117 117.5 119 119.5 121 123 125
127 129 135A 135B 137 139 141 143 145 149} (AC ids `u1175`/`u1195` →
117.5/119.5) vs `public/tenant-logos/*.png` — **25/25, zero missing, zero
extra.** Combined-lease tenants share one logo on both sides (101/103 Pink
Paisley, 115/117 Clothing Loft, 125/127 Jordan Amanda, 139/141 FastPass).
`tools/pylon.py` and the K-1 site imagery consume the same files.

**Gap check:** `orgs.brand` is written, validated, and never read at runtime
(every brand constant is hardcoded). That is a platform design item —
Tier 3 **F-22 brand sheet** — not an AC capability that failed to transfer
(AC never had a brand kit either). Twin-marketing set = F-17, out of scope.

**Verdict: GREEN → register chip DONE.** No decision owed.

---

## #23 · SOT import tooling

**Register line (:62):** "SOT import tooling | onboard/intake rail +
per-property data packages (Phase C) | PARITY + gap | —".

**Atlas has:** `docs/phase-c/01-onboarding-design.md` (v1 fences :38-48: no
data package, no storage prefixes, no self-serve), `src/lib/onboard.js`
`validateIntake` (org/property/members shape; `property.facts` as an array
of `{label, value}`), `tools/onboard-property.mjs`, RPC `onboard_property`
(`20260805030451_onboarding_rpc.sql` — org reused by slug, duplicate
property slug refused, whole intake rolls back), the split-seed rail,
`tools/ac-archive.mjs` (rebuild drill for the archive itself).

**AC had:** `property_identifiers` 25 label/value rows in 7 groups, no
import tooling of its own beyond the Manus seed (its `audit_log` records
only 2 `unit_edit` events in two months — no import event log existed to
port).

**Verification performed:** the 25 rows read and grouped — Entity & Legal 5 ·
Tax & Parcel 3 · Loan 4 · Insurance 4 · Title 2 · Utilities 3 · Technology 4;
**13 have values, 12 are null**. Secrets scan: no tokens, keys or
credentials — the values are a policy number (`Hartford 43SBMAL3XX2`), a
broker contact line (TSL Insurance Group — names, office phones, one work
email), lender / loan / maturity, title company, and status strings. The
broker line is business contact data already on K-1's insurance contacts;
loaded verbatim. `properties.facts` shape confirmed as a **jsonb array**
(`phase_b_foundation.sql` :21 default `'[]'`; purge #4 entries `{key, kind,…}`)
— the migration appends, never object-merges.

**Closed this session:** `supabase/migrations/20260911140000_property_identifiers.sql`
— header NOT YET APPLIED; idempotent (strips prior `kind='identifier'`
entries, appends 25 `{key, kind:"identifier", group, label, value,
sortOrder, asOf, source:"ac:property_identifiers:<id>"}`); generated from the
archive by script, values verbatim, nulls kept null (the gap is the record).

**Anomalies surfaced, not fixed (values loaded as AC held them, `asOf`
stamped):**
- "Owner Entity (Legal Name)" = **"On The Boulevard, LLC"** (AC edit
  2026-07-31) vs the audit record (owning entity Belle Realty of Lafayette,
  LLC; AC's own `properties.legalEntity` says Belle Realty). Operator call.
- "PM platform: DoorLoop" — DoorLoop is off the roadmap (Jun 2026 decision).
- "Domain: orangeoceanassetcommand.com" — retired; product is Cypress
  Command / otb.cypresscommand.com.
- "Owner policy status: MISSING — order needed" (title) and "Flood policy:
  NONE in program — NFIP/private decision needed" — both are open items
  already, restated here so they do not get lost inside a jsonb column.

**Verdict: GREEN-WITH-NOTE.** The rail exists and is fenced deliberately; the
one AC dataset that belonged to it now has a migration. Note: `validateIntake`
rejects blank `value`s on *intake* — the migration bypasses intake by design;
a future export → re-intake of these facts would need blanks allowed.

**D-23a — surfacing the identifiers once applied:**
1. **K-1 "Property identifiers" card** reading `properties.facts` where
   `kind='identifier'`, grouped as in AC, nulls shown as "— not on file"
   (so the 12 gaps are visible work items). Half a day.
2. S-1 Owner Safe block (same render, owner-visible only) — but 9 of the 25
   are utility/technology rows nobody needs behind the safe.
3. Data only; no sheet — the concierge cannot see `facts` today, so this
   makes the load pointless.

**D-23b — owner entity legal name:** 1. Operator confirms the owning entity
of record and the migration value is corrected in a follow-up (one row);
2. leave AC's value with the `asOf` stamp as the discrepancy record.

---

## #24 · Allowlist / superadmin / audit log

**Register line (:63):** "Allowlist / superadmin / audit log |
authorized_emails + org_members + per-domain audit trails | PARITY |
audit_log archive".

**Atlas has:** `authorized_emails` (role owner | operator), the `org_members`
lattice (operator · owner · vendor · tenant, property + unit scope),
`assign_role` (owner | vendor | tenant, Sep 1), `stamp_log_email` forgery
guard, per-domain logs — `safe_log`, `vendor_log`, `compliance_events`,
`maintenance_events`, `comm_log`, `client_errors`, `api_usage`,
`cron_heartbeats`, `sop_completions`, `occupancy_samples` — and
`updated_by` / `updated_at` stamps on the typed tables. Owners are read-only
by RLS (operator writes).

**AC has (archive):** `access_allowlist` 6 · `audit_log` 2,622 · `users` 76
· `user_properties` 12.

**Verification performed:**
1. `access_allowlist`: **5 `read_only` + 1 `staff`** —
   alicia@ / catherine@ / edward@belle-realty.com (property null = all),
   spencer@comittechnologies.com (IT vendor, all), dickeydupuis@icloud.com
   (read_only, scoped otb-prop-1), bzorn253@gmail.com (staff, otb-prop-1).
   Mapped to Atlas today: **dickeydupuis → `authorized_emails` OWNER**
   (pre-authorized 2026-08-10, HANDOFF); **bzorn253 → `vendors.json`
   `brian-zorn`** (vendor role path exists; invitation not sent). The other
   four have no Atlas row — that is exactly the **H-3 mapping**, owed by the
   operator since Sep 5 (reopened r7). Not relitigated here.
2. `audit_log` 2,622 by `eventType`: page_view **2,525** · login_password 68
   · login_oauth 21 · password_reset 4 · register 2 · unit_edit **2**;
   8 distinct users; 2026-07-06 → 2026-08-30; IP + user-agent on every row.
   96.3 % is page-view noise; the two `unit_edit` rows are the only
   change-history AC ever recorded. Archived (harvest spec) — nothing to
   import into a typed table.
3. `users` 76 = 12 real (9 `user`, 2 `viewer`, 1 `admin`) + 64 synthetic
   `owner` rows from a load test; `user_properties` 12 (3 owner, 4 manager,
   5 viewer). AC's role vocabulary had an explicit **viewer**; Atlas's
   `org_members` CHECK does not.
4. Atlas gap, confirmed by grep of `supabase/migrations/`: no sign-in log,
   no page-view log, no generic change-history table (stamps only).

**Verdict: OPEN.** Membership and per-domain audit are at parity; the
read-only role and a sign-in trail are missing, and 4 of 6 AC allowlist
entries wait on H-3.

**D-24a — read-only role for AC's `read_only` users:**
1. **Map `read_only` → Atlas OWNER as-is.** Owners are already read-only by
   RLS on every sheet (operator writes). No schema change; the three
   belle-realty.com staff and the IT vendor become owners *only if the
   operator is content that they see S-1 and P-1* — which is the H-3
   question restated, so this collapses into H-3.
2. Add an explicit `viewer` role to `org_members` (owner-shaped reads minus
   the safe bucket, ledger and owner briefs) — new CHECK value + RLS
   predicates on ~8 policies + `assign_role` option + sidebar chip. ~1 day.
   Pick this if any of the four should NOT see money.
3. Leave the four unmapped until the C-3 pilot needs a viewer.

**D-24b — sign-in audit:**
1. **`signin_log` typed table + a boot-time RPC** (`log_signin`, stamped
   through `stamp_log_email` so the email cannot be forged; one row per
   session start with role + property). Feeds a D-1 "Recent sign-ins" line.
   Half a day; no page-view firehose.
2. Rely on Supabase Auth dashboard logs — short retention, not in-app,
   not owner-visible. Rejected as the record of account.
3. AC-style page-view audit — rejected (2,525 of 2,622 rows were noise).

**H-3** — unchanged, operator's: the AC-account → owner / vendor / tenant
mapping for the four unmapped emails above (and confirmation of the two
already mapped).

---

## Files touched this session

- `docs/parity-reconciliation-2026-09-11.md` (this file)
- `src/data/instruments.json` — `appraisal2019`
- `src/lib/facts.js` — `APPRAISAL_2019`, `factLines.appraisal2019()`, `factLines.capRateHint()`
- `src/views/safe.js` — S-1 proforma "Valuation on file" line
- `src/views/financial.js` — P-1 cap-rate placeholder + tooltip + reference note (hint only)
- `src/lib/concierge.js` — `digestTyped`, `MAX_TYPED_CHARS`
- `api/concierge.js` — `typedSummary`, `liveDigest` appends the typed block
- `test/facts.test.mjs` (+2) · `test/concierge.test.mjs` (+4)
- `supabase/migrations/20260911140000_property_identifiers.sql` — NOT applied
- `docs/status/atlas-punch-list.html` — Schedule E only (#20 → done; cell notes for #4 #15 #19 #23 #24; count 9/25)

Out of scope by instruction: invoices (F-1), HVAC (F-4), CAM (F-2), report
variants (F-3), floor-plan / document binaries (F-9), twin-marketing (F-17),
brand sheet (F-22).
