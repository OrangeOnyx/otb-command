# LLM Session Export — OTB / Orange Ocean Atlas (as of 2026-08-02 late)

Self-contained boot context for a fresh LLM session. Repo docs remain the
deep source: `CLAUDE.md` (project memory + rules) → `HANDOFF.md` (live state,
newest block first) → `docs/phase-b/01–07 + assert-suite.sql`.

## What this is
**Orange Ocean Atlas** (product; never naked "Atlas") — full visual
property-management platform. Flagship deployment: **On The Boulevard
Shopping Center** (OTB), 101–149 Arnould Blvd, Lafayette LA. Operator: Adam
Abdalla — Orange Ocean, LLC (manager) for Belle Realty of Lafayette, LLC
(owner). Live: **https://orangeoceanatlas.com** (+ otb-command.vercel.app),
Vite vanilla-JS, 13 sheets (D-1…V-1), roles operator/owner/vendor/tenant/
pending, Supabase backend (project `kbhsghodquchkgfdzckc`), manual deploys
(`npx vercel deploy --prod --yes --scope adams-projects-0c52918e`). 289 unit
tests. Repo: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`
(GitHub OrangeOnyx/otb-command, private).

## State after the 2026-08-02 session — PHASE B-1 IS LIVE IN PROD
Multi-tenant foundation merged, deployed, smoked. The app looks unchanged;
underneath, every property-scoped row now carries uuid `(org_id,
property_id)` and RLS is **membership-only**.

- **Tenancy core:** `orgs` (orange-ocean) → `properties` (otb) →
  `org_members` (role + capabilities + unit_scope; operator = org-wide) →
  `property_settings` (ledger_start_ym 2026-08…). 11/11 real users
  backfilled; adam@adamabdalla.com = operator/org-wide.
- **Code speaks uuid:** `src/lib/remote.js propertyContext()` and
  `api/_supa.mjs tenancyContext()` resolve uuids from the `otb` slug (RLS
  answers for members only); all client writers stamp explicitly; property
  reads filter by uuid. Legacy text slug columns are GONE (9 dropped).
- **RLS:** ~45 policies in final scoped form `member_role_in(org_id,
  property_id, roles[])` — the profiles legacy leg is DROPPED. Storage
  policies membership-based. `handle_new_user` creates membership at
  sign-up; `promote_authorized(p_email)` RPC un-sticks pending users
  (client `authorizeEmail` calls it). `default_org_id()/default_property_id()`
  = SECURITY DEFINER single-tenant bridge (dropped at multi-property
  onboarding, when writer RPCs gain an explicit property parameter).
- **Verified:** 5-persona × 17-table assert suite
  (`docs/phase-b/assert-suite.sql`) passed on branch AND on prod
  (`SUITE_PASS_ROLLBACK`, zero residue). It caught + fixed a real RLS
  recursion (policy calling a non-definer default → stack blowup). 24 Aug
  rent charges intact post-migration. Advisors: accepted definer-WARN class
  only. Executable DDL: `supabase/migrations/20260802*` (8 files).
- The phase-b Supabase branch is DELETED (billing stopped).

## Operator decisions locked this session (do not relitigate)
1. **Purge #7 (property_state jsonb → typed per-layer tables): DEFERRED** to
   a dedicated design session — it is the per-row-sync + realtime foundation
   (build-plan §17 B-5), not a seed. `property_state` (uuid-keyed, PK
   (property_id, layer)) remains the sync mechanism until then.
2. **Storage folder prefixes (`<property_id>/…`): DEFERRED to onboarding** —
   no second property; membership RLS is the security boundary.
3. Merge + deploy: executed 2026-08-02.
- Also standing: DoorLoop import OFF roadmap · rent presentation = TOTAL
  monthly (PSF breakdown only as explicit chart) · never naked "Atlas" ·
  Arnould street / "Arnold Heights Subd." subdivision both correct.

## Open items (next session's menu)
1. **A-5 first real ACH payment** — operator drops a restricted Stripe key
   (Payment Links + Products + Prices: Write) at
   `%USERPROFILE%\.otb-stripe2.key`, then per unit:
   `node tools/stripe-payment-links.mjs --key <file> --unit 131 --amount <total rent>`
   (ACH-only link carrying PI `metadata.unit` — REQUIRED for auto-posting;
   dashboard links can't set it). Delete key file after. Runbook §1.
2. **Voice smokes (open since 07-28):** call (337) 270-7044, book a REAL tour
   → first `tour_bookings` row · probe "so I'm booked right?" without a slot
   → agent must refuse · AI-1 voice-lead thread for the 07-28 call.
3. **Purge #7 design session** — typed layer tables + per-row sync +
   realtime (kicks off Phase B-2/B-3: pure-seam port, shell rebuild,
   property switcher, D-0 portfolio dashboard).
4. **Post-merge operator smoke:** log in at orangeoceanatlas.com (should
   look identical) · unit drawer ledger loads · /leasing without .html
   (rewrite is live).
5. Small: `tools/run-hidden.vbs` = inert hidden-window PS launcher,
   unreferenced — delete on operator's word. B3 fly-through · C2 sandbox ·
   C3 LinkedIn series still queued. Commercial v2 shot list (Higgsfield).
   Canonical tenant-facing domain (ontheblvd vs shopontheblvd) still open —
   gates vinyl QR print.

## Gotchas that bite (hard-won)
- **Deployed ≠ committed:** operator checks the live URL; always
  grep-verify the prod bundle after `vercel deploy`.
- **Secrets:** never in chat/repo/disk-at-rest. Vercel env via
  `cmd /c "npx vercel env add … < file"` (byte-exact; PowerShell pipes
  append \n and 401 everything). A secret drill is verified only by a
  REAL-secret accepted request.
- Supabase MCP is the DB path (execute_sql/apply_migration on project
  `kbhsghodquchkgfdzckc`); NO service-role key anywhere; writes via
  secret-gated definer RPCs (`app_secrets` rows: auto_trigger ·
  voice_agent) or user-JWT RLS.
- Dev server port **5199** (`.claude/launch.json`). Local no-login preview:
  move `.env` aside, RESTORE after. Quality gate before delivery:
  `node --check` changed files + `npm test` (289).
- Voice bridge = Fly app `otb-voice-bridge` (the ONLY always-on process);
  brain = `/api/voice-agent` (Bearer VOICE_SECRET). Twilio: 7044 leasing ·
  0384 tenant. `bridge/server.mjs:50` esc() one-char fix (`s ?? ""`)
  pending next bridge touch.
- C3 parking loop is hands-free (sampler + watchdog → OTB-C3-Nightly 23:45
  + OTB-C3-Midday 12:00 → D-1/A-1). Capture data on E:\ / outside repo —
  never commit frames.
- Cron `api/auto-trigger` daily 11:00Z posts rent idempotently
  (`rent:YYYY-MM:unit`); ACH webhook posts `ach:<pi_id>` the same way.

## Operator style (follow strictly)
Executive register; working output first; forced rankings (he picks by
number); never relitigate; `node --check`/tests before delivery; small
judgment/code decision points offered are welcome.
