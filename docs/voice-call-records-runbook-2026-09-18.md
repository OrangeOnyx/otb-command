# Voice Call Records — Runbook (2026-09-18)

**Operator ask (Sep 18 memo + chat):** every call on the property lines must be
something the owners can listen to and read, with the work order or leasing
package that came out of it, and an e-mail when it happens. Asset Command
never had this — its ElevenLabs agents posted structured intake rows and a
push notification, and its "Package Sent" label was optimistic (nothing was
sent). The Cypress bridge already logs every turn; this build closes the loop.

## What ships (live after the PR deploys + the migration applies)

```
Caller ↔ Twilio ConversationRelay ↔ Fly bridge ↔ Vercel brain ↔ Supabase
                                        │ setup ──→ voice_call_start · Twilio recording starts*
                                        │ turns ──→ voice_log_turn (transcript) · tools → voice_call_outcome
                                        │ end   ──→ voice_call_finalize: Claude Haiku summary + intent + urgency
                                        │            + unit + caller → comm_log mirror (L-1) → owner e-mail**
                                        │            → EMERGENCY calls also open an AI-1 manager thread
Twilio ──(recording completed)──→ POST /api/voice-call (signature-checked) → voice_call_recording*
Browser ──(owner/operator session)──→ GET /api/voice-call?sid=RE… → streams the mp3 from Twilio*
Cron 6 AM ──→ voice_calls_pending → finalizes any call the bridge never closed out (no bridge redeploy needed)
```

`*` needs `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` · `**` needs an e-mail key + `NOTIFY_FROM`.
Without them everything else still works: summary, transcript, outcome, L-1 card, D-1 KPI.

- **L-1 Comm Log** — every finalized call is a voice row (source `voice`): intent chip
  (Maintenance · Leasing · Billing · General), urgency, unit, caller, length; expand →
  summary, outcome links (work order → M-1, tour, W-1 lead, package state), ▶ Play
  recording, the transcript as Caller / Agent turns. Operator: ✓ Mark handled / ↺ Reopen.
  "Calls · 7 days" strip on top with a *needs attention* filter. Owners read all of it.
- **D-1** — "Calls · 7d" KPI (needs attention · emergency · by intent) once a call exists.
- **M-1** — a work order the phone agent filed shows "📞 from call — open" → jumps to the call.
- **Leasing line** — new `send_leasing_package` tool: saves the caller to the W-1 pipeline
  (`deals`, stage inquiry, source `voice:<CallSid>`); e-mails the package
  (`src/lib/leasing.js leasingPackageEmail`: vacant suites, anchor, hosted package link,
  rates "on request") when the caller gave an address AND mail is configured; the spoken
  reply never claims a send that did not happen.
- **Owner e-mail** — subject `[EMERGENCY — ]<Intent> call · Unit N — <caller>`, summary,
  next step, facts table, outcome, link to L-1, full transcript. Recipients = every
  allow-listed owner + operator (`authorized_emails`).

## Operator steps (in order; ~15 minutes)

1. **Migration.** `supabase/migrations/20260918120000_voice_call_records.sql` — applied
   through Claude's door when it was open; if HANDOFF says NOT-YET-ON-PROD, paste it in the
   Supabase SQL editor (idempotent: `add column if not exists`, `create or replace`).
2. **Redeploy the bridge** (adds the setup/end events; until then the 6 AM sweeper
   finalizes calls with a ≤24 h delay):
   ```
   cd bridge && flyctl deploy
   ```
3. **Recording (optional, recommended).** Vercel → Project → Settings → Environment
   Variables (Production): `TWILIO_ACCOUNT_SID` (Console → Account Info) and
   `TWILIO_AUTH_TOKEN`. Redeploy (any push to master, or Actions → deploy → Run).
   Operator ruling Sep 18: callers ARE told. Both greetings on prod now read "… This call may
   be recorded. How can I help?" (`voice_settings` updated 2026-09-18; the bridge re-reads
   greetings every 10 min and its hardcoded fallbacks carry the same line).
4. **E-mail — Resend (operator ruling Sep 18: "whatever is easiest").** resend.com → sign up →
   Domains → add `cypresscommand.com` (or the subdomain you prefer) → paste the three DNS
   records at GoDaddy → API Keys → create → Vercel Production env:
   `RESEND_API_KEY` + `NOTIFY_FROM="Cypress Command <notices@cypresscommand.com>"`. ~10 minutes,
   free tier covers this volume. (SendGrid works too: `SENDGRID_API_KEY` + `NOTIFY_FROM`.)
   Nothing sends until both are present; the app never fails a call over mail.
4b. **SMS leg (ruling Sep 18: the package also goes by text).** Built, env-gated. Once the
   A2P 10DLC registration clears in the Twilio console, set `TWILIO_SMS_FROM` (the tenant or
   leasing line in E.164) — or `TWILIO_MESSAGING_SERVICE_SID` — and the leasing agent texts
   the one-pager link to the caller's callback number in the same tool call that e-mails it.
   Until then no text is attempted and the agent never claims one.
5. **Smoke (SMK-21):** call the tenant line, report a fake AC issue for 105 with a callback
   number, hang up → within a minute L-1 shows a Maintenance · Urgent row for unit 105;
   expand → summary, "Work order vr-… →", transcript; ▶ Play recording appears once
   Twilio finishes (usually < 1 min) if step 3 is done; the e-mail lands if step 4 is done.
   Mark handled; D-1 shows "Calls · 7d 1".
6. **Smoke (SMK-22):** call the leasing line, ask for the package by e-mail, spell an
   address → L-1 Leasing row with "Leasing package e-mailed to …" (or "send pending" when
   step 4 is not done); W-1 pipeline shows the lead.

## Env summary (all Vercel, Production)

| Var | Needed for | Default |
|---|---|---|
| `VOICE_SECRET`, `ANTHROPIC_API_KEY`, `CRON_SECRET` | already set | — |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | recording + playback | off |
| `RESEND_API_KEY` **or** `SENDGRID_API_KEY`, `NOTIFY_FROM` | owner e-mail + package e-mail | off |
| `TWILIO_SMS_FROM` **or** `TWILIO_MESSAGING_SERVICE_SID` | package by text (after A2P) | off |
| `VOICE_PUBLIC_ORIGIN` | recording callback URL | `https://otb-command.vercel.app` |
| `APP_PUBLIC_URL` | link in the e-mail | `https://otb.cypresscommand.com` |
| `VOICE_SUMMARY_MODEL` | summarizer | `VOICE_MODEL` → claude-haiku-4-5 |

## Deliberate boundaries

- Recordings stay at Twilio (no new bucket, no service-role key); the proxy checks the
  caller's role AND that the sid belongs to a readable `voice_calls` row.
- Callback + proxy share ONE function (`api/voice-call.js`) — written under the Hobby plan's
  12-function cap. The operator moved the project to **Vercel Pro** on Sep 18, so the cap no
  longer binds (`api/tour-lead.js` is the 13th); the merged file stays as is.
- SMS is limited to the leasing-package text and stays dormant until the A2P sender exists.
- The summarizer is told to invent nothing; a hang-up with no speech records "The caller
  hung up before anything was said." and still lands in L-1.
- `comm_log.status` is the only field the operator edits on a voice row (new ↔ handled).
