# Supabase migration history (exported 2026-07-22)

Exported verbatim from the live project `kbhsghodquchkgfdzckc`
(`supabase_migrations.schema_migrations`) — closes transfer-package
open-questions.json **OTBC-Q-001**. 17 migrations, chronological by filename.
`supabase/security-model.sql` remains the human-readable posture snapshot;
these files are the DDL of record.

**One redaction:** `20260716205410_auto_trigger_threads.sql` originally seeded
`app_secrets.value` with the live shared cron secret. The repo copy replaces it
with `<REDACTED-SET-OUT-OF-BAND>` and `do nothing` on conflict (so re-applying
never clobbers the real value). ⚠ That secret transited a chat session during
this export — **rotate it** (new value into `app_secrets` via SQL + Vercel env
`CRON_SECRET`, then redeploy) at the next convenient window.

Two migrations were missing from the security-model.sql bottom list and are
included here: `20260710185921_audit_log_email_from_jwt` and
`20260722212237_c3_occupancy`.

Applying to a fresh project: run in filename order (or `supabase db push` with
this directory), then set the auto_trigger secret out-of-band.
