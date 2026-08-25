# SOP Module (H1.3) — Implementation Plan

Design: `docs/superpowers/specs/2026-08-25-sop-module-design.md`. Each task is
a commit-sized unit; suite gate (`node --test` + `npm run build`) before
delivery; every DB step verified in the same session.

1. **Commit design + plan** (this pair).
2. **Pure seam + tests.** `src/lib/sop.js` pure parts (SOP_FREQ, period math,
   `sopOccurrenceId`, `foldCompletions`, `deriveOccurrence`,
   `sopNewOccurrences`, `sopOverdueCandidate`, `sopStreak`) +
   `test/sop.test.mjs`. Green before any DB work.
3. **Migration.** Write `supabase/migrations/<ts>_sop_module.sql` (5 tables,
   stamps trigger reuse, indexes, RLS, `get_sop_schedule` +
   `post_sop_occurrences`); apply to otb prod (`kbhsghodquchkgfdzckc`) via
   `apply_migration` (additive convention). Smoke: wrong-secret raise on both
   RPCs; `post_sop_occurrences` body insert-under-verify with 0 residue.
4. **AC export.** Pull the 5 AC tables (`pegmtfjexdzuupubgggv`) →
   `docs/harvest/sop-ac-export-2026-08-25.json` (committed provenance).
5. **Import.** Batched inserts via MCP SQL with explicit otb org/property
   uuids; mapping per design §5 (ids preserved, userId 1 → adam@…,
   source='ac', dueAt→due_on, assignee on the 27 assigned procedures).
6. **Verify.** Counts 18/88/320/71/9 · per-table md5 of ordered ids+titles
   AC vs Atlas · 9 linked completions · 0 FK orphans.
7. **Assert suite.** Extend `docs/phase-b/assert-suite.sql` with the 5 tables
   (representative rows + persona asserts: owner read/no-write, tenant/
   vendor/stranger blind, completions append-only) → run on prod expecting
   SUITE_PASS_ROLLBACK, 0 residue. Advisors check after.
8. **Client.** REMOTE layer in sop.js; `src/views/sop.js` (operator/owner
   faces per design §4); wire `pages.js` (["sop","O-1","Operations"] after
   maint), `index.html` `pg-sop`, `main.js` initSop.
9. **Cron leg.** api/auto-trigger.mjs: get_sop_schedule →
   post_sop_occurrences(new) → overdue digest candidate → summary.sop;
   best-effort try/catch.
10. **Gate + local walk.** Full suite + build; no-login browser walk (sheet
    renders its hosted-backend note; nav shows O-1; console clean).
11. **Deploy + smoke.** `npx vercel` prod deploy; bundle grep
    (sop_procedures / Operations); if the CRON_SECRET drill is available, one
    manual cron run (expect sop.materialized ≥ 0, digest candidate for the
    imported overdue set, heartbeat row fresh); else verify next scheduled
    run's heartbeat + materialized rows by SQL.
12. **Close.** HANDOFF.md update (H1.3 shipped, operator smoke steps),
    commits pushed.
