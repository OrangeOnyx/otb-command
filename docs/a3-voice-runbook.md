# A-3 Voice Lines — Go-Live Runbook (2026-07-24)

Two phone lines on Twilio ConversationRelay: **tenant line** (triage + work
orders) and **leasing line** (lead capture + tour booking). Architecture:

```
Caller ↔ Twilio (Deepgram ASR / ElevenLabs TTS)
       ↔ Fly.io bridge (bridge/ — dumb WS↔HTTP transport, always-on)
       ↔ Vercel brain (/api/voice-agent — personas, tools, guardrails)
       ↔ Supabase (work orders, tour bookings, transcripts — secret-gated RPCs)
```

Personas + all rules derive from `src/data/sop.json` (the A-4 capture).
Transcripts land in chat_threads as `voice-tenant` / `voice-leasing`.
Work orders flow into M-1/W-1 and the existing aging cron untouched.
Tour bookings land in `tour_bookings` (operator can free a slot by deleting
the row; windows/greetings live in the `voice_settings` row).

## Claude-done (this session)
- Migration `a3_voice_lines` (settings row · tour_bookings · voice_calls ·
  5 secret-gated RPCs · chat_threads agent check extended).
- `/api/voice-agent` brain (Bearer VOICE_SECRET, fails closed; GET = greeting
  config for the bridge).
- `bridge/` Fly app (server.mjs + Dockerfile + fly.toml).
- `tools/rotate-voice-secret.mjs` (A-0-style drill; also FIRST-TIME setter).

## OPERATOR steps (in order — nothing works until all are done)

**1. Twilio (console.twilio.com):**
   a. ConversationRelay onboarding: Console → Voice → ConversationRelay →
      Onboard (NOT instant — start this first). Pick ASR **Deepgram**,
      TTS **ElevenLabs** (needs enablement on the account — if error 64101
      appears later, flip the bridge to `TTS_PROVIDER=Deepgram` until enabled).
   b. Buy TWO local 337 voice numbers (Phone Numbers → Buy): one TENANT,
      one LEASING (~$1.15/mo each).
   c. Leave webhook config for step 4.

**2. Fly.io:** create an account (fly.io), install flyctl, `flyctl auth login`.
   Then from the repo:
   ```
   cd bridge
   flyctl launch --copy-config --no-deploy   # accept app name otb-voice-bridge, region dfw
   flyctl deploy
   ```

**3. Secrets (never in chat/repo — the A-0 drill shape):**
   ```
   npx vercel env pull %TEMP%\env.rot --environment=production --yes --scope adams-projects-0c52918e
   node tools/rotate-voice-secret.mjs %TEMP%\env.rot %TEMP%\new.secret
   npx vercel env add VOICE_SECRET production --scope adams-projects-0c52918e < %TEMP%\new.secret
   flyctl secrets set -a otb-voice-bridge VOICE_SECRET=<paste from %TEMP%\new.secret> BRAIN_URL=https://otb-command.vercel.app
   del %TEMP%\env.rot %TEMP%\new.secret
   npx vercel deploy --prod --yes --scope adams-projects-0c52918e
   ```

**4. Point the numbers at the bridge** (each number → Voice Configuration →
   "A call comes in" → Webhook, HTTP POST):
   - Tenant number:  `https://otb-voice-bridge.fly.dev/twiml?line=tenant`
   - Leasing number: `https://otb-voice-bridge.fly.dev/twiml?line=leasing`

**5. Smoke (call each number):**
   - Tenant line: report a fake AC issue on unit 105 → expect same-day
     language (business hours) → M-1 shows a `vr-…` request; W-1 card appears;
     AI-1 threads show `voice-tenant` transcript.
   - Leasing line: ask about space → "high teens" range → book a tour →
     `tour_bookings` row (check via R-1-side ops or ask AI-1).
   - Junk-secret check: `curl -H "Authorization: Bearer junk" -X POST
     https://otb-command.vercel.app/api/voice-agent` → 401.

## Deliberate v1 boundaries (don't mistake for bugs)
- No SMS notify to Adam on emergency dispatch yet (v2: Twilio REST from the
  brain). Manager visibility today = work order + W-1 card + transcript.
- No live call transfer — handoff = callback promise (per SOP 2.2 script).
- No per-day call cap (per-call turn cap only). Twilio spend alerts are the
  backstop — set one in Console → usage triggers.
- Greetings/windows edit = SQL on voice_settings or wait for the S-1-style
  settings UI (queued).
- Voice model = Haiku (VOICE_MODEL env-overridable) — phone latency first.
