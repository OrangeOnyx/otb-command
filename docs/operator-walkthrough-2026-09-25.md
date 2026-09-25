# Operator walkthrough — 2026-09-25

Every item that is waiting on you, in deadline order, as a question you answer and the exact
steps that follow from your answer. Nothing here needs a Devin session first; items 1–9 are all
yours. Where a step is a Claude/Devin step it says so.

Sources: `HANDOFF.md` (Sep 22 "Open on the operator", Sep 18 runbook entries),
`docs/status/atlas-punch-list.html` Rev 18, `docs/voice-call-records-runbook-2026-09-18.md`,
`docs/marketing-b1-and-tour-2026-09-18.md`, `docs/h11-voice-cutover-runbook-2026-09-01.md`.

---

## 1. `orangeoceanassetcommand.com` — lapses tomorrow (Sep 26) · 5 minutes

**Q. Does the old Asset Command address need to keep resolving after tomorrow?**

Facts: the domain sits at its transfer date Sep 26, 2026. Asset Command still holds live data
until H3 decommission, and its 9 exposed secrets (H0-3) are unrotated. Nothing in this repo
links to it — Cypress Command Platform serves from `otb.cypresscommand.com`, with
`orangeoceanatlas.com` and `otb-command.vercel.app` as aliases. The exposure is that anything
still pointed at the old name (a printed card, a saved bookmark, a forwarded e-mail link,
AC's own login page) goes dark tomorrow, and that the name becomes registrable by anyone
90 days after it drops.

**If YES — renew (the safe default):**
1. Registrar (GoDaddy, same account as `cypresscommand.com`) → Domains → `orangeoceanassetcommand.com`
   → Renew → **1 year**, and turn **auto-renew off** so it does not silently roll again.
2. Leave DNS exactly as-is. It dies with H3 instead of on a calendar date you did not choose.

**If NO — let it lapse:**
1. Before end of day: confirm nothing you hand out in print or e-mail carries the old address
   (the vinyl QR, the manual PDFs and the leasing/tour QR codes were all re-pointed to
   `otb.cypresscommand.com` on Sep 22 — those are clean).
2. Tell me "let it lapse" and I mark H3 in the punch list so the wave stops flagging it.
3. Understand the coupling: the lapse does **not** take Asset Command down. AC keeps running
   and keeps its data — this only stops the vanity address. So item 2 below gets more urgent,
   not less.

*Recommendation, forced: renew one year. $20-ish buys away an irreversible deadline on a day
where the alternative saves nothing.*

---

## 2. H0-3 — rotate Asset Command's 9 exposed secrets · 30–45 minutes

**Q. Do you want to rotate AC's keys, or shut AC's public door instead?**

AC holds live property data until decommission, so the exposure is live. The list of 9 lives in
the Asset Command repo/audit, not this one — I can't name them from here.

**To rotate (do this in the AC project, not this one):**
1. Open the AC repo's env/secret audit and list the 9 names. Typical set: Supabase `anon` +
   `service_role`, an Anthropic key, an ElevenLabs key, a Manus/webhook secret, a cron secret,
   a Twilio SID/token pair, a mail key.
2. Rotate **one at a time**, in this order — read-only first, write-capable last:
   Anthropic → ElevenLabs → mail → cron/webhook → Twilio → Supabase `anon` → Supabase
   `service_role`. Each: create the new key in the provider console → paste into AC's hosting
   env → redeploy AC → confirm the app still loads → revoke the old key.
3. Supabase `service_role` is the one that matters most: Supabase → Settings → API →
   **Generate new JWT secret** invalidates `anon` and `service_role` together, so plan on
   updating both in the same pass and expect a brief AC outage.
4. Anything that was committed to a git history stays exposed even after rotation — that is
   exactly why rotation, not deletion, is the fix.

**Alternative if you would rather not spend the time:** put AC behind a login-only door or take
it offline now and read its data through the database directly. Rotation only stays necessary
while AC is reachable. Tell me which and I will re-scope F-12.

**Answer to record:** rotated (date) / AC taken offline instead / deferred with a date.

---

## 3. Assign Edward in the sidebar · 2 minutes

**Q. Is `edward@belle-realty.com` the right address for Edward?**

He is on your six-owner list but has no account and no allowlist row anywhere — my insert was
blocked twice as a permission grant, so this one is yours by design.

1. Open `https://otb.cypresscommand.com`, signed in as yourself.
2. Sidebar → **Sign-in access…**
3. Type `edward@belle-realty.com` → role **owner** → **Assign**.
4. Tell Edward to request a magic link at that address and sign in once.
5. Verify: he appears in the list as owner; register row #24 stays green.

Related open question from Sep 22 that is still unanswered: `brother@brothersontheblvd.com`
was revoked as part of the six-owner cleanup. **Is that Edward's actual account?** If it is,
tell me and I will restore it instead of creating a second identity for the same person.

---

## 4. Redeploy the Fly bridge · 3 minutes

**Q. Do you want call records written in real time instead of the next morning?**

Right now the bridge does not emit the setup/end events, so the 6 AM sweeper finalizes each
call up to 24 hours late. The record is never lost — just late.

1. On your machine, in the repo root:
   ```
   cd bridge && flyctl deploy
   ```
2. If `flyctl` asks you to log in: `flyctl auth login` (browser opens), then repeat.
3. Verify: place a test call; within a minute L-1 shows the row instead of tomorrow morning.

That verification *is* SMK-21 (item 8).

---

## 5. Twilio recording vars in Vercel · 5 minutes

**Q. Do you want owners to be able to press ▶ and listen to the call?**

Callers are already told — both greetings on production read "This call may be recorded."
So the disclosure is done; only the storage switch is off.

1. Twilio Console → Account Info → copy **Account SID** and **Auth Token**.
2. Vercel → project `otb-command` → Settings → Environment Variables → **Production**:
   - `TWILIO_ACCOUNT_SID` = the SID
   - `TWILIO_AUTH_TOKEN` = the token
3. Redeploy: GitHub → Actions → **deploy** → Run workflow (or any push to master).
4. Verify: place a call, wait a minute, L-1 → expand the row → **▶ Play recording** appears.

Recordings stay at Twilio; nothing new is stored in our bucket.

---

## 6. Resend key + `NOTIFY_FROM` · 10 minutes

**Q. Which address should owner call-notices and leasing packages come from?**

Suggested: `notices@cypresscommand.com`. Until this is set, no e-mail is sent anywhere — the
voice agent is written never to claim a send that did not happen, and leasing packages read
"send pending".

1. resend.com → sign up (free tier covers this volume).
2. Domains → Add → `cypresscommand.com`.
3. Resend shows three DNS records → paste all three at GoDaddy → wait for Resend to show
   **Verified** (usually minutes).
4. Resend → API Keys → Create → copy it once.
5. Vercel → `otb-command` → Settings → Environment Variables → **Production**:
   - `RESEND_API_KEY` = the key
   - `NOTIFY_FROM` = `Cypress Command <notices@cypresscommand.com>`
6. Redeploy (Actions → deploy → Run).
7. Verify: place a call; every allow-listed owner gets the summary e-mail with the transcript.

SendGrid works identically (`SENDGRID_API_KEY` + `NOTIFY_FROM`) if you already have one.

---

## 7. Re-paste the two published phone numbers · 2 minutes

**Q. Does K-1 show a "Property lines" block right now?**

SMK-7 passed, but production `voice_settings.tenant_number` / `leasing_number` read **blank**
on Sep 18. If K-1 shows no lines, the paste did not stick.

1. `otb.cypresscommand.com` → sidebar → **Phone lines…**
2. Tenant line: **+1 337-273-0384** · Leasing line: **+1 337-270-7044** → **Save**.
3. Verify: K-1 shows "Property lines" with tap-to-call; a tenant login's M-1 shows the
   "Urgent after hours?" strip (your owner-preview will not — tenant face only).
4. If it goes blank again after a reload, stop and tell me — that is a write-path bug, not a
   you-problem, and I will chase it.

---

## 8. The smokes — what to run, in order

**Q. Which of these can you run today?**

Run them on **production** (`otb.cypresscommand.com`), not a preview. Each is 1–3 minutes.
Tell me pass/fail per number and I will stamp the punch list.

| # | What to do | Gate |
| --- | --- | --- |
| **SMK-27** | **Do this one first.** P-1 → check the composition donut matches the rent roll's Base · CAM · Tax · Ins shares → open the NOI worksheet (waterfall on top; GPR and vacancy labeled ESTIMATES) → cap-rate strip runs ±100 bp around your rate → Tenant health: five tiles + the worst-performers list. **These charts have only ever been seen against synthetic numbers.** If anything reads wrong against the real roll, that is the finding. | none |
| SMK-28 | A-1 → the **View** row above the chips → pick **Signage** → chips/sliders re-derive → toggle any chip by hand → the View highlight drops → pick **Leasing** → unit fill returns to lease status | none |
| SMK-25 | T-1 → four-year Gantt with today's line → bucket cards (past end · <90 d · 90–180 d · >180 d · term unresolved; 119/139/141/145 in "term unresolved" **by design**) → Renewal pipeline → click a row → the drawer opens. Flag any suite whose option period you know reads differently from 60 days | none |
| SMK-26 | Topbar ribbon (Occupancy · Rent/mo · Vacant · Expiring ≤12 mo · Needs attention), each drills in → C-1 Document coverage card → B-1 Pylon sign block draws from `pylon.json` and lists tenants without a panel | none |
| SMK-23 | B-1 → ⤓ Flyer on Suite 131 → Letter page, 1,907 SF, logos, plan, QR, **no dollar figure** → overview + a tenant card → upload one exterior into Property, ★ it → the hero changes | none |
| SMK-21 | Call the tenant line, report a fake AC issue for 105 with a callback number, hang up → L-1 shows Maintenance · Urgent for 105 → expand: summary, work order, transcript | item 4 (else next morning) |
| SMK-22 | Call the leasing line, ask for the package by e-mail, spell an address, decline a tour → L-1 Leasing row + W-1 pipeline lead | item 6 for the actual send |
| SMK-24 | After the scans (item 9) | item 9 |
| SMK-5 | First ACH payment — self-announces in AI-1. Nothing to watch | waits on the world |

---

## 9. Shoot 131 and 133 with the Insta360 · 1 hour on site

**Q. When can you get into the two vacant suites with the camera?**

1. Monopod at ~5 ft, **2–4 positions per suite** (door, center, back, restroom/hall).
2. Insta360 Studio → export **equirectangular JPEG, 2:1, 8K or 6K** (10–25 MB each; bucket cap
   is 50 MB per file). The straight-line walkthrough video is for B3, not this page.
3. B-1 → **360° tour** → Suite 131 → **＋ 360° panorama** (multi-select) and **＋ Hero still**.
4. Repeat for 133.
5. **Publish manifest → /tour**.
6. Verify (SMK-24): reload `otb.cypresscommand.com/tour` — each suite becomes a drag-to-look
   viewer, scroll zooms, a second panorama adds a dot.

---

## 10. Two data answers I need from you (no clicking)

**Q1. Federal Pacific.** Your Sep 22 ruling was "no Federal Pacific panels on the property,"
but the Sep 24 site register still carries an FPE panel with the unit unknown. One of the two
is wrong. Which — was the Sep 22 ruling about a specific building, or is the register row bad?

**Q2. `brother@brothersontheblvd.com`.** Revoked in the six-owner cleanup. Is that Edward's
real account (restore it) or someone else (leave revoked)?

---

## Answers on the record (2026-09-25)

| Item | Operator answer | State |
| --- | --- | --- |
| 1 · `orangeoceanassetcommand.com` | Renew one year, auto-renew **off** — it dies with H3, not on a calendar date | Operator to execute at the registrar |
| 2 · H0-3 | Rotate. Exact checklist against the live Railway variable set: `docs/ac-secret-rotation-2026-09-25.md`. Ten rotations, three sittings; `LLM_API_KEY` (the plaintext Perplexity key) first | Open |
| 2b · AC P0-1 PII | Neither `db-backup-20260707.sql` nor `seed-payload.json` is in the AC remote's history — no purge needed. AC logins are not password-based, so no force-reset. Review docs redacted (AC PR #27) | Closed but for `DATABASE_URL` |
| 3 · Edward | `edward@belle-realty.com` added in *Sign-in access…* with role **owner**. `brother@brothersontheblvd.com` is **not** his account — stays revoked/pending | Done; awaiting his first magic-link sign-in |

---

## What I do once you answer

Everything above is yours because it needs an account, a console, a phone, or a camera. On my
side, waiting on nothing: publish punch list **Rev 19** (the voice router, the A-1 site
register and the Stage 2 site twin are not catalogued anywhere on the sheet yet), then wire the
Stage 2 GLB into A-2 Lens-B — the only un-gated build work left in Schedule F.
