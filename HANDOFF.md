# OTB Property Command â€” Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`
Last updated: 2026-08-27 — **H1.3 DEPLOY DONE + VERIFIED: the SOP module
is fully LIVE.** Operator ran the gated `npx vercel deploy --prod` from his
own terminal (auto-mode classifier blocks deploys/pushes for Claude — now
confirmed to also block Claude *writing its own allow rules*, any route).
Verification: prod serves bundle `index-C1zfbpcN.js` = exact content-hash
match with the local build of the verified commit; sop_categories/
procedures/completions + O-1/Operations markers grep ✓ in the served
bundle; `/api/auto-trigger` deployed + 401 without secret (cron literals
`sa:`/`sop-overdue:` are server-leg-only — tree-shaken from the client
bundle, correct). Outstanding: operator authed smoke below · first 6am
cron opens the ~49-item overdue digest + materializes August (expected,
not a bug) · **⚠ UNGATE INCOMPLETE: `.claude/settings.json` allow rules
were never written (the Option B Set-Content paste didn't land) — deploys
and `git push` stay operator-gated until the operator creates that file;
proposed content is in the 2026-08-26/27 session transcript.**
Prior: 2026-08-25 (later) — **H1.3 SOP MODULE PORTED: DB + import
LIVE ON PROD, client/cron leg built — ⚠ ONE STEP LEFT: `npx vercel deploy
--prod` (the permission classifier blocked deploys this session; everything
else is done and verified).** The first live-organ cutover with new build
surface is in: 5 typed tables (sop_categories/procedures/steps/assignments/
completions; migration `20260825170000_sop_module.sql` applied direct to
prod per the additive convention, via MCP SQL so NOT in server migration
history — the repo file is the record) + membership RLS (owner+operator
read · operator write · completions APPEND-ONLY even for operator ·
assignments insert/delete only) + 2 secret-gated cron RPCs
(get_sop_schedule · post_sop_occurrences, both wrong-secret-raise +
rollback-body smoked). **All 506 AC rows imported and verified to the
digest: per-table md5 checksums match the committed export
(docs/harvest/sop-ac-export-2026-08-25.json) exactly; 18/88/320/71/9; all
AC user refs = adam@ (H-3 not a dependency).** Key shape call: occurrence
STATUS IS DERIVED (completion-link + due date, pure ymd math in
src/lib/sop.js — AC's stale enums self-healed on import: 49 truly overdue
today vs AC's stored 44); the dead Manus scheduler is replaced by an
auto-trigger leg that materializes the current period per scheduled
procedure (deterministic ids `sa:<proc>:<dueYmd>`, insert-0 re-runs — the
rent-charges idiom) + ONE overdue digest thread keyed by newest lapse
(`sop-overdue:<ymd>`, static backlog never re-fires; first post-deploy run
will open one listing the ~49-item backlog + materialize August
occurrences — expected, not a bug). New **O-1 Operations sheet** (id
`sop`, after M-1; operator: browse/complete w/ notes+minutes, streaks 🔥,
authoring incl. steps + occurrence clear; owner read-only; tenant/vendor
sealed — assert suite extended to the 5 tables ×5 personas,
SUITE_PASS_ROLLBACK on prod, 0 residue; advisors = accepted definer-WARN
class only). 399 tests, build clean, local no-login walk clean (#sop
deep-link, console clean). Design/plan: docs/superpowers/{specs,plans}/
2026-08-25-sop-module*. **Operator smoke (after deploy, 2 min):
orangeoceanatlas.com → O-1 Operations → 18 categories/88 procedures render
with overdue badges → expand "Morning Opening Walkthrough" → steps + ✓
Complete (links the oldest open occurrence) → next 6am cron: AI-1 manager
thread "SOPs overdue — N procedures" + D-1 Automation card shows
summary.sop.** Suite drift fixed in passing: assert-suite owner_briefs
seed now upserts (prod holds a real July brief).
Prior: 2026-08-25 — **PLATFORM CONSOLIDATION DECISION ADOPTED
(docs/platform-consolidation-decision-2026-08-25.md): otb-command IS the
surviving platform; AC (assetcommand.orangeocean.com) retires via
usage-driven harvest; the never-deployed NestJS `orange-ocean-atlas` repo
is archived.** Basis: AC prod audit 2026-08-25 — live organs are voice
intake (43/30d) · work orders (24/30d) · SOPs (506 rows, in daily use),
plus 13 months / $1.13M of rent_payments history; CAM/QBO/governance are
0-row shells (rebuild clean — no data migration owed). **Operator scope
ruling (2026-08-25, same day): ALL AC features transfer in some form —
zero usage changes shape/sequencing, never inclusion.** Decision doc now
carries a 25-row capability-transfer register + single-pane north star
("open Atlas, never open another program"): N-1 Matters & Planning
module (e.g. Lot 7 rezoning: planning docs + meeting notes + deadlines) ·
N-2 meeting-notes ingestion · N-3 accounting home. Harvest: H1 organ
cutovers → H2 history import → H2.5 parity rebuilds (Money/Accounting ·
Tenant/Leasing · Documents/Matters · Intelligence/Comms) → H3
decommission GATED on the register going green. 8/27:
cancel Manus; AC scheduler NOT blanket-enabled (per-job runbook lives in
the Asset Command project folder, `RUNBOOK-2026-08-27-manus-and-
scheduler.md`). **New rock for THIS repo: SOP module port** (5 typed
tables + RLS + sheet + auto-trigger reminder leg + 506-row import) — the
one AC feature with real adoption and no otb equivalent. Open operator
decisions H-1/H-2/H-3 (rent-history shape · phone-number strategy · AC
user role mapping) listed in the decision doc.
Prior: 2026-08-23 — **LEASE ASSEMBLER SHIPPED + DEPLOYED (387
tests, squash-merged d731a17, prod bundle + hashed lease-template.docx
asset both verified 200).** Executable-lease generation from the v2.2
Louisiana house form: `tools/lease-template.mjs` (run ONCE per master
change; reads the RAW master from OneDrive Desktop — NEVER commit it;
PII pattern-scrubbed via base64 needles, DRAFT-stamped into the docx
body, whole-zip forbidden-string + token-location scans) emits committed
`src/data/lease-template.docx` + `lease-manifest.json` (33 tokens) +
`lease-body.json` (single source for HTML — docx/HTML can't drift). Pure
engine `src/lib/leasedoc.js` (token map · Schedule G auto-compute, step
PSF rounded to cents THEN monthly derived · validation incl. integer
term, free-months ≤ term, date-span-vs-term warning, NNN ≥ 0 with
zero-NNN warning · issuance checklist: exclusives/counsel-flags/
attachments). Renderers: `leasedocx.js` (fflate merge, throws on any
unmerged token) · `leasedochtml.js` (signer copy vs operator copy —
checklist NEVER in signer copy, print-hidden). Unit drawer gains
operator-only **Lease panel** (above E-Sign; hidden entirely for
owner/tenant/vendor): repo-locked facts, **editable CAM/Tax/Ins for
vacant units** (131/133 have $0 recoveries — operator enters deal NNN,
CAM defaults 2.1), ⤓ DOCX · ⤓ HTML · → E-Sign (uploads signer HTML to
documents bucket + creates esign_requests row; link still copied from
the E-Sign panel — app sends nothing). Local no-login browser walk
PASSED (empty-form errors render; full form → checklist; console clean).
V2 seams documented in spec (docs/superpowers/specs/2026-08-22-…):
AI-1 caller, custom Schedule G tables, real plat/ACH attachments,
amendments at first renewal. **Operator smoke (2 min): any unit drawer →
Lease → fill a dummy deal on 131 → ⤓ DOCX opens in Word (DRAFT stamp
top, Schedule G rows) · ⤓ HTML (checklist box) · → E-Sign creates a row
in the panel below (cancel it after).** Design/plan committed under
docs/superpowers/. Feature branch deleted (pre-fix history carried PII
in tool source; squash-merge kept master clean — never push old branch
refs).
Prior: 2026-08-10 (session close) — **SESSION TAIL:** (1) intake form
HOSTED + linked from the manual page banner
(orangeoceanatlas.com/manual/intake-form.html — onboarding manual §3 now
leads with the URL; publish() copies it from docs/phase-c/ each rebuild;
deployed, smoked 200 + content greps). Onboarding a pilot now starts with
sending ONE link. (2) **dickeydupuis@icloud.com pre-authorized as OWNER**
(authorized_emails row, org orange-ocean, added_by stamped "via Claude
session 2026-08-10"; operator-corrected spelling — the 'dupuid' typo was
never inserted). Signs in via magic link like every owner; read-only by
construction. **⚠ OPEN FLAG raised to operator, no answer yet:
layer_settings owner_sheets currently exposes ALL 13 sheets to owners
(incl. comp/board/maint/vendors/ai) — global to all owners, not
per-person. Operator may want the classic set (dash/plan/roll/fin/safe)
before Dickey's first sign-in — ASK before trimming.** Operator smokes
outstanding: sidebar 📖 User manual link on phone · /manual/ page skim ·
intake form fill-through. All committed (…a0ab0d1) + Drive synced
(manuals-2026-08). Still waiting on the world: first ACH payment
(self-announcing) · C-3 pilot signature.
Prior: 2026-08-10 (later) — **DOCUMENTATION HOSTED IN-APP + DEPLOYED:
orangeoceanatlas.com/manual/ serves the generic complete documentation
(HTML + ⤓ PDF + images from public/manual/, auto-refreshed by
tools/build-manuals.py publish()); sidebar foot gains a 📖 "User manual"
link (index.html, all roles — static page, no auth). 340 tests, prod
smoke: /manual/ + PDF + img all 200, shell grep "User manual" ✓.**
Prior: 2026-08-10 — **MANUALS GENERICIZED + COMBINED (operator ask):
all manual screenshots now show FICTIONAL tenants/rents (capture rig
intercepts every /src/data/*.json module: name map incl. UPPERCASE +
curly-apostrophe variants, synthesized legal entities — real ones are
unrelated holding cos, never string-map them, banded fake PSFs, logo-thumbs
→ []); D-0/M-1/S-1/V-1 are backend-bound = text-only sections; NEW
OO-Atlas-Complete-Documentation.pdf (Book I operating + Book II onboarding,
36pp) via tools/build-manuals.py third spec; leak-scan of all 3 PDFs CLEAN;
NEW docs/phase-c/intake-form.html = fill-in-the-blank intake builder for
non-technical pilots (output dry-run-verified "Intake valid"). The
CONFIDENTIAL real-data edition exists only in git history (e33b6d2).**
Prior: 2026-08-08 (later still) — **ILLUSTRATED MANUALS SHIPPED:
docs/manual/ = operator manual (Aug refresh, supersedes docs/pitch copy) +
NEW onboarding manual (C-3 rail procedure), both with REAL authed-prod
screenshots (18 shots, docs/manual/img/), branded HTML + PDF via NEW
tools/build-manuals.py (re-run after edits); Drive copy
G:\My Drive\00 OTB\manuals-2026-08\.** Capture rig lessons (scratchpad-only,
not committed): local no-login preview renders $NaN (C1 split-seed by
design) — puppeteer CDP-intercepts units.public.json with full SOT for
local money shots; authed prod shots via the OTP drill BUT skip Gmail
mangle-forensics entirely — read auth.one_time_tokens.token_hash via
Supabase MCP SQL, POST /auth/v1/verify {type:'magiclink',token_hash}
(NO email field — it flips the flow), inject sb-<ref>-auth-token, then
HARD RELOAD (goto '/'→'/#dash' is same-document; boot won't re-run);
session revoked after (logout 204). OTP emails rate-limit fast (429);
auth.refresh_tokens has the fallback (mind the operator's own row).
Prior: 2026-08-08 (later) — **A-5 SMOKE IS NOW SELF-ANNOUNCING (340
tests):** new migration `ach_first_probe` (secret-gated
`get_first_ach_payment`, wrong-secret raise + insert/verify-under-rollback
smoked, 0 residue) + pure `achFirstCandidate` seam (src/lib/ach.js, +2
tests) + cron leg — **the FIRST ach: ledger row ever opens ONE manager
thread 'ach-first' in AI-1** ("First ACH payment received — A-5 rail
proven"); success stays silent forever after. Deployed; manual cron run
clean (probe live, null → no false fire). Nobody has to watch the drawer:
when the first payment settles (ACH = days), AI-1 announces it. Waiting on
the world only: first payment (operator sends a link; settlement lag) ·
C-3 pilot signature.
Prior: 2026-08-08 — **A-5 PAYMENT LINKS DONE — the last A-item is
closed.** Operator dropped the restricted key (Payment Links/Products/Prices
Write → ~/.otb-stripe2.key, never in chat; a background file-watcher caught
the drop) → canary link (101) verified → **all 24 ACH links created from the
staged tools/stripe-links-2026-08.json, every PaymentIntent carries
metadata.unit (tool-verified per link)** → key file DELETED → roster with
URLs: `docs/stripe-payment-links-2026-08.md` + Drive copy
(G:\My Drive\00 OTB\). Distribution = operator's channel (app sends
nothing); links are reusable monthly; amount changes = re-run the tool for
that unit + retire the old link in the dashboard. **REMAINING SMOKE (the
very last A-5 step): first real payment — send a link to yourself/a tenant,
watch the unit ledger gain `ach:<pi_id>` automatically.** With this, Phase A
(A-0…A-5) + Phase B (B-1…B-5) + C-1/C-2 are ALL COMPLETE; next big rock =
C-3 pilot onboarding (real intake) on the proven rail.
Prior: 2026-08-05 (later) — **DEMO TORN DOWN (operator's word) + THE
BUG IT CAUGHT FIXED + DEPLOYED (338 tests).** Teardown found demo-pilot's
typed tables POPULATED (297 comp_state + board/features/cameras/settings):
**boot's seed-empty-backend leg had pushed the operator's local OTB snapshot
into the fresh property on first switch** — real B-3 bug, would have hit
pilot #1. Deleted demo children → settings → property; verified: 1 property
(otb, first-visible), OTB comp_state 297 intact, 0 orphans; switcher
disappears again (correct at one property). **FIX SHIPPED: seeding leg now
gated on `(await propertyContext()).slug === BUNDLED_PROPERTY` (new remote.js
const naming the COMPILED-IN data package — a dataset fact, not a tenancy
literal).** A fresh property now boots empty as designed; known residual
fence (doc'd): manual edits made while SWITCHED to a data-less property still
sync to it — Phase C gives non-bundled properties their own packages.
Deploy verified by bundle content-hash match (KKFPt_31 local == prod).
**A-5 Stripe key still expected tonight → runbook §1.**
Prior: 2026-08-05 — **C-2 FUNNEL PROOF RUN LIVE (operator "lets go,
dummy intake"): property `demo-pilot` onboarded into PROD via the C-1 rail.**
`docs/phase-c/intake-demo-pilot.json` (org-reuse leg: landed under the
existing orange-ocean org; authorized=[] on purpose — no live access-config
mutations for a dummy) → dry-run → live run via the CRON_SECRET drill →
SQL-verified: 2 properties under orange-ocean (otb 2026-08-02 · demo-pilot
2026-08-05, ledger_start_ym 2026-09, settings.demo=true, 2 facts) →
**duplicate re-run RAISED live (P0001, nothing clobbered)**. Consequences
now visible to all org-wide members: **the property SWITCHER is live in the
sidebar (first time — B-3 rail proven) and D-0 shows two cards** (demo-pilot
= $0 A/R · 0 WOs). No financial side effects: rent cron posts to
default_property_id (OTB) only; api/* still resolve 'otb'. Tool patched:
post-fetch exits use exitCode (a hard process.exit tripped a libuv teardown
assert on Windows — cosmetic, but ugly). **TEARDOWN when demo is done
(operator's word):** `delete from property_settings where property_id =
(select id from properties where slug='demo-pilot'); delete from properties
where slug='demo-pilot';` **Operator confirmations this session: D-1
Automation card ✓ ("looks correct") · phone/realtime/voice smokes ✓
("already did, was good") · parked decisions accepted (error-vendor upgrade,
auto-deploy) · A-5 restricted Stripe key COMING TONIGHT → next session:
tools/stripe-payment-links.mjs per runbook §1, links must carry
metadata.unit.**
Prior: 2026-08-04 (final round) — **C-1 ONBOARDING RAIL + ERROR-
TRACKING BASELINE SHIPPED + DEPLOYED (autonomous under /goal; 338 tests).**
(1) **C-1 onboarding productized** (docs/phase-c/01): intake contract
(docs/phase-c/onboarding-intake-template.json — org+brand / property+facts /
settings+SOP-jsonb / authorized emails+roles), pure validation seam
src/lib/onboard.js (+6 tests, slug/YM regexes match the DB CHECKs), migration
`onboarding_rpc` (20260805030451, additive + DORMANT): secret-gated
`onboard_property` — org reused by slug, duplicate property RAISES (never
clobbers), settings defaulted, authorized_emails upserted (membership rows
created by the existing first-sign-in lattice), all-or-nothing. Full body
smoke under rollback PASSED (org/brand/property/facts/settings-defaults/
authorized/org-reuse/dup-raise), 0 residue. Driver:
`node tools/onboard-property.mjs <intake.json> --dry-run` (validate+plan) or
live via the CRON_SECRET drill. Fences: NO data package (13 sheets stay
OTB-bound until C-2), no storage prefixes (decision still open), no
self-serve UI. A freshly onboarded property appears on D-0 + the switcher
appears at >1 property — the B-3 rail lands it. (2) **Error tracking shipped
as the no-vendor baseline** (B-4 option 3, forecloses nothing): migration
`client_error_log` (20260805030624): client_errors table (operator-only
read), inserts ONLY via `log_client_error` RPC — authed-only (unauthed leg
smoked false/0-rows), 50/user/hour cap, 30-day retention on the write path,
server-side clamps; client beacon src/lib/errlog.js (pure dedupe +
5-per-session cap, +4 tests) wired in boot; D-1 brick "Client Errors (24h)"
card ONLY when count>0 — quiet renders nothing. Bundle grep
log_client_error/Client Errors ✓. Sentry/log-drain upgrade = open menu item,
now non-blocking. **STILL OPERATOR-GATED (cannot be done without you):
A-5 payment links (needs your restricted Stripe key) · phone smokes (voice
tour/refusal probe + cross-device realtime flip) · C-2 first pilot intake ·
error-vendor upgrade · auto-deploy decision.**
Prior: 2026-08-04 (later still) — **PHASE B-4 OBSERVABILITY SHIPPED +
DEPLOYED + SMOKED (autonomous under /goal; 328 tests).** Design:
docs/phase-b/11. Three legs: (1) **CI tripwire** `.github/workflows/ci.yml` —
npm ci/test/build on every push/PR, env-less (no secrets in CI), deliberately
NOT auto-deploy (Vercel git-link decision stays operator-open). (2)
**Automation heartbeat** — migration `cron_heartbeat` (20260805025709,
additive, applied DIRECT to prod per the additive convention): cron_heartbeats
table (default_org_id/property_id stamps, member read, writes only via
secret-gated `post_cron_heartbeat`); auto-trigger cron records each run
best-effort; NEW D-1 card "Automation (cron)" (pure seam src/lib/heartbeat.js,
+5 tests) — green with last-run age + scan line, **brick STALE past 26h**
naming the blast radius (maint/voice/C3/UniFi/rent/brief all ride that one
cron — silence was invisible before this). Wrong-secret raise + rollback body
smoke (row/stamps/upsert asserts) PASSED, 0 residue; advisors = same accepted
definer-WARN class only. **Live smoke: manual cron run via the CRON_SECRET
pull-load-delete drill → {scanned 6, opened 0, rent inserted 0 = idempotency
re-proven, brief exists} → prod row fresh+stamped ✓ → bundle grep
Automation(cron)/cron_heartbeats ✓.** (3) **Voice-bridge esc() null-safety**
(the queued 07-29 one-liner, `s ?? ""`) — Fly deploy + smoke: healthz ok,
/twiml returns clean TwiML with real greeting. NOT shipped (operator
decisions, ranked): error-tracking vendor — 1 Sentry free tier · 2 Vercel log
drains · 3 window.onerror→Supabase table (no vendor); auto-deploy-on-green.
**Operator smoke (30s): D-1 → "Automation (cron)" card, green OK, age + "last
scan: 6 candidates · 0 opened".**
Prior: 2026-08-04 (later) — **PHASE B-3 SHIPPED + DEPLOYED + SMOKED
(autonomous under /goal): D-0 PORTFOLIO SHEET + PROPERTY SWITCHER PLUMBING
(323 tests).** Design: docs/phase-b/10. Client-only — no migration, no RLS
change. (1) **Active property is now a selection**, not a literal: remote.js
`PROPERTY="otb"` died; localStorage `otb-active-property`, unset = first
RLS-visible property (created_at order = OTB), stale slug self-heals;
switching = full reload (seed/hydration/queue/realtime are boot-bound —
deliberate). (2) **Sidebar property switcher** renders ONLY at >1 visible
property — today invisible, OTB sidebar pixel-identical. (3) **New D-0
Portfolio sheet** first in the sheet index (boot default stays D-1 via new
explicit `DEFAULT_PAGE`): cross-property cards from DB-native rows only
(pure seam src/lib/portfolio.js, +7 tests) — A/R outstanding (positive unit
balances over effective ledger entries) + open work orders; "Open →"
switches property. Scope fences (doc'd): 13 property sheets stay OTB-data-
bound until Phase C onboarding builds a second data package; api/* still
resolves 'otb'; no realtime on D-0; comp KPI excluded (diff-vs-baseline
rows would misread). **Prod smoke:** bundle grep pg-portfolio/otb-active-
property ✓ · local no-login UI walk (14 sheets, boot lands D-1, #portfolio
deep-link, console clean) ✓ · **live-data path proven end-to-end: headless
operator session (OTP → Gmail → /auth/v1/verify; NEW mangle mode — the
double-QP eats `token=` AND the token's first hex pair when ≥0x80, renders
�; recovered by probing the 128 candidate pairs against /verify, hit "85",
wrong guesses don't consume the token) → D-0's exact RLS reads via REST →
shipped seam fold returned A/R $90,291.23 / 24 units = the Aug-1 ledger
posting TO THE CENT, WO 0 open (3 heads all closed)**; smoke session
revoked (logout 204), token artifacts deleted. Note: harness auto-mode
blocked browser-side session injection this session — REST + seam fold is
the working substitute for authed browser smokes. **Operator smoke (1 min):
orangeoceanatlas.com → sheet index shows D-0 above D-1 → open D-0 → OTB
card, ACTIVE tag, A/R $90,291.23 (24 units — Aug charges, pre-payments) ·
boot still lands D-1 · no switcher visible (single property = correct).**
**NEXT MENU: A-5 payment links (operator key → tools/stripe-payment-links
.mjs, runbook §1) · realtime smoke (phone+desktop C-1 flip) · Phase B-4
observability or Phase C-1 onboarding funnel (D-0 + switcher now give C-1
somewhere to land) · voice smokes (07-28 queue).**
Prior: 2026-08-04 — **PURGE #7 SHIPPED: TYPED LAYER TABLES + REALTIME
(Phase B-5) — MERGED TO PROD + DEPLOYED + SMOKED, all autonomous under /goal.**
`property_state` is GONE; the 9 persisted layers now live in 7 typed tables
(comp_state 297 rows · unit_notes · board_state · directory_state ·
site_features · camera_overrides · layer_settings) with per-row diff sync
(new pure seam `src/lib/statesync.js`, registry row contract in
`src/lib/layers.js`: toRows/fromRows/ownsRow, round-trip law tested) and a
**realtime channel per property** (`src/lib/realtime.js`: per-table debounced
re-pull fold, own-origin echo skip via `origin` col + REPLICA IDENTITY FULL,
busy-guard defers folds over unpushed local edits, dirty-table recovery on
failed push). Store/views untouched — snapshot shape frozen; **JSON import now
syncs** (whole-snapshot push silently skipped it). Rollout was the B-1 drill:
Supabase branch seeded with a byte-identical prod `property_state` copy (md5
9/9) → migration `typed_layers` (create+backfill) verified 8/8 layer-equality
checks against real data → `typed_layers_drop` carries an IN-MIGRATION verify
that RAISES before the drop (a bad backfill would abort the merge with
property_state intact) + `get_brief_state` ported (secret = auto_trigger, NOT
cron_secret — plan error caught in preflight) → assert suite extended to the 7
tables (5 personas + publication + property_state-absent asserts),
SUITE_PASS_ROLLBACK on branch → **branch smoke in two browser tabs: boot
hydration matched DB exactly, C-1 click A→B via realtime ≤2s, SQL-side
INSERT and DELETE folds landed in tab state, zero console errors** →
`merge_branch` (async — poll list_branches) → immediate deploy → **prod:
SUITE_PASS_ROLLBACK, 0 residue, comp 297/149-coi=ok intact, 24 Aug charges
untouched, bundle grep comp_state/postgres_changes ✓, 0 property_state
refs** → DDL exported (supabase/migrations/20260804101425+20260804101831) →
branches deleted (billing stopped). liveDigest (api/concierge.js) reads the
typed tables via fromRows. Docs: specs docs/phase-b/08 (design) + 09 (plan).
⚠ Session lessons: Supabase MCP branches are SCHEMA-ONLY (seed real data
yourself if verification needs it) · preview_start{name} carries a STALE
Downloads project root — use preview_start{url} + Bash-background vite ·
Supabase magic-link emails read via Gmail MCP arrive DOUBLE-QP-decoded
("=78"→"x" eats the token= equals sign; recover the hex, POST
/auth/v1/verify {type,token_hash} and inject the session into localStorage).
**Operator smoke (2 min): open orangeoceanatlas.com on phone AND desktop,
logged in as you — flag a C-1 cell on one, watch it flip on the other without
reload · unit drawer note edit syncs the same way.**
Also this session (pre-design housekeeping): dossier data-as-of stamp bumped
to the July SOT (7/16/2026) + AI-1 grounding regenerated + deployed; export
re-synced to Drive + zip (parking memo restored after /MIR dropped it);
tools/run-hidden.vbs deleted. **NEXT MENU: A-5 payment links (operator key →
tools/stripe-payment-links.mjs, runbook §1) · operator realtime smoke above ·
Phase B-2/B-3 continuation (property switcher / D-0 portfolio dash — realtime
+ typed rows are now the foundation).**
Prior: 2026-08-03 (session close) — **SESSION TAIL after the merge:**
(1) **Property LLM export regenerated** (`npm run export-package` + headless-
Edge PNG re-render) and synced to the canonical Drive folder
`G:\My Drive\00 OTB\OTB-LLM-Export\` + zip refreshed (Drive copy had been
stale since Jul 24; proforma now included). Cosmetic: dossier "data as of
6/10/2026" stamp is a constant in tools/export-package.mjs predating the
July SOT — figures themselves are current; bump next touch. (2) **NEW
OPERATOR RULE (CLAUDE.md §Conventions + Claude memory): every export ALSO
goes to G:\My Drive\00 OTB\ — chat delivery alone ≠ done.** (3) **NEW
Scheduled Task `OTB-Repo-Backup` (daily 03:00, tools/gdrive-backup.ps1
-Register):** full-history git bundle → G:\…\00 OTB\repo-backups\ (verify
logged, keep 10); first bundle written+verified (15 MB, incl. HEAD e54a985).
Committed-only — commit what matters. (4) Session-state export for a fresh
LLM: docs/llm-export-2026-08-02.md. **NEXT SESSION MENU: A-5 payment links
(operator drops restricted key → tools/stripe-payment-links.mjs, runbook §1)
· voice smokes (real tour booking · booking-refusal probe · 07-28 voice-lead
thread) · purge #7 typed-layers design session (Phase B-2/B-3 kickoff) ·
post-merge operator smoke (login/ledger//leasing) · run-hidden.vbs delete on
word.**
Prior (same day): **PHASE B-1 MERGED TO PROD + DEPLOYED +
SMOKED (operator "1,2,3").** `merge_branch` applied all 8 Phase B migrations
to prod (history 20260802014818→163706) · Vercel deploy aliased to
orangeoceanatlas.com (29s) · **post-merge prod smoke: assert suite
SUITE_PASS_ROLLBACK on PROD, 0 residue** · 0 legacy columns · **11/11 real
users backfilled to org_members (adam = operator/org-wide)** · 24 Aug rent
charges intact · /leasing no-extension = HTTP 200 · prod bundle carries the
ported code (promote_authorized/propertyContext grep) · **branch phase-b
DELETED (hourly billing stopped)** · executable DDL exported to
supabase/migrations/ (8 files, real prod versions). Operator decisions
LOCKED: **purge #7 typed layer tables = DEFERRED to its own design session
(per-row sync + realtime foundation, §17 B-5)** · **storage folder prefixes =
DEFERRED to onboarding** · merge = done. tools/run-hidden.vbs identified:
inert 2-line hidden-window PS launcher, unreferenced (both C3 tasks use
-WindowStyle Hidden directly) — delete on operator's word. **Operator smoke:
log in at orangeoceanatlas.com (magic-link, should look identical) · R-1/P-1
render · a unit drawer ledger loads · /leasing without .html.**
Prior (same day): **PHASE B MERGE GATE: a/b/d/e DONE + c PARTIAL —
branch `phase-b` was 7 migrations deep, merge-gated.** Done ON BRANCH: **(a) code port**
(migration `code_port_uuid` + commit 8891baf: remote.js propertyContext() /
api tenancyContext() resolve uuid tenancy from the 'otb' slug, all client
writers stamp explicitly, property reads filter by uuid; concierge liveDigest
text-eq-uuid 400 fixed; property_state PK → (property_id, layer); all 9
*_slug_legacy columns DROPPED; purge #2 created_by from membership;
get_brief_state/voice_tour_state de-literaled) · **(b) storage port**
(`storage_membership_port`: all 19 role policies → member_role_in/property-
aware overloads; zero-arg refs in storage = 0; **folder prefixes DEFERRED to
onboarding** — no 2nd property, prefixing = prod object moves for zero gain;
operator can veto) · **(c) purges #4+#6** (`purge_facts_brand`: 7 fact rows →
properties.facts; OO+OTB brand kits → orgs.brand; **#7 typed layer tables
HELD — operator decision, see ranks in session log**) · **(d) membership**
(`membership_migration`+`fix_membership_recursion`: profiles→org_members
backfill; handle_new_user creates memberships; NEW promote_authorized RPC
(client authorizeEmail uses it); member_manage policy; **member_role_in
legacy leg DROPPED**; is_operator/is_owner_or_operator → membership; zero-arg
tenant/vendor helpers dropped; suite caught an RLS recursion — default_org_id/
default_property_id now SECURITY DEFINER) · **(e) assert suite GREEN**
(docs/phase-b/assert-suite.sql — 5 personas × 17 tables, SUITE_PASS_ROLLBACK,
0 residue; re-run against prod post-merge as the smoke). Advisors: accepted
definer-WARN class only. 289 tests. Docs: docs/phase-b/04–07.
**⚠ MERGE COUPLING: master (8891baf+) speaks the BRANCH schema — do NOT
`vercel deploy` until `merge_branch` runs; then deploy immediately (the
committed /leasing rewrite ships with it).** Loose ends CLOSED: 40 vendored-
skill files committed deleted (79c96a6) · /leasing→/leasing.html rewrite in
vercel.json · ~/.otb-stripe.key DELETED (verified). **A-5 links:** NEW
tools/stripe-payment-links.mjs (ACH-only, sets PI metadata.unit — dashboard
links can't); operator drops a restricted key (Payment Links/Products/Prices
Write) → runbook §1. Unknown loose file: tools/run-hidden.vbs (untracked, not
Claude's — operator to identify).
Prior: 2026-08-01 (late) — **PHASE B STARTED (operator: "in-place +
Supabase branch") — B-1 schema is 3 migrations deep on branch `phase-b`
(project_ref tyhmcfjjhecpphidbuxt, $0.01344/hr, schema-only).** Applied +
verified ON BRANCH (prod untouched; everything merge-gated): (1)
`phase_b_foundation` — orgs→properties→org_members(capabilities)→
property_settings + member_can(); seeded orange-ocean/otb/ledger_start_ym
2026-08. (2) `stamp_tenancy` — uuid (org_id,property_id) on all 17
property-scoped tables (legacy text 'belle'/'otb' → *_slug_legacy, dropped
at code-port; default_org_id()/default_property_id() = single-tenant bridge
so un-ported writers keep working). (3) `rls_membership_rewrite` — ~45
policies in FINAL scoped form member_role_in(org_id,property_id,roles[]);
profiles fallback confined to ONE function leg; property-aware
current_tenant_unit/current_vendor_id overloads kill cross-property
unit/vendor collisions; zero-arg helpers kept for storage policies.
RLS smoke ON BRANCH: operator-member sees / stranger blind / stranger
write blocked (rolled back). **Merge gate (docs/phase-b/03): code port
(remote.js+RPCs speak uuid, purge #2 created_by) · storage policies ·
purges #4/#6/#7 · user migration → drop legacy leg · full 4-role assert
suite → merge_branch + simultaneous deploy.** Docs: docs/phase-b/01–03.
Purge #3 (LEDGER_START_YM→settings row) already retired on-branch.
NOTE: legacy org text was 'belle' — plan says orgs = MANAGEMENT co
(orange-ocean); Belle = owning entity, becomes a property attribute later.
Prior (same day): **AUG-1 GO-LIVE LANDED + THE 07-28 QUEUE IS
COMPLETE (all four; 289 tests).** Repo-move check: site was never down —
operator hit `/leasing` w/o `.html` (404; no-extension redirect NOT built,
decision open). **A-5 ACH ACTIVATED:** operator dropped a restricted
rk_live key (events/PI/webhook-endpoint scopes verified 200) →
STRIPE_SECRET_KEY via the byte-exact `cmd < file` drill → deployed →
REAL-secret verify: brain re-fetch returned 404-authenticated (not 401).
Webhook endpoint `we_1TzXByAG3Ua90EF59aSkCLBl` created VIA API
(operator-approved), enabled, live-mode, both PI events. ⚠ `~/.otb-stripe.key`
STILL ON DISK — operator to delete (or say the word). First real payment =
remaining smoke; payment links MUST carry metadata.unit. **LEDGER GO-LIVE
CONFIRMED:** scheduled cron (11:09Z) posted 24 charges = $90,291.23
(27 units − 131/133 vacant − 135B owner); manual re-run inserted 0 =
idempotency proven live. **QUEUE #1 truthful booking SHIPPED + DEPLOYED:**
persona TRUTH RULE + pure `claimsBooking()` detector (negation/conditional/
future-aware) + brain guard — unbacked claim → 1 corrective round → honest
BOOKING_FALLBACK + manager thread `voice-lead:<callSid>`; new RPC
`voice_call_has_booking` (applied, wrong-secret raise verified) lets callers
restate REAL bookings cross-turn (bridge history is text-only — that's the
root enabler). **QUEUE #2 unbooked-lead cron SHIPPED + DEPLOYED:** RPC
`get_unbooked_voice_leads` (14d window) + `voiceLeadCandidates` seam (2h
grace) rides auto-trigger; live smoke opened `voice-lead:CA3089…` = exactly
the 07-28 hallucinated call. Shares the guard's thread key — never
double-fires. **QUEUE #3 dedupe SHIPPED (DB-only, no deploy needed):**
`voice_file_maintenance` now returns the existing ticket for same
unit+title (case/space-blind) within 10 min; rollback smoke passed
(dedupe ✓ cross-unit ✓ gate ✓, zero rows leaked). **Operator smoke: call
(337) 270-7044, book a real tour → tour_bookings gets its FIRST row · probe
call "so I'm booked right?" without picking a slot → agent must refuse the
claim · AI-1 → voice-lead thread for the 07-28 call is waiting.** Loose:
40 deleted vendored-skill files uncommitted (plugin supersedes them) ·
`/leasing` no-extension redirect undecided.
Prior: 2026-07-30 — **LEASING-PACKAGE v1.5 (queue #4) SHIPPED +
DEPLOYED (281 tests) â€” Google Maps Platform onboarded.** Operator created a
key (broad Maps-Platform restriction, acceptable) â†’ `~/.otb-gmaps.env`
(GOOGLE_MAPS_API_KEY, same never-in-chat drill; NOT in Vercel env â€” key is
build-time only). `tools/gmaps-pull.mjs` snapshots Places two-ring
(120 m tenants / 400 m corridor) + Routes drive times â†’
`src/data/corridor.json` (committed; re-run to refresh). Pure seam
`src/lib/leasing.js` (+6 tests): tenant-rating matching vs rent roll
(token-subset + GOOGLE_NAME_ALIASES â€” "Mary Ellen's Tux Shop"â†’123; match
across BOTH rings, anchor pins sit outside 120 m), driveLine, smsText,
LEASING_URL. `tools/leasing-package.py` (node seam contract + otb_brand)
â†’ **`public/leasing.html` â€” LIVE on both hosts**
(orangeoceanatlas.com/leasing.html Â· otb-command.vercel.app/leasing.html):
navy/white, zero JS, mobile-clean (375px verified, no h-scroll), 131+133
cards + combinable 3,179 SF, high-teens $/SF (SOP range only), drive strip
(9 downtown Â· 6 UL Â· 12 I-10), tenant ratings under SOT names (display
gate â‰¥4.0â˜… & â‰¥10 reviews), neighbor draws, 324 spaces cited, Google
attribution + as-of. **AI-1 leasing agent â†’ "ðŸ“¦ Lead SMS" chip** (copies
ready-to-send text w/ package link + (337) 270-7044; app sends NOTHING).
Prod bundle grep-verified (aiLeadSms/leasing.html). **Aerial View find:**
Google has a pre-rendered 40s flyover (Apr 2022) â†’
`G:\My Drive\00 OTB\OTB-aerial-google-2022.mp4` â€” operator to judge as B3
stopgap vs wait for re-fly. Probe tools: gmaps-probe.mjs (Solar returned
only 11.5K SF slice â€” needs per-building/dataLayers for full roof; Isochrones
untested, deferred). **Operator smoke: open orangeoceanatlas.com/leasing.html
on phone â†’ AI-1 ðŸ¤ Leasing â†’ ðŸ“¦ Lead SMS â†’ paste somewhere Â· watch the
aerial MP4.** LEASING_URL swaps when the canonical-domain decision lands
(then regen page + SMS). Aug-1 ACH still OPEN â€” 2 days.
Prior: 2026-07-29 â€” **D-1 OCCUPANCY CARD FIXED + DEPLOYED (275
tests) â€” root cause was CADENCE, not render:** the card gated on a 6h
freshness window (`listOccupancy(6)`) but C3 uploads land once nightly
(23:45 local), so the newest sample was 11â€“19h old all business day and
the card only existed ~11pmâ€“5am. Fix: 48h window (sits above the 36h
c3-stale heartbeat, which already threads real outages) + new pure
`occAsOf()` seam (+3 tests) â€” as-of label shows date+time for non-today
samples so yesterday never reads as today. Prod bundle grep-verified
(en-CA/48). **PLUS operator-picked intraday refresh: NEW Task
`OTB-C3-Midday` (daily 12:00, same c3-nightly.ps1 â€” `-Register` now
registers both).** Live-smoked under the scheduler: 07-28 pass = 0
requests/0 inserts (816 already present â€” idempotency proven), 07-29
pass = 138 Haiku requests / 590 inserted; DB max(ts) went 04:01Z â†’
23:45Z (5 min fresh). Nightly re-processes nothing the midday pass did â€”
earlier data, no extra spend. **Operator smoke: D-1 mid-day â†’ "Parking
Occupancy (C3)" card present with dated as-of + 7d sparkline.**
Also this session: **knowledge graph re-run** (docs/graph/graphify-out â€”
1,164 nodes/76 communities; A-3 voice stack, build queue, transfer-package
+ pitch docs now first-class; Obsidian vault 1,238 notes, same registered
path) Â· fixed graphify semantic-cache root bug (0-files-cached silently;
41 files now cached â€” next update is cheap) Â· post-commit-hook label
clobber fixed (labels.json rebuilt, 75 names, survives hook refresh) Â·
fly.toml: committed the flyctl-regenerated file w/ deploy notes restored Â·
NOTE for queue #1 (truthful booking): bridge/server.mjs:50 carries its own
non-null-safe `esc()` (String(null)â†’"null" into TwiML welcomeGreeting);
one-char fix `s ?? ""` next time the bridge is touched.
Prior: 2026-07-28 (night) â€” **A-3 VOICE IS LIVE â€” both lines
answered real calls and wrote real data.** Numbers (operator bought):
**(337) 270-7044 = LEASING Â· (337) 273-0384 = TENANT** (assignment
delegatedâ†’made; 7044's old ElevenLabs webhook overwritten, operator-
approved). Voice webhooks â†’ `https://otb-voice-bridge.fly.dev/twiml?line=â€¦`
(operator clicked the two console forms; he ALSO pointed both MESSAGING
webhooks at the same URL â€” harmless no-op, inbound SMS just errors in the
Twilio debugger until a v2 bridge messaging handler; A2P unregistered
anyway). **Fly bridge:** app `otb-voice-bridge` (dfw, scaled to 1 machine,
flyctl in ~/.fly/bin authed adam@; operator added the credit card so the
trial 5-min machine-kills are gone). **âš  SECRET DRILL LESSON (cost us the
first smoke round):** piping a secret into `vercel env add` from PowerShell
appends a newline â†’ brain stored `<secret>\n` â†’ EVERY bridge turn died 401
("brain call failed: brain HTTP 401" in fly logs; caller hears greeting,
then apologies). Fix = `cmd /c "npx vercel env add â€¦ < file"` (byte-exact);
drill re-run end-to-end. NEW RULE: a secret drill is not verified until a
REAL-secret request is accepted (junk-401 alone proved nothing). **Live
smoke (operator, 21:20/21:23 UTC):** tenant call filed work order
`vr-20260728212150-6b5e` (AC, 135B, callback captured; agent TRIPLE-filed â€”
dupes â€¦2128/â€¦2145 closed via maintenance_events actor `claude-code`) +
voice-tenant/-leasing transcripts in AI-1. Leasing call captured
name/units(131+133)/phone and said "locked in" Ã—5 â€” **but NEVER called
book_tour; tour_bookings = 0 rows ever. Hallucinated confirmation = the
worst leasing failure; fix is queue #1.**
**NEXT-SESSION BUILD QUEUE (operator: "all four", 2026-07-28):**
1. **Truthful booking** â€” persona/tool hardening: never claim booked
   without an ok:true tool result; call book_tour the moment
   name+phone+slot exist. 2. **Unbooked-lead cron** â€” leasing voice_calls
   with no tour_bookings row â†’ manager thread keyed `voice-lead:<call_sid>`
   (safety net so no lead silently drops). 3. **Dedupe guard** â€”
   voice_file_maintenance returns the existing ticket for same unit+title
   within 10 min. 4. **Leasing-package v1.5** â€” hosted public one-pager
   (131/133) + ready-to-send SMS text inside the leasing manager thread
   (caller asked for a package ON TAPE; keeps the "app sends nothing"
   boundary). PLUS: **D-1 Parking Occupancy card "not up" (operator)** â€”
   pipeline is HEALTHY (occupancy_samples 5,644 rows, latest 07-27 23:00Z,
   OTB-C3-Nightly + watchdog tasks Ready) â†’ suspect the card's freshness/
   render path in the view, diagnose front-end first. PLUS: **operator asked
   "where does someone onboard a new property" â€” nowhere; that IS Phase B
   multi-tenant (schema + onboarding flow), now operator-pulled â€” schedule
   it.** Stripe ACH still untouched â€” **Aug 1 is 4 days out, now the top
   clock item.** Commercial v2 (feature-forward, via Higgsfield MCP â€” added
   user-scope, tools appear in NEW sessions) still wanted; Manus quoted
   450-600 credits for a full regen, so draft the shot list first.
**Desktop-control lessons (Windows-MCP):** labels go stale after ANY window
switch â€” resnapshot before every click; Manus + Claude-desktop self-front
and steal clicks/dismiss dropdowns â€” MINIMIZE the Claude Code browser window
before driving other windows; `loc` param serializes broken â€” use `label`.
Prior: 2026-07-28 â€” **NO-BUILD SESSION (context load + tooling
only): nothing OTB shipped, prod untouched.** One env change: `higgsfield`
MCP server added at USER scope (`claude mcp add --transport http --scope
user higgsfield https://mcp.higgsfield.ai/mcp` â†’ ~/.claude.json) â€” tools
appear in NEW sessions only; if it wants OAuth, authenticate via `/mcp`
in an interactive terminal on first use. Session offered ranks (Aug-1
ACH readiness Â· Phase B schema Â· meeting prep) â€” operator did not pick;
the queue below stands exactly as of 07-26. Aug 1 ledger go-live is now
4 days out â€” Stripe ACH operator steps (STRIPE_SECRET_KEY + webhook,
docs/operator-runbook-2026-07.md) are the clock-driven item.
Prior: 2026-07-26 (later) â€” **CUSTOM DOMAIN LIVE:
https://orangeoceanatlas.com** (+ www) â€” operator bought at GoDaddy
(3yr), Claude attached both to the Vercel project, DNS = A @ 76.76.21.21 +
CNAME wwwâ†’cname.vercel-dns.com (GoDaddy's pre-installed parked www CNAME
had to be EDITED, not added-over). Verified HTTP 200 + SSL + Atlas title
on both hosts. ~~Supabase redirect-URL check~~ **CONFIRMED by operator
2026-07-26: magic-link login works on the new domain.** ooatlas.com /
ooatlas.ai still unpurchased (were open). NOTE: this is the PRODUCT
domain â€” the OTB tenant-facing canonical-domain decision (ontheblvd vs
shopontheblvd, gates vinyl QR) is separate and still open.
Prior: 2026-07-26 â€” **PRODUCT RENAMED: "ORANGE OCEAN ATLAS"
(operator-confirmed; billion-dollar client meeting next week) â€” SWEEP
SHIPPED + DEPLOYED (272 tests).** Name journey: Asset Command cleared â†’
operator chose Atlas; composite-only rule (never naked "Atlas" â€” crowded:
Saunders/AtlasX/Atlas RE/VISION-ATLAS); all 5 composite domains OPEN at
check time (orangeoceanatlas.com Â· ooatlas.com/.ai Â· atlasbyorangeocean.com
Â· oo-atlas.com, ~$205) â€” **operator buys; app can live at
atlas.orangeocean.ai.** Swept: pitch master+variants (PDFs â†’ OO-Atlas-*,
stale OTB-*.pdf purged incl. on G:), commercial title/end-card + **scene-8
VO re-rendered** ("Orange Ocean Atlas â€” built by an operatorâ€¦", ~10s in the
14s slot; full 8-scene re-render via the key drill; MP3s â†’ G:\vo-mp3),
operator-manual header, app titles/login-sub/print-foot ("ORANGE OCEAN
ATLAS Â· OTB"), concierge CORE + _context regenerated, export-package/
proforma attributions. âš  TOOL FIX: render-commercial-vo.py marker regex
was only re-runnable against an EMPTY AUDIO array (data-URIs carry ";");
now re.S non-greedy. Prod verified (title + bundle). Module-naming concept
(pitch talking point): Atlas=spatial Â· Almanac=dates Â· Ledger Â· Desk Â·
Register. **Operator smoke: commercial.html â–¶ full loop (new scene-8 VO) Â·
skim 3 OO-Atlas PDFs' covers Â· login page shows "Orange Ocean Atlas â€”
sign in".**
Prior: 2026-07-25 (night, cont.) â€” **MOBILE OPTIMIZATION SHIPPED +
DEPLOYED:** â‰¤860px the sheet index is an off-canvas drawer behind a topbar
â˜° (veil, auto-close on sheet pick), grids collapse to one column (KPIs
2-up), search full-width, unit drawer full-screen, `100dvh` viewport,
coarse-pointer tap targets (matrix cells 38px, always-visible edit/âœ•).
Desktop >860px byte-identical behavior; print hides the new chrome.
Verified at 375Ã—812 via computed-style checks (occluded pane can't
screenshot â€” standing lesson): burger/veil/nav lifecycle, zero horizontal
page scroll, tables scroll inside their cards; desktop regression clean;
console clean; prod bundle grep-verified (navBurger/nav-burger/dvh/860).
`.env` was moved aside for the local no-login preview and RESTORED.
**Operator smoke: open otb-command.vercel.app on your phone â†’ â˜° â†’
walk D-1/R-1/M-1 â†’ open a unit drawer (full-screen, âœ• closes).**
Prior (same night): autonomous `/goal` finish-out â€”
**UNIFI OFFLINE AUTO-TRIGGER SHIPPED + DEPLOYED (272 tests):** the deferred
D-1-card follow-on â€” `unifiTriggerCandidate` (pure seam, src/lib/unifi.js)
rides the daily cron; keyed by the OUTAGE SET (not date), so a persistent
outage alerts once ever, a changed outage opens fresh. Best-effort scan
(skipped without UNIFI_API_KEY; api.ui.com failure never blocks other
scans). **Live prod smoke via the pull-load-delete CRON_SECRET drill:
scanned 4 / opened 1 (`unifi:1-unlisted` â€” the known dead WiFi unit now
has a manager thread in AI-1) / failed 0.** Also: **operator runbook
consolidated** â†’ `docs/operator-runbook-2026-07.md` â€” EVERY operator-gated
action with exact steps (Stripe ACH keys/webhook Â· A-3 Twilio/Fly go-live Â·
CAPTCHA Â· dead-AP ident Â· 4 blocked decisions incl. owner-layer RLS set +
auto-deploy Â· field walks Â· open smokes Â· data gaps). Deliberately NOT done
unattended (live prod, judgment call): Phase B multi-tenant schema Â·
B3/B4/C2 Â· per-AP uptime history (still queued).
Prior: 2026-07-25 (later still) â€” **PITCH PACK ROUND 2 (operator "1
AND 2"):** (1) **VO RENDERED** â€” all 8 commercial scenes in the AI-1 "Jack
John" voice (key via the pull-load-delete drill, never on disk), embedded as
per-scene data-URIs in commercial.html (â–¶ PLAY WITH VOICE; per-scene playback
survives manual advance; scene 8 slot 12â†’14s â€” VO ran 12.2s â€” reel now 92s;
every scene duration verified â‰¤ its slot). Re-render tool:
`tools/render-commercial-vo.py` (keep LINES in sync w/ the script MD).
Loose MP3s â†’ G:\â€¦\pitch-2026-07\vo-mp3\ for external video assembly.
(2) **AUDIENCE COVERS** â€” `tools/brief-variants.py` regenerates
feature-value-brief-belle.html (owner edition: "what the owner personally
holds") + -partner.html (design-partner offer: get/ask/won't-do) from the
master; both PDF'd (Chrome can't write into the repo â€” render to temp, copy).
All synced to G:. **Operator smoke: commercial.html â†’ â–¶ PLAY WITH VOICE, one
full loop w/ sound Â· skim both variant PDFs' covers.**
Prior: 2026-07-25 (later) â€” **INVESTOR PITCH PACK SHIPPED (doc-only,
no deploy):** `docs/pitch/` = feature-value brief (MD canonical + OO-branded
HTML + PDF via headless Chrome), full operator manual (all 5 roles, sheet-by-
sheet + rhythms + admin), commercial ("The Instrumented Asset": 90s/30s script
w/ claims register + self-playing 90s HTML reel, 8 scenes, OO dark brand â€”
screen-record for video or loop as-is). Copied to `G:\My Drive\00 OTB\
pitch-2026-07\`. Voice claims flagged: soften scene 6 if airing before A-3
go-live. Operator smoke: open the PDF (render unverified locally â€” no
poppler) Â· play commercial.html once through.
Prior: 2026-07-25 â€” **HARVESTS #5 + #6 SHIPPED + DEPLOYED (269
tests) â€” the donor merger queue is COMPLETE; belle-realty-pwa is an archive.**
**#5 calc engines** (pure seams in `src/lib/calc/`): capex reserve-gate
(Playbook Â§9, EUL urgency bands), insurance claim timeline (Â§12, UTC
month-clamp date math), occupancy-cost-ratio tripwire (Â§6). NOTE: donor
"OCR" = **occupancy cost ratio**, NOT document OCR â€” all three engines are
pure, so the old "gated on data surfaces" caveat dissolved. All ride the
existing run_calc tool + numeric guardrail (AI-1, all personas).
**#6 e-sign** (migration `esign_requests` APPLIED): token lifecycle
pendingâ†’sentâ†’viewedâ†’signed/declined/expired. Signer page =
`/api/esign?t=<uuid>` â€” public, **zero inline JS** (CSP untouched; plain
HTML form POSTs back to itself, plan-room styled, E-SIGN/LA-UETA consent
line). Signer transitions ONLY via token-gated definer RPCs
(esign_get/sign/decline â€” junk-token raises + full lifecycle asserts
verified, incl. double-sign and decline-after-sign fail closed). Optional
doc review link: esign_doc_path + an anon storage policy scoped to docs on
live requests. Operator face: **unit drawer â†’ E-Sign panel** (create, copy
link/copy message â€” the app sends NOTHING, operator's own channel, v1
boundary â€” re-token, cancel, signed receipt); owner read-only via CSS.
**#6 tenant-portal-lite** (migration APPLIED): tenants read their OWN
unit's ledger via RLS; M-1 tenant face gains **"Your account"** (balance +
last 8 entries, same pure fold as the operator drawer).
**A-5 ACH GROUNDWORK** (migration `post_ach_payments` APPLIED,
wrong-secret raise verified): pure seam `src/lib/ach.js` classifies Stripe
events â†’ idempotent `ach:<pi_id>` payment rows, or manager threads for
unmapped/failed payments (`ach-unmapped:`/`ach-fail:` keys). Webhook
`api/stripe-webhook.mjs` verifies by RE-FETCHING the event from Stripe (no
raw-body/signature fragility) and is **DORMANT (503) until the operator
adds STRIPE_SECRET_KEY in Vercel env and points a Stripe webhook at it.**
Advisors: same accepted definer-WARN class only. Carry-forwards EXAMINED,
blocked on operator decisions: owner-layer read policy (D-1 owner-default
renders actions+comp, so per-layer RLS would break owner dashboards â€” needs
a decision on the owner-readable layer set) Â· CAPTCHA (dashboard-only) Â·
auto-deploys (Vercel git link).
**Operator smoke: any unit drawer â†’ E-Sign â†’ create â†’ Copy link â†’ open
incognito â†’ sign Â· M-1 as a tenant â†’ "Your account" Â· ask ðŸ¤ Leasing
"should I spend $45K on an RTU replacement with a $120K reserve, $30K/yr
contributions, installed 2008, 15-yr life?"**
Prior: 2026-07-24 (rev 2) â€” **R-1 ONE-SHEET PRINT + EXPIRY WATCH
(owner request) SHIPPED, then HARDENED after field report "still 2 pages,
flags louder" (248 tests).** Rev 2: (1) print fit is now MEASURED, not
estimated â€” stampPrint applies `.print-fit` (compact layout, rules live
outside the media query so they're measurable), reads the sheet's real
height, and sets a zoom via pure `fitZoom()` (budget 590px; engages at 0.95
today) â€” shrink beats spill; (2) `html,body{height:auto}` in print â€” the
100% height pinned body to exactly one paper height, where a single spilled
pixel = blank page 2 (likely the field culprit); (3) flags LOUDER: stronger
tint + 4px inset left bar + bold colored Term-End date + bigger â–²/â–³.
Expiry watch: â‰¤6 mo â–² brick / 6â€“12 mo â–³ amber (seam `src/lib/roll.js`,
legend in stamp). Verified via full print emulation in preview: 1 page at
740px budget, zoom 0.95, bars+colors present under print layout; 115/117 â–²
(Clothing Loft 9/30/26 = SOT), 8 units â–³.
**Operator smoke: R-1 â†’ â¤“ SHEET â†’ ONE page, flags unmissable.**
Prior: 2026-07-24 (later) â€” **A-3 VOICE BUILT + DEPLOYED (243 tests);
operator go-live steps pending.** Two 337 lines (tenant + leasing), Twilio
ConversationRelay. Architecture: **Fly.io bridge** (`bridge/` â€” dumb WSâ†”HTTP
transport, the system's ONLY always-on process; Vercel can't hold a socket) â†’
**`/api/voice-agent` brain** (Bearer VOICE_SECRET fails closed; personas/tools/
speechify from pure seam `src/lib/voiceagent.js` + `src/data/sop.json` â€” the
A-4 capture, single-sourced) â†’ migration **`a3_voice_lines`** APPLIED
(voice_settings row [windows/greetings] Â· tour_bookings [unique slot_key =
conflict gate] Â· voice_callsâ†’chat_threads map Â· 5 secret-gated RPCs on NEW
app_secrets row 'voice_agent'; all five wrong-secret raises verified + full
body smoke under rollback; advisors = same accepted definer-WARN class only).
Tenant line files real maintenance_requests (actor voice-agent â†’ M-1/W-1/aging
cron unchanged); leasing line books tour slots (18h lead, Tue/Thu defaults) +
transcripts land as voice-tenant/voice-leasing threads. Voice = ElevenLabs
"Jack John" (same as AI-1; Deepgram fallback documented). Decisions this
session: Fly.io (1) Â· two numbers (my call, delegated) Â· settings-row calendar
(1) Â· ElevenLabs (1). **GO-LIVE = OPERATOR RUNBOOK `docs/a3-voice-runbook.md`:
Twilio CR onboarding (slow â€” start first) Â· buy 2 numbers Â· Fly launch Â·
secret drill (tools/rotate-voice-secret.mjs) Â· point webhooks Â· smoke calls.**
v1 boundaries (deliberate): no SMS-notify on dispatch, no live transfer, no
daily call cap (set a Twilio usage trigger), settings edits via SQL until a UI.
Prior: 2026-07-24 â€” **A-4 SOP CAPTURE DONE**
(`docs/a4-sop-capture-2026-07.md`): all 7 domains interviewed + locked.
Headlines: emergencies = leak/electrical/break-in/sewer, dispatch+notify
after-hours (never wake for permission) Â· vendor spend cap $500 Â· 2-bid $5K Â·
full tradeâ†’vendor roster named (Butcher/All Around/A&P/Grizzley/Alamo/AAA/
Broussard) Â· **rent is ALL-ELECTRONIC (no checks â€” supersedes the 07-21
"log each check" note; de-risks A-5 ACH)** Â· no rent reminders (deliberate
non-build) Â· agents NEVER speak eviction timelines Â· leasing line: name+number
only, "high teens PSF" range, books tour slots (**A-3 needs a calendar seam**),
exclusivity-conflict screening only Â· COI soft gate (dispatch+chase; GL $1M/$2M
+ Belle addl insured; COI/W-9/license gate at PAYMENT not dispatch) Â· make-ready
as-is/deal-driven Â· move-out solo walk+photos â‰¤30d Â· monthly documented walk Â·
house HVAC PM semi-annual (149 excluded). 6 automation candidates + full A-3
script derivation queued in the doc's "Derived outputs" section.
**A-3 voice is now UNBLOCKED.** Doc-only session â€” no code, no deploy needed.
Prior: 2026-07-23 (late) â€” **OPTIMIZATION PASS (4 carry-forwards) + C3
FOLLOW-ONS SHIPPED + DEPLOYED** (233 tests). Operator-ordered: hardening â†’ C3
â†’ verify each. Shipped: **#4 facts single-sourced** (new `src/lib/facts.js` +
`src/data/instruments.json`; D-1 parking KPI / W-1 covenant cards / T-1 JD
Bank all derive â€” no fact literals in views) Â· **#5 URL hash routing**
(`src/lib/router.js`; #sheet deep links, back/forward, sealed sheets snap to
first visible; smoked in preview) Â· **#8 rate limiter FAILS CLOSED**
(underDailyCap tri-state allow/limit/outage â†’ 429 vs honest 503 on all three
paid endpoints) Â· **#7 staleness guard** (test/generated-freshness re-derives
units.public.json/_seed.json/_context.mjs from live sources â€” a forgotten
`npm run split-seed`/`concierge-context` now FAILS the suite; export-package
gained OTB_EXPORT_DIR so tests never touch export/) Â· **C3-1 lot8+field-149
zone rects** (stall-map.json `zoneRects` from parking ticks; A-1 ðŸš— now paints
all three camera-covered ranks; est-geometric until the stall walk) Â·
**C3-2 heartbeat** (migration `c3_heartbeat` APPLIED â€” secret-gated
`get_occupancy_freshness`, wrong-secret raise verified; cron opens ONE
manager thread per outage keyed `c3-stale:<last-sample-day>` at 36h; manual
cron run clean, no false alert on the healthy pipeline) Â· **C3-3 weekly
rollup** (pure `weeklyRollup`/`rollupLine` â†’ D-1 card 7-day sparkline;
brief-ready figure source). Advisors: same accepted definer-WARN class only.
**Operator smoke: D-1 Parking card shows "7d â–â–ƒâ–…â€¦ avg %" tail Â· A-1 ðŸš— â†’
green/outline rects also at the Lot 8 pocket + 149 corner Â· URL bar tracks
sheets (#roll etc.), back button walks them.**
Prior: 2026-07-23 â€” **A-1 COI AI-parse + A-2 MAINTENANCE both SHIPPED +
DEPLOYED** (212 tests, now 13 sheets).
**A-2 (same day):** new **M-1 Maintenance** sheet + migration
`maintenance_module` (APPLIED): event-sourced work orders â€” INSERT-only
`maintenance_requests` + append-only `maintenance_events` (status/assign/note),
`maintenance-photos` bucket (folder per request id), new **tenant role**
(magic-link match against operator-managed `tenant_contacts`, tenant lands on
M-1 scoped to their unit â€” same lattice as vendors). Operator face: queue Â·
vendor assign (service roster) Â· status flips Â· tenant-login roster editor Â·
file-on-behalf. Owner: read-only. **V-1 vendor face now shows assigned work
orders** (notes + âœ“ Mark complete). W-1 seeds live "Work Order" cards
(mr:<id>, overrides/dismiss work as usual). Cron: `get_open_maintenance`
(secret-gated, wrong-secret raise verified; body query smoke-tested w/
rollback) â†’ aging unassigned requests (2d, emergency 1d) open a manager
thread idempotently (`maint:<id>`). Manual cron run clean. Advisors: same
accepted definer-WARN class only. Built `(org_id,property_id)`-shaped per plan.
**Operator smoke: M-1 â†’ submit a test request w/ photo â†’ assign a vendor â†’
W-1 shows the card â†’ V-1 (as that vendor) shows the work order.** To onboard a
real tenant: M-1 â†’ Tenant logins â†’ add email+unit; they magic-link in as usual.
V-1 operator panel: ðŸ¤– Parse cert (or drop a PDF on the vendor panel) â†’ cert
files in the vendor folder â†’ `api/coi-parse.js` (operator-only, daily-capped,
Haiku forced-tool `record_coi`) â†’ seam `src/lib/coiparse.js` normalizes
(date shape/plausibility, deterministic note "Carrier Â· GL $1M/$2M Â· pol â€¦")
â†’ pre-fills coi_expires/coi_note â†’ operator clicks Save COI. Prod bundle +
401/405 endpoint gate verified. **Operator smoke: V-1 â†’ any service vendor â†’
ðŸ¤– Parse cert with a real ACORD PDF â†’ date/note prefill â†’ Save COI.**
**NEXT: A-3 voice (Twilio ConversationRelay, decided) â€” ~~A-4 gate~~ CLEARED
2026-07-24 (SOP capture done; scripts derive from
docs/a4-sop-capture-2026-07.md Â§Derived outputs).**
Prior: 2026-07-22 (night) â€” **FINAL BUILD PLAN adopted + gates decided
+ A-0 done.** Session: operator confirmed the visual smoke round Â· market scan
(Placer.ai = skip, broker-pull instead; PM platforms = keep building, gaps are
payments/GL/CAM-rec/e-sign) Â· `transfer-package/16-competitive-landscape.md`
(Pickspace = lane rival; wedge = measured occupancy Â· guardrail numerics Â·
governed onboarding Â· voice ops) Â· `transfer-package/17-final-build-plan.md`
(Phases Aâ€“D; validated demand: 1â€“2 outside owners want in). **Gates (operator
"1A 2A 3A 4A"): Twilio ConversationRelay + Claude personas Â· free
design-partner pilots Â· Stripe ACH now (Aug 1 ledger pairing) Â· QBO sync, no
own GL.** A-0 secret rotation EXECUTED + smoked (see SYSTEM EXTRACTION note).
**NEXT: A-1 COI AI-parse (approved, seams ready) â†’ A-2 maintenance w/ photos â†’
A-3 voice (needs A-4 SOP capture session â€” schedule the operator interview).**
Prior: 2026-07-22 â€” C3-A FULLY ARMED: sampler died a 3rd time (silent,
~02:38, no reboot/crash record) â†’ **Task Scheduler watchdog** now self-heals it
(OTB-C3-Sampler-Watchdog, at logon + 5 min; tools/sampler-watchdog.ps1 -Register
to re-register). **Archive backfill discovered + built** (tools/cube-backfill.mjs):
DW Spectrum serves TRUE archive frames at native res via
`/ec2/cameraThumbnail?cameraId=<id>&time=<epochMs>&height=1520` (the /rest/v2
image endpoint IGNORES timestampMs â†’ live fallback; verified with a real 03:30
night frame). Today's 12-hr gap recovered (2,467 frames). **All 8 cams' stall
zones AUTHORED** (34 stalls, docs/c3-stall-zones.json; tools/c3-overlay.py =
authoring loop; busy-frame crops validated) + live Haiku classify verified
end-to-end (key pulled from Vercel env at runtime â€” never on disk/chat/repo;
`npx vercel env pull` â†’ load â†’ delete). NOTE: capture day-dirs are UTC-keyed
(late-evening local frames land in next day's dir). Occupancy JSONL accruing in
`<capture>/occupancy/`. **SAME DAY (evening): stall map + occupancy surface
SHIPPED + DEPLOYED.** `src/data/stall-map.json` (34 stalls â†’ row56 index /
lot8 / field-149 / aisle-101 / north-edge; est-geometric Â±1 until an operator
stall walk) + pure seam `src/lib/occupancy.js` (+6 tests â†’ **197**). Migration
`c3_occupancy`: occupancy_samples append-only, PK (frame,stall), read
owner/operator, writes ONLY via secret-gated post_occupancy_samples (gate
smoke-tested; advisors = accepted definer-WARN class only).
`tools/c3-upload.mjs` posts a day's JSONL idempotently (636 â†’ 0 re-run;
CRON_SECRET via `vercel env pull`, load, delete â€” never chat/repo). A-1 â†’
**ðŸš— Occupancy** chip (REMOTE-only, latest state over the row56 tick band) Â·
D-1 â†’ **"Parking Occupancy (C3)"** card. Prod bundle verified (105-s1 /
occupancy_samples / chip in assets). **Daily ops until a cron lands:**
`c3-stalls.py --classify --date <UTC-date> --every 12` (ANTHROPIC_API_KEY
same pull-load-delete drill) then `node tools/c3-upload.mjs --date <date>`.
**Operator smoke: D-1 â†’ "Parking Occupancy (C3)" card Â· A-1 â†’ ðŸš— chip â†’
green/outline stalls along the storefront row.**
**Classify+upload cron SHIPPED same evening:** Task `OTB-C3-Nightly`
(daily 23:45, tools/c3-nightly.ps1; -Register to re-register) â€” pulls
secrets from Vercel env at runtime, classifies current+previous UTC dirs,
uploads. Live-tested under the scheduler: 151 requests / 643 samples
(âš  lesson: PYTHONUTF8=1 â€” Task Scheduler python stdout is cp1252; the
verdict-arrow print killed the run after ONE frame, and the failure mode
looked like success). occupancy_samples = 1,326 rows spanning 07-21â†’07-22.
The whole C3 loop is now hands-free: sampler (watchdog-healed) â†’ nightly
classify+upload â†’ A-1/D-1 surfaces.
NEXT: lot8/field-149 overlay geometry â†’ stall-walk index verification â†’
weekly occupancy rollup (owner-brief candidate section).
Prior: 2026-07-21 â€” smoke round MOSTLY PASSED (operator); ðŸ›° Satellite lens
REWORKED + DEPLOYED same day (georef refit for Esri refresh Â· plan-orientation
bearing Â· unit-number labels Â· asset-pin layer). Prod = HEAD, **191 tests**.
Prior: 2026-07-20 â€” HORIZONTAL LAYERS + B1 + C1 + harvest #3 SHIPPED (see
"SHIPPED 2026-07-20" below).
Prior update: 2026-07-16 (evening). Today: Cube creds landed â†’ 17/17 camera aims
frame-verified + baked (Server Cabinet reclassified exterior, rear 101/103) Â· C3 sampler
running Â· harvest #2 SHIPPED (auto-trigger cron â†’ AI-1 threads; found live 115/117 renewal
window, operator in discussions â€” strict stance, $24K AC approved) Â· sidebar-clip bug fixed
(PENDING DEPLOY, see âš  above) Â· B2 microsite DEFERRED by operator until new drone/camera
footage. Multi-space tenants: units stay individual (operator decision; rent-roll combine
= future display option only).

## âš¡ NEXT SESSION â€” START HERE
**2026-07-22 (late): FINAL BUILD PLAN ADOPTED â€” `transfer-package/17-final-build-plan.md`**
(+ Â§16 competitive landscape: Pickspace = the lane rival; wedge = measured
occupancy / guardrail numerics / governed onboarding / voice ops). Operator
validated demand: 1â€“2 external properties want onto the software. New scope
folded in: SOP codification (A-4) Â· maintenance requests w/ photos (A-2) Â·
call-in voice agents w/ transcripts (A-3). **Execution order: ~~A-0 secret
rotation~~ â†’ ~~A-1 COI AI-parse~~ â†’ ~~A-2~~ (all DONE 07-22/23) â†’ A-3/A-4 â†’
Phase B multi-tenant schema â†’ pilots.** Gates DECIDED (operator "1A 2A 3A 4A"): D-1 Twilio
ConversationRelay + Claude personas Â· D-2 free design-partner pilots Â· D-3
Stripe ACH now (pairs with Aug 1 ledger go-live) Â· D-4 QBO sync, no own GL.
D-5 (name/domain/pricing/entity) parked until Phase B.
**Live app:** https://otb-command.vercel.app (magic-link; operator = adam@adamabdalla.com).
**PROD = HEAD as of 2026-07-23:** A-1 COI AI-parse + A-2 maintenance module
(M-1 sheet, tenant role, work orders, photos, aging cron) deployed and
bundle-verified on top of everything below. **212 unit tests.**
**C3 sampler:** RELAUNCHED 2026-07-20 (died with a reboot 07-19 ~17:14; first tick verified
20:11, 17/17 cams; â‰ˆ26.3k frames banked 07-16â†’07-19). Detached node PID in
`Drone Footage RAW/OTB-cube-capture/sampler.pid` (300s Ã— 17 cams â†’ that dir, OUTSIDE the
repo â€” never let frames back into the project; TaskStop orphans npm children, kill the node
PID directly). **Does NOT auto-start on reboot â€” relaunch per the quoted --out lesson below.**
Cube creds: `~/.otb-cube.env` (in).
Collector HARDENED 2026-07-17 (30s fetch timeouts Â· re-login on all-fail/401 tick â€” the old
re-auth path was dead code Â· no tick stacking Â· appends `sampler.log` in the capture dir).
âš  LAUNCH LESSON: `Start-Process -ArgumentList` splits unquoted space paths â€” the 07-16
overnight run wrote 2,890 frames to `Downloads\Drone\` (recovered + merged 2026-07-17; junk
dir deleted). Always pass the --out path with embedded quotes: `'"C:\...\OTB-cube-capture"'`.
**State:** 13 sheets, all deployed: D-1 Â· A-1 (ðŸ“ asset pins + ðŸ…¿ parking layer + ðŸŽ¥ CCTV
layer w/ drag-to-place âœŽ Adjust + ðŸš— Occupancy chip) Â· A-2 Spatial (4 lenses; Lens B ðŸ— Mesh
toggle; ðŸŽ¥ Reality clickable + unit overlay; ðŸ›° frozen sat base) Â· R-1 Â· P-1 Â· C-1 (â± event-
sourced history) Â· T-1 Â· W-1 (live work-order cards) Â· K-1 Â· **M-1 Maintenance (NEW â€”
tenant/operator/owner faces)** Â· S-1 Safe Â· AI-1 Agent Desk (voice, thread-persistent) Â·
V-1 Vendor Portal (COI tracking + ðŸ¤– AI cert parse + assigned work orders).
**212 unit tests.**
**FIRST MOVES next session:**
1. ~~Operator smoke round~~ **CONFIRMED 2026-07-22 (operator: "all smoke items appear"):**
   D-1 Parking Occupancy (C3) card Â· D-1 Network (UniFi) card Â· A-1 ðŸš— Occupancy chip Â·
   C-1 â± History Â· A-1 Size lens Â· V-1 COI dateâ†’badge Â· AI-1 reload-resume Â·
   AI-1 ðŸ“Š Briefs â†’ July â†’ Open ðŸ”’ Â· A-2 ðŸ›° frozen satellite base.
   (Interaction smokes still open in punch-list #7: PDF attach on K-1 Â· ðŸŽ¥ Reality orbit Â·
   lease-package assembly Â· V-1 vendor-folder upload Â· leasing-calc question.
   **NEW smokes pending from 07-23:** V-1 ðŸ¤– Parse cert with a real ACORD PDF Â·
   M-1 submitâ†’assignâ†’W-1 cardâ†’V-1 vendor work order Â· add one real tenant login.)
2. **BUILD QUEUE (plan Â§Phase A â€” all approved, work in order):**
   ~~**A-1 COI AI-parse**~~ ~~**A-2 maintenance w/ photos**~~ **BOTH SHIPPED +
   DEPLOYED 2026-07-23** (see Last-updated block above for smokes).
   Next **A-3** voice lines
   (Twilio ConversationRelay, decided) â€” but A-3's triage scripts come from
   **A-4 SOP capture**, so schedule that operator interview early â†’ **A-5**
   Stripe ACH (decided: pair with Aug 1 ledger go-live).
   ~~C3 classifier decision~~ RESOLVED (1A) + SHIPPED 07-21/22; next C3 =
   lot8/field-149 overlay geometry â†’ operator stall walk â†’ weekly rollup.
3. Twin-marketing status: ~~B1 Â· A2 Â· C1~~ **DONE** Â· B2 microsite DEFERRED (awaits new
   footage) Â· remaining: B3 fly-through Â· B4 public scoped leasing bot Â· C2 sandbox login Â·
   C3 LinkedIn series. **Vinyl PRINT is gated on the canonical-domain decision** (punch-list
   â€” QR currently encodes tel:; re-run `python tools/vinyl-b1.py --url https://â€¦/tour` once
   B2 + domain land). Full plan in the 2026-07-15 chat digest below.
3. **Blessed creative direction:** operator picked the NAVY/WHITE creative poster
   ("the blue advertisement") = `OTB-poster-X-boulevard` from `tools/poster-specials.py`
   (plat-as-art, "27 doors / 25 taken"). Use its aesthetic for the microsite + QR vinyls.
   (If he meant the dark-navy OO showcase instead, confirm â€” X is the strict-navy one.)
**Deploy rule:** commits do NOT auto-deploy â†’ `npx vercel deploy --prod --yes --scope adams-projects-0c52918e`
(CLI logged in as orangeonyx). `.vercelignore` governs uploads (NOT .gitignore â€” splat 16MB +
mesh 3MB ride in public/). Dev server = port **5199** (`.claude/launch.json`; 5173 belongs to
another project). Local preview without login: move `.env` aside, RESTORE IT AFTER.

### SHIPPED 2026-07-21 (part 5) â€” UNIFI NETWORK CARD (key delivered via ~/.otb-unifi.env)
- **Probe** `tools/unifi-probe.mjs` (reads the env file, never prints the key):
  UDM Pro "Belle" (WAN 76.72.15.3) + USW Pro Max 16 PoE + U7 Pro XG Wall + 5 suite
  AC Pros (101 Johnston side, 101 above door, 107, 119, 137, 149). Site: 10 devices,
  **1 offline WiFi unit that Site Manager drops from the device list** (unnamed via
  API â€” operator should identify it in the UniFi console).
- **D-1 "Network (UniFi)" KPI card**: pure seam `src/lib/unifi.js` (+3 tests â†’ 191)
  Â· server proxy `api/unifi.mjs` (key ONLY in Vercel env UNIFI_API_KEY â€” added via
  CLI, never in chat/repo; owner/operator session gate like concierge; 401 verified
  unauthenticated) Â· card shows up/total, health line, client count, and flags the
  unlisted-down unit. Best-effort: card absent in local mode or on API outage.
  **Operator smoke: D-1 â†’ "Network (UniFi)" card (expect 9/10 up, brick-red).**
- Deferred: offline-device auto-trigger (cron candidate `unifi:<date>` â†’ manager
  thread) Â· per-AP uptime history. Build after C3 zones finish.

### SHIPPED 2026-07-21 (part 4) â€” FROZEN SATELLITE BASE (operator decision: 1â†’2)
Operator picked: freeze the Esri base now, swap to the owned drone ortho after the
roof re-fly (the current RTK ortho is roof-plane-projected â€” parking field is gaps).
- NEW `tools/build-sat-base.py`: composites the z19 tiles the georef was FITTED
  against â†’ `public/OTB-sat-base.jpg` (700 KB, committed) + `src/data/sat-base.json`
  (MapLibre image-source corners). **Re-run ONLY together with fit-georef +
  extract-georef** (base and footprints must share one imagery vintage).
- scenegeo.js: live Esri tile source â†’ static image source. Kills BOTH drift
  classes forever (per-zoom vintage mismatch + silent Esri refreshes); loads
  instantly; ortho swap later = same corners contract, different image.
- Verified: offline registration proof (export/_satbase_check.jpg â€” footprints hug
  both buildings on the frozen image) Â· runtime: map constructs, bearing 232.25,
  27 unit markers, asset serves 200, console clean (style paint = occluded-tab rAF
  limitation, standing lesson) Â· prod serves OTB-sat-base.jpg + chunk carries it.
  **Operator smoke: A-2 â†’ ðŸ›° (should look identical, load faster, never drift).**
- Mesh-toggle smoke CONFIRMED by operator (07-21). Kept: it's the photoreal skin
  for the 3D twin (marketing/leasing show-piece); zero maintenance.
- UniFi: `~/.otb-unifi.env` CREATED with empty UNIFI_API_KEY= â€” operator pastes key
  into the file (never chat), then build the Site Manager probe (rank: after C3).

### STARTED 2026-07-21 (part 3) â€” C3-A OCCUPANCY (operator picked classifier 1; scope A assumed)
- **Sampler died AGAIN ~14:36 (second unexplained death; first was the 07-19 reboot).**
  Relaunched 21:2x, new PID in sampler.pid, first tick verified. If it keeps dying,
  consider a Task Scheduler auto-restart (operator decision).
- **NEW `tools/c3-stalls.py`** + `docs/c3-stall-zones.json`: per-camera stall quads
  (native px) â†’ perspective crops â†’ one Haiku request per FRAME (all stalls labeled,
  strict JSON schema) â†’ `<capture>/occupancy/<date>.jsonl` (outside repo), idempotent.
  Commands: `--grid <cam>` (authoring frame) Â· `--montage` (crop check) Â· `--classify
  --date â€¦ --every 12` (hourly sampling of the 300s frames).
- **suite-105-parking: 3 zones authored + VALIDATED** against a known daytime frame
  (s1 empty / s2 occupied / s3 empty â€” crops match ground truth; see
  export/c3-daytime-check.jpg). âš  Authoring lesson: read coordinates at NATIVE res â€”
  first pass used downscaled-display px and every quad was half-scale.
- **NEXT:** author zones for the remaining storefront cams (suite-101/113-n/113-s/
  119/131 + politics + jasons-deli-149-parking; ~4-6 stalls each) Â· then the live
  Haiku run â€” needs ANTHROPIC_API_KEY exported locally (key lives only in Vercel env;
  never in chat/repo) Â· then physical stall mapping (cam-local ids â†’ row 1-56) Â·
  then an occupancy surface (A-1/D-1). Batches API halves cost for historical sweeps.

### SHIPPED 2026-07-21 (part 2) â€” LEDGER-LITE (harvest #4, belle-realty-pwa donor)
Operator delegated the wiring decisions â†’ built as recommended (1A drawer+P-1 Â·
2A cron auto-post Â· 3A suggest-only late fees Â· uniform policy).
- **Pure seam `src/lib/ledger.js`** (+14 tests): donor late-fee engine (5-day grace,
  $100 flat + $25/day â€” "OTB standard schedule", donor constants), append-only entry
  algebra (void = its own entry, `void_of` â†’ target), FIFO aging (â‰¤30/31-60/61-90/90+),
  idempotent month charges (`rent:YYYY-MM:unit`), late-fee SUGGESTIONS (silenced by
  the posted fee's deterministic id `late:YYYY-MM:unit`).
- **Migration `ledger_lite`**: `ledger_entries` append-only (read owner/operator Â·
  insert operator Â· NO update/delete) + secret-gated `post_rent_charges` RPC (same
  app_secrets 'auto_trigger' row). Gate smoke-tested: wrong secret = exception,
  real secret + empty payload = 0. Advisors: only the accepted definer-WARN class.
- **Cron** (api/auto-trigger.mjs): posts the month's TOTAL-rent charges daily-
  idempotently, **gated to LEDGER_START_YM = 2026-08** (going live mid-July would
  fabricate receivables for rent already paid off-system â€” deliberate). Summary
  field `rent`: "pre-start" until Aug 1, then {month, inserted:25}.
- **Drawer "Ledger" panel** (lib/ledgerUI.js): balance headline, last 10 entries
  w/ running balance, void âœ•, add payment/charge/credit/adjustment/NSF/write-off,
  late-fee suggestion chip â†’ operator confirms â†’ posts. Owners read-only (CSS),
  vendors never reach it. REMOTE-only (local mode = note).
- **P-1 "Collections & aging" card**: month collected-vs-charged + per-unit aging
  table (async fill, C-1 history pattern).
- **188 tests.** DEPLOYED; prod bundle verified (dwLedger/finLedger/ledger_entries/
  led-sugg). Local-mode DOM verified in preview (drawer renders, console clean).
- **Workflow (operator):** starting August, log each rent check in the unit's
  drawer â†’ Ledger â†’ "Payment received". Aug 1 cron seeds the charges.
- **Uniform-policy assumption stands** unless a lease says otherwise â€” flag any
  tenant whose lease carries different late terms and the policy goes per-unit.
**Merger queue COMPLETE 2026-07-25:** ~~#5 capex/insurance/OCR engines~~ â†’
~~#6 e-sign/tenant-portal schemas~~ â€” all harvested; donors are archives.

### SHIPPED 2026-07-21 â€” ðŸ›° Satellite lens rework (operator smoke feedback on #8)
Operator ran the 07-20 smoke round: **mostly passed**; #8 (satellite) flagged â€”
footprints offset, no unit numbers, orientation â‰  A-1, no asset pins. All four fixed:
1. **Georef REFIT** (Esri had refreshed imagery again): `python tools/fit-georef.py` â†’
   anchorLL [30.201689, -92.053983], azY 52.25 (was 51.75; on-roof .94/.84, shared
   shift Eâˆ’2.0m Sâˆ’0.5m). Pasted into extract-georef.py + regenerated. NOTE: the
   fitter's control-point line ("nearest bay 75m") is EXPECTED â€” the Skydio thermal
   spot was retracted to the neighbor's roof; ignore that sanity note.
2. **Plan orientation**: Lens C now opens at bearing azY+180 (232.25Â°) = A-1's exact
   arrangement (M.Antoinette top, 101 left, short building right, 149 at Arnould
   corner); compass control resets north-up. Verified via offline rotated-tile
   composite `export/sat-plan-orientation-preview.png` (occluded preview can't
   paint MapLibre â€” standing lesson).
3. **Unit-number labels**: DOM markers at footprint centroids (screen-upright at any
   bearing; NO glyph server â†’ no CSP change). Thin bays (117.5â€“121) sit tight at
   low zoom â€” acceptable, zoom resolves.
4. **Asset-pin layer on satellite**: NEW pure seam `src/lib/geoproject.js` â€” fitted
   plan-pxâ†’CAD-ft affine (PLAN2CAD, rms â‰¤5px, icon-grade) + cadToLL mirror of
   extract-georef + planBearing + numerically-stable ringCentroid (shoelace relative
   to first vertex â€” raw lng/lat cancels catastrophically on thin rings). A-1 ðŸ“ pins
   project through the live georef; store "features" events â†’ `refreshPins()` (wired
   in spatial.js). Pins render once the operator does the A-1 pin walk (punch-list #5
   â€” now feeds BOTH lenses).
+5 tests â†’ **174**. DEPLOYED; prod scenegeo chunk verified (new anchor, geo-unitnum/
geo-pin, refreshPins). **Operator re-smoke: A-2 â†’ ðŸ›° â€” plan-oriented, labeled,
registered; drop one pin on A-1 and see it appear on ðŸ›°.**

### SHIPPED 2026-07-20 â€” horizontal enabling layers + B1 vinyls + C1 case study + harvest #3
**Goal session (operator: "/goal completion of the todos" + horizontal-layer audit).**
Five cross-cutting layers identified (audit in chat); three SHIPPED, two queued:
1. **esc consolidation + brand kit** â€” ONE canonical escaper (`src/lib/format.js esc`,
   null-safe); lease/brief/concierge/main.js/export-package all import it (export-package's
   old copy didn't escape `"` â€” fixed). NEW `tools/otb_brand.py`: palettes (OTB navy/white Â·
   OO Â· plan-room), fonts, contact blocks, logo paths, esc â€” poster/pylon/plat/poster-specials
   now import it (all 10 artifacts regenerate byte-clean).
2. **Persisted-layer registry** â€” NEW `src/lib/layers.js`: store.js state shape/resets/
   persist/export AND remote.js sync allowlist all derive from ONE table (killed the
   hand-synced twin lists â€” the silent never-syncs-to-Supabase bug class). Adding a layer =
   one entry + an applySnapshot branch. +6 tests.
3. **Server Supabase wrapper** â€” NEW `api/_supa.mjs`: URL/key/headers spelled ONCE; user-JWT
   family (supaJson/supaPost/rpcUser) vs secret-gated RPC family (rpcSecret) made explicit;
   storage uploadâ†’sign helpers. _auth/concierge/voice/seed/auto-trigger rewired.
4. **B1 QR window vinyls SHIPPED** â€” `python tools/vinyl-b1.py` â†’ marketing/OTB-vinyl-131/133
   (SVG + PNG + 24Ã—36" print PDF; copied to G:\My Drive\00 OTB). Blessed X aesthetic, strict
   navy/white, plat-as-art with the suite lit + "THIS ONE IS YOURS" leader, segno QR.
   **QR defaults to tel:+13377691554 ("SCAN TO CALL ADAM") so it works the day it prints**;
   re-run with `--url https://â€¦/tour` when B2 + the domain decision land (caption auto-switches).
5. **C1 OO case study SHIPPED** â€” `python tools/case-study-c1.py` â†’ marketing/
   OO-case-study-OTB.html/.pdf/.png (on G: too). "The Instrumented Asset", OO brand (light
   logo on light bg), one-page letter; audited figures only, 2025 stats labeled, no financials.
6. **Harvest #3 (otb-ops donor = OneDrive/Desktop/OTBPROPOPS/OTB_Ops_Tool_v5.html):**
   heat-map lenses were ALREADY mostly shipped (A-1 status/expiry/rent/use/hvac) â€” delta was
   the donor's **Size lens** (new A-1 "Size" chip, palette ramp, vacants color too; verified
   in preview: 22 distinct fills, legend 1,272â†’6,877 SF). **Event-sourced compliance** built
   natively: migration `compliance_event_log` (append-only `compliance_events`, insert=operator,
   read=owner/operator, NO update/delete policies) + `lib/compevents.js` seam + C-1 **â± History**
   panel (REMOTE only) â€” every matrix flip logs who/when/what, best-effort (never blocks the click).
   +10 tests â†’ **156**. DEPLOYED; prod bundle verified (compliance_events/mx-hist in JS, sf chip in HTML).
**Smoke (operator):** C-1 â†’ flip any cell â†’ â± History shows the row Â· A-1 â†’ Size chip.

### SHIPPED 2026-07-20 (part 2) â€” Phase 3: last two layers + the features they unlock
7. **Bucket-store factory** â€” NEW `src/lib/bucketstore.js`: shared id/sanitize/path helpers,
   IndexedDB micro-backend, audit-log factory, and `createBucketStore({bucket, ttl, audit,
   local})` (standard folder/id__name shape). docs.js / safe.js / vendors.js are now thin
   configs (~120 dup lines gone, public APIs byte-identical â€” their test files pass
   unchanged); assets.js adopts the primitives but keeps its kind-embedded path convention.
   Audit default = configured-only (operator pick (b): no behavior change on adoption).
8. **Card registry** â€” NEW `src/lib/cards.js`: `registerCard(type, validate)` +
   `extractCards/stripCards`; package (https-only) + brief (strict YYYY-MM) are built-ins;
   lease/brief keep compat wrappers; AI-1 view now parses ALL card types in one pass
   (manual extractBriefs(extractPackages(â€¦)) chaining gone). [[coi:]]/[[thread:]] = one line.
9. **COI tracking SHIPPED** (P3 deferred item) â€” migration `vendor_coi_tracking`
   (vendors.coi_expires/coi_note; existing RLS covers it). Pure seam `src/lib/coi.js`
   (expired/â‰¤30d critical/â‰¤60d expiring/ok). V-1 operator face: COI badge on every service
   vendor row (missing = slate "COI â€”") + date/note editor in the vendor panel; vendor face
   shows their own cert status + renewal nudge. Workflow: file the cert in the folder, set
   the date. **Smoke: V-1 â†’ any service vendor â†’ set a COI date â†’ badge updates.**
10. **AI-1 thread persistence** â€” per-agent thread id + transcript persist to localStorage
   (`otb-ai-state-v1`); a reload resumes the SAME conversation (server threads already
   persisted; the client now keeps pointing at them). + New / History / agent switch all
   persist. **Smoke: ask AI-1 something, reload, conversation still on screen.**
   +13 tests â†’ **169.** DEPLOYED; prod bundle verified (coi_expires/vpCoiSave/otb-ai-state-v1).

### âš  C3 SAMPLER â€” died 2026-07-19 ~17:14 (machine reboot?), RELAUNCHED 2026-07-20
Captured before death: 07-16: 8,769 Â· 07-17: 8,297 Â· 07-18: 4,694 Â· 07-19: 4,539 frames
(â‰ˆ26.3k total â€” plenty for C3 design). Relaunched detached (node, 300s loop, quoted --out
per the 07-16 lesson), new PID in `sampler.pid`. If the machine reboots, relaunch the same
way â€” the sampler does NOT auto-start.

**QUEUED next (Phase 4):** **C3 occupancy processing** over the captured frames â€” needs the
C2 per-camera de-warp/stall-zone step first (docs/camera-4d-brief.md); design decisions
pending: which cams cover which stall groups + VLM vs classical classifier (cost). Then
B3 fly-through Â· B4 scoped bot Â· C2 sandbox Â· C3 LinkedIn (footage-gated: B2).

### OPERATOR punch-list (nothing here is Claude-doable)
1. **Call the roofer** â€” `docs/roof-condition-brief.md`: membrane failure, long-building RTU row
   (~101â€“109), open to weather since â‰¤Oct-2025. K-1 register row + W-1 card live. (The "thermal
   anomaly near 149" was RETRACTED â€” neighbor's roof.) Mark findings on the roof ortho.
2. ~~Rotate both API keys~~ **CLOSED 2026-07-14**: both keys rotated via Vercel dashboard,
   old keys disabled at both providers, redeployed, authed AI-1 question + ðŸ”Š reply
   confirmed both keys end-to-end (operator, 2026-07-14).
3. **Enable CAPTCHA** â€” Supabase Dashboard â†’ Auth â†’ Bot & Abuse Protection (no API for it).
4. **10-min roof RE-FLY** (when the Skydio is next up) â€” recipe in
   `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`; unlocks gap-free ortho + real roof
   splat through the already-scripted pipeline.
5. **Asset-pin walk** â€” A-1 â†’ ï¼‹ Pin: drop a pin per water shutoff/meter/bench/can/column.
6. **Drag-drop blessed photos** â€” `Belle Shared Drive/Marketing/_BLESSED-2020-shoot/app-ready-2000px/`
   â†’ K-1 Site imagery + unit drawers (2 min).
7. **Smoke tests still unconfirmed:** attach a PDF to a K-1 row Â· ðŸ›° Satellite click Â· ðŸŽ¥ Reality
   orbit Â· ðŸ— Mesh toggle Â· one lease-package assembly Â· one V-1 vendor-folder upload.
   (AI-1 authed question + ðŸ”Š reply CONFIRMED 2026-07-14 during key rotation.)
   ~~C-1 â± History Â· A-1 Size lens Â· V-1 COI dateâ†’badge Â· AI-1 reload-resume~~
   CONFIRMED 2026-07-22 (with the C3/UniFi/ðŸ›° round). Still open: leasing-calc
   question ("retain at $17 vs replace at $20â€¦").
   NOTE 2026-07-13: ðŸŽ¥ Reality was BROKEN in prod since the 07-10 CSP (script-src lacked
   'wasm-unsafe-eval' â†’ GaussianSplats3D's WASM sorter blocked â†’ infinite "Processing
   splatsâ€¦"). Fixed in vercel.json + deployed 07-13; A/B-verified locally against the
   prod-exact header. Lesson: after CSP changes, smoke every WASM/worker surface
   (splat lens), not just the login page.
8. Decide canonical domain (ontheblvd.com per Apr-2026 brand doc vs shopontheblvd.com in the
   2025 package) before the next print run.

### SYSTEM EXTRACTION 2026-07-22 â€” `transfer-package/` (committed 2203d23/f7ec178)
Full portable spec: 16 narrative sections + 10 machine-readable JSONs (features/
data model/rules/workflows/screens/architecture/agents/reusable assets/open
questions, stable OTBC-* ids) + **Supabase migration DDL exported verbatim to
`supabase/migrations/`** (17 files â€” closes OTBC-Q-001).
~~âš  rotate the `auto_trigger` shared secret~~ **CLOSED 2026-07-22 (A-0):**
rotated end-to-end with the value never touching chat/repo â€” migration
`20260723014510_rotate_shared_secret` (secret-gated definer RPC, old secret
authorizes, 64-hex shape guard) + `tools/rotate-secret.mjs` (pull Vercel env â†’
generate â†’ RPC â†’ new value to temp file â†’ `vercel env add` from stdin â†’ delete
temps). Deployed; smoked: junk secret 401 Â· rotated secret 200 (full detector
run: scanned 3 / skippedExisting 3 / brief exists). Advisors: same accepted
definer-WARN class only. âš  Drill lesson: Vercel rejects env values with
trailing whitespace AT DEPLOY TIME â€” write the secret file with NO newline.
The drill is now re-runnable any time (script is committed, secrets are not).
**DECISION (operator, 2026-07-22): rebuild target = MULTI-PROPERTY PRODUCT**
(OTBC-Q-002 closed; OTB = tenant #1/reference dataset). Concrete deltas +
sequencing: transfer-package/14-canonical-architecture.md "Decision addendum".
**Top carry-forward problems distilled by the extraction** (full list:
transfer-package/00-README.md): client-side-only owner sheet privacy (RLS reads
all layers) Â· hardcoded facts in views (D-1 parking "324/344", T-1 JD Bank
date, W-1 covenant prose) Â· no URL routing Â· schema-free property_state layers
Â· split-seed/concierge-context/georef regen footgun Â· fail-open rate limit +
CAPTCHA still off Â· C3 pipeline has no heartbeat/alerting Â· manual deploys.
These are candidate work items, not regressions â€” pick by number when ready.

### CLAUDE next-action menu (say the word)
- **APPROVED QUEUE:** ~~B1 Â· A2 Â· C1~~ DONE (07-17/07-20) Â· B2 deferred (footage) Â·
  remaining: **bucket-store factory + card registry â†’ COI tracking + thread persistence Â·
  C3 occupancy processing** Â· then B3 fly-through Â· B4 scoped bot Â· C2 sandbox Â· C3 LinkedIn.
- **Splice the approved 2026 end card** into the marketing video (ffmpeg; card + spec in
  `Belle Shared Drive/Marketing/`; treatment A rendered and delivered 2026-07-12) â€” note
  B3 (twin fly-through) supersedes/absorbs this if built together.
- Tenant-spotlights photo folder (from the 334-frame review) Â· satellite-lens asset pins Â·
  photo-per-pin Â· COI tracking / vendor notifications Â· concierge thread-persistence polish Â·
  avatar (needs provider decision) Â· custom domain + SMTP wiring (needs operator DNS) Â·
  Magnolia 121 lease swap (needs executed copy) Â· B4 realtime.

### SHIPPED 2026-07-17 â€” A2 Owner Intelligence Brief (monthly, deterministic)
**A2 from the approved twin-marketing queue** (B2 deferred â†’ A2 was next unblocked).
Monthly OO-branded owner report â€” NO LLM in the loop, every figure deterministic:
occupancy + scheduled-rent KPI tiles with precomputed MoM direction words (vs the
prior month's STORED model â€” real deltas start August), vacancies, holdovers,
12-month expiration table (115/117 Clothing Loft leads it â€” matches the live renewal
talks), owner-worksheet NOI + cap value ONLY when the P-1 opex worksheet exists
(July: omitted, none on file), open action cards. Pure seam `src/lib/brief.js`
(+9 tests â†’ 139). Storage: new `owner_briefs` table (migration
`owner_intelligence_briefs`) â€” RLS read owner/operator, writes ONLY via secret-gated
SECURITY DEFINER RPCs (get/put_owner_brief, get_brief_state) on the same app_secrets
row as the cron; NO service-role key. Cron (api/auto-trigger.mjs) generates once per
month, idempotent (`summary.brief`: generated/exists/failed), and appends a
[[brief:YYYY-MM|label]] card line to the monthly seeded thread (strict YYYY-MM gate
client-side). AI-1 gains **ðŸ“Š Briefs** archive panel; cards blob-open via RLS fetch.
DEPLOYED + LIVE-VERIFIED: manual cron run â†’ "brief":"generated"; July row in
owner_briefs ($90,291/mo â‰ˆ $1.08M/yr EGI âœ“, 94.9% = 25/27 âœ“); prod bundle carries
aiBriefs/owner_briefs; document visually verified via headless-Chrome render
(OO navy/orange, on-brand). Occupancy footnoted as demised-SF (62,810) vs audited
headline GLA 62,883. **Operator smoke: AI-1 â†’ ðŸ“Š Briefs â†’ July 2026 â†’ Open ðŸ”’.**
NOTE: July's card is NOT in the July thread (thread pre-existed the feature) â€” the
panel is the July path; August's thread will carry the card inline.

### SHIPPED 2026-07-16 (part 3) â€” visual sheet export (â¤“ SHEET)
Topbar **â¤“ SHEET** button (+ plain Ctrl+P): prints/saves the OPEN sheet as a PDF â€”
print CSS isolates `.page.on`, hides chrome, forces plan-room colors exact
(`print-color-adjust`), letter-landscape @page, scroll containers unrolled so long
tables flow across pages, and a drawing-set footer stamps sheet code + PRINTED date +
headline figures (doc title becomes the PDF filename, e.g. `OTB-R-1-2026-07-16`).
Dark mode auto-reverts to paper for print and restores after. Pure seam
`src/lib/printsheet.js` (+3 tests â†’ 123). Verified in preview: button renders,
beforeprint/afterprint lifecycle stamps per-sheet (D-1/A-1) and restores; pixel/print
dialog check = operator (occluded preview can't screenshot). NOTE: WebGL lenses
(A-2 3D/satellite/Reality) don't rasterize into print â€” A-2's own â¤“ SVG chip remains
the export path there.

### SHIPPED 2026-07-16 (part 2) â€” calc engines + numeric guardrail in AI-1 (PWA harvest #1)
AI-1 agents now carry a **run_calc** tool (all three personas): deterministic engines
ported from belle-realty-pwa @ 19f7c06 into the pure seam `src/lib/calc/` â€” **NER
deal comparison** (retain-vs-replace / blend-and-extend / free-rent-vs-TI, pairwise
deltas + asset value at cap), **CAM gross-up** (variable-only to 95%, never grosses
down, Exhibit-C methodology line), **Louisiana eviction sequencer** (CCP 4701â†’4733,
waiver/acceptance-of-rent/bankruptcy/self-help traps, 200% holdover math), **monthly
KPI** (NOI/occupancy/collections with precomputed MoM direction words). **Numeric
guardrail** (`src/lib/calc/guardrail.js`, donor synth-validator M1/M2): once a calc
runs, later rounds are BUFFERED server-side and every $/%/decimal must trace to calc
output (â‰¤0.5% tolerance; years/CCP articles/â‰¤12 ints ignored) â€” FAILS CLOSED, replying
with the engines' own deterministic summaries instead. Chat without calcs streams
live as before. Manager persona stale-holdover line fixed. +26 tests (120).
Smoke test (operator): ask ðŸ¤ Leasing "compare retaining a tenant at $17 vs replacing
at $20 with 3 months free and $10 TI, 5-yr term, 1,917 SF, 7.5% cap".
NEXT HARVESTS QUEUED: owner-brief auto-trigger (Vercel cron) â†’ event-sourced
compliance + heat-map lenses (otb-ops) â†’ ledger-lite â†’ capex/insurance/OCR engines
(when their data surfaces exist) â†’ e-sign/tenant-portal schemas.

### SHIPPED 2026-07-16 â€” SOT reconciliation (owner-corrected rent roll)
**All five holdovers RESOLVED** (105â†’3/31/29 Â· 109â†’9/30/28 Â· 117.5â†’2/28/29 Â· 119â†’2/28/27 Â·
143â†’1/31/31), Upstream 145 signed $14.95 base / $19.95 total / $3,187.01 mo, Magnolia 121
â†’12/31/31, ~15 expiration dates corrected to owner month-end dates (107 pulled back to
3/31/27), Pink Paisley allocations set to stated rent (owner-accepted âˆ’$4.84/mo vs formula).
Source dataset vendored: `docs/sot-2026-07/` (authority ranking + validation rules +
known-exceptions log, from belle-realty-pwa @ 19f7c06); full diff in
`docs/sot-reconciliation-2026-07.md`. CLAUDE.md anomalies for 101/117.5/135B/145 CLOSED
(deposits 107/137/143/149 still open). split-seed + concierge-context regenerated;
data-integrity guards updated to pin the documented stated-rent exceptions. 94 tests.
NOTE: D-1/P-1 "revenue at risk" and W-1 holdover cards now empty of holdovers â€” correct,
not a bug. Poster/dossier occupancy stats unchanged (131/133 still the only vacancies).

### SHIPPED 2026-07-15 (part 3) â€” marketing set + twin-marketing plan
Four pieces generated, reviewed, delivered to `G:\My Drive\00 OTB` (SVG+PNG+PDF), all from
committed re-runnable tools: **B refresh** (`npm run poster`, current availability) Â·
**F two-bays** (plan-room, 131/133 halo + leader, "TOUR THIS WEEK") Â· **OO twin showcase**
("THE INSTRUMENTED ASSET", geometry.json plan + 16 camera cones in Sunset Orange, 6
capability cards, OO brand per brand-orange-ocean.md) Â· **X creative NAVY/WHITE**
("27 doors / 25 taken", plat-as-art, vacant bays pulse in SVG) â† **OPERATOR-LIKED** Â·
**pylon refresh** (current logos). Generator: `tools/poster-specials.py` (imports poster.py
plumbing; regenerating Aâ€“E is a side effect). Copy-honesty fixes applied during review:
removed unverified "24 years" claim; fixed false "two doors from Jason's Deli" adjacency;
VPD phrased as "passing the center". Twin-marketing plan (3 audiences, ranked) delivered
in-chat + queued as tasks; operator approved the B2â†’B1â†’A2â†’C1 order.

### SHIPPED 2026-07-15 (part 2) â€” parking fix + CCTV Phase C1 + drag-to-place
**Drag-to-place cameras:** âœŽ Adjust cams chip (operator-only) â€”
drag pin = move, drag brass dot = re-aim, double-click = reset; corrections persist
via the new store 'cameras' layer (localStorage + Supabase property_state + Export/
Import; remote.js LAYERS updated) and merge over the seed via applyOverrides().
Once the operator finishes the walk, bake overrides into cameras.json and clear.
94 tests. DEPLOYED. **Cube access LIVE (Tailscale):** dw-cube = 100.73.185.15,
DW Spectrum REST v2 verified from this box (device GUIDs = registry dwViewIds).
Collector ready: `npm run cube-frames` (--loop 60 = C3 sampling). Blocked only on
the operator creating a LOCAL Viewer user in DW Spectrum â†’ `~/.otb-cube.env`
(CUBE_USER=/CUBE_PASS=). Do NOT commit creds; script self-documents.
**Storefront parking corrected to plat (REV 12):** the 56-space row against the long
building was drawn ANGLED since the original trace â€” plat + operator's daytime camera
views prove head-on; all 57 ticks now perpendicular. Main-field herringbone verified
plat-exact and untouched. **Parking carved out** into its own toggleable A-1 layer
(ðŸ…¿ chip, default on) + pure seam `src/lib/parking.js` â€” ready to re-project into
satellite/Lens B later. **Phase C1 cameras SHIPPED:** `src/data/cameras.json` = the
17-camera DW Spectrum roster (Blackjack Cube NVR, LAN 10.10.10.101â€“117, cloud system
"Belle Reality" 97bad7e3â€¦; 4 off-property 192.168.1.x cams excluded). A-1 ðŸŽ¥ Cameras
chip (default off) draws mounts + brass view cones; click a camera â†’ DW cloud live
view. **ALL positions/aims ESTIMATED** (from names + the 2021 install-map plat in
`Camera Options for Belle.pdf` + daytime grid) â€” refine on an operator walk.
Full 4D roadmap: `docs/camera-4d-brief.md` (C2 de-warp/homography â†’ C3 parking
occupancy â†’ C4 VLM night-watch â†’ C5 timeline lens). +11 tests (91). DEPLOYED,
prod bundle verified. Watch item: Bilawal Sidhu's "God's Eye View" OSS drop (July).

### SHIPPED 2026-07-13/15 digest
**ðŸŽ¥ Reality unit overlay (2026-07-15, operator ask)** â€” status-colored border on every unit
hit box + camera-facing unit-number chip above each parapet; in-pane "â–¦ Units on/off" toggle
(default on); selection still = brass wireframe (colored border yields to avoid z-fight).
Pure seam `labelSpecs`/`inkOn` in splat-align.js (+2 tests â†’ 80). DEPLOYED; prod chunk
verified to carry it. Pixel check = operator (preview pane was occluded â†’ 0 rAF, same
throttling class as the 07-03 MapLibre lesson â€” splat lens can't be screenshot-verified
in a hidden preview either).
**ðŸŽ¥ Reality lens prod hang FIXED + DEPLOYED** â€” the 07-10 CSP blocked GaussianSplats3D's
WASM sorter (`script-src` lacked `'wasm-unsafe-eval'`); splat stalled forever at "Processing
splatsâ€¦" on the live site (dev sends no CSP header, so it only broke in prod). One-token
vercel.json fix, A/B-verified against the prod-exact header (commit c15e9bc). Lesson encoded
below: after CSP changes, smoke WASM/worker surfaces, not just the login page. Â·
**Anthropic key rotated** into Vercel Production + redeployed (see punch-list #2 for the two
loose ends). Â· **Dev-server launch fixed**: `~/.claude/launch.json` (used when the session
cwd is the home dir) was stale on port 5173 â€” now mirrors the repo config (5199,
`--strictPort`, `autoPort:false`); an orphaned Vite on 5199 was killed. Keep both
launch.json copies in sync.

### SHIPPED 2026-07-11/12 digest (details in sections below)
A-2 polish (true-heights â‡…, north/scale, â¤“ SVG export) Â· tenant logo thumbs (drawer + R-1) Â·
**P6d photogrammetry mesh in Lens B** (`npm run mesh-glb`) Â· **site-asset pin layer** (A-1
ðŸ“/ï¼‹ Pin, persisted `features` layer) Â· **roof orthomosaic** `OTB-roof-ortho-2025-10-15.png`
(3 cm/px, RTK direct-georef, in Drone Footage RAW + G: Drive) Â· **roof splat CLOSED as
capture-limited** (all SfM + pose-injected + MVS fail on the blank membrane + mixed zoom;
Postshot `roofsplat.ply` = fog, deletable; re-fly recipe written) Â· marketing library curated
(`_BLESSED-2020-shoot/`, 31 frames) Â· video end-card spec + draft card Â· **Jul-2025 marketing
package harvested** (`docs/marketing-package-2025.md`, K-1 row pd:mktpkg2025; conflicts flagged:
pkg GLA 62,749 vs audited 62,883, 5 ac vs 4.84) Â· 2025 story woven into dossier/buyer set/
poster B + concierge context Â· fresh exports + poster SVG/PNG/PDF + LLM zip on G: Drive.

### Knowledge graph â€” BUILT 2026-07-13 (`/graphify --obsidian --wiki`)
Lives in `docs/graph/graphify-out/` (gitignored; all regenerable): `graph.json` (572 nodes /
1,206 edges / 35 communities, GraphRAG-ready) Â· `graph.html` (interactive) Â· `obsidian/`
(607-note vault + graph.canvas â€” open `graphify-out/` as a vault to get wiki too) Â· `wiki/`
(45 agent-crawlable articles) Â· `GRAPH_REPORT.md` (audit; every edge tagged
EXTRACTED/INFERRED/AMBIGUOUS). Avg query â‰ˆ3.7k tokens vs ~104k naive (28Ã—) â€” future sessions:
answer "how does X relate to Y" from the graph before re-reading the repo
(`/graphify query "..."` run from `docs/graph/`). **Update, don't rebuild:**
`/graphify <repo> --update` after doc-heavy sessions (code-only changes = free AST pass).
The corpus filter (noise exclusions per the old prep note) is encoded in
`docs/graph/_detect.py`; the other `_*.py` there are the re-run pipeline. Traced finding
saved into the graph: app render layer escapes through ONE chokepoint (`lib/format.js esc()`,
14 importers) + six independent local esc() copies in tools/server contexts (7 places to
patch an escaping bug). Stale root `graphify-out/` deleted 2026-07-13.
**Auto-refresh hook INSTALLED 2026-07-13** (`.git/hooks/post-commit` â€” hooks aren't
versioned; the file documents its own reinstall): every commit touching `.js/.mjs/.py/.sql/
.html` re-runs the filtered AST pass in the background and rewrites graph.json/html/report,
preserving the semantic (doc/image) layer and community labels (`docs/graph/_refresh.py` +
`labels.json`). Do NOT use stock `graphify hook install` â€” it writes an unfiltered graph
to the repo root. Log: `docs/graph/graphify-out/refresh.log`.
**Splat pipeline (owned, $0):** COLMAP (`C:/Users/adam/tools3dgs`) â†’ Brush â†’ `node tools/convert-splat.mjs`.
Postshot license (operator buying) = marketing fly-through renders only; do NOT mix Skydio (Oct-2025)
frames into the DJI hero splat (season mismatch â†’ ghosting); Skydio-only roof splat = optional side project.
**ownerSheets whitelist FIXED 2026-07-08:** ticking A-2/S-1 in "Owners can seeâ€¦" was a silent no-op
(store whitelist predated those sheets â€” owners could never see the Owner Safe). Nav table now lives in
`src/lib/pages.js` (single source; store derives its whitelist; unit-tested). PROD STATE RESOLVED
2026-07-08: the persisted `property_state.ownerSheets` row was updated (SQL) to include spatial+safe,
then the operator's live selection turned ALL 12 sheets on (incl. AI-1 + V-1) â€” no action left.
**V-1 owner face + buyer trim â€” DONE 2026-07-08:** owners on V-1 get a READ-ONLY roster
(`portalFace` seam in lib/vendors.js â€” RLS grants owners roster read only; upload/folders/log stay
operator, so the operator console no longer errors at them). `npm run export-buyer` now strips
"Known anomalies" + "Marketing angles" from the external buyer set (deferred item closed);
full `export-package` dossier keeps both â€” verified on both generators.
**Smoke tests operator hasn't confirmed yet:** attach a PDF to a K-1 row (signed-URL path) Â·
click ðŸ›° Satellite once Â· orbit ðŸŽ¥ Reality once Â· **ask AI-1 one question** (auth path verified
to 401 unauthenticated; the Anthropic leg verified live pre-deploy â€” only the full authed
round-trip awaits the operator).
**Sign-in access panel â€” SHIPPED 2026-07-08:** sidebar â†’ "Sign-in accessâ€¦" (operator-only; inside
the owner-view panel, so owner/vendor roles never see it). Type an email + "+ Owner" to
PRE-AUTHORIZE it (`authorized_emails` table, consulted by the sign-up trigger: vendor-roster match >
allowlist > pending) â€” the person's first magic link lands them straight in as owner. Anyone already
parked in 'pending' shows in the same panel with a one-click "make owner". Revoke = âœ• (removes the
pre-authorization; does not demote an existing profile â€” do that in Supabase if ever needed).
Migration `owner_email_allowlist`; trigger logic verified with SQL (vendor/allowlist/stranger paths).
**SECURITY:** Anthropic key ROTATED 2026-07-13 (Vercel Production env updated + redeployed);
disable the old key at console.anthropic.com if not already done. ElevenLabs rotation still
pending. Key lives ONLY in Vercel env; never in the repo or client bundle.

## SECURITY AUDIT 2026-07-08 (multi-agent: server/RLS + client + correctness)
**Overall posture GOOD** â€” the real boundary (Supabase RLS + `api/_auth.mjs` gate) fails closed and holds:
roles can't be spoofed/self-escalated, vendor isolation airtight, no service-role bypass, all buckets
private, no committed secrets, 0 prod dep vulns. **Quick-wins FIXED + DEPLOYED** (commit c576bd3):
transcripts creator-scoped (`owns_thread` RLS); per-user daily caps on concierge(200)/voice(150) via
`check_and_bump_usage`; "Arnould Heights"â†’"Arnold Heights" audit-grade fix (was poisoning export JSON);
client role fails closed to pending; `[[package:]]` https-only allowlist; delete-throws-before-audit-log;
25MB caps on vendor-docs+assets buckets; capRatePct null-coercion.
**ALL CODE-IMPLEMENTABLE FINDINGS FIXED + DEPLOYED 2026-07-10 (Fable 5 pass).** Beyond the
earlier quick-wins:
- **C1 CLOSED** â€” confidential seeds no longer in the public bundle. `tools/split-seed.mjs`
  (`npm run split-seed`) â†’ `src/data/units.public.json` (skeleton) + `api/_seed.json` (rents,
  tenant PII, lease/floorplan Drive URLs, AP roster; bundled into the seed function ONLY).
  Client boots skeleton; owner/operator hydrate via role-gated `/api/seed` before initViews;
  vendors read own row from RLS-scoped `public.vendors`. VERIFIED in prod: bundle has 0 rent
  values/tenant emails/vendor emails/legal entities; `/api/_seed.json` â†’ 404; `/api/seed` â†’ 401.
  **Re-run `npm run split-seed` after editing any src/data seed** (like concierge-context).
  NOTE: local-only dev mode (no backend) now shows the skeleton (no rents) â€” by design.
- CSP + 6 security headers (`vercel.json`) â€” verified: login page + fonts + Supabase boot call
  raise ZERO CSP violations. TODAY now LIVE (holdover/expiry track real time); exports show
  generated-date + "data as of". Audit-log email JWT-stamped (can't be forged). Security model
  version-controlled in `supabase/security-model.sql`. +8 tests (78 total: seed round-trip +
  money-math/data-integrity regression guards).
**OPERATOR-ONLY (cannot be done from code â€” 2 console actions):**
- **Enable CAPTCHA**: Supabase Dashboard â†’ Auth â†’ Settings â†’ Bot & Abuse Protection (stops
  magic-link email-bomb / junk-pending abuse). No API for this.
- **Rotate both API keys** (Anthropic + ElevenLabs â€” pasted in chat): providers' consoles â†’
  update Vercel Production env â†’ redeploy.
**Accepted (not changed, by design):** SECURITY DEFINER helper WARNs (caller-scoped facts;
revoking EXECUTE risks breaking RLS); policies `to public` relying on helpers returning false
for anon (correct, marginally looser than checklist); concierge-handler lacks a unit test
(would need full Supabase+Anthropic mocking â€” covered by live 401/403/429 smoke + pure-helper
tests).

## ELITE ROADMAP (started 2026-07-03) â€” see `docs/superpowers/specs` + `docs/superpowers/plans`
Vision: full owner/operator platform. Three threads on the live Supabase foundation:
- **Thread 1 Â· Secure Documents:** P1 Document Repository â†’ P2 Owner Safe â†’ P3 Vendor Portal
  (all = role-scoped file storage; extends the existing image asset seam / private bucket).
- **Thread 2 Â· AI Property Concierge:** P4 grounded text RAG â†’ P5 realtime voice + avatar.
- **Thread 3 Â· Spatial & 2.5D:** **P6** (this thread, in progress).
**Substrate decision (operator):** ONE app â€” the repo is authoritative; harvest v9
(`~/OneDrive/Desktop/otbcommandv9kimi.html`, a dark Mapbox "spatial engine" concept)
IDEAS ONLY (Mapbox satellite map + global search). Plan-room = default palette; dark = optional
theme switch (SHIPPED, see below). Do NOT fork into two codebases.

### P1 Â· Document Repository â€” **SHIPPED + DEPLOYED 2026-07-03**
- Plan `docs/superpowers/plans/2026-07-03-p1-document-repository.md`. Any document row (K-1 register +
  unit-drawer docs) can carry a real uploaded file: **"ðŸ“Ž Attach file"** in the row's edit form uploads to the
  **private Supabase `documents` bucket** (25 MB cap; RLS cloned from `assets`: auth read / operator write â€”
  migration `documents_bucket_and_policies`) and sets the row's existing `link` to **`doc://<path>`**; rows
  render **"Open ðŸ“Ž"** which resolves a fresh signed URL on click. External Drive links unchanged. Local
  fallback = IndexedDB (`otb-docs`). Seam: `src/lib/docs.js` (mirrors assets.js; pure doc:// helpers unit-tested).
- Also fixed: `remote.js` now guards `import.meta.env` (was crashing `node --test`; Vite static replacement
  verified intact â€” URL still baked into the prod bundle).
- Verified: local round-trip (attach â†’ save â†’ Open ðŸ“Ž â†’ byte-exact) + prod bundle carries the feature.
  Remote signed-URL path: operator should attach one real PDF to a register row as the live smoke test.
- P2 Owner Safe / P3 Vendor Portal build on this (role-scoped buckets/policies; versioning; search â€” later).

### P2 Â· Owner Safe â€” **SHIPPED + DEPLOYED 2026-07-03**
- **S-1 "Owner Safe" sheet** (nav after P-1): vault for Proforma/Leases/Tax/Insurance/Banking/Other.
  Private **`safe` bucket** â€” read = `is_owner_or_operator()` (NEW fn; a future P3 vendor role is sealed out
  at the DB layer, unlike `documents` which is any-auth read), write = operator. 10-min signed URLs.
  **`safe_log` audit table**: every view/upload/delete recorded (who/when/what); "Recent access" panel =
  operator-only. Owners: read/open only (role-owner CSS + RLS). Migration `owner_safe_bucket_log_policies`.
  Seam `src/lib/safe.js` (pure helpers unit-tested â†’ 23 tests total); view `src/views/safe.js`.
- Verified live: upload â†’ list â†’ byte-exact open â†’ audit rows (view/upload) â†’ delete; owner-mode hides all
  operator controls + log. Deployed; S-1 in prod HTML.

### Global search â€” **SHIPPED + DEPLOYED 2026-07-03** (v9 harvest complete)
- Topbar search box (+ **"/" hotkey**): units / property contacts / register docs; Enter opens the top hit
  (units â†’ drawer; contacts/docs â†’ K-1). Pure matcher `src/lib/search.js` (unit-tested; 29 tests total).
- With this + the satellite lens, the v9-concept harvest is DONE â€” `otbcommandv9kimi.html` is now fully
  superseded and can be archived/deleted from the Desktop whenever.

### ROADMAP REMAINING (all gated on operator inputs â€” nothing ungated left)
- **P3 Vendor Portal â€” SHIPPED + DEPLOYED 2026-07-08**: **V-1 "Vendor Portal" sheet** (nav last).
  Roster = SOT "Vendor List" sheet in `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` â†’ `python
  tools/extract-vendors.py` â†’ `src/data/vendors.json` (69 vendors: 28 service / payees / people,
  26 with email = portal-capable) â†’ seeded into `public.vendors` (migration `vendor_portal_p3`).
  **Operator face:** filterable roster (service first, green "portal" tag), per-vendor private folder
  in the **`vendor-docs` bucket** (upload/open 10-min URLs/delete) + `vendor_log` audit panel.
  **Vendor face:** a vendor signs in with the SAME magic-link gate using their roster email â€” the DB
  trigger assigns role `vendor` â€” and gets a one-sheet shell (role-vendor CSS + nav lock): only their
  folder, read + "send a file to management". RLS: vendor sees/uploads ONLY `<their-id>/â€¦`; sealed out
  of safe, documents, assets, property_state, and the concierge endpoint (403).
  **SECURITY (same migration):** new sign-ins used to default to role **owner** (anyone completing a
  magic link could read the Safe) â€” now default **'pending'** (holding-pen screen). âš  Consequence: a
  NEW legitimate owner will land in 'pending' until promoted (Supabase â†’ profiles.role='owner').
  Also tightened documents/assets buckets + property_state reads from any-auth â†’ owner/operator.
  Advisor WARNs about SECURITY DEFINER helpers callable via RPC = pre-existing pattern, they only
  return facts about the caller â€” accepted. Seam `src/lib/vendors.js` (pure helpers tested; 58 total);
  view `src/views/vendorportal.js`. Smoke test: upload a doc to any vendor folder on V-1. **Inviting a
  real vendor = telling them to magic-link in with their roster email (e.g. marlin@butcherac.com) â€”
  operator's call when to make that ask.** Deferred: per-file "request from vendor" checklist, COI
  expiry tracking, email notifications. NOTE: static seed data (incl. rents in units.json) rides in
  the public JS bundle â€” the login gate protects live state, not the seeds; consider moving sensitive
  seeds behind auth later.
- **P4 AI concierge â€” SHIPPED + DEPLOYED 2026-07-08 (v1)**: **AI-1 "Concierge" sheet** (nav after S-1) â€”
  grounded property Q&A chat. Server side: `api/concierge.js` (Vercel function, `claude-opus-4-8`,
  adaptive thinking, effort medium, streaming) â€” requires a Supabase session token, role must be
  owner/operator (vendor sealed out), key = Vercel env `ANTHROPIC_API_KEY` (Production, set 2026-07-08;
  never ships to client). Grounding: static dossier `api/_context.mjs` (**generated â€” regenerate with
  `npm run concierge-context` whenever src/data changes**; reuses export-package.mjs, prompt-cached
  ~7.6k tokens) + live `property_state` digest woven into the final user turn (cache-safe). Pure seam
  `src/lib/concierge.js` (sanitize/digest/buildMessages/mdToHtml â€” unit-tested, 39 tests total); view
  `src/views/concierge.js`. History is session-only (resets on reload â€” persistence = later).
  Owner visibility togglable via "Owners can seeâ€¦" (off by default). Persona/system prompt lives in
  `api/concierge.js` PREAMBLE â€” operator may want to tune voice/rules there.
- **AGENT DESK â€” SHIPPED + DEPLOYED 2026-07-08**: AI-1 is now THREE agents on one chat surface â€”
  **ðŸ› Concierge** (Q&A, unchanged) Â· **ðŸ¤ Leasing Agent** Â· **ðŸ”§ Property Manager** (chips at the top;
  per-agent suggestions/personas in `api/concierge.js` AGENTS registry).
  **Transcripts:** every conversation persists to `chat_threads`/`chat_messages` (migration
  `agent_desk_transcripts`, owner+operator RLS; vendors sealed). ðŸ—‚ History panel reloads any thread;
  + New starts fresh. Server returns `X-Thread-Id`; client stores per-agent thread state.
  **Lease assembler:** the leasing agent carries a strict tool `assemble_lease_package`
  (OPERATOR-only, enforced server-side) â€” collects terms conversationally, then generates
  (a) a tenant-facing **Lease Proposal** (OTB navy/white brand, DRAFTâ€“subject-to-legal-review stamp,
  real SF/NNN/HVAC-split figures from units/recoveries/hvac.json; vacant units fall back to
  camFlatPsf + median tax/ins) and/or (b) the internal **Owner Lease Summary** (mirrors the
  operator's `Owner_Lease_Template_Form.docx` sections). Output = HTML uploaded to the `documents`
  bucket under `lease-packages/`, 7-day signed URL, delivered as a `[[package:url|label]]` line in
  the stream â†’ client renders a card with **Open ðŸ”’** + **âœ‰ Email** (mailto prefilled with the link
  + OTB signature â€” true in-app send needs a Resend/SendGrid key later, deliberately human-in-loop
  for now). Pure seam `src/lib/lease.js` (builders + tool schema + package-line parser â€” 69 tests
  total). VERIFIED live pre-deploy: real model call drove the tool with perfect strict input; the
  assembled proposal renders on-brand (export/lease-proposal-test.html). Smoke test: open AI-1 â†’
  ðŸ¤ Leasing â†’ "Assemble a lease proposal for unit 131â€¦" with terms â†’ open + email the card.
- **P5 Voice â€” SHIPPED + DEPLOYED 2026-07-08 (v1: voice, avatar deferred)**: AI-1 speaks.
  Server: `api/voice.js` â€” ElevenLabs TTS proxy (model `eleven_turbo_v2_5`, voice **"Jack John â€”
  Natural Customer Support Agent"** `7EzWGsX10sAS4c9m9cPf`, override via env `ELEVENLABS_VOICE_ID`);
  key = Vercel env `ELEVENLABS_API_KEY` (Production, set 2026-07-08 â€” account tier Creator, ~284k
  chars/mo quota; 2,400-char cap per request protects it). Same owner/operator session gate as the
  concierge â€” shared `api/_auth.mjs` (concierge refactored onto it; vendors 403). Client: ðŸ”Š button
  per reply + persisted auto-speak toggle + ðŸŽ™ mic input (Web Speech API, Chrome/Edge only â€”
  auto-hidden elsewhere); `mdToSpeech` pure helper strips markdown for natural reading (60 tests).
  **SECURITY: the ElevenLabs key was pasted into chat 2026-07-08 â€” rotate at elevenlabs.io when
  convenient, update the Vercel env, redeploy** (same drill as the Anthropic key). Smoke test:
  ask AI-1 a question, tap ðŸ”Š on the answer. Deferred: avatar (needs a design/provider decision),
  streaming TTS-while-generating, voice for vendor portal.
- **P6d Reality lens â€” SHIPPED + DEPLOYED 2026-07-08 (v1, $0)**: fourth A-2 chip **ðŸŽ¥ Reality** â€”
  photoreal 3DGS splat of the center, trained via the OPEN pipeline (no Postshot license needed:
  its free tier can't export): **COLMAP 3.11.1 CUDA** (`C:/Users/adam/tools3dgs`, solved 121 frames in
  4.7 min, 0.9px err) â†’ **Brush v0.3** (413k gaussians, ~10 min on the 4070) â†’ master PLY
  `Drone Footage RAW/OTB-splat-v1.ply` (93MB) â†’ `node tools/convert-splat.mjs` â†’ `public/OTB-splat.ksplat`
  (16MB, SH1; gitignored but deployed â€” `.vercelignore` controls uploads now). Lazy GaussianSplats3D viewer
  (`src/lib/scenesplat.js`). RE-FLY/RETRAIN recipe in `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`.
  Postshot can be closed/uninstalled â€” nothing depends on it.
- **P6d v3 â€” photogrammetry mesh in Lens B SHIPPED 2026-07-11 ($0, open pipeline)**: Lens B
  (â—§ 3D) now carries an in-pane **ðŸ— Mesh / â—§ Massing** toggle â€” the captured photoreal mesh
  swaps in over the buildBoxes() seam; unit boxes stay as invisible raycast targets (click â†’
  drawer, selection = brass wireframe), massing stays the default. NO RealityCapture needed:
  COLMAP dense (`tools3dgs/run-dense-mesh.sh`: undistort â†’ PatchMatch stereo ~40 min on the
  4070 â†’ 5.1M-pt fusion) on the SAME 121-frame solve as the splat, so `splat-align.json` bakes
  the mesh straight into Lens-B world (alignment verified: `export/mesh-align-check.png`).
  `npm run mesh-glb` (`tools/build-mesh-glb.py`) crops the FUSED CLOUD to the site first
  (meshing the full cloud makes a Poisson balloon around the background â€” don't), Poisson d11,
  decimates to 150k tris, vertex colors â†’ `public/OTB-mesh.glb` (3 MB, gitignored, deploys
  like the splat; mesh renders UNLIT â€” photo colors already carry the sun). Loader is
  fail-soft: no glb â†’ no toggle, massing only. Re-run mesh-glb after any dense re-run or
  align re-fit. Known v1 limits: roofs thin (no nadir in the DJI set), vegetation blobs.
- **A-2 polish SHIPPED 2026-07-11**: â‡… True-heights chip (iso + Lens B swap between
  presentation exaggeration Ã—1.7 and plat-true 1.8657 px/ft) Â· north arrow + 100â€² scale bar
  on the iso (plan-rotated: true north = +x; along an iso axis projected length = plan length,
  so the bar is exact) Â· â¤“ SVG chip downloads a standalone A-2 isometric (fonts/colors inlined,
  CSS vars resolved). Tenant logos: `npm run logo-thumbs` â†’ `public/tenant-logos/` +
  `src/data/logo-thumbs.json`; chips render in the unit-drawer header + R-1 tenant cells
  (vacant rows skipped; sources stay vendored in `tools/brand-assets/tenant-logos/`).
- **P6d v2 â€” splatâ†”world alignment SHIPPED + DEPLOYED 2026-07-08**: ðŸŽ¥ Reality is now CLICKABLE
  (click a storefront â†’ unit drawer; selection = brass wireframe; synced across sheets). The similarity
  transform (COLMAP frame â†’ Lens-B world) was fitted COMPUTATIONALLY, no GPS: `tools/fit-splat-align.mjs`
  (**re-run after any splat re-train**) density-crops the site, RANSACs the parking-field ground plane
  from a mini-DTM, seeds scale from the 16.4' parapet, then grid-searches yaw/scale/translation matching
  FACADES to footprint outlines (the DJI orbit reconstructs walls, not roofs â€” no nadir coverage) +
  penalizing ground points inside footprints. Result committed: `src/data/splat-align.json` (score .162,
  ~0.0156 splat-units/ft); visual check regenerable at `export/splat-align-preview.svg`. Pure math seam
  `src/lib/splat-align.js` (quat helpers + true-height realityBoxes â€” 46 tests total). Runtime: splat
  transformed into y-up world via addSplatScene {position,rotation,scale}; invisible TRUE-proportion hit
  boxes (no Lens-B vertical exaggeration) raycast â†’ drawer. Verified in preview: full click-sweep opened
  101â†’125 in correct plan order + 149 on the short building; splat renders upright/level/plan-oriented.
- **Roof-condition brief â€” DONE 2026-07-08 (CORRECTED same day)**: `docs/roof-condition-brief.md`
  + downscaled key frames in `docs/roof-brief-assets/` (originals stay on J:). Finding 1 STANDS:
  membrane failure, long-building roof, RTU row â‰ˆ101â€“109 (bay confirmed on the roofer walk; the
  RTU+gas-line geometry in S1002433 locates it on-roof). Finding 2 **RETRACTED for Belle** after
  the georef refit: the thermal anomaly (S1002330/28, true-nadir GPS) locates on the NEIGHBOR's
  roof north of Patricia â€” the Skydio sweep photographed neighbor roofs for mesh context. Brief,
  K-1 register row `pd:roofbrief`, and W-1 card `roof:brief` all corrected + DEPLOYED.
- Prior assessment (2026-07-04) â€” `Downloads/Drone Footage RAW/`,
  9 clips 4K/100Mbps: 0001-0003 dusk + 0008-0016 golden (marketing only); **0023/0029/0030 daylight = reconstruction
  set**. Frame package CUT: `Drone Footage RAW/OTB-3DGS-frames/` â€” 242 sharp 4K stills (2fps, blur-culled) +
  README-TRAINING.md (Postshot/Luma for splat Â· RealityCapture for mesh Â· 15-min supplemental-flight recipe).
  Remaining operator step: run the training (GPU/cloud), hand back .ksplat/.glb â†’ wire Lens D.
  **PLUS (found 2026-07-04): Skydio VT300-L roof survey** (`J:/Shared drives/AA & RR/Drone Photos/
  Arnould Boulavard/`, 2025-10-15): 165 GPS-tagged 50MP near-nadir stills (copied to
  `Drone Footage RAW/OTB-mesh-photos-skydio/` â€” FILLS the nadir gap; mesh via RealityCapture w/ both
  sets) + **330 thermal IR roof frames** â€” samples show membrane damage + a thermal hot spot
  (possible moisture): flag for roof-condition review / C-1 / Butcher Air conversation. Operator has
  Postshot installed (RTX 4070 SUPER local training).
- Small deferreds: Magnolia (121) lease swap, remaining Drive-doc links, custom domain + SMTP,
  B4 realtime. (A-2 metric-height/north/scale/SVG-export + logo thumbnails + buyer-export trim
  all shipped â€” see above.)

### P6 Â· 2.5D + Spatial â€” **P6a + P6b SHIPPED 2026-07-03**
- Spec `docs/superpowers/specs/2026-07-02-p6-2p5d-spatial-design.md`; plans `docs/superpowers/plans/2026-07-0{2-p6a-svg-isometric,3-p6b-webgl-3d-twin}.md`.
- **A-2 "Spatial" sheet LIVE** (nav D-1Â·A-1Â·**A-2**Â·R-1â€¦) with an **Iso / 3D lens toggle**:
  - **Lens A (SVG isometric, P6a):** native-SVG, footprints extruded to **real CAD heights**
    (`npm run extract-heights` â†’ `src/data/heights.json`, from DXF `BLD_HT`), block color = live status.
    Pure core `src/lib/iso.js` (unit-tested).
  - **Lens B (WebGL 3D twin, P6b):** Three.js (`three@0.185`), orbit controls, same footprints/heights/colors,
    raycast click â†’ drawer. Loaded **lazily** (dynamic import â†’ code-split `scene3d-*.js` chunk; `three` only
    loads when 3D opens). Pure layout `src/lib/scene3d-layout.js` (unit-tested); scene `src/lib/scene3d.js`.
    **Verified live in WebGL 2.0** (render + real heights + clickâ†’drawer + clean dispose on toggle-back).
  - Both: click â†’ shared drawer, selection syncs across sheets. **`npm test`** = 15 tests (native node:test).
  - **Swappable geometry seam:** `buildBoxes()` in scene3d.js is isolated so **P6d's captured mesh drops in**.
- **Theme switch SHIPPED**: plan-room (DEFAULT) â†” dark, toggle in sidebar foot, persisted `localStorage["otb-theme"]`,
  dark overrides `:root` vars under `[data-theme="dark"]`; the 3D scene reads the theme too.
- **P6c satellite lens â€” SHIPPED + DEPLOYED 2026-07-03**: third A-2 chip **ðŸ›° Satellite** â€” MapLibre GL
  (lazy chunk, only loads on open) + free Esri World Imagery + **georeferenced unit footprints**
  (`npm run extract-georef` â†’ `src/data/footprints-geo.json`; tunables in `tools/extract-georef.py`:
  anchorLL/azY tunables). **Georef RE-FITTED computationally 2026-07-08** after the operator's
  screenshot showed drift: NEW `tools/fit-georef.py` masks the white roofs in the same Esri tiles,
  sweeps azimuth with per-building translations, and accepts only azimuths where BOTH buildings
  agree (<6 m) â€” fitted anchorLL [30.201685, -92.053962], azY 51.75 (= the plat's own north arrow;
  the old eyeballed 70.5 was the drift â€” Esri had also refreshed imagery). On-roof coverage .94/.84.
  Re-run the fitter + `npm run extract-georef` whenever Esri refreshes tiles. Status-colored
  polygons, click â†’ drawer, selection outline. Layers attach on load+idle (robust in throttled tabs).
  **RESIDUAL:** could not paint MapLibre in the headless preview (occluded-tab rAF throttling) â€”
  registration/data/wiring verified offline; operator's first click in prod = the smoke test.
- **Next in P6:** **P6d Reality capture** â€” operator to do a **drone shoot â†’ photogrammetry mesh + 3D
  Gaussian Splat**, clickability via georef-draped hit-areas over the swappable seam. Deferred: metric-height
  toggle, north/scale, static-SVG export of A-2, v9 global-search harvest.
- Height note (operator eyeball): 22/27 units = 16.4â€² (real nearest-BLD_HT match, not fabricated); 103=23.6â€²,
  101=13.5â€², 105/107/109=13.2â€². Real skew, not a bug.

## Run / verify
- `npm run dev` (Vite) Â· preview via Claude_Preview (`otb-command-dev`, port 5173). Note: with `.env` present the app is **login-gated** (Path B); to view locally without login, move `.env` aside temporarily.
- **Generators (all re-runnable):** `npm run poster` (5 leasing posters) Â· `npm run pylon` (monument sign) Â· `npm run proforma` (owner Excel proforma) Â· `npm run export-package` (LLM export) Â· `npm run export-buyer` (no-financials buyer set) Â· `npm run extract-geometry` Â· `extract-hvac`/`extract-recoveries` (py).
- **Deploy (Path B):** `npx vercel deploy --prod --yes --scope adams-projects-0c52918e` â€” the Vercel CLI is
  **logged in on this machine as `orangeonyx`** (device-flow login 2026-07-03; no token needed).
  **IMPORTANT: local commits do NOT auto-deploy** (no git remote / no Vercel git integration) â€” run the deploy
  command after shipping, or the live site silently stays stale.
- Quality gate before delivery: `node --check` each module + `npm run build`. Console clean.

## What's built (12 sheets)
D-1 Dashboard Â· A-1 Site Plan (plat-exact + photo/overlay layers; **whole-center floor-plan overlay** registered to the unit envelope w/ unit-fill opacity slider; unit numbers uniform, tenant names off A-1) Â· A-2 Spatial (4 lenses) Â· R-1 Rent Roll (11 cols, PSF breakdown) Â·
P-1 Financial (income composition + NOI worksheet) Â· C-1 Compliance Â· T-1 Critical Dates Â·
W-1 Action Board (live kanban) Â· K-1 Directory (contacts + document register + site imagery) Â·
S-1 Owner Safe Â· AI-1 Concierge (3 agents) Â· V-1 Vendor Portal.
- **Persisted state layers** (localStorage, write-through, in Export/Import JSON): comp, notes, actions, contacts, documents, financials.
- **Asset store**: images (photos / floor plans / roof-HVAC / signage) in **IndexedDB** behind a swappable backend seam (lib/assets.js). NOT yet in Export/Import â€” per-browser today (portability gap, see below).
- **Data**: src/data/{units,compliance,geometry,directory,hvac,recoveries}.json. Single-source rule: Base/Total PSF from units.json; recoveries.json only supplies CAM/Tax/Ins.
- Headline vs drawn convention (labeled, not bugs): GLA 62,883 headline / 62,810 demised; parking 324 legal (variance 99-11797) / 314 drawn.

## Marketing (CAD-derived) â€” FOLDED INTO REPO 2026-06-20
- **CAD**: `cad/Boulev_CLEAN.dxf` â€” AutoCAD R14, in FEET, the architect's layered plat. Now committed (~644 KB). (Source .dwg still only in Downloads.)
- **Poster generator**: `tools/poster.py` â†’ `npm run poster`. Reads `cad/Boulev_CLEAN.dxf` + units.json/geometry.json, logos vendored in `tools/brand-assets/` (otb_logo.png + a white-knockout). Emits **5 style variants** to `marketing/` (gitignored, disposable): A brand Â· **B plan-room (CHOSEN)** Â· C standard Â· D editorial Â· E heritage. Bays color-coded by tenancy; true north âˆ’51.5Â°. Johnston label rides a center lane-stripe via textPath; pylon marker at the surveyor 'SIGN' coord (1075.8,321.1).
- **Pylon generator**: `tools/pylon.py` â†’ `npm run pylon`. Emits `OTB-pylon-blank.svg` (scaled 14-panel template, matches the real sign) + `OTB-pylon-tenants.svg` (type stand-ins). Real-logo version is the operator's own image â€” drop logo files in `tools/brand-assets/` to swap.
- Generated SVGâ†’PNG locally via headless Chrome (no cairosvg/rsvg in repo): wrap SVG in HTML, `chrome --headless --screenshot`.
- **Pylon real logos DONE 2026-06-20**: 25 tenant logos vendored to `tools/brand-assets/tenant-logos/` (from the updated SOT's LOGO sheet), embedded per panel; P13 Boulevard Nutrition â†’ Upstream Rehabilitation.

## Export deliverables (all â†’ `export*/`, gitignored; copied to `G:\My Drive\00 OTB\`)
- **LLM export** (`npm run export-package` â†’ `export/`): dossier MD + data JSON + A-1 SVG/PNG/HTML. Full detail incl. financials.
- **Buyer overview** (`npm run export-buyer` â†’ `export-buyer/`): same set with **all $ stripped** (roster only, financials â†’ NDA note). For the prospective-buyer group. NOTE: still contains "Known anomalies" + "Marketing angles (LOI pending)" â€” operator may want those trimmed before sending externally.
- **Owner proforma** (`npm run proforma` â†’ `export/OTB-Proforma.xlsx`): live Excel model â€” real in-place income (EGI $1,080,773/yr), yellow OpEx cells = seeded estimates the owner overrides, formula-driven NOI + cap-rate value. Pending option: add vacancy/credit-loss line + stabilized (lease-up 131/133) scenario.

## OPEN â€” next session punch-list
### Poster edits â€” DONE on B (2026-06-20; 2025-stats strip added 2026-07-12)
2026-07-12: brass performance strip (95% occ Â· 88% retention Â· 14-business waitlist Â·
33,000+ VPD, from the Jul-2025 marketing package â€” see docs/marketing-package-2025.md)
added inside B's contact bar; dossier + buyer set gained a "Center performance" section
(non-financial in both; revenue story + $10â€“17 NNN comp in full dossier only); concierge
context regenerated + deployed; fresh poster SVG/PNG/PDF + LLM export on G: Drive.
### (original 2026-06-20 notes)
All five original notes resolved on the chosen B variant: tenant DBAs off the boxes (number-only,
turned 90Â° CCW + centered both axes); pylon at the surveyor 'SIGN' coord by Unit 101 (no leader line);
Johnston label curves with the road, within the lane lines; boundary dashes thinned; OTB contact block
+ enlarged logo. **GLA LOCKED to audited 62,883 across ALL variants** (operator, 2026-06-20 â€” overrides
the brand's 70,000 marketing figure). Real pylon logos now embedded (see Export/Marketing). A/C/D/E
remain exploratory; only B is blessed.

## Brand (ingested 2026-06-20) â€” `~/.claude/skills/abdalla-brand-system`
Three skills installed: `abdalla-brand-system` (router â†’ per-entity `references/*.md` + `assets/` logos), `abdalla-web-templates`, `adam-brand-context`. Auto-trigger on OTB / Orange Ocean / Belle Realty / brand keywords. DO NOT pull brand details from memory â€” read the entity doc.
**OTB public brand (tenant-facing marketing = leasing poster):**
- Palette: **strictly Boulevard Navy `#1C2D4F` + White/Off-White `#F5F5F5`. NO orange or gray accent bars.** (Conflicts with the app "plan-room" palette â€” two separate systems: app stays plan-room; public OTB marketing = navy/white.)
- Type: Helvetica/Arial (headers/marketing); Times New Roman (formal notices). NOT Big Shoulders/Plex.
- Logo: `assets/otb_logo.png` (use the file, not a typed wordmark).
- Contact block: Adam Anthony Abdalla, Property Manager Â· 101-149 Arnould Blvd., Lafayette, LA 70506 Â· **P 337-769-1554 Â· E info@ontheblvd.com Â· W ontheblvd.com**. Required attribution: **"Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."**
- Tone: welcoming/local; AVOID investment/legal/B2B jargon on public pieces (strip "variance 99-11797", "hard corner", etc.).
- **GLA figure conflict:** brand markets **"70,000 sq ft"**; our audit = 62,883 demised / 62,810 sum. **RESOLVED 2026-06-20: print audited 62,883 on all marketing (operator decision).**
- Audience question: tenant-facing leasing = OTB brand; broker/investor/sale = Orange Ocean B2B brand (`brand-orange-ocean.md`).

### Fold poster into the repo (re-runnable tool) â€” DONE 2026-06-20
- DXF committed to `cad/`; `poster.py` + `pylon.py` in `tools/`; `npm run poster` / `npm run pylon` wired; `marketing/` gitignored. Regenerates whenever availability changes.

### Portability (operator goal: "moves with the app wherever")
- **Path A â€” DONE 2026-06-20**: lease Drive URLs wired (clickable in unit drawers), floor-plan links + real tenant contacts seeded (from updated SOT `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` â€” sidecars `src/data/{lease,floorplan,logo}-links.json` + `contacts-info.json`), session artifacts in K-1 register. **Google Drive connector is CONNECTED** (file search/metadata works). **Register Drive links WIRED 2026-07-08** via the connector: church easement, JD Bank easement, HVAC 2021 PDF, SOT workbook, SOT docx, meters workbook, title commitment (folder link â€” all 2007 versions). Still blank (likely not digitized â€” parish records if needed): parking variance 99-11797, electric easement 577566, expired drainage easements; also blank by design: repo-generated rows (roof brief, recon memo, dossier, poster, pylon â€” refs point at repo paths / re-run commands).
- **Path B â€” LIVE 2026-06-20** (`docs/path-b-supabase-scope.md`): hosted at **https://otb-command.vercel.app** (Vercel) + Supabase (project `kbhsghodquchkgfdzckc`). Magic-link auth; operator (adam@adamabdalla.com) edits, owners read-only + scoped sheets; state + images sync to Supabase. Deploy: `npx vercel deploy --prod --scope adams-projects-0c52918e` (needs a Vercel token). Deferred: B4 realtime, custom domain, per-sheet read RLS, custom SMTP.

### Visuals / 2.5D (next session)
- Operator wants state-of-the-art data viz + **2.5D / isometric renderings** of OTB. Inline viz capability exists (mcp__visualize__show_widget) + in-app views. Needs the inputs in `docs/visuals-input-checklist` (see below / chat).

### Other
- **Floor plans â€” A-1 overlay LIVE 2026-06-20**: whole-center plan (`public/floorplan-center.png`, processed from `G:\â€¦\Floor Plan - Whole Center.jpg` â€” exterior/parking knocked transparent, largest-component crop, rotated 180Â° to match A-1) renders under the unit boxes via **A-1 â†’ Overlay â†’ Floor plan**, registered to the unit envelope (`FAC` box in `plan.js`), with a **Unit-fill opacity slider** (auto-fades boxes to 40% when the overlay is on; labels go dark+halo). Per-unit floor-plan **links** also live in each unit drawer. Tuning preview tool: composite floor plan + unit rects offline (see chat).
- **Still parked:** custom domain `command.ontheblvd.com` + custom SMTP for auth email Â· doc Drive URLs (above) Â· Magnolia (121) executed lease swap (Draftâ†’Executed when provided). (Logo thumbnails + 2.5D viz shipped.)
- **Title check (P0) â€” CLOSED 2026-06-27**: street = **Arnould Blvd** (operator-confirmed);
  recorded subdivision of record = **"Arnold Heights Subd. Ext. No. 1"** (distinct legal
  name, deliberately "Arnold" â€” not a variant to reconcile). App already uses Arnould
  consistently; "do not fix" the subdivision name. See CLAUDE.md property facts.

## Locked decisions
- DoorLoop is OFF the roadmap (don't re-propose).
- Repo is authoritative; all exports are one-way/disposable.
- v7 baseline deleted (recoverable at git 81b1541).
- Audit-grade facts in CLAUDE.md must not be contradicted.
- **CONSOLIDATION (operator, 2026-07-16): OTB Command is the SURVIVOR.** The parallel
  builds are DONORS, not co-equals: `belle-realty-pwa` @ 19f7c06 (NestJS/Railway,
  Downloads zip + live app.belle-realty.com) and `otb-ops` (Manus). Harvest into this
  repo on Supabase â€” no two-backend federation, no new features in donors. Harvest
  queue: calc engines + numeric guardrail (started 2026-07-16) â†’ owner-brief
  auto-trigger patterns â†’ event-sourced compliance + heat-map lenses (otb-ops) â†’
  ledger-lite â†’ e-sign/tenant-portal schemas. Supabase plan upgraded 2026-07-16 â†’
  splat/mesh can move to Supabase storage, which then unlocks git-integration
  auto-deploy safely (assets are gitignored â€” flipping auto-deploy BEFORE moving
  them ships prod without the Reality lens).
