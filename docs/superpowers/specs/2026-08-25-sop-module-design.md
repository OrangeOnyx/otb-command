# SOP Module (Harvest H1.3) — Design

**Date:** 2026-08-25 · **Status:** adopted (executes the operator-adopted
platform-consolidation decision, register row #3 / Wave H1.3 — scope was ruled
there; this doc fixes the shape).
**Source system:** Asset Command prod (`asset-command-prod`,
`pegmtfjexdzuupubgggv`) — the one AC feature with real adoption (9 completions
in 30d) and no otb-command equivalent.
**Deliverables:** 5 typed tables + RLS · new O-1 Operations sheet · reminder
leg in the existing `auto-trigger` cron · all 506 rows imported.

## 1. What AC actually has (audited 2026-08-25)

| AC table | Rows | Live columns (used) | Dead columns (0 usage) |
|---|---|---|---|
| sop_categories | 18 | name, description, icon, sortOrder | — |
| sop_procedures | 88 | categoryId, title, description, frequency, estimatedMinutes, isActive, version | scheduleCronTaskUid (Manus), complianceFieldKey, targetUnitId |
| sop_steps | 320 | procedureId, stepNumber, title, instructions, isCheckpoint, warningNote | photoUrl/photoKey |
| sop_assignments | 71 | procedureId, userId, assignedBy, dueAt, status | scheduleCronTaskUid, scheduledFrequency (Manus scheduler) |
| sop_completions | 9 | procedureId, assignmentId (all 9 linked), completedBy, completedAt, notes, durationMinutes | photoUrl/photoKey |

Facts that shape the port:
- **Every actor is Adam** (AC user id 1 = adam@adamabdalla.com): all 71
  assignments assigned by/to him, all 9 completions his. User mapping is a
  constant; open decision H-3 is NOT a dependency.
- **Frequencies:** as_needed 29 · annually 19 · monthly 13 · quarterly 13 ·
  weekly 9 · daily 5. 27 of 88 procedures have assignment rows.
- **AC's reminder engine was Manus cron tasks** (dead since the scheduler was
  decoupled; per runbook it is NOT being re-enabled). Assignment rows are
  scheduler-materialized *occurrences*; since it died, "overdue" piled up
  (44 stored overdue, due 8/01–8/07) and stored statuses went stale (18
  "pending" rows are due 8/08–8/31 — many already lapsed by wall clock).
- **Photos:** zero step/completion photos ever. Referential integrity: clean
  (0 orphans anywhere).

## 2. Shape decisions (Atlas idiom)

1. **Occurrences stay materialized, status goes derived.** The
   `sop_assignments` table survives as *scheduled occurrences* (that is what
   AC's rows are), but the enum status column dies: **completed** ⟺ a
   completion row links the occurrence; **overdue** ⟺ due date passed without
   one; **pending** otherwise. Same derive-don't-mutate pattern as M-1
   (status from events) — and it makes AC's stale enums self-healing on
   import.
2. **The auto-trigger cron replaces the Manus scheduler.** A new leg (a)
   materializes the current period's occurrence per active scheduled
   procedure — deterministic ids + on-conflict-do-nothing, exactly the
   rent-charges idiom, so re-runs insert 0 — and (b) emits ONE overdue digest
   candidate for AI-1.
3. **Digest, not per-item threads** (44 overdue on day one would open 44
   threads). `trigger_source = "sop-overdue:<max overdue due-date>"`: stable
   while nothing new lapses (no re-fire), a fresh thread when a new occurrence
   goes overdue (it re-lists the stragglers). Exception-driven — success stays
   silent; "due today" is the sheet's job, not the alert rail's.
4. **Dead Manus columns are dropped** (scheduleCronTaskUid, scheduledFrequency
   — they name a scheduler that no longer exists). **Unused-but-intentful
   columns keep cheap parity seats:** `unit` (AC targetUnitId), `comp_field`
   (AC complianceFieldKey), `photo_key` on steps/completions (bucket-path
   seat; writer UI is a v2 seam). Per the operator's capability ruling,
   features transfer in some form — these are the form.
5. **Due-date semantics are date-based, UTC ymd.** Occurrences are due at
   period end (daily = that day, weekly = ISO-week Sunday, biweekly = Sunday
   of even ISO weeks, monthly = month end, quarterly = quarter end, annually
   = Dec 31). Overdue compares dates, never timestamps — no tz math anywhere.
   Imported AC due dates keep their original day.
6. **Materializer duplicate guard is period-based, not id-based:** skip a
   procedure if ANY existing occurrence (imported AC ids included) falls
   inside the current period. New ids are deterministic:
   `sa:<procedureId>:<dueYmd>`.
7. **No realtime, no board cards, no D-1 brick** in v1 — M-1 parity
   (fetch-on-open + refresh after writes). V2 seams: W-1 cards for overdue
   SOPs, D-1 "due today" brick, step/completion photos via the
   maintenance-photos bucket pattern, per-member assignees beyond the
   operator.

## 3. Schema (migration `sop_module`, additive — direct to prod per convention)

All tables: `org_id uuid default default_org_id() references orgs`,
`property_id uuid default default_property_id() references properties`,
text PKs (imported rows keep AC ids), `source text not null default ''`
(`'ac'` import · `'cron'` materialized · `''` hand-entered).

- **sop_categories** — id pk, name, description default '', icon default '',
  sort_order int default 0, +stamps¹
- **sop_procedures** — id pk, category_id → sop_categories, title,
  description default '', frequency check in (daily·weekly·biweekly·monthly·
  quarterly·annually·as_needed) default 'as_needed', estimated_minutes int,
  assignee text default '' (email; '' = unassigned), unit text, comp_field
  text, is_active bool default true, version int default 1, +stamps¹
- **sop_steps** — id pk, procedure_id → sop_procedures, step_number int,
  title, instructions default '', is_checkpoint bool default false,
  warning_note default '', photo_key text, +stamps¹
- **sop_assignments** — id pk, procedure_id → sop_procedures, assignee text
  default '', due_on date not null, created_at. No status column (derived).
- **sop_completions** — id pk, procedure_id → sop_procedures, assignment_id
  text → sop_assignments (nullable — ad-hoc/as-needed completions),
  completed_by text default '', completed_at timestamptz default now(),
  notes default '', duration_minutes int, photo_key text, created_at.

¹ stamps = created_at, updated_at, updated_by + the existing
`stamp_layer_row()` trigger (editable-content tables only).

Indexes: procedures (property_id, category_id) · steps (procedure_id,
step_number) · assignments (property_id, due_on desc) · completions
(procedure_id, completed_at desc).

**RLS** (membership form, `member_role_in`): all five tables owner+operator
read · operator insert. Categories/procedures/steps: operator update +
delete (content management). Assignments: operator delete (occurrence
hygiene), **no update** (reschedule = delete + re-add). Completions:
**insert-only** (append-only audit trail, compliance_events pattern).
Tenant/vendor: no policies — sealed.

**RPCs** (security definer, `app_secrets.auto_trigger` gate, the
get_open_maintenance/post_rent_charges pattern):
- `get_sop_schedule(p_secret)` → jsonb: active scheduled procedures
  (id/title/frequency/assignee) + all occurrences (id/procedure_id/due_on/
  done-flag via completion link). Read leg for the cron scan.
- `post_sop_occurrences(p_secret, p_rows jsonb)` → int inserted; on conflict
  (id) do nothing. Tenancy stamps ride the single-tenant defaults (same
  residual fence as post_rent_charges, documented since B-3).

## 4. Client

**`src/lib/sop.js`** — pure seam + REMOTE layer (maintenance.js pattern):
- vocabulary: `SOP_FREQ` labels/colors; period math `dueEndFor(freq, ymd)`,
  `periodStartFor(freq, ymd)`; `sopOccurrenceId(procId, ymd)`.
- `sopNewOccurrences(procedures, occurrences, todayYmd)` → rows the cron
  should insert (skips as_needed, inactive, already-covered periods).
- `deriveOccurrence(occ, completions, todayYmd)` → completed | overdue |
  pending.
- `sopOverdueCandidate(procedures, occurrences, todayYmd)` → the single
  digest candidate or null (keying per §2.3).
- `sopStreak(procId, occurrences, completions)` → consecutive completed
  scheduled occurrences, latest first.
- REMOTE: `refreshSop()` cache (5 scoped selects), `addSopCompletion`,
  `upsertSopCategory/Procedure/Step`, `deleteSopStep`,
  `deactivateSopProcedure`, `addSopOccurrence`, `deleteSopOccurrence`.

**`src/views/sop.js`** — O-1 Operations sheet (id `sop`, nav after M-1):
- **Operator:** top strip "Due today · Overdue" chips; category sections
  (icon · name) listing procedures — frequency chip, due/overdue/streak
  badges, last-completed; expand → steps checklist (checkpoints flagged,
  warning notes visible), ✓ Complete (notes + minutes) writes the completion
  against the open occurrence when one exists; inline authoring (add/edit
  category, procedure, steps; deactivate procedure).
- **Owner:** read-only library + status (no authoring, no completes). Not in
  `DEFAULT_OWNER_SHEETS` (operator working sheet, like W-1/K-1).
- **Tenant/vendor:** sealed (single-sheet roles unchanged).
- Wiring: `pages.js` row `["sop","O-1","Operations"]`, `index.html` section
  `pg-sop` (+ `sopBody` card), `main.js` initSop.

**Cron leg** (api/auto-trigger.mjs, after the maintenance scan): read
`get_sop_schedule` → `post_sop_occurrences(sopNewOccurrences(…))` →
`sopOverdueCandidate(…)` into the candidates list → summary.sop
{materialized, overdue}. Best-effort try/catch like every other leg.

## 5. Import (one-time, 506 rows, run via Supabase MCP)

1. Export the 5 AC tables → `docs/harvest/sop-ac-export-2026-08-25.json`
   (committed provenance record).
2. Apply the `sop_module` DDL migration to otb prod.
3. Insert data (explicit otb org/property uuids; camelCase→snake;
   `userId 1 → adam@adamabdalla.com`; `source='ac'`; dueAt → due date;
   drop Manus columns; procedures with AC assignments get
   `assignee = adam@…`).
4. Verify: counts 18/88/320/71/9 · md5 checksum of ordered titles per table
   AC vs Atlas · 9 linked completions · FK integrity. (Derived statuses will
   legitimately differ from AC's stale enums — more overdue, see §1.)
5. Extend `docs/phase-b/assert-suite.sql` (persona asserts + representative
   rows for the 5 tables) and re-run on prod → SUITE_PASS_ROLLBACK.
6. Export executable DDL to `supabase/migrations/`, advisors check.

## 6. Testing

`test/sop.test.mjs` on the pure seam: period ends across freq (incl. month/
quarter/year boundaries, biweekly parity), deterministic ids, materializer
(as_needed/inactive skipped; covered period skipped — including coverage by
an imported AC id; idempotence), derivation (completed beats overdue; date-
not-timestamp comparison), digest candidate (null when clean; key stability
while static; key moves when a new occurrence lapses), streaks. Suite gate:
`node --test` green (387 + new) and `npm run build` before delivery.
