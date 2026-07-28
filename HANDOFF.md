# OTB Property Command — Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`
Last updated: 2026-07-28 (night) — **A-3 VOICE IS LIVE — both lines
answered real calls and wrote real data.** Numbers (operator bought):
**(337) 270-7044 = LEASING · (337) 273-0384 = TENANT** (assignment
delegated→made; 7044's old ElevenLabs webhook overwritten, operator-
approved). Voice webhooks → `https://otb-voice-bridge.fly.dev/twiml?line=…`
(operator clicked the two console forms; he ALSO pointed both MESSAGING
webhooks at the same URL — harmless no-op, inbound SMS just errors in the
Twilio debugger until a v2 bridge messaging handler; A2P unregistered
anyway). **Fly bridge:** app `otb-voice-bridge` (dfw, scaled to 1 machine,
flyctl in ~/.fly/bin authed adam@; operator added the credit card so the
trial 5-min machine-kills are gone). **⚠ SECRET DRILL LESSON (cost us the
first smoke round):** piping a secret into `vercel env add` from PowerShell
appends a newline → brain stored `<secret>\n` → EVERY bridge turn died 401
("brain call failed: brain HTTP 401" in fly logs; caller hears greeting,
then apologies). Fix = `cmd /c "npx vercel env add … < file"` (byte-exact);
drill re-run end-to-end. NEW RULE: a secret drill is not verified until a
REAL-secret request is accepted (junk-401 alone proved nothing). **Live
smoke (operator, 21:20/21:23 UTC):** tenant call filed work order
`vr-20260728212150-6b5e` (AC, 135B, callback captured; agent TRIPLE-filed —
dupes …2128/…2145 closed via maintenance_events actor `claude-code`) +
voice-tenant/-leasing transcripts in AI-1. Leasing call captured
name/units(131+133)/phone and said "locked in" ×5 — **but NEVER called
book_tour; tour_bookings = 0 rows ever. Hallucinated confirmation = the
worst leasing failure; fix is queue #1.**
**NEXT-SESSION BUILD QUEUE (operator: "all four", 2026-07-28):**
1. **Truthful booking** — persona/tool hardening: never claim booked
   without an ok:true tool result; call book_tour the moment
   name+phone+slot exist. 2. **Unbooked-lead cron** — leasing voice_calls
   with no tour_bookings row → manager thread keyed `voice-lead:<call_sid>`
   (safety net so no lead silently drops). 3. **Dedupe guard** —
   voice_file_maintenance returns the existing ticket for same unit+title
   within 10 min. 4. **Leasing-package v1.5** — hosted public one-pager
   (131/133) + ready-to-send SMS text inside the leasing manager thread
   (caller asked for a package ON TAPE; keeps the "app sends nothing"
   boundary). PLUS: **D-1 Parking Occupancy card "not up" (operator)** —
   pipeline is HEALTHY (occupancy_samples 5,644 rows, latest 07-27 23:00Z,
   OTB-C3-Nightly + watchdog tasks Ready) → suspect the card's freshness/
   render path in the view, diagnose front-end first. PLUS: **operator asked
   "where does someone onboard a new property" — nowhere; that IS Phase B
   multi-tenant (schema + onboarding flow), now operator-pulled — schedule
   it.** Stripe ACH still untouched — **Aug 1 is 4 days out, now the top
   clock item.** Commercial v2 (feature-forward, via Higgsfield MCP — added
   user-scope, tools appear in NEW sessions) still wanted; Manus quoted
   450-600 credits for a full regen, so draft the shot list first.
**Desktop-control lessons (Windows-MCP):** labels go stale after ANY window
switch — resnapshot before every click; Manus + Claude-desktop self-front
and steal clicks/dismiss dropdowns — MINIMIZE the Claude Code browser window
before driving other windows; `loc` param serializes broken — use `label`.
Prior: 2026-07-28 — **NO-BUILD SESSION (context load + tooling
only): nothing OTB shipped, prod untouched.** One env change: `higgsfield`
MCP server added at USER scope (`claude mcp add --transport http --scope
user higgsfield https://mcp.higgsfield.ai/mcp` → ~/.claude.json) — tools
appear in NEW sessions only; if it wants OAuth, authenticate via `/mcp`
in an interactive terminal on first use. Session offered ranks (Aug-1
ACH readiness · Phase B schema · meeting prep) — operator did not pick;
the queue below stands exactly as of 07-26. Aug 1 ledger go-live is now
4 days out — Stripe ACH operator steps (STRIPE_SECRET_KEY + webhook,
docs/operator-runbook-2026-07.md) are the clock-driven item.
Prior: 2026-07-26 (later) — **CUSTOM DOMAIN LIVE:
https://orangeoceanatlas.com** (+ www) — operator bought at GoDaddy
(3yr), Claude attached both to the Vercel project, DNS = A @ 76.76.21.21 +
CNAME www→cname.vercel-dns.com (GoDaddy's pre-installed parked www CNAME
had to be EDITED, not added-over). Verified HTTP 200 + SSL + Atlas title
on both hosts. ~~Supabase redirect-URL check~~ **CONFIRMED by operator
2026-07-26: magic-link login works on the new domain.** ooatlas.com /
ooatlas.ai still unpurchased (were open). NOTE: this is the PRODUCT
domain — the OTB tenant-facing canonical-domain decision (ontheblvd vs
shopontheblvd, gates vinyl QR) is separate and still open.
Prior: 2026-07-26 — **PRODUCT RENAMED: "ORANGE OCEAN ATLAS"
(operator-confirmed; billion-dollar client meeting next week) — SWEEP
SHIPPED + DEPLOYED (272 tests).** Name journey: Asset Command cleared →
operator chose Atlas; composite-only rule (never naked "Atlas" — crowded:
Saunders/AtlasX/Atlas RE/VISION-ATLAS); all 5 composite domains OPEN at
check time (orangeoceanatlas.com · ooatlas.com/.ai · atlasbyorangeocean.com
· oo-atlas.com, ~$205) — **operator buys; app can live at
atlas.orangeocean.ai.** Swept: pitch master+variants (PDFs → OO-Atlas-*,
stale OTB-*.pdf purged incl. on G:), commercial title/end-card + **scene-8
VO re-rendered** ("Orange Ocean Atlas — built by an operator…", ~10s in the
14s slot; full 8-scene re-render via the key drill; MP3s → G:\vo-mp3),
operator-manual header, app titles/login-sub/print-foot ("ORANGE OCEAN
ATLAS · OTB"), concierge CORE + _context regenerated, export-package/
proforma attributions. ⚠ TOOL FIX: render-commercial-vo.py marker regex
was only re-runnable against an EMPTY AUDIO array (data-URIs carry ";");
now re.S non-greedy. Prod verified (title + bundle). Module-naming concept
(pitch talking point): Atlas=spatial · Almanac=dates · Ledger · Desk ·
Register. **Operator smoke: commercial.html ▶ full loop (new scene-8 VO) ·
skim 3 OO-Atlas PDFs' covers · login page shows "Orange Ocean Atlas —
sign in".**
Prior: 2026-07-25 (night, cont.) — **MOBILE OPTIMIZATION SHIPPED +
DEPLOYED:** ≤860px the sheet index is an off-canvas drawer behind a topbar
☰ (veil, auto-close on sheet pick), grids collapse to one column (KPIs
2-up), search full-width, unit drawer full-screen, `100dvh` viewport,
coarse-pointer tap targets (matrix cells 38px, always-visible edit/✕).
Desktop >860px byte-identical behavior; print hides the new chrome.
Verified at 375×812 via computed-style checks (occluded pane can't
screenshot — standing lesson): burger/veil/nav lifecycle, zero horizontal
page scroll, tables scroll inside their cards; desktop regression clean;
console clean; prod bundle grep-verified (navBurger/nav-burger/dvh/860).
`.env` was moved aside for the local no-login preview and RESTORED.
**Operator smoke: open otb-command.vercel.app on your phone → ☰ →
walk D-1/R-1/M-1 → open a unit drawer (full-screen, ✕ closes).**
Prior (same night): autonomous `/goal` finish-out —
**UNIFI OFFLINE AUTO-TRIGGER SHIPPED + DEPLOYED (272 tests):** the deferred
D-1-card follow-on — `unifiTriggerCandidate` (pure seam, src/lib/unifi.js)
rides the daily cron; keyed by the OUTAGE SET (not date), so a persistent
outage alerts once ever, a changed outage opens fresh. Best-effort scan
(skipped without UNIFI_API_KEY; api.ui.com failure never blocks other
scans). **Live prod smoke via the pull-load-delete CRON_SECRET drill:
scanned 4 / opened 1 (`unifi:1-unlisted` — the known dead WiFi unit now
has a manager thread in AI-1) / failed 0.** Also: **operator runbook
consolidated** → `docs/operator-runbook-2026-07.md` — EVERY operator-gated
action with exact steps (Stripe ACH keys/webhook · A-3 Twilio/Fly go-live ·
CAPTCHA · dead-AP ident · 4 blocked decisions incl. owner-layer RLS set +
auto-deploy · field walks · open smokes · data gaps). Deliberately NOT done
unattended (live prod, judgment call): Phase B multi-tenant schema ·
B3/B4/C2 · per-AP uptime history (still queued).
Prior: 2026-07-25 (later still) — **PITCH PACK ROUND 2 (operator "1
AND 2"):** (1) **VO RENDERED** — all 8 commercial scenes in the AI-1 "Jack
John" voice (key via the pull-load-delete drill, never on disk), embedded as
per-scene data-URIs in commercial.html (▶ PLAY WITH VOICE; per-scene playback
survives manual advance; scene 8 slot 12→14s — VO ran 12.2s — reel now 92s;
every scene duration verified ≤ its slot). Re-render tool:
`tools/render-commercial-vo.py` (keep LINES in sync w/ the script MD).
Loose MP3s → G:\…\pitch-2026-07\vo-mp3\ for external video assembly.
(2) **AUDIENCE COVERS** — `tools/brief-variants.py` regenerates
feature-value-brief-belle.html (owner edition: "what the owner personally
holds") + -partner.html (design-partner offer: get/ask/won't-do) from the
master; both PDF'd (Chrome can't write into the repo — render to temp, copy).
All synced to G:. **Operator smoke: commercial.html → ▶ PLAY WITH VOICE, one
full loop w/ sound · skim both variant PDFs' covers.**
Prior: 2026-07-25 (later) — **INVESTOR PITCH PACK SHIPPED (doc-only,
no deploy):** `docs/pitch/` = feature-value brief (MD canonical + OO-branded
HTML + PDF via headless Chrome), full operator manual (all 5 roles, sheet-by-
sheet + rhythms + admin), commercial ("The Instrumented Asset": 90s/30s script
w/ claims register + self-playing 90s HTML reel, 8 scenes, OO dark brand —
screen-record for video or loop as-is). Copied to `G:\My Drive\00 OTB\
pitch-2026-07\`. Voice claims flagged: soften scene 6 if airing before A-3
go-live. Operator smoke: open the PDF (render unverified locally — no
poppler) · play commercial.html once through.
Prior: 2026-07-25 — **HARVESTS #5 + #6 SHIPPED + DEPLOYED (269
tests) — the donor merger queue is COMPLETE; belle-realty-pwa is an archive.**
**#5 calc engines** (pure seams in `src/lib/calc/`): capex reserve-gate
(Playbook §9, EUL urgency bands), insurance claim timeline (§12, UTC
month-clamp date math), occupancy-cost-ratio tripwire (§6). NOTE: donor
"OCR" = **occupancy cost ratio**, NOT document OCR — all three engines are
pure, so the old "gated on data surfaces" caveat dissolved. All ride the
existing run_calc tool + numeric guardrail (AI-1, all personas).
**#6 e-sign** (migration `esign_requests` APPLIED): token lifecycle
pending→sent→viewed→signed/declined/expired. Signer page =
`/api/esign?t=<uuid>` — public, **zero inline JS** (CSP untouched; plain
HTML form POSTs back to itself, plan-room styled, E-SIGN/LA-UETA consent
line). Signer transitions ONLY via token-gated definer RPCs
(esign_get/sign/decline — junk-token raises + full lifecycle asserts
verified, incl. double-sign and decline-after-sign fail closed). Optional
doc review link: esign_doc_path + an anon storage policy scoped to docs on
live requests. Operator face: **unit drawer → E-Sign panel** (create, copy
link/copy message — the app sends NOTHING, operator's own channel, v1
boundary — re-token, cancel, signed receipt); owner read-only via CSS.
**#6 tenant-portal-lite** (migration APPLIED): tenants read their OWN
unit's ledger via RLS; M-1 tenant face gains **"Your account"** (balance +
last 8 entries, same pure fold as the operator drawer).
**A-5 ACH GROUNDWORK** (migration `post_ach_payments` APPLIED,
wrong-secret raise verified): pure seam `src/lib/ach.js` classifies Stripe
events → idempotent `ach:<pi_id>` payment rows, or manager threads for
unmapped/failed payments (`ach-unmapped:`/`ach-fail:` keys). Webhook
`api/stripe-webhook.mjs` verifies by RE-FETCHING the event from Stripe (no
raw-body/signature fragility) and is **DORMANT (503) until the operator
adds STRIPE_SECRET_KEY in Vercel env and points a Stripe webhook at it.**
Advisors: same accepted definer-WARN class only. Carry-forwards EXAMINED,
blocked on operator decisions: owner-layer read policy (D-1 owner-default
renders actions+comp, so per-layer RLS would break owner dashboards — needs
a decision on the owner-readable layer set) · CAPTCHA (dashboard-only) ·
auto-deploys (Vercel git link).
**Operator smoke: any unit drawer → E-Sign → create → Copy link → open
incognito → sign · M-1 as a tenant → "Your account" · ask 🤝 Leasing
"should I spend $45K on an RTU replacement with a $120K reserve, $30K/yr
contributions, installed 2008, 15-yr life?"**
Prior: 2026-07-24 (rev 2) — **R-1 ONE-SHEET PRINT + EXPIRY WATCH
(owner request) SHIPPED, then HARDENED after field report "still 2 pages,
flags louder" (248 tests).** Rev 2: (1) print fit is now MEASURED, not
estimated — stampPrint applies `.print-fit` (compact layout, rules live
outside the media query so they're measurable), reads the sheet's real
height, and sets a zoom via pure `fitZoom()` (budget 590px; engages at 0.95
today) — shrink beats spill; (2) `html,body{height:auto}` in print — the
100% height pinned body to exactly one paper height, where a single spilled
pixel = blank page 2 (likely the field culprit); (3) flags LOUDER: stronger
tint + 4px inset left bar + bold colored Term-End date + bigger ▲/△.
Expiry watch: ≤6 mo ▲ brick / 6–12 mo △ amber (seam `src/lib/roll.js`,
legend in stamp). Verified via full print emulation in preview: 1 page at
740px budget, zoom 0.95, bars+colors present under print layout; 115/117 ▲
(Clothing Loft 9/30/26 = SOT), 8 units △.
**Operator smoke: R-1 → ⤓ SHEET → ONE page, flags unmissable.**
Prior: 2026-07-24 (later) — **A-3 VOICE BUILT + DEPLOYED (243 tests);
operator go-live steps pending.** Two 337 lines (tenant + leasing), Twilio
ConversationRelay. Architecture: **Fly.io bridge** (`bridge/` — dumb WS↔HTTP
transport, the system's ONLY always-on process; Vercel can't hold a socket) →
**`/api/voice-agent` brain** (Bearer VOICE_SECRET fails closed; personas/tools/
speechify from pure seam `src/lib/voiceagent.js` + `src/data/sop.json` — the
A-4 capture, single-sourced) → migration **`a3_voice_lines`** APPLIED
(voice_settings row [windows/greetings] · tour_bookings [unique slot_key =
conflict gate] · voice_calls→chat_threads map · 5 secret-gated RPCs on NEW
app_secrets row 'voice_agent'; all five wrong-secret raises verified + full
body smoke under rollback; advisors = same accepted definer-WARN class only).
Tenant line files real maintenance_requests (actor voice-agent → M-1/W-1/aging
cron unchanged); leasing line books tour slots (18h lead, Tue/Thu defaults) +
transcripts land as voice-tenant/voice-leasing threads. Voice = ElevenLabs
"Jack John" (same as AI-1; Deepgram fallback documented). Decisions this
session: Fly.io (1) · two numbers (my call, delegated) · settings-row calendar
(1) · ElevenLabs (1). **GO-LIVE = OPERATOR RUNBOOK `docs/a3-voice-runbook.md`:
Twilio CR onboarding (slow — start first) · buy 2 numbers · Fly launch ·
secret drill (tools/rotate-voice-secret.mjs) · point webhooks · smoke calls.**
v1 boundaries (deliberate): no SMS-notify on dispatch, no live transfer, no
daily call cap (set a Twilio usage trigger), settings edits via SQL until a UI.
Prior: 2026-07-24 — **A-4 SOP CAPTURE DONE**
(`docs/a4-sop-capture-2026-07.md`): all 7 domains interviewed + locked.
Headlines: emergencies = leak/electrical/break-in/sewer, dispatch+notify
after-hours (never wake for permission) · vendor spend cap $500 · 2-bid $5K ·
full trade→vendor roster named (Butcher/All Around/A&P/Grizzley/Alamo/AAA/
Broussard) · **rent is ALL-ELECTRONIC (no checks — supersedes the 07-21
"log each check" note; de-risks A-5 ACH)** · no rent reminders (deliberate
non-build) · agents NEVER speak eviction timelines · leasing line: name+number
only, "high teens PSF" range, books tour slots (**A-3 needs a calendar seam**),
exclusivity-conflict screening only · COI soft gate (dispatch+chase; GL $1M/$2M
+ Belle addl insured; COI/W-9/license gate at PAYMENT not dispatch) · make-ready
as-is/deal-driven · move-out solo walk+photos ≤30d · monthly documented walk ·
house HVAC PM semi-annual (149 excluded). 6 automation candidates + full A-3
script derivation queued in the doc's "Derived outputs" section.
**A-3 voice is now UNBLOCKED.** Doc-only session — no code, no deploy needed.
Prior: 2026-07-23 (late) — **OPTIMIZATION PASS (4 carry-forwards) + C3
FOLLOW-ONS SHIPPED + DEPLOYED** (233 tests). Operator-ordered: hardening → C3
→ verify each. Shipped: **#4 facts single-sourced** (new `src/lib/facts.js` +
`src/data/instruments.json`; D-1 parking KPI / W-1 covenant cards / T-1 JD
Bank all derive — no fact literals in views) · **#5 URL hash routing**
(`src/lib/router.js`; #sheet deep links, back/forward, sealed sheets snap to
first visible; smoked in preview) · **#8 rate limiter FAILS CLOSED**
(underDailyCap tri-state allow/limit/outage → 429 vs honest 503 on all three
paid endpoints) · **#7 staleness guard** (test/generated-freshness re-derives
units.public.json/_seed.json/_context.mjs from live sources — a forgotten
`npm run split-seed`/`concierge-context` now FAILS the suite; export-package
gained OTB_EXPORT_DIR so tests never touch export/) · **C3-1 lot8+field-149
zone rects** (stall-map.json `zoneRects` from parking ticks; A-1 🚗 now paints
all three camera-covered ranks; est-geometric until the stall walk) ·
**C3-2 heartbeat** (migration `c3_heartbeat` APPLIED — secret-gated
`get_occupancy_freshness`, wrong-secret raise verified; cron opens ONE
manager thread per outage keyed `c3-stale:<last-sample-day>` at 36h; manual
cron run clean, no false alert on the healthy pipeline) · **C3-3 weekly
rollup** (pure `weeklyRollup`/`rollupLine` → D-1 card 7-day sparkline;
brief-ready figure source). Advisors: same accepted definer-WARN class only.
**Operator smoke: D-1 Parking card shows "7d ▁▃▅… avg %" tail · A-1 🚗 →
green/outline rects also at the Lot 8 pocket + 149 corner · URL bar tracks
sheets (#roll etc.), back button walks them.**
Prior: 2026-07-23 — **A-1 COI AI-parse + A-2 MAINTENANCE both SHIPPED +
DEPLOYED** (212 tests, now 13 sheets).
**A-2 (same day):** new **M-1 Maintenance** sheet + migration
`maintenance_module` (APPLIED): event-sourced work orders — INSERT-only
`maintenance_requests` + append-only `maintenance_events` (status/assign/note),
`maintenance-photos` bucket (folder per request id), new **tenant role**
(magic-link match against operator-managed `tenant_contacts`, tenant lands on
M-1 scoped to their unit — same lattice as vendors). Operator face: queue ·
vendor assign (service roster) · status flips · tenant-login roster editor ·
file-on-behalf. Owner: read-only. **V-1 vendor face now shows assigned work
orders** (notes + ✓ Mark complete). W-1 seeds live "Work Order" cards
(mr:<id>, overrides/dismiss work as usual). Cron: `get_open_maintenance`
(secret-gated, wrong-secret raise verified; body query smoke-tested w/
rollback) → aging unassigned requests (2d, emergency 1d) open a manager
thread idempotently (`maint:<id>`). Manual cron run clean. Advisors: same
accepted definer-WARN class only. Built `(org_id,property_id)`-shaped per plan.
**Operator smoke: M-1 → submit a test request w/ photo → assign a vendor →
W-1 shows the card → V-1 (as that vendor) shows the work order.** To onboard a
real tenant: M-1 → Tenant logins → add email+unit; they magic-link in as usual.
V-1 operator panel: 🤖 Parse cert (or drop a PDF on the vendor panel) → cert
files in the vendor folder → `api/coi-parse.js` (operator-only, daily-capped,
Haiku forced-tool `record_coi`) → seam `src/lib/coiparse.js` normalizes
(date shape/plausibility, deterministic note "Carrier · GL $1M/$2M · pol …")
→ pre-fills coi_expires/coi_note → operator clicks Save COI. Prod bundle +
401/405 endpoint gate verified. **Operator smoke: V-1 → any service vendor →
🤖 Parse cert with a real ACORD PDF → date/note prefill → Save COI.**
**NEXT: A-3 voice (Twilio ConversationRelay, decided) — ~~A-4 gate~~ CLEARED
2026-07-24 (SOP capture done; scripts derive from
docs/a4-sop-capture-2026-07.md §Derived outputs).**
Prior: 2026-07-22 (night) — **FINAL BUILD PLAN adopted + gates decided
+ A-0 done.** Session: operator confirmed the visual smoke round · market scan
(Placer.ai = skip, broker-pull instead; PM platforms = keep building, gaps are
payments/GL/CAM-rec/e-sign) · `transfer-package/16-competitive-landscape.md`
(Pickspace = lane rival; wedge = measured occupancy · guardrail numerics ·
governed onboarding · voice ops) · `transfer-package/17-final-build-plan.md`
(Phases A–D; validated demand: 1–2 outside owners want in). **Gates (operator
"1A 2A 3A 4A"): Twilio ConversationRelay + Claude personas · free
design-partner pilots · Stripe ACH now (Aug 1 ledger pairing) · QBO sync, no
own GL.** A-0 secret rotation EXECUTED + smoked (see SYSTEM EXTRACTION note).
**NEXT: A-1 COI AI-parse (approved, seams ready) → A-2 maintenance w/ photos →
A-3 voice (needs A-4 SOP capture session — schedule the operator interview).**
Prior: 2026-07-22 — C3-A FULLY ARMED: sampler died a 3rd time (silent,
~02:38, no reboot/crash record) → **Task Scheduler watchdog** now self-heals it
(OTB-C3-Sampler-Watchdog, at logon + 5 min; tools/sampler-watchdog.ps1 -Register
to re-register). **Archive backfill discovered + built** (tools/cube-backfill.mjs):
DW Spectrum serves TRUE archive frames at native res via
`/ec2/cameraThumbnail?cameraId=<id>&time=<epochMs>&height=1520` (the /rest/v2
image endpoint IGNORES timestampMs → live fallback; verified with a real 03:30
night frame). Today's 12-hr gap recovered (2,467 frames). **All 8 cams' stall
zones AUTHORED** (34 stalls, docs/c3-stall-zones.json; tools/c3-overlay.py =
authoring loop; busy-frame crops validated) + live Haiku classify verified
end-to-end (key pulled from Vercel env at runtime — never on disk/chat/repo;
`npx vercel env pull` → load → delete). NOTE: capture day-dirs are UTC-keyed
(late-evening local frames land in next day's dir). Occupancy JSONL accruing in
`<capture>/occupancy/`. **SAME DAY (evening): stall map + occupancy surface
SHIPPED + DEPLOYED.** `src/data/stall-map.json` (34 stalls → row56 index /
lot8 / field-149 / aisle-101 / north-edge; est-geometric ±1 until an operator
stall walk) + pure seam `src/lib/occupancy.js` (+6 tests → **197**). Migration
`c3_occupancy`: occupancy_samples append-only, PK (frame,stall), read
owner/operator, writes ONLY via secret-gated post_occupancy_samples (gate
smoke-tested; advisors = accepted definer-WARN class only).
`tools/c3-upload.mjs` posts a day's JSONL idempotently (636 → 0 re-run;
CRON_SECRET via `vercel env pull`, load, delete — never chat/repo). A-1 →
**🚗 Occupancy** chip (REMOTE-only, latest state over the row56 tick band) ·
D-1 → **"Parking Occupancy (C3)"** card. Prod bundle verified (105-s1 /
occupancy_samples / chip in assets). **Daily ops until a cron lands:**
`c3-stalls.py --classify --date <UTC-date> --every 12` (ANTHROPIC_API_KEY
same pull-load-delete drill) then `node tools/c3-upload.mjs --date <date>`.
**Operator smoke: D-1 → "Parking Occupancy (C3)" card · A-1 → 🚗 chip →
green/outline stalls along the storefront row.**
**Classify+upload cron SHIPPED same evening:** Task `OTB-C3-Nightly`
(daily 23:45, tools/c3-nightly.ps1; -Register to re-register) — pulls
secrets from Vercel env at runtime, classifies current+previous UTC dirs,
uploads. Live-tested under the scheduler: 151 requests / 643 samples
(⚠ lesson: PYTHONUTF8=1 — Task Scheduler python stdout is cp1252; the
verdict-arrow print killed the run after ONE frame, and the failure mode
looked like success). occupancy_samples = 1,326 rows spanning 07-21→07-22.
The whole C3 loop is now hands-free: sampler (watchdog-healed) → nightly
classify+upload → A-1/D-1 surfaces.
NEXT: lot8/field-149 overlay geometry → stall-walk index verification →
weekly occupancy rollup (owner-brief candidate section).
Prior: 2026-07-21 — smoke round MOSTLY PASSED (operator); 🛰 Satellite lens
REWORKED + DEPLOYED same day (georef refit for Esri refresh · plan-orientation
bearing · unit-number labels · asset-pin layer). Prod = HEAD, **191 tests**.
Prior: 2026-07-20 — HORIZONTAL LAYERS + B1 + C1 + harvest #3 SHIPPED (see
"SHIPPED 2026-07-20" below).
Prior update: 2026-07-16 (evening). Today: Cube creds landed → 17/17 camera aims
frame-verified + baked (Server Cabinet reclassified exterior, rear 101/103) · C3 sampler
running · harvest #2 SHIPPED (auto-trigger cron → AI-1 threads; found live 115/117 renewal
window, operator in discussions — strict stance, $24K AC approved) · sidebar-clip bug fixed
(PENDING DEPLOY, see ⚠ above) · B2 microsite DEFERRED by operator until new drone/camera
footage. Multi-space tenants: units stay individual (operator decision; rent-roll combine
= future display option only).

## ⚡ NEXT SESSION — START HERE
**2026-07-22 (late): FINAL BUILD PLAN ADOPTED — `transfer-package/17-final-build-plan.md`**
(+ §16 competitive landscape: Pickspace = the lane rival; wedge = measured
occupancy / guardrail numerics / governed onboarding / voice ops). Operator
validated demand: 1–2 external properties want onto the software. New scope
folded in: SOP codification (A-4) · maintenance requests w/ photos (A-2) ·
call-in voice agents w/ transcripts (A-3). **Execution order: ~~A-0 secret
rotation~~ → ~~A-1 COI AI-parse~~ → ~~A-2~~ (all DONE 07-22/23) → A-3/A-4 →
Phase B multi-tenant schema → pilots.** Gates DECIDED (operator "1A 2A 3A 4A"): D-1 Twilio
ConversationRelay + Claude personas · D-2 free design-partner pilots · D-3
Stripe ACH now (pairs with Aug 1 ledger go-live) · D-4 QBO sync, no own GL.
D-5 (name/domain/pricing/entity) parked until Phase B.
**Live app:** https://otb-command.vercel.app (magic-link; operator = adam@adamabdalla.com).
**PROD = HEAD as of 2026-07-23:** A-1 COI AI-parse + A-2 maintenance module
(M-1 sheet, tenant role, work orders, photos, aging cron) deployed and
bundle-verified on top of everything below. **212 unit tests.**
**C3 sampler:** RELAUNCHED 2026-07-20 (died with a reboot 07-19 ~17:14; first tick verified
20:11, 17/17 cams; ≈26.3k frames banked 07-16→07-19). Detached node PID in
`Drone Footage RAW/OTB-cube-capture/sampler.pid` (300s × 17 cams → that dir, OUTSIDE the
repo — never let frames back into the project; TaskStop orphans npm children, kill the node
PID directly). **Does NOT auto-start on reboot — relaunch per the quoted --out lesson below.**
Cube creds: `~/.otb-cube.env` (in).
Collector HARDENED 2026-07-17 (30s fetch timeouts · re-login on all-fail/401 tick — the old
re-auth path was dead code · no tick stacking · appends `sampler.log` in the capture dir).
⚠ LAUNCH LESSON: `Start-Process -ArgumentList` splits unquoted space paths — the 07-16
overnight run wrote 2,890 frames to `Downloads\Drone\` (recovered + merged 2026-07-17; junk
dir deleted). Always pass the --out path with embedded quotes: `'"C:\...\OTB-cube-capture"'`.
**State:** 13 sheets, all deployed: D-1 · A-1 (📍 asset pins + 🅿 parking layer + 🎥 CCTV
layer w/ drag-to-place ✎ Adjust + 🚗 Occupancy chip) · A-2 Spatial (4 lenses; Lens B 🏗 Mesh
toggle; 🎥 Reality clickable + unit overlay; 🛰 frozen sat base) · R-1 · P-1 · C-1 (⏱ event-
sourced history) · T-1 · W-1 (live work-order cards) · K-1 · **M-1 Maintenance (NEW —
tenant/operator/owner faces)** · S-1 Safe · AI-1 Agent Desk (voice, thread-persistent) ·
V-1 Vendor Portal (COI tracking + 🤖 AI cert parse + assigned work orders).
**212 unit tests.**
**FIRST MOVES next session:**
1. ~~Operator smoke round~~ **CONFIRMED 2026-07-22 (operator: "all smoke items appear"):**
   D-1 Parking Occupancy (C3) card · D-1 Network (UniFi) card · A-1 🚗 Occupancy chip ·
   C-1 ⏱ History · A-1 Size lens · V-1 COI date→badge · AI-1 reload-resume ·
   AI-1 📊 Briefs → July → Open 🔒 · A-2 🛰 frozen satellite base.
   (Interaction smokes still open in punch-list #7: PDF attach on K-1 · 🎥 Reality orbit ·
   lease-package assembly · V-1 vendor-folder upload · leasing-calc question.
   **NEW smokes pending from 07-23:** V-1 🤖 Parse cert with a real ACORD PDF ·
   M-1 submit→assign→W-1 card→V-1 vendor work order · add one real tenant login.)
2. **BUILD QUEUE (plan §Phase A — all approved, work in order):**
   ~~**A-1 COI AI-parse**~~ ~~**A-2 maintenance w/ photos**~~ **BOTH SHIPPED +
   DEPLOYED 2026-07-23** (see Last-updated block above for smokes).
   Next **A-3** voice lines
   (Twilio ConversationRelay, decided) — but A-3's triage scripts come from
   **A-4 SOP capture**, so schedule that operator interview early → **A-5**
   Stripe ACH (decided: pair with Aug 1 ledger go-live).
   ~~C3 classifier decision~~ RESOLVED (1A) + SHIPPED 07-21/22; next C3 =
   lot8/field-149 overlay geometry → operator stall walk → weekly rollup.
3. Twin-marketing status: ~~B1 · A2 · C1~~ **DONE** · B2 microsite DEFERRED (awaits new
   footage) · remaining: B3 fly-through · B4 public scoped leasing bot · C2 sandbox login ·
   C3 LinkedIn series. **Vinyl PRINT is gated on the canonical-domain decision** (punch-list
   — QR currently encodes tel:; re-run `python tools/vinyl-b1.py --url https://…/tour` once
   B2 + domain land). Full plan in the 2026-07-15 chat digest below.
3. **Blessed creative direction:** operator picked the NAVY/WHITE creative poster
   ("the blue advertisement") = `OTB-poster-X-boulevard` from `tools/poster-specials.py`
   (plat-as-art, "27 doors / 25 taken"). Use its aesthetic for the microsite + QR vinyls.
   (If he meant the dark-navy OO showcase instead, confirm — X is the strict-navy one.)
**Deploy rule:** commits do NOT auto-deploy → `npx vercel deploy --prod --yes --scope adams-projects-0c52918e`
(CLI logged in as orangeonyx). `.vercelignore` governs uploads (NOT .gitignore — splat 16MB +
mesh 3MB ride in public/). Dev server = port **5199** (`.claude/launch.json`; 5173 belongs to
another project). Local preview without login: move `.env` aside, RESTORE IT AFTER.

### SHIPPED 2026-07-21 (part 5) — UNIFI NETWORK CARD (key delivered via ~/.otb-unifi.env)
- **Probe** `tools/unifi-probe.mjs` (reads the env file, never prints the key):
  UDM Pro "Belle" (WAN 76.72.15.3) + USW Pro Max 16 PoE + U7 Pro XG Wall + 5 suite
  AC Pros (101 Johnston side, 101 above door, 107, 119, 137, 149). Site: 10 devices,
  **1 offline WiFi unit that Site Manager drops from the device list** (unnamed via
  API — operator should identify it in the UniFi console).
- **D-1 "Network (UniFi)" KPI card**: pure seam `src/lib/unifi.js` (+3 tests → 191)
  · server proxy `api/unifi.mjs` (key ONLY in Vercel env UNIFI_API_KEY — added via
  CLI, never in chat/repo; owner/operator session gate like concierge; 401 verified
  unauthenticated) · card shows up/total, health line, client count, and flags the
  unlisted-down unit. Best-effort: card absent in local mode or on API outage.
  **Operator smoke: D-1 → "Network (UniFi)" card (expect 9/10 up, brick-red).**
- Deferred: offline-device auto-trigger (cron candidate `unifi:<date>` → manager
  thread) · per-AP uptime history. Build after C3 zones finish.

### SHIPPED 2026-07-21 (part 4) — FROZEN SATELLITE BASE (operator decision: 1→2)
Operator picked: freeze the Esri base now, swap to the owned drone ortho after the
roof re-fly (the current RTK ortho is roof-plane-projected — parking field is gaps).
- NEW `tools/build-sat-base.py`: composites the z19 tiles the georef was FITTED
  against → `public/OTB-sat-base.jpg` (700 KB, committed) + `src/data/sat-base.json`
  (MapLibre image-source corners). **Re-run ONLY together with fit-georef +
  extract-georef** (base and footprints must share one imagery vintage).
- scenegeo.js: live Esri tile source → static image source. Kills BOTH drift
  classes forever (per-zoom vintage mismatch + silent Esri refreshes); loads
  instantly; ortho swap later = same corners contract, different image.
- Verified: offline registration proof (export/_satbase_check.jpg — footprints hug
  both buildings on the frozen image) · runtime: map constructs, bearing 232.25,
  27 unit markers, asset serves 200, console clean (style paint = occluded-tab rAF
  limitation, standing lesson) · prod serves OTB-sat-base.jpg + chunk carries it.
  **Operator smoke: A-2 → 🛰 (should look identical, load faster, never drift).**
- Mesh-toggle smoke CONFIRMED by operator (07-21). Kept: it's the photoreal skin
  for the 3D twin (marketing/leasing show-piece); zero maintenance.
- UniFi: `~/.otb-unifi.env` CREATED with empty UNIFI_API_KEY= — operator pastes key
  into the file (never chat), then build the Site Manager probe (rank: after C3).

### STARTED 2026-07-21 (part 3) — C3-A OCCUPANCY (operator picked classifier 1; scope A assumed)
- **Sampler died AGAIN ~14:36 (second unexplained death; first was the 07-19 reboot).**
  Relaunched 21:2x, new PID in sampler.pid, first tick verified. If it keeps dying,
  consider a Task Scheduler auto-restart (operator decision).
- **NEW `tools/c3-stalls.py`** + `docs/c3-stall-zones.json`: per-camera stall quads
  (native px) → perspective crops → one Haiku request per FRAME (all stalls labeled,
  strict JSON schema) → `<capture>/occupancy/<date>.jsonl` (outside repo), idempotent.
  Commands: `--grid <cam>` (authoring frame) · `--montage` (crop check) · `--classify
  --date … --every 12` (hourly sampling of the 300s frames).
- **suite-105-parking: 3 zones authored + VALIDATED** against a known daytime frame
  (s1 empty / s2 occupied / s3 empty — crops match ground truth; see
  export/c3-daytime-check.jpg). ⚠ Authoring lesson: read coordinates at NATIVE res —
  first pass used downscaled-display px and every quad was half-scale.
- **NEXT:** author zones for the remaining storefront cams (suite-101/113-n/113-s/
  119/131 + politics + jasons-deli-149-parking; ~4-6 stalls each) · then the live
  Haiku run — needs ANTHROPIC_API_KEY exported locally (key lives only in Vercel env;
  never in chat/repo) · then physical stall mapping (cam-local ids → row 1-56) ·
  then an occupancy surface (A-1/D-1). Batches API halves cost for historical sweeps.

### SHIPPED 2026-07-21 (part 2) — LEDGER-LITE (harvest #4, belle-realty-pwa donor)
Operator delegated the wiring decisions → built as recommended (1A drawer+P-1 ·
2A cron auto-post · 3A suggest-only late fees · uniform policy).
- **Pure seam `src/lib/ledger.js`** (+14 tests): donor late-fee engine (5-day grace,
  $100 flat + $25/day — "OTB standard schedule", donor constants), append-only entry
  algebra (void = its own entry, `void_of` → target), FIFO aging (≤30/31-60/61-90/90+),
  idempotent month charges (`rent:YYYY-MM:unit`), late-fee SUGGESTIONS (silenced by
  the posted fee's deterministic id `late:YYYY-MM:unit`).
- **Migration `ledger_lite`**: `ledger_entries` append-only (read owner/operator ·
  insert operator · NO update/delete) + secret-gated `post_rent_charges` RPC (same
  app_secrets 'auto_trigger' row). Gate smoke-tested: wrong secret = exception,
  real secret + empty payload = 0. Advisors: only the accepted definer-WARN class.
- **Cron** (api/auto-trigger.mjs): posts the month's TOTAL-rent charges daily-
  idempotently, **gated to LEDGER_START_YM = 2026-08** (going live mid-July would
  fabricate receivables for rent already paid off-system — deliberate). Summary
  field `rent`: "pre-start" until Aug 1, then {month, inserted:25}.
- **Drawer "Ledger" panel** (lib/ledgerUI.js): balance headline, last 10 entries
  w/ running balance, void ✕, add payment/charge/credit/adjustment/NSF/write-off,
  late-fee suggestion chip → operator confirms → posts. Owners read-only (CSS),
  vendors never reach it. REMOTE-only (local mode = note).
- **P-1 "Collections & aging" card**: month collected-vs-charged + per-unit aging
  table (async fill, C-1 history pattern).
- **188 tests.** DEPLOYED; prod bundle verified (dwLedger/finLedger/ledger_entries/
  led-sugg). Local-mode DOM verified in preview (drawer renders, console clean).
- **Workflow (operator):** starting August, log each rent check in the unit's
  drawer → Ledger → "Payment received". Aug 1 cron seeds the charges.
- **Uniform-policy assumption stands** unless a lease says otherwise — flag any
  tenant whose lease carries different late terms and the policy goes per-unit.
**Merger queue COMPLETE 2026-07-25:** ~~#5 capex/insurance/OCR engines~~ →
~~#6 e-sign/tenant-portal schemas~~ — all harvested; donors are archives.

### SHIPPED 2026-07-21 — 🛰 Satellite lens rework (operator smoke feedback on #8)
Operator ran the 07-20 smoke round: **mostly passed**; #8 (satellite) flagged —
footprints offset, no unit numbers, orientation ≠ A-1, no asset pins. All four fixed:
1. **Georef REFIT** (Esri had refreshed imagery again): `python tools/fit-georef.py` →
   anchorLL [30.201689, -92.053983], azY 52.25 (was 51.75; on-roof .94/.84, shared
   shift E−2.0m S−0.5m). Pasted into extract-georef.py + regenerated. NOTE: the
   fitter's control-point line ("nearest bay 75m") is EXPECTED — the Skydio thermal
   spot was retracted to the neighbor's roof; ignore that sanity note.
2. **Plan orientation**: Lens C now opens at bearing azY+180 (232.25°) = A-1's exact
   arrangement (M.Antoinette top, 101 left, short building right, 149 at Arnould
   corner); compass control resets north-up. Verified via offline rotated-tile
   composite `export/sat-plan-orientation-preview.png` (occluded preview can't
   paint MapLibre — standing lesson).
3. **Unit-number labels**: DOM markers at footprint centroids (screen-upright at any
   bearing; NO glyph server → no CSP change). Thin bays (117.5–121) sit tight at
   low zoom — acceptable, zoom resolves.
4. **Asset-pin layer on satellite**: NEW pure seam `src/lib/geoproject.js` — fitted
   plan-px→CAD-ft affine (PLAN2CAD, rms ≤5px, icon-grade) + cadToLL mirror of
   extract-georef + planBearing + numerically-stable ringCentroid (shoelace relative
   to first vertex — raw lng/lat cancels catastrophically on thin rings). A-1 📍 pins
   project through the live georef; store "features" events → `refreshPins()` (wired
   in spatial.js). Pins render once the operator does the A-1 pin walk (punch-list #5
   — now feeds BOTH lenses).
+5 tests → **174**. DEPLOYED; prod scenegeo chunk verified (new anchor, geo-unitnum/
geo-pin, refreshPins). **Operator re-smoke: A-2 → 🛰 — plan-oriented, labeled,
registered; drop one pin on A-1 and see it appear on 🛰.**

### SHIPPED 2026-07-20 — horizontal enabling layers + B1 vinyls + C1 case study + harvest #3
**Goal session (operator: "/goal completion of the todos" + horizontal-layer audit).**
Five cross-cutting layers identified (audit in chat); three SHIPPED, two queued:
1. **esc consolidation + brand kit** — ONE canonical escaper (`src/lib/format.js esc`,
   null-safe); lease/brief/concierge/main.js/export-package all import it (export-package's
   old copy didn't escape `"` — fixed). NEW `tools/otb_brand.py`: palettes (OTB navy/white ·
   OO · plan-room), fonts, contact blocks, logo paths, esc — poster/pylon/plat/poster-specials
   now import it (all 10 artifacts regenerate byte-clean).
2. **Persisted-layer registry** — NEW `src/lib/layers.js`: store.js state shape/resets/
   persist/export AND remote.js sync allowlist all derive from ONE table (killed the
   hand-synced twin lists — the silent never-syncs-to-Supabase bug class). Adding a layer =
   one entry + an applySnapshot branch. +6 tests.
3. **Server Supabase wrapper** — NEW `api/_supa.mjs`: URL/key/headers spelled ONCE; user-JWT
   family (supaJson/supaPost/rpcUser) vs secret-gated RPC family (rpcSecret) made explicit;
   storage upload→sign helpers. _auth/concierge/voice/seed/auto-trigger rewired.
4. **B1 QR window vinyls SHIPPED** — `python tools/vinyl-b1.py` → marketing/OTB-vinyl-131/133
   (SVG + PNG + 24×36" print PDF; copied to G:\My Drive\00 OTB). Blessed X aesthetic, strict
   navy/white, plat-as-art with the suite lit + "THIS ONE IS YOURS" leader, segno QR.
   **QR defaults to tel:+13377691554 ("SCAN TO CALL ADAM") so it works the day it prints**;
   re-run with `--url https://…/tour` when B2 + the domain decision land (caption auto-switches).
5. **C1 OO case study SHIPPED** — `python tools/case-study-c1.py` → marketing/
   OO-case-study-OTB.html/.pdf/.png (on G: too). "The Instrumented Asset", OO brand (light
   logo on light bg), one-page letter; audited figures only, 2025 stats labeled, no financials.
6. **Harvest #3 (otb-ops donor = OneDrive/Desktop/OTBPROPOPS/OTB_Ops_Tool_v5.html):**
   heat-map lenses were ALREADY mostly shipped (A-1 status/expiry/rent/use/hvac) — delta was
   the donor's **Size lens** (new A-1 "Size" chip, palette ramp, vacants color too; verified
   in preview: 22 distinct fills, legend 1,272→6,877 SF). **Event-sourced compliance** built
   natively: migration `compliance_event_log` (append-only `compliance_events`, insert=operator,
   read=owner/operator, NO update/delete policies) + `lib/compevents.js` seam + C-1 **⏱ History**
   panel (REMOTE only) — every matrix flip logs who/when/what, best-effort (never blocks the click).
   +10 tests → **156**. DEPLOYED; prod bundle verified (compliance_events/mx-hist in JS, sf chip in HTML).
**Smoke (operator):** C-1 → flip any cell → ⏱ History shows the row · A-1 → Size chip.

### SHIPPED 2026-07-20 (part 2) — Phase 3: last two layers + the features they unlock
7. **Bucket-store factory** — NEW `src/lib/bucketstore.js`: shared id/sanitize/path helpers,
   IndexedDB micro-backend, audit-log factory, and `createBucketStore({bucket, ttl, audit,
   local})` (standard folder/id__name shape). docs.js / safe.js / vendors.js are now thin
   configs (~120 dup lines gone, public APIs byte-identical — their test files pass
   unchanged); assets.js adopts the primitives but keeps its kind-embedded path convention.
   Audit default = configured-only (operator pick (b): no behavior change on adoption).
8. **Card registry** — NEW `src/lib/cards.js`: `registerCard(type, validate)` +
   `extractCards/stripCards`; package (https-only) + brief (strict YYYY-MM) are built-ins;
   lease/brief keep compat wrappers; AI-1 view now parses ALL card types in one pass
   (manual extractBriefs(extractPackages(…)) chaining gone). [[coi:]]/[[thread:]] = one line.
9. **COI tracking SHIPPED** (P3 deferred item) — migration `vendor_coi_tracking`
   (vendors.coi_expires/coi_note; existing RLS covers it). Pure seam `src/lib/coi.js`
   (expired/≤30d critical/≤60d expiring/ok). V-1 operator face: COI badge on every service
   vendor row (missing = slate "COI —") + date/note editor in the vendor panel; vendor face
   shows their own cert status + renewal nudge. Workflow: file the cert in the folder, set
   the date. **Smoke: V-1 → any service vendor → set a COI date → badge updates.**
10. **AI-1 thread persistence** — per-agent thread id + transcript persist to localStorage
   (`otb-ai-state-v1`); a reload resumes the SAME conversation (server threads already
   persisted; the client now keeps pointing at them). + New / History / agent switch all
   persist. **Smoke: ask AI-1 something, reload, conversation still on screen.**
   +13 tests → **169.** DEPLOYED; prod bundle verified (coi_expires/vpCoiSave/otb-ai-state-v1).

### ⚠ C3 SAMPLER — died 2026-07-19 ~17:14 (machine reboot?), RELAUNCHED 2026-07-20
Captured before death: 07-16: 8,769 · 07-17: 8,297 · 07-18: 4,694 · 07-19: 4,539 frames
(≈26.3k total — plenty for C3 design). Relaunched detached (node, 300s loop, quoted --out
per the 07-16 lesson), new PID in `sampler.pid`. If the machine reboots, relaunch the same
way — the sampler does NOT auto-start.

**QUEUED next (Phase 4):** **C3 occupancy processing** over the captured frames — needs the
C2 per-camera de-warp/stall-zone step first (docs/camera-4d-brief.md); design decisions
pending: which cams cover which stall groups + VLM vs classical classifier (cost). Then
B3 fly-through · B4 scoped bot · C2 sandbox · C3 LinkedIn (footage-gated: B2).

### OPERATOR punch-list (nothing here is Claude-doable)
1. **Call the roofer** — `docs/roof-condition-brief.md`: membrane failure, long-building RTU row
   (~101–109), open to weather since ≤Oct-2025. K-1 register row + W-1 card live. (The "thermal
   anomaly near 149" was RETRACTED — neighbor's roof.) Mark findings on the roof ortho.
2. ~~Rotate both API keys~~ **CLOSED 2026-07-14**: both keys rotated via Vercel dashboard,
   old keys disabled at both providers, redeployed, authed AI-1 question + 🔊 reply
   confirmed both keys end-to-end (operator, 2026-07-14).
3. **Enable CAPTCHA** — Supabase Dashboard → Auth → Bot & Abuse Protection (no API for it).
4. **10-min roof RE-FLY** (when the Skydio is next up) — recipe in
   `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`; unlocks gap-free ortho + real roof
   splat through the already-scripted pipeline.
5. **Asset-pin walk** — A-1 → ＋ Pin: drop a pin per water shutoff/meter/bench/can/column.
6. **Drag-drop blessed photos** — `Belle Shared Drive/Marketing/_BLESSED-2020-shoot/app-ready-2000px/`
   → K-1 Site imagery + unit drawers (2 min).
7. **Smoke tests still unconfirmed:** attach a PDF to a K-1 row · 🛰 Satellite click · 🎥 Reality
   orbit · 🏗 Mesh toggle · one lease-package assembly · one V-1 vendor-folder upload.
   (AI-1 authed question + 🔊 reply CONFIRMED 2026-07-14 during key rotation.)
   ~~C-1 ⏱ History · A-1 Size lens · V-1 COI date→badge · AI-1 reload-resume~~
   CONFIRMED 2026-07-22 (with the C3/UniFi/🛰 round). Still open: leasing-calc
   question ("retain at $17 vs replace at $20…").
   NOTE 2026-07-13: 🎥 Reality was BROKEN in prod since the 07-10 CSP (script-src lacked
   'wasm-unsafe-eval' → GaussianSplats3D's WASM sorter blocked → infinite "Processing
   splats…"). Fixed in vercel.json + deployed 07-13; A/B-verified locally against the
   prod-exact header. Lesson: after CSP changes, smoke every WASM/worker surface
   (splat lens), not just the login page.
8. Decide canonical domain (ontheblvd.com per Apr-2026 brand doc vs shopontheblvd.com in the
   2025 package) before the next print run.

### SYSTEM EXTRACTION 2026-07-22 — `transfer-package/` (committed 2203d23/f7ec178)
Full portable spec: 16 narrative sections + 10 machine-readable JSONs (features/
data model/rules/workflows/screens/architecture/agents/reusable assets/open
questions, stable OTBC-* ids) + **Supabase migration DDL exported verbatim to
`supabase/migrations/`** (17 files — closes OTBC-Q-001).
~~⚠ rotate the `auto_trigger` shared secret~~ **CLOSED 2026-07-22 (A-0):**
rotated end-to-end with the value never touching chat/repo — migration
`20260723014510_rotate_shared_secret` (secret-gated definer RPC, old secret
authorizes, 64-hex shape guard) + `tools/rotate-secret.mjs` (pull Vercel env →
generate → RPC → new value to temp file → `vercel env add` from stdin → delete
temps). Deployed; smoked: junk secret 401 · rotated secret 200 (full detector
run: scanned 3 / skippedExisting 3 / brief exists). Advisors: same accepted
definer-WARN class only. ⚠ Drill lesson: Vercel rejects env values with
trailing whitespace AT DEPLOY TIME — write the secret file with NO newline.
The drill is now re-runnable any time (script is committed, secrets are not).
**DECISION (operator, 2026-07-22): rebuild target = MULTI-PROPERTY PRODUCT**
(OTBC-Q-002 closed; OTB = tenant #1/reference dataset). Concrete deltas +
sequencing: transfer-package/14-canonical-architecture.md "Decision addendum".
**Top carry-forward problems distilled by the extraction** (full list:
transfer-package/00-README.md): client-side-only owner sheet privacy (RLS reads
all layers) · hardcoded facts in views (D-1 parking "324/344", T-1 JD Bank
date, W-1 covenant prose) · no URL routing · schema-free property_state layers
· split-seed/concierge-context/georef regen footgun · fail-open rate limit +
CAPTCHA still off · C3 pipeline has no heartbeat/alerting · manual deploys.
These are candidate work items, not regressions — pick by number when ready.

### CLAUDE next-action menu (say the word)
- **APPROVED QUEUE:** ~~B1 · A2 · C1~~ DONE (07-17/07-20) · B2 deferred (footage) ·
  remaining: **bucket-store factory + card registry → COI tracking + thread persistence ·
  C3 occupancy processing** · then B3 fly-through · B4 scoped bot · C2 sandbox · C3 LinkedIn.
- **Splice the approved 2026 end card** into the marketing video (ffmpeg; card + spec in
  `Belle Shared Drive/Marketing/`; treatment A rendered and delivered 2026-07-12) — note
  B3 (twin fly-through) supersedes/absorbs this if built together.
- Tenant-spotlights photo folder (from the 334-frame review) · satellite-lens asset pins ·
  photo-per-pin · COI tracking / vendor notifications · concierge thread-persistence polish ·
  avatar (needs provider decision) · custom domain + SMTP wiring (needs operator DNS) ·
  Magnolia 121 lease swap (needs executed copy) · B4 realtime.

### SHIPPED 2026-07-17 — A2 Owner Intelligence Brief (monthly, deterministic)
**A2 from the approved twin-marketing queue** (B2 deferred → A2 was next unblocked).
Monthly OO-branded owner report — NO LLM in the loop, every figure deterministic:
occupancy + scheduled-rent KPI tiles with precomputed MoM direction words (vs the
prior month's STORED model — real deltas start August), vacancies, holdovers,
12-month expiration table (115/117 Clothing Loft leads it — matches the live renewal
talks), owner-worksheet NOI + cap value ONLY when the P-1 opex worksheet exists
(July: omitted, none on file), open action cards. Pure seam `src/lib/brief.js`
(+9 tests → 139). Storage: new `owner_briefs` table (migration
`owner_intelligence_briefs`) — RLS read owner/operator, writes ONLY via secret-gated
SECURITY DEFINER RPCs (get/put_owner_brief, get_brief_state) on the same app_secrets
row as the cron; NO service-role key. Cron (api/auto-trigger.mjs) generates once per
month, idempotent (`summary.brief`: generated/exists/failed), and appends a
[[brief:YYYY-MM|label]] card line to the monthly seeded thread (strict YYYY-MM gate
client-side). AI-1 gains **📊 Briefs** archive panel; cards blob-open via RLS fetch.
DEPLOYED + LIVE-VERIFIED: manual cron run → "brief":"generated"; July row in
owner_briefs ($90,291/mo ≈ $1.08M/yr EGI ✓, 94.9% = 25/27 ✓); prod bundle carries
aiBriefs/owner_briefs; document visually verified via headless-Chrome render
(OO navy/orange, on-brand). Occupancy footnoted as demised-SF (62,810) vs audited
headline GLA 62,883. **Operator smoke: AI-1 → 📊 Briefs → July 2026 → Open 🔒.**
NOTE: July's card is NOT in the July thread (thread pre-existed the feature) — the
panel is the July path; August's thread will carry the card inline.

### SHIPPED 2026-07-16 (part 3) — visual sheet export (⤓ SHEET)
Topbar **⤓ SHEET** button (+ plain Ctrl+P): prints/saves the OPEN sheet as a PDF —
print CSS isolates `.page.on`, hides chrome, forces plan-room colors exact
(`print-color-adjust`), letter-landscape @page, scroll containers unrolled so long
tables flow across pages, and a drawing-set footer stamps sheet code + PRINTED date +
headline figures (doc title becomes the PDF filename, e.g. `OTB-R-1-2026-07-16`).
Dark mode auto-reverts to paper for print and restores after. Pure seam
`src/lib/printsheet.js` (+3 tests → 123). Verified in preview: button renders,
beforeprint/afterprint lifecycle stamps per-sheet (D-1/A-1) and restores; pixel/print
dialog check = operator (occluded preview can't screenshot). NOTE: WebGL lenses
(A-2 3D/satellite/Reality) don't rasterize into print — A-2's own ⤓ SVG chip remains
the export path there.

### SHIPPED 2026-07-16 (part 2) — calc engines + numeric guardrail in AI-1 (PWA harvest #1)
AI-1 agents now carry a **run_calc** tool (all three personas): deterministic engines
ported from belle-realty-pwa @ 19f7c06 into the pure seam `src/lib/calc/` — **NER
deal comparison** (retain-vs-replace / blend-and-extend / free-rent-vs-TI, pairwise
deltas + asset value at cap), **CAM gross-up** (variable-only to 95%, never grosses
down, Exhibit-C methodology line), **Louisiana eviction sequencer** (CCP 4701→4733,
waiver/acceptance-of-rent/bankruptcy/self-help traps, 200% holdover math), **monthly
KPI** (NOI/occupancy/collections with precomputed MoM direction words). **Numeric
guardrail** (`src/lib/calc/guardrail.js`, donor synth-validator M1/M2): once a calc
runs, later rounds are BUFFERED server-side and every $/%/decimal must trace to calc
output (≤0.5% tolerance; years/CCP articles/≤12 ints ignored) — FAILS CLOSED, replying
with the engines' own deterministic summaries instead. Chat without calcs streams
live as before. Manager persona stale-holdover line fixed. +26 tests (120).
Smoke test (operator): ask 🤝 Leasing "compare retaining a tenant at $17 vs replacing
at $20 with 3 months free and $10 TI, 5-yr term, 1,917 SF, 7.5% cap".
NEXT HARVESTS QUEUED: owner-brief auto-trigger (Vercel cron) → event-sourced
compliance + heat-map lenses (otb-ops) → ledger-lite → capex/insurance/OCR engines
(when their data surfaces exist) → e-sign/tenant-portal schemas.

### SHIPPED 2026-07-16 — SOT reconciliation (owner-corrected rent roll)
**All five holdovers RESOLVED** (105→3/31/29 · 109→9/30/28 · 117.5→2/28/29 · 119→2/28/27 ·
143→1/31/31), Upstream 145 signed $14.95 base / $19.95 total / $3,187.01 mo, Magnolia 121
→12/31/31, ~15 expiration dates corrected to owner month-end dates (107 pulled back to
3/31/27), Pink Paisley allocations set to stated rent (owner-accepted −$4.84/mo vs formula).
Source dataset vendored: `docs/sot-2026-07/` (authority ranking + validation rules +
known-exceptions log, from belle-realty-pwa @ 19f7c06); full diff in
`docs/sot-reconciliation-2026-07.md`. CLAUDE.md anomalies for 101/117.5/135B/145 CLOSED
(deposits 107/137/143/149 still open). split-seed + concierge-context regenerated;
data-integrity guards updated to pin the documented stated-rent exceptions. 94 tests.
NOTE: D-1/P-1 "revenue at risk" and W-1 holdover cards now empty of holdovers — correct,
not a bug. Poster/dossier occupancy stats unchanged (131/133 still the only vacancies).

### SHIPPED 2026-07-15 (part 3) — marketing set + twin-marketing plan
Four pieces generated, reviewed, delivered to `G:\My Drive\00 OTB` (SVG+PNG+PDF), all from
committed re-runnable tools: **B refresh** (`npm run poster`, current availability) ·
**F two-bays** (plan-room, 131/133 halo + leader, "TOUR THIS WEEK") · **OO twin showcase**
("THE INSTRUMENTED ASSET", geometry.json plan + 16 camera cones in Sunset Orange, 6
capability cards, OO brand per brand-orange-ocean.md) · **X creative NAVY/WHITE**
("27 doors / 25 taken", plat-as-art, vacant bays pulse in SVG) ← **OPERATOR-LIKED** ·
**pylon refresh** (current logos). Generator: `tools/poster-specials.py` (imports poster.py
plumbing; regenerating A–E is a side effect). Copy-honesty fixes applied during review:
removed unverified "24 years" claim; fixed false "two doors from Jason's Deli" adjacency;
VPD phrased as "passing the center". Twin-marketing plan (3 audiences, ranked) delivered
in-chat + queued as tasks; operator approved the B2→B1→A2→C1 order.

### SHIPPED 2026-07-15 (part 2) — parking fix + CCTV Phase C1 + drag-to-place
**Drag-to-place cameras:** ✎ Adjust cams chip (operator-only) —
drag pin = move, drag brass dot = re-aim, double-click = reset; corrections persist
via the new store 'cameras' layer (localStorage + Supabase property_state + Export/
Import; remote.js LAYERS updated) and merge over the seed via applyOverrides().
Once the operator finishes the walk, bake overrides into cameras.json and clear.
94 tests. DEPLOYED. **Cube access LIVE (Tailscale):** dw-cube = 100.73.185.15,
DW Spectrum REST v2 verified from this box (device GUIDs = registry dwViewIds).
Collector ready: `npm run cube-frames` (--loop 60 = C3 sampling). Blocked only on
the operator creating a LOCAL Viewer user in DW Spectrum → `~/.otb-cube.env`
(CUBE_USER=/CUBE_PASS=). Do NOT commit creds; script self-documents.
**Storefront parking corrected to plat (REV 12):** the 56-space row against the long
building was drawn ANGLED since the original trace — plat + operator's daytime camera
views prove head-on; all 57 ticks now perpendicular. Main-field herringbone verified
plat-exact and untouched. **Parking carved out** into its own toggleable A-1 layer
(🅿 chip, default on) + pure seam `src/lib/parking.js` — ready to re-project into
satellite/Lens B later. **Phase C1 cameras SHIPPED:** `src/data/cameras.json` = the
17-camera DW Spectrum roster (Blackjack Cube NVR, LAN 10.10.10.101–117, cloud system
"Belle Reality" 97bad7e3…; 4 off-property 192.168.1.x cams excluded). A-1 🎥 Cameras
chip (default off) draws mounts + brass view cones; click a camera → DW cloud live
view. **ALL positions/aims ESTIMATED** (from names + the 2021 install-map plat in
`Camera Options for Belle.pdf` + daytime grid) — refine on an operator walk.
Full 4D roadmap: `docs/camera-4d-brief.md` (C2 de-warp/homography → C3 parking
occupancy → C4 VLM night-watch → C5 timeline lens). +11 tests (91). DEPLOYED,
prod bundle verified. Watch item: Bilawal Sidhu's "God's Eye View" OSS drop (July).

### SHIPPED 2026-07-13/15 digest
**🎥 Reality unit overlay (2026-07-15, operator ask)** — status-colored border on every unit
hit box + camera-facing unit-number chip above each parapet; in-pane "▦ Units on/off" toggle
(default on); selection still = brass wireframe (colored border yields to avoid z-fight).
Pure seam `labelSpecs`/`inkOn` in splat-align.js (+2 tests → 80). DEPLOYED; prod chunk
verified to carry it. Pixel check = operator (preview pane was occluded → 0 rAF, same
throttling class as the 07-03 MapLibre lesson — splat lens can't be screenshot-verified
in a hidden preview either).
**🎥 Reality lens prod hang FIXED + DEPLOYED** — the 07-10 CSP blocked GaussianSplats3D's
WASM sorter (`script-src` lacked `'wasm-unsafe-eval'`); splat stalled forever at "Processing
splats…" on the live site (dev sends no CSP header, so it only broke in prod). One-token
vercel.json fix, A/B-verified against the prod-exact header (commit c15e9bc). Lesson encoded
below: after CSP changes, smoke WASM/worker surfaces, not just the login page. ·
**Anthropic key rotated** into Vercel Production + redeployed (see punch-list #2 for the two
loose ends). · **Dev-server launch fixed**: `~/.claude/launch.json` (used when the session
cwd is the home dir) was stale on port 5173 — now mirrors the repo config (5199,
`--strictPort`, `autoPort:false`); an orphaned Vite on 5199 was killed. Keep both
launch.json copies in sync.

### SHIPPED 2026-07-11/12 digest (details in sections below)
A-2 polish (true-heights ⇅, north/scale, ⤓ SVG export) · tenant logo thumbs (drawer + R-1) ·
**P6d photogrammetry mesh in Lens B** (`npm run mesh-glb`) · **site-asset pin layer** (A-1
📍/＋ Pin, persisted `features` layer) · **roof orthomosaic** `OTB-roof-ortho-2025-10-15.png`
(3 cm/px, RTK direct-georef, in Drone Footage RAW + G: Drive) · **roof splat CLOSED as
capture-limited** (all SfM + pose-injected + MVS fail on the blank membrane + mixed zoom;
Postshot `roofsplat.ply` = fog, deletable; re-fly recipe written) · marketing library curated
(`_BLESSED-2020-shoot/`, 31 frames) · video end-card spec + draft card · **Jul-2025 marketing
package harvested** (`docs/marketing-package-2025.md`, K-1 row pd:mktpkg2025; conflicts flagged:
pkg GLA 62,749 vs audited 62,883, 5 ac vs 4.84) · 2025 story woven into dossier/buyer set/
poster B + concierge context · fresh exports + poster SVG/PNG/PDF + LLM zip on G: Drive.

### Knowledge graph — BUILT 2026-07-13 (`/graphify --obsidian --wiki`)
Lives in `docs/graph/graphify-out/` (gitignored; all regenerable): `graph.json` (572 nodes /
1,206 edges / 35 communities, GraphRAG-ready) · `graph.html` (interactive) · `obsidian/`
(607-note vault + graph.canvas — open `graphify-out/` as a vault to get wiki too) · `wiki/`
(45 agent-crawlable articles) · `GRAPH_REPORT.md` (audit; every edge tagged
EXTRACTED/INFERRED/AMBIGUOUS). Avg query ≈3.7k tokens vs ~104k naive (28×) — future sessions:
answer "how does X relate to Y" from the graph before re-reading the repo
(`/graphify query "..."` run from `docs/graph/`). **Update, don't rebuild:**
`/graphify <repo> --update` after doc-heavy sessions (code-only changes = free AST pass).
The corpus filter (noise exclusions per the old prep note) is encoded in
`docs/graph/_detect.py`; the other `_*.py` there are the re-run pipeline. Traced finding
saved into the graph: app render layer escapes through ONE chokepoint (`lib/format.js esc()`,
14 importers) + six independent local esc() copies in tools/server contexts (7 places to
patch an escaping bug). Stale root `graphify-out/` deleted 2026-07-13.
**Auto-refresh hook INSTALLED 2026-07-13** (`.git/hooks/post-commit` — hooks aren't
versioned; the file documents its own reinstall): every commit touching `.js/.mjs/.py/.sql/
.html` re-runs the filtered AST pass in the background and rewrites graph.json/html/report,
preserving the semantic (doc/image) layer and community labels (`docs/graph/_refresh.py` +
`labels.json`). Do NOT use stock `graphify hook install` — it writes an unfiltered graph
to the repo root. Log: `docs/graph/graphify-out/refresh.log`.
**Splat pipeline (owned, $0):** COLMAP (`C:/Users/adam/tools3dgs`) → Brush → `node tools/convert-splat.mjs`.
Postshot license (operator buying) = marketing fly-through renders only; do NOT mix Skydio (Oct-2025)
frames into the DJI hero splat (season mismatch → ghosting); Skydio-only roof splat = optional side project.
**ownerSheets whitelist FIXED 2026-07-08:** ticking A-2/S-1 in "Owners can see…" was a silent no-op
(store whitelist predated those sheets — owners could never see the Owner Safe). Nav table now lives in
`src/lib/pages.js` (single source; store derives its whitelist; unit-tested). PROD STATE RESOLVED
2026-07-08: the persisted `property_state.ownerSheets` row was updated (SQL) to include spatial+safe,
then the operator's live selection turned ALL 12 sheets on (incl. AI-1 + V-1) — no action left.
**V-1 owner face + buyer trim — DONE 2026-07-08:** owners on V-1 get a READ-ONLY roster
(`portalFace` seam in lib/vendors.js — RLS grants owners roster read only; upload/folders/log stay
operator, so the operator console no longer errors at them). `npm run export-buyer` now strips
"Known anomalies" + "Marketing angles" from the external buyer set (deferred item closed);
full `export-package` dossier keeps both — verified on both generators.
**Smoke tests operator hasn't confirmed yet:** attach a PDF to a K-1 row (signed-URL path) ·
click 🛰 Satellite once · orbit 🎥 Reality once · **ask AI-1 one question** (auth path verified
to 401 unauthenticated; the Anthropic leg verified live pre-deploy — only the full authed
round-trip awaits the operator).
**Sign-in access panel — SHIPPED 2026-07-08:** sidebar → "Sign-in access…" (operator-only; inside
the owner-view panel, so owner/vendor roles never see it). Type an email + "+ Owner" to
PRE-AUTHORIZE it (`authorized_emails` table, consulted by the sign-up trigger: vendor-roster match >
allowlist > pending) — the person's first magic link lands them straight in as owner. Anyone already
parked in 'pending' shows in the same panel with a one-click "make owner". Revoke = ✕ (removes the
pre-authorization; does not demote an existing profile — do that in Supabase if ever needed).
Migration `owner_email_allowlist`; trigger logic verified with SQL (vendor/allowlist/stranger paths).
**SECURITY:** Anthropic key ROTATED 2026-07-13 (Vercel Production env updated + redeployed);
disable the old key at console.anthropic.com if not already done. ElevenLabs rotation still
pending. Key lives ONLY in Vercel env; never in the repo or client bundle.

## SECURITY AUDIT 2026-07-08 (multi-agent: server/RLS + client + correctness)
**Overall posture GOOD** — the real boundary (Supabase RLS + `api/_auth.mjs` gate) fails closed and holds:
roles can't be spoofed/self-escalated, vendor isolation airtight, no service-role bypass, all buckets
private, no committed secrets, 0 prod dep vulns. **Quick-wins FIXED + DEPLOYED** (commit c576bd3):
transcripts creator-scoped (`owns_thread` RLS); per-user daily caps on concierge(200)/voice(150) via
`check_and_bump_usage`; "Arnould Heights"→"Arnold Heights" audit-grade fix (was poisoning export JSON);
client role fails closed to pending; `[[package:]]` https-only allowlist; delete-throws-before-audit-log;
25MB caps on vendor-docs+assets buckets; capRatePct null-coercion.
**ALL CODE-IMPLEMENTABLE FINDINGS FIXED + DEPLOYED 2026-07-10 (Fable 5 pass).** Beyond the
earlier quick-wins:
- **C1 CLOSED** — confidential seeds no longer in the public bundle. `tools/split-seed.mjs`
  (`npm run split-seed`) → `src/data/units.public.json` (skeleton) + `api/_seed.json` (rents,
  tenant PII, lease/floorplan Drive URLs, AP roster; bundled into the seed function ONLY).
  Client boots skeleton; owner/operator hydrate via role-gated `/api/seed` before initViews;
  vendors read own row from RLS-scoped `public.vendors`. VERIFIED in prod: bundle has 0 rent
  values/tenant emails/vendor emails/legal entities; `/api/_seed.json` → 404; `/api/seed` → 401.
  **Re-run `npm run split-seed` after editing any src/data seed** (like concierge-context).
  NOTE: local-only dev mode (no backend) now shows the skeleton (no rents) — by design.
- CSP + 6 security headers (`vercel.json`) — verified: login page + fonts + Supabase boot call
  raise ZERO CSP violations. TODAY now LIVE (holdover/expiry track real time); exports show
  generated-date + "data as of". Audit-log email JWT-stamped (can't be forged). Security model
  version-controlled in `supabase/security-model.sql`. +8 tests (78 total: seed round-trip +
  money-math/data-integrity regression guards).
**OPERATOR-ONLY (cannot be done from code — 2 console actions):**
- **Enable CAPTCHA**: Supabase Dashboard → Auth → Settings → Bot & Abuse Protection (stops
  magic-link email-bomb / junk-pending abuse). No API for this.
- **Rotate both API keys** (Anthropic + ElevenLabs — pasted in chat): providers' consoles →
  update Vercel Production env → redeploy.
**Accepted (not changed, by design):** SECURITY DEFINER helper WARNs (caller-scoped facts;
revoking EXECUTE risks breaking RLS); policies `to public` relying on helpers returning false
for anon (correct, marginally looser than checklist); concierge-handler lacks a unit test
(would need full Supabase+Anthropic mocking — covered by live 401/403/429 smoke + pure-helper
tests).

## ELITE ROADMAP (started 2026-07-03) — see `docs/superpowers/specs` + `docs/superpowers/plans`
Vision: full owner/operator platform. Three threads on the live Supabase foundation:
- **Thread 1 · Secure Documents:** P1 Document Repository → P2 Owner Safe → P3 Vendor Portal
  (all = role-scoped file storage; extends the existing image asset seam / private bucket).
- **Thread 2 · AI Property Concierge:** P4 grounded text RAG → P5 realtime voice + avatar.
- **Thread 3 · Spatial & 2.5D:** **P6** (this thread, in progress).
**Substrate decision (operator):** ONE app — the repo is authoritative; harvest v9
(`~/OneDrive/Desktop/otbcommandv9kimi.html`, a dark Mapbox "spatial engine" concept)
IDEAS ONLY (Mapbox satellite map + global search). Plan-room = default palette; dark = optional
theme switch (SHIPPED, see below). Do NOT fork into two codebases.

### P1 · Document Repository — **SHIPPED + DEPLOYED 2026-07-03**
- Plan `docs/superpowers/plans/2026-07-03-p1-document-repository.md`. Any document row (K-1 register +
  unit-drawer docs) can carry a real uploaded file: **"📎 Attach file"** in the row's edit form uploads to the
  **private Supabase `documents` bucket** (25 MB cap; RLS cloned from `assets`: auth read / operator write —
  migration `documents_bucket_and_policies`) and sets the row's existing `link` to **`doc://<path>`**; rows
  render **"Open 📎"** which resolves a fresh signed URL on click. External Drive links unchanged. Local
  fallback = IndexedDB (`otb-docs`). Seam: `src/lib/docs.js` (mirrors assets.js; pure doc:// helpers unit-tested).
- Also fixed: `remote.js` now guards `import.meta.env` (was crashing `node --test`; Vite static replacement
  verified intact — URL still baked into the prod bundle).
- Verified: local round-trip (attach → save → Open 📎 → byte-exact) + prod bundle carries the feature.
  Remote signed-URL path: operator should attach one real PDF to a register row as the live smoke test.
- P2 Owner Safe / P3 Vendor Portal build on this (role-scoped buckets/policies; versioning; search — later).

### P2 · Owner Safe — **SHIPPED + DEPLOYED 2026-07-03**
- **S-1 "Owner Safe" sheet** (nav after P-1): vault for Proforma/Leases/Tax/Insurance/Banking/Other.
  Private **`safe` bucket** — read = `is_owner_or_operator()` (NEW fn; a future P3 vendor role is sealed out
  at the DB layer, unlike `documents` which is any-auth read), write = operator. 10-min signed URLs.
  **`safe_log` audit table**: every view/upload/delete recorded (who/when/what); "Recent access" panel =
  operator-only. Owners: read/open only (role-owner CSS + RLS). Migration `owner_safe_bucket_log_policies`.
  Seam `src/lib/safe.js` (pure helpers unit-tested → 23 tests total); view `src/views/safe.js`.
- Verified live: upload → list → byte-exact open → audit rows (view/upload) → delete; owner-mode hides all
  operator controls + log. Deployed; S-1 in prod HTML.

### Global search — **SHIPPED + DEPLOYED 2026-07-03** (v9 harvest complete)
- Topbar search box (+ **"/" hotkey**): units / property contacts / register docs; Enter opens the top hit
  (units → drawer; contacts/docs → K-1). Pure matcher `src/lib/search.js` (unit-tested; 29 tests total).
- With this + the satellite lens, the v9-concept harvest is DONE — `otbcommandv9kimi.html` is now fully
  superseded and can be archived/deleted from the Desktop whenever.

### ROADMAP REMAINING (all gated on operator inputs — nothing ungated left)
- **P3 Vendor Portal — SHIPPED + DEPLOYED 2026-07-08**: **V-1 "Vendor Portal" sheet** (nav last).
  Roster = SOT "Vendor List" sheet in `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` → `python
  tools/extract-vendors.py` → `src/data/vendors.json` (69 vendors: 28 service / payees / people,
  26 with email = portal-capable) → seeded into `public.vendors` (migration `vendor_portal_p3`).
  **Operator face:** filterable roster (service first, green "portal" tag), per-vendor private folder
  in the **`vendor-docs` bucket** (upload/open 10-min URLs/delete) + `vendor_log` audit panel.
  **Vendor face:** a vendor signs in with the SAME magic-link gate using their roster email — the DB
  trigger assigns role `vendor` — and gets a one-sheet shell (role-vendor CSS + nav lock): only their
  folder, read + "send a file to management". RLS: vendor sees/uploads ONLY `<their-id>/…`; sealed out
  of safe, documents, assets, property_state, and the concierge endpoint (403).
  **SECURITY (same migration):** new sign-ins used to default to role **owner** (anyone completing a
  magic link could read the Safe) — now default **'pending'** (holding-pen screen). ⚠ Consequence: a
  NEW legitimate owner will land in 'pending' until promoted (Supabase → profiles.role='owner').
  Also tightened documents/assets buckets + property_state reads from any-auth → owner/operator.
  Advisor WARNs about SECURITY DEFINER helpers callable via RPC = pre-existing pattern, they only
  return facts about the caller — accepted. Seam `src/lib/vendors.js` (pure helpers tested; 58 total);
  view `src/views/vendorportal.js`. Smoke test: upload a doc to any vendor folder on V-1. **Inviting a
  real vendor = telling them to magic-link in with their roster email (e.g. marlin@butcherac.com) —
  operator's call when to make that ask.** Deferred: per-file "request from vendor" checklist, COI
  expiry tracking, email notifications. NOTE: static seed data (incl. rents in units.json) rides in
  the public JS bundle — the login gate protects live state, not the seeds; consider moving sensitive
  seeds behind auth later.
- **P4 AI concierge — SHIPPED + DEPLOYED 2026-07-08 (v1)**: **AI-1 "Concierge" sheet** (nav after S-1) —
  grounded property Q&A chat. Server side: `api/concierge.js` (Vercel function, `claude-opus-4-8`,
  adaptive thinking, effort medium, streaming) — requires a Supabase session token, role must be
  owner/operator (vendor sealed out), key = Vercel env `ANTHROPIC_API_KEY` (Production, set 2026-07-08;
  never ships to client). Grounding: static dossier `api/_context.mjs` (**generated — regenerate with
  `npm run concierge-context` whenever src/data changes**; reuses export-package.mjs, prompt-cached
  ~7.6k tokens) + live `property_state` digest woven into the final user turn (cache-safe). Pure seam
  `src/lib/concierge.js` (sanitize/digest/buildMessages/mdToHtml — unit-tested, 39 tests total); view
  `src/views/concierge.js`. History is session-only (resets on reload — persistence = later).
  Owner visibility togglable via "Owners can see…" (off by default). Persona/system prompt lives in
  `api/concierge.js` PREAMBLE — operator may want to tune voice/rules there.
- **AGENT DESK — SHIPPED + DEPLOYED 2026-07-08**: AI-1 is now THREE agents on one chat surface —
  **🏛 Concierge** (Q&A, unchanged) · **🤝 Leasing Agent** · **🔧 Property Manager** (chips at the top;
  per-agent suggestions/personas in `api/concierge.js` AGENTS registry).
  **Transcripts:** every conversation persists to `chat_threads`/`chat_messages` (migration
  `agent_desk_transcripts`, owner+operator RLS; vendors sealed). 🗂 History panel reloads any thread;
  + New starts fresh. Server returns `X-Thread-Id`; client stores per-agent thread state.
  **Lease assembler:** the leasing agent carries a strict tool `assemble_lease_package`
  (OPERATOR-only, enforced server-side) — collects terms conversationally, then generates
  (a) a tenant-facing **Lease Proposal** (OTB navy/white brand, DRAFT–subject-to-legal-review stamp,
  real SF/NNN/HVAC-split figures from units/recoveries/hvac.json; vacant units fall back to
  camFlatPsf + median tax/ins) and/or (b) the internal **Owner Lease Summary** (mirrors the
  operator's `Owner_Lease_Template_Form.docx` sections). Output = HTML uploaded to the `documents`
  bucket under `lease-packages/`, 7-day signed URL, delivered as a `[[package:url|label]]` line in
  the stream → client renders a card with **Open 🔒** + **✉ Email** (mailto prefilled with the link
  + OTB signature — true in-app send needs a Resend/SendGrid key later, deliberately human-in-loop
  for now). Pure seam `src/lib/lease.js` (builders + tool schema + package-line parser — 69 tests
  total). VERIFIED live pre-deploy: real model call drove the tool with perfect strict input; the
  assembled proposal renders on-brand (export/lease-proposal-test.html). Smoke test: open AI-1 →
  🤝 Leasing → "Assemble a lease proposal for unit 131…" with terms → open + email the card.
- **P5 Voice — SHIPPED + DEPLOYED 2026-07-08 (v1: voice, avatar deferred)**: AI-1 speaks.
  Server: `api/voice.js` — ElevenLabs TTS proxy (model `eleven_turbo_v2_5`, voice **"Jack John —
  Natural Customer Support Agent"** `7EzWGsX10sAS4c9m9cPf`, override via env `ELEVENLABS_VOICE_ID`);
  key = Vercel env `ELEVENLABS_API_KEY` (Production, set 2026-07-08 — account tier Creator, ~284k
  chars/mo quota; 2,400-char cap per request protects it). Same owner/operator session gate as the
  concierge — shared `api/_auth.mjs` (concierge refactored onto it; vendors 403). Client: 🔊 button
  per reply + persisted auto-speak toggle + 🎙 mic input (Web Speech API, Chrome/Edge only —
  auto-hidden elsewhere); `mdToSpeech` pure helper strips markdown for natural reading (60 tests).
  **SECURITY: the ElevenLabs key was pasted into chat 2026-07-08 — rotate at elevenlabs.io when
  convenient, update the Vercel env, redeploy** (same drill as the Anthropic key). Smoke test:
  ask AI-1 a question, tap 🔊 on the answer. Deferred: avatar (needs a design/provider decision),
  streaming TTS-while-generating, voice for vendor portal.
- **P6d Reality lens — SHIPPED + DEPLOYED 2026-07-08 (v1, $0)**: fourth A-2 chip **🎥 Reality** —
  photoreal 3DGS splat of the center, trained via the OPEN pipeline (no Postshot license needed:
  its free tier can't export): **COLMAP 3.11.1 CUDA** (`C:/Users/adam/tools3dgs`, solved 121 frames in
  4.7 min, 0.9px err) → **Brush v0.3** (413k gaussians, ~10 min on the 4070) → master PLY
  `Drone Footage RAW/OTB-splat-v1.ply` (93MB) → `node tools/convert-splat.mjs` → `public/OTB-splat.ksplat`
  (16MB, SH1; gitignored but deployed — `.vercelignore` controls uploads now). Lazy GaussianSplats3D viewer
  (`src/lib/scenesplat.js`). RE-FLY/RETRAIN recipe in `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`.
  Postshot can be closed/uninstalled — nothing depends on it.
- **P6d v3 — photogrammetry mesh in Lens B SHIPPED 2026-07-11 ($0, open pipeline)**: Lens B
  (◧ 3D) now carries an in-pane **🏗 Mesh / ◧ Massing** toggle — the captured photoreal mesh
  swaps in over the buildBoxes() seam; unit boxes stay as invisible raycast targets (click →
  drawer, selection = brass wireframe), massing stays the default. NO RealityCapture needed:
  COLMAP dense (`tools3dgs/run-dense-mesh.sh`: undistort → PatchMatch stereo ~40 min on the
  4070 → 5.1M-pt fusion) on the SAME 121-frame solve as the splat, so `splat-align.json` bakes
  the mesh straight into Lens-B world (alignment verified: `export/mesh-align-check.png`).
  `npm run mesh-glb` (`tools/build-mesh-glb.py`) crops the FUSED CLOUD to the site first
  (meshing the full cloud makes a Poisson balloon around the background — don't), Poisson d11,
  decimates to 150k tris, vertex colors → `public/OTB-mesh.glb` (3 MB, gitignored, deploys
  like the splat; mesh renders UNLIT — photo colors already carry the sun). Loader is
  fail-soft: no glb → no toggle, massing only. Re-run mesh-glb after any dense re-run or
  align re-fit. Known v1 limits: roofs thin (no nadir in the DJI set), vegetation blobs.
- **A-2 polish SHIPPED 2026-07-11**: ⇅ True-heights chip (iso + Lens B swap between
  presentation exaggeration ×1.7 and plat-true 1.8657 px/ft) · north arrow + 100′ scale bar
  on the iso (plan-rotated: true north = +x; along an iso axis projected length = plan length,
  so the bar is exact) · ⤓ SVG chip downloads a standalone A-2 isometric (fonts/colors inlined,
  CSS vars resolved). Tenant logos: `npm run logo-thumbs` → `public/tenant-logos/` +
  `src/data/logo-thumbs.json`; chips render in the unit-drawer header + R-1 tenant cells
  (vacant rows skipped; sources stay vendored in `tools/brand-assets/tenant-logos/`).
- **P6d v2 — splat↔world alignment SHIPPED + DEPLOYED 2026-07-08**: 🎥 Reality is now CLICKABLE
  (click a storefront → unit drawer; selection = brass wireframe; synced across sheets). The similarity
  transform (COLMAP frame → Lens-B world) was fitted COMPUTATIONALLY, no GPS: `tools/fit-splat-align.mjs`
  (**re-run after any splat re-train**) density-crops the site, RANSACs the parking-field ground plane
  from a mini-DTM, seeds scale from the 16.4' parapet, then grid-searches yaw/scale/translation matching
  FACADES to footprint outlines (the DJI orbit reconstructs walls, not roofs — no nadir coverage) +
  penalizing ground points inside footprints. Result committed: `src/data/splat-align.json` (score .162,
  ~0.0156 splat-units/ft); visual check regenerable at `export/splat-align-preview.svg`. Pure math seam
  `src/lib/splat-align.js` (quat helpers + true-height realityBoxes — 46 tests total). Runtime: splat
  transformed into y-up world via addSplatScene {position,rotation,scale}; invisible TRUE-proportion hit
  boxes (no Lens-B vertical exaggeration) raycast → drawer. Verified in preview: full click-sweep opened
  101→125 in correct plan order + 149 on the short building; splat renders upright/level/plan-oriented.
- **Roof-condition brief — DONE 2026-07-08 (CORRECTED same day)**: `docs/roof-condition-brief.md`
  + downscaled key frames in `docs/roof-brief-assets/` (originals stay on J:). Finding 1 STANDS:
  membrane failure, long-building roof, RTU row ≈101–109 (bay confirmed on the roofer walk; the
  RTU+gas-line geometry in S1002433 locates it on-roof). Finding 2 **RETRACTED for Belle** after
  the georef refit: the thermal anomaly (S1002330/28, true-nadir GPS) locates on the NEIGHBOR's
  roof north of Patricia — the Skydio sweep photographed neighbor roofs for mesh context. Brief,
  K-1 register row `pd:roofbrief`, and W-1 card `roof:brief` all corrected + DEPLOYED.
- Prior assessment (2026-07-04) — `Downloads/Drone Footage RAW/`,
  9 clips 4K/100Mbps: 0001-0003 dusk + 0008-0016 golden (marketing only); **0023/0029/0030 daylight = reconstruction
  set**. Frame package CUT: `Drone Footage RAW/OTB-3DGS-frames/` — 242 sharp 4K stills (2fps, blur-culled) +
  README-TRAINING.md (Postshot/Luma for splat · RealityCapture for mesh · 15-min supplemental-flight recipe).
  Remaining operator step: run the training (GPU/cloud), hand back .ksplat/.glb → wire Lens D.
  **PLUS (found 2026-07-04): Skydio VT300-L roof survey** (`J:/Shared drives/AA & RR/Drone Photos/
  Arnould Boulavard/`, 2025-10-15): 165 GPS-tagged 50MP near-nadir stills (copied to
  `Drone Footage RAW/OTB-mesh-photos-skydio/` — FILLS the nadir gap; mesh via RealityCapture w/ both
  sets) + **330 thermal IR roof frames** — samples show membrane damage + a thermal hot spot
  (possible moisture): flag for roof-condition review / C-1 / Butcher Air conversation. Operator has
  Postshot installed (RTX 4070 SUPER local training).
- Small deferreds: Magnolia (121) lease swap, remaining Drive-doc links, custom domain + SMTP,
  B4 realtime. (A-2 metric-height/north/scale/SVG-export + logo thumbnails + buyer-export trim
  all shipped — see above.)

### P6 · 2.5D + Spatial — **P6a + P6b SHIPPED 2026-07-03**
- Spec `docs/superpowers/specs/2026-07-02-p6-2p5d-spatial-design.md`; plans `docs/superpowers/plans/2026-07-0{2-p6a-svg-isometric,3-p6b-webgl-3d-twin}.md`.
- **A-2 "Spatial" sheet LIVE** (nav D-1·A-1·**A-2**·R-1…) with an **Iso / 3D lens toggle**:
  - **Lens A (SVG isometric, P6a):** native-SVG, footprints extruded to **real CAD heights**
    (`npm run extract-heights` → `src/data/heights.json`, from DXF `BLD_HT`), block color = live status.
    Pure core `src/lib/iso.js` (unit-tested).
  - **Lens B (WebGL 3D twin, P6b):** Three.js (`three@0.185`), orbit controls, same footprints/heights/colors,
    raycast click → drawer. Loaded **lazily** (dynamic import → code-split `scene3d-*.js` chunk; `three` only
    loads when 3D opens). Pure layout `src/lib/scene3d-layout.js` (unit-tested); scene `src/lib/scene3d.js`.
    **Verified live in WebGL 2.0** (render + real heights + click→drawer + clean dispose on toggle-back).
  - Both: click → shared drawer, selection syncs across sheets. **`npm test`** = 15 tests (native node:test).
  - **Swappable geometry seam:** `buildBoxes()` in scene3d.js is isolated so **P6d's captured mesh drops in**.
- **Theme switch SHIPPED**: plan-room (DEFAULT) ↔ dark, toggle in sidebar foot, persisted `localStorage["otb-theme"]`,
  dark overrides `:root` vars under `[data-theme="dark"]`; the 3D scene reads the theme too.
- **P6c satellite lens — SHIPPED + DEPLOYED 2026-07-03**: third A-2 chip **🛰 Satellite** — MapLibre GL
  (lazy chunk, only loads on open) + free Esri World Imagery + **georeferenced unit footprints**
  (`npm run extract-georef` → `src/data/footprints-geo.json`; tunables in `tools/extract-georef.py`:
  anchorLL/azY tunables). **Georef RE-FITTED computationally 2026-07-08** after the operator's
  screenshot showed drift: NEW `tools/fit-georef.py` masks the white roofs in the same Esri tiles,
  sweeps azimuth with per-building translations, and accepts only azimuths where BOTH buildings
  agree (<6 m) — fitted anchorLL [30.201685, -92.053962], azY 51.75 (= the plat's own north arrow;
  the old eyeballed 70.5 was the drift — Esri had also refreshed imagery). On-roof coverage .94/.84.
  Re-run the fitter + `npm run extract-georef` whenever Esri refreshes tiles. Status-colored
  polygons, click → drawer, selection outline. Layers attach on load+idle (robust in throttled tabs).
  **RESIDUAL:** could not paint MapLibre in the headless preview (occluded-tab rAF throttling) —
  registration/data/wiring verified offline; operator's first click in prod = the smoke test.
- **Next in P6:** **P6d Reality capture** — operator to do a **drone shoot → photogrammetry mesh + 3D
  Gaussian Splat**, clickability via georef-draped hit-areas over the swappable seam. Deferred: metric-height
  toggle, north/scale, static-SVG export of A-2, v9 global-search harvest.
- Height note (operator eyeball): 22/27 units = 16.4′ (real nearest-BLD_HT match, not fabricated); 103=23.6′,
  101=13.5′, 105/107/109=13.2′. Real skew, not a bug.

## Run / verify
- `npm run dev` (Vite) · preview via Claude_Preview (`otb-command-dev`, port 5173). Note: with `.env` present the app is **login-gated** (Path B); to view locally without login, move `.env` aside temporarily.
- **Generators (all re-runnable):** `npm run poster` (5 leasing posters) · `npm run pylon` (monument sign) · `npm run proforma` (owner Excel proforma) · `npm run export-package` (LLM export) · `npm run export-buyer` (no-financials buyer set) · `npm run extract-geometry` · `extract-hvac`/`extract-recoveries` (py).
- **Deploy (Path B):** `npx vercel deploy --prod --yes --scope adams-projects-0c52918e` — the Vercel CLI is
  **logged in on this machine as `orangeonyx`** (device-flow login 2026-07-03; no token needed).
  **IMPORTANT: local commits do NOT auto-deploy** (no git remote / no Vercel git integration) — run the deploy
  command after shipping, or the live site silently stays stale.
- Quality gate before delivery: `node --check` each module + `npm run build`. Console clean.

## What's built (12 sheets)
D-1 Dashboard · A-1 Site Plan (plat-exact + photo/overlay layers; **whole-center floor-plan overlay** registered to the unit envelope w/ unit-fill opacity slider; unit numbers uniform, tenant names off A-1) · A-2 Spatial (4 lenses) · R-1 Rent Roll (11 cols, PSF breakdown) ·
P-1 Financial (income composition + NOI worksheet) · C-1 Compliance · T-1 Critical Dates ·
W-1 Action Board (live kanban) · K-1 Directory (contacts + document register + site imagery) ·
S-1 Owner Safe · AI-1 Concierge (3 agents) · V-1 Vendor Portal.
- **Persisted state layers** (localStorage, write-through, in Export/Import JSON): comp, notes, actions, contacts, documents, financials.
- **Asset store**: images (photos / floor plans / roof-HVAC / signage) in **IndexedDB** behind a swappable backend seam (lib/assets.js). NOT yet in Export/Import — per-browser today (portability gap, see below).
- **Data**: src/data/{units,compliance,geometry,directory,hvac,recoveries}.json. Single-source rule: Base/Total PSF from units.json; recoveries.json only supplies CAM/Tax/Ins.
- Headline vs drawn convention (labeled, not bugs): GLA 62,883 headline / 62,810 demised; parking 324 legal (variance 99-11797) / 314 drawn.

## Marketing (CAD-derived) — FOLDED INTO REPO 2026-06-20
- **CAD**: `cad/Boulev_CLEAN.dxf` — AutoCAD R14, in FEET, the architect's layered plat. Now committed (~644 KB). (Source .dwg still only in Downloads.)
- **Poster generator**: `tools/poster.py` → `npm run poster`. Reads `cad/Boulev_CLEAN.dxf` + units.json/geometry.json, logos vendored in `tools/brand-assets/` (otb_logo.png + a white-knockout). Emits **5 style variants** to `marketing/` (gitignored, disposable): A brand · **B plan-room (CHOSEN)** · C standard · D editorial · E heritage. Bays color-coded by tenancy; true north −51.5°. Johnston label rides a center lane-stripe via textPath; pylon marker at the surveyor 'SIGN' coord (1075.8,321.1).
- **Pylon generator**: `tools/pylon.py` → `npm run pylon`. Emits `OTB-pylon-blank.svg` (scaled 14-panel template, matches the real sign) + `OTB-pylon-tenants.svg` (type stand-ins). Real-logo version is the operator's own image — drop logo files in `tools/brand-assets/` to swap.
- Generated SVG→PNG locally via headless Chrome (no cairosvg/rsvg in repo): wrap SVG in HTML, `chrome --headless --screenshot`.
- **Pylon real logos DONE 2026-06-20**: 25 tenant logos vendored to `tools/brand-assets/tenant-logos/` (from the updated SOT's LOGO sheet), embedded per panel; P13 Boulevard Nutrition → Upstream Rehabilitation.

## Export deliverables (all → `export*/`, gitignored; copied to `G:\My Drive\00 OTB\`)
- **LLM export** (`npm run export-package` → `export/`): dossier MD + data JSON + A-1 SVG/PNG/HTML. Full detail incl. financials.
- **Buyer overview** (`npm run export-buyer` → `export-buyer/`): same set with **all $ stripped** (roster only, financials → NDA note). For the prospective-buyer group. NOTE: still contains "Known anomalies" + "Marketing angles (LOI pending)" — operator may want those trimmed before sending externally.
- **Owner proforma** (`npm run proforma` → `export/OTB-Proforma.xlsx`): live Excel model — real in-place income (EGI $1,080,773/yr), yellow OpEx cells = seeded estimates the owner overrides, formula-driven NOI + cap-rate value. Pending option: add vacancy/credit-loss line + stabilized (lease-up 131/133) scenario.

## OPEN — next session punch-list
### Poster edits — DONE on B (2026-06-20; 2025-stats strip added 2026-07-12)
2026-07-12: brass performance strip (95% occ · 88% retention · 14-business waitlist ·
33,000+ VPD, from the Jul-2025 marketing package — see docs/marketing-package-2025.md)
added inside B's contact bar; dossier + buyer set gained a "Center performance" section
(non-financial in both; revenue story + $10–17 NNN comp in full dossier only); concierge
context regenerated + deployed; fresh poster SVG/PNG/PDF + LLM export on G: Drive.
### (original 2026-06-20 notes)
All five original notes resolved on the chosen B variant: tenant DBAs off the boxes (number-only,
turned 90° CCW + centered both axes); pylon at the surveyor 'SIGN' coord by Unit 101 (no leader line);
Johnston label curves with the road, within the lane lines; boundary dashes thinned; OTB contact block
+ enlarged logo. **GLA LOCKED to audited 62,883 across ALL variants** (operator, 2026-06-20 — overrides
the brand's 70,000 marketing figure). Real pylon logos now embedded (see Export/Marketing). A/C/D/E
remain exploratory; only B is blessed.

## Brand (ingested 2026-06-20) — `~/.claude/skills/abdalla-brand-system`
Three skills installed: `abdalla-brand-system` (router → per-entity `references/*.md` + `assets/` logos), `abdalla-web-templates`, `adam-brand-context`. Auto-trigger on OTB / Orange Ocean / Belle Realty / brand keywords. DO NOT pull brand details from memory — read the entity doc.
**OTB public brand (tenant-facing marketing = leasing poster):**
- Palette: **strictly Boulevard Navy `#1C2D4F` + White/Off-White `#F5F5F5`. NO orange or gray accent bars.** (Conflicts with the app "plan-room" palette — two separate systems: app stays plan-room; public OTB marketing = navy/white.)
- Type: Helvetica/Arial (headers/marketing); Times New Roman (formal notices). NOT Big Shoulders/Plex.
- Logo: `assets/otb_logo.png` (use the file, not a typed wordmark).
- Contact block: Adam Anthony Abdalla, Property Manager · 101-149 Arnould Blvd., Lafayette, LA 70506 · **P 337-769-1554 · E info@ontheblvd.com · W ontheblvd.com**. Required attribution: **"Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."**
- Tone: welcoming/local; AVOID investment/legal/B2B jargon on public pieces (strip "variance 99-11797", "hard corner", etc.).
- **GLA figure conflict:** brand markets **"70,000 sq ft"**; our audit = 62,883 demised / 62,810 sum. **RESOLVED 2026-06-20: print audited 62,883 on all marketing (operator decision).**
- Audience question: tenant-facing leasing = OTB brand; broker/investor/sale = Orange Ocean B2B brand (`brand-orange-ocean.md`).

### Fold poster into the repo (re-runnable tool) — DONE 2026-06-20
- DXF committed to `cad/`; `poster.py` + `pylon.py` in `tools/`; `npm run poster` / `npm run pylon` wired; `marketing/` gitignored. Regenerates whenever availability changes.

### Portability (operator goal: "moves with the app wherever")
- **Path A — DONE 2026-06-20**: lease Drive URLs wired (clickable in unit drawers), floor-plan links + real tenant contacts seeded (from updated SOT `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` — sidecars `src/data/{lease,floorplan,logo}-links.json` + `contacts-info.json`), session artifacts in K-1 register. **Google Drive connector is CONNECTED** (file search/metadata works). **Register Drive links WIRED 2026-07-08** via the connector: church easement, JD Bank easement, HVAC 2021 PDF, SOT workbook, SOT docx, meters workbook, title commitment (folder link — all 2007 versions). Still blank (likely not digitized — parish records if needed): parking variance 99-11797, electric easement 577566, expired drainage easements; also blank by design: repo-generated rows (roof brief, recon memo, dossier, poster, pylon — refs point at repo paths / re-run commands).
- **Path B — LIVE 2026-06-20** (`docs/path-b-supabase-scope.md`): hosted at **https://otb-command.vercel.app** (Vercel) + Supabase (project `kbhsghodquchkgfdzckc`). Magic-link auth; operator (adam@adamabdalla.com) edits, owners read-only + scoped sheets; state + images sync to Supabase. Deploy: `npx vercel deploy --prod --scope adams-projects-0c52918e` (needs a Vercel token). Deferred: B4 realtime, custom domain, per-sheet read RLS, custom SMTP.

### Visuals / 2.5D (next session)
- Operator wants state-of-the-art data viz + **2.5D / isometric renderings** of OTB. Inline viz capability exists (mcp__visualize__show_widget) + in-app views. Needs the inputs in `docs/visuals-input-checklist` (see below / chat).

### Other
- **Floor plans — A-1 overlay LIVE 2026-06-20**: whole-center plan (`public/floorplan-center.png`, processed from `G:\…\Floor Plan - Whole Center.jpg` — exterior/parking knocked transparent, largest-component crop, rotated 180° to match A-1) renders under the unit boxes via **A-1 → Overlay → Floor plan**, registered to the unit envelope (`FAC` box in `plan.js`), with a **Unit-fill opacity slider** (auto-fades boxes to 40% when the overlay is on; labels go dark+halo). Per-unit floor-plan **links** also live in each unit drawer. Tuning preview tool: composite floor plan + unit rects offline (see chat).
- **Still parked:** custom domain `command.ontheblvd.com` + custom SMTP for auth email · doc Drive URLs (above) · Magnolia (121) executed lease swap (Draft→Executed when provided). (Logo thumbnails + 2.5D viz shipped.)
- **Title check (P0) — CLOSED 2026-06-27**: street = **Arnould Blvd** (operator-confirmed);
  recorded subdivision of record = **"Arnold Heights Subd. Ext. No. 1"** (distinct legal
  name, deliberately "Arnold" — not a variant to reconcile). App already uses Arnould
  consistently; "do not fix" the subdivision name. See CLAUDE.md property facts.

## Locked decisions
- DoorLoop is OFF the roadmap (don't re-propose).
- Repo is authoritative; all exports are one-way/disposable.
- v7 baseline deleted (recoverable at git 81b1541).
- Audit-grade facts in CLAUDE.md must not be contradicted.
- **CONSOLIDATION (operator, 2026-07-16): OTB Command is the SURVIVOR.** The parallel
  builds are DONORS, not co-equals: `belle-realty-pwa` @ 19f7c06 (NestJS/Railway,
  Downloads zip + live app.belle-realty.com) and `otb-ops` (Manus). Harvest into this
  repo on Supabase — no two-backend federation, no new features in donors. Harvest
  queue: calc engines + numeric guardrail (started 2026-07-16) → owner-brief
  auto-trigger patterns → event-sourced compliance + heat-map lenses (otb-ops) →
  ledger-lite → e-sign/tenant-portal schemas. Supabase plan upgraded 2026-07-16 →
  splat/mesh can move to Supabase storage, which then unlocks git-integration
  auto-deploy safely (assets are gitignored — flipping auto-deploy BEFORE moving
  them ships prod without the Reality lens).
