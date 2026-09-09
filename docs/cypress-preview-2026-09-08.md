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

## Deployed preview and acceptance — September 9, 2026

Open the protected preview at **https://otb-command-gwxcwvl8o-adams-projects-0c52918e.vercel.app**. Deployment `dpl_6PHP6KjtLavC7uvKXhKA5TxDLXCC` is READY and runs application commit `6fdf116`. Vercel sign-in and application operator authorization remain required. No production promotion is authorized or performed.

The isolated Supabase branch's Site URL points to this deployment. Its redirect allowlist contains only the exact current and preceding Cypress preview origins; production URLs are excluded. The preview contains no active AI, email, payment or other production integration secrets.

Hosted acceptance verified:

- An authenticated operator session loads the property. Suite 139 can be selected in the model and suite 149 in the plan. The maintenance marker opens Pothole Repair in both views after the marker interaction fix.
- The maintenance read identifies the isolated September 8 snapshot and reports the copied request's `done` status, three events and 21 supporting photos. This is a fresh read of the test database, not a fresh production status assertion.
- Original-record and system-record source viewers open. A signed photo link opened successfully during the preceding preview check, and the supplied plan rendered at 2,592 pixels wide.
- A dated September 9 owner-update draft generates from the selected evidence and downloads. The downloaded HTML contains the embedded approved logo and fonts and no scripts. Attachment contents are not extracted into the owner briefing; the first attachment, named `unnamed.jpg`, was visually an invoice image during the preceding check, but its contents are not treated as verified extracted facts.
- The final hosted evidence API returns **200** for the operator, **403** for a pending user and **401** without authentication. Its response includes eight sources, the preview label and source snapshot timestamp `2026-09-08T18:59:20Z`.
- The full suite of **578 tests** and a local build passed before the final two small fixes; **18 relevant tests** passed after those fixes. The final hosted build is READY. These checks do not constitute a fresh full-suite run after the two fixes.

At 2026-09-09T18:22Z, `orangeoceanatlas.com` still returned HTTP 200 from preserved production deployment `dpl_JD3a5JRiaG1jTbkk5y4z422u8seR`. Its HTML and JavaScript/CSS asset checksums matched the exact production backup. Compact verification evidence is retained in the protected backup folder as `final-preview-api-verification.json` and `live-health-after.json`.

## Local review and remaining limits

The earlier local server had stopped overnight. It was restarted in a hidden process on September 9 with `npm run dev:review`; the same application is available at **http://127.0.0.1:5174/#spatial** while that process is running. A local development server is not persistent hosting. To restart it, run that command from this repository. The local review surface uses the review data path; use the protected hosted preview for the isolated authenticated database journey.

The July tenant roster remains historical. Derived suite boundaries and building heights remain labeled; parking-count, area and legal-instrument conflicts are unresolved. No additional dimensions, current tenant/payment status, legal conclusions or attachment contents were inferred. Full database restoration and print pagination have not been drilled. Sending messages, payments, production business-record changes and any production promotion still require explicit approval.
