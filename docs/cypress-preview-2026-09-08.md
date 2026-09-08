# Cypress preview — September 8, 2026

The existing OTB production app is preserved. Cypress remains the same Vite application and repository, deployed only to a separate Vercel preview environment.

## Production backup

Protected local backup: `C:\Users\adam\Backups\OTB\20260908-135228`. Read its `RESTORE.md` for recovery routes and precise limitations. It contains the full Git bundle (clone/fsck passed), 987 hash-verified deployed source files, current Vercel configuration, a fresh snapshot of 70 database tables / 21,339 rows, schema catalog, and all 44 Storage objects / 159,904,559 bytes. Supabase's managed physical backup from 2026-09-08T07:40:21Z was verified in its dashboard. A full database restore has not been drilled. The later JSON snapshot is supplementary, not a pg_dump.

Preserved deployment: `dpl_JD3a5JRiaG1jTbkk5y4z422u8seR`, serving `orangeoceanatlas.com` and existing production aliases. Its metadata points to `bd2230d75f25a34de770d907190076ec8bd3ccfe` but records a dirty CLI deployment; the exact source archive covers those differences. The Git bundle and exact production archive have hash-matched copies in `G:\My Drive\00 OTB\repo-backups`; remote Drive sync was not independently verified. Raw credentials and database/auth snapshots remain in the protected local folder.

## Isolated pilot

- Vercel project remains `otb-command`, ID `prj_4gSxJWKDASjJolEuXmL0oBcFjefe`.
- Production Supabase remains `kbhsghodquchkgfdzckc`.
- Approved preview branch: `cypress-preview`, project `hefexnqkigirmzpmeggj`, branch ID `192df79c-3335-4cec-acb2-79584dbf0ca3`, in OrangeOnyx's Org.
- User approved the quoted cost of USD 0.01344/hour (about USD 9.68 per 30 days), plus applicable tax/usage.
- Vercel Preview variables point only to the isolated project. Production variables and domains are unchanged. The Vercel project has no Git integration; branch-specific variables were unavailable, so the two variables are scoped to Preview, and deployment is explicit through CLI.
- The branch's migration history initially omitted 13 tables that had been applied directly in production. Four exact repository schema migrations were applied only to the branch: SOP, AC reference tables, matters/comms/deals, and governance. All 46 public tables, public column/function definitions and policies now match the protected production catalog; there are 142 public/storage policies.
- Test accounts use reserved `.invalid` email addresses. The existing OTB operator email is preauthorized in the isolated branch for normal sign-in. No email or invitation was sent during setup.
- Only one real maintenance request and its three events were copied from the 2026-09-08T18:59:20Z snapshot. Supporting photos are copied to the private branch bucket and verified separately. Other operational state is intentionally empty and is not represented as production state.

## Application safeguards

`tools/check-preview-isolation.mjs` runs in both Vite build configuration and shared server Supabase initialization. A Preview build/runtime rejects missing credentials, the production project, mismatched/privileged keys and active integration secrets. Local review and production behavior are unchanged. Opaque publishable keys still require runtime verification.

The shell, sign-in screen, maintenance read and owner-update exports say **Preview · isolated test data**. Edited downloads retain the source snapshot qualification. Archived source references and verified geometry remain unchanged.

Vercel upload rules were corrected after its dry run showed the archive inputs missing. Exactly the three allowed source records under docs now enter the private function bundle; environment files and Supabase CLI cache are excluded. The public browser bundle does not contain the private archive.

Deployment and hosted acceptance results will be appended after verification. No production promotion is authorized.
