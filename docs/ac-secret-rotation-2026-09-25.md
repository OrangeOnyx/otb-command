# Asset Command — secret rotation checklist (H0-3 / F-12), 2026-09-25

Scope: the Railway service **`ooac-web`** (project *OTB Ops* → environment `production`),
43 service variables, values masked in the operator's export. AC is served at
`assetcommand.orangeocean.com`; `orangeoceanassetcommand.com` returns a Cloudflare 404 today.

Source of the exposure: `OrangeOnyx/orange-ocean-asset-command` → `ONBOARDING.md` §7 item 2 —
"Ten production secrets need rotation, exposed in a Railway variable dump, plus a Perplexity
key pasted in plaintext on 2026-08-04."

**Never paste a value into chat, a ticket, or a file.** Copy provider console → Railway only.

## Rules for the whole pass

- Railway redeploys on variable change. Use **Raw Editor** to stage several at once, then let
  it deploy once; verify the app after each *group*, not each keystroke.
- Rotate in the order below: read-only / low-blast-radius first, session- and
  database-breaking last.
- For each: create new in the provider → paste into Railway → redeploy → confirm AC loads and
  the dependent feature works → **then revoke the old key**. Revoking first turns a rotation
  into an outage.
- Stale in the docs, confirmed from the export: `LLM_API_KEY` **is** set now (ONBOARDING §7
  item 3 says it is unset — that is out of date). `ELEVENLABS_API_KEY`,
  `QUICKBOOKS_CLIENT_ID/SECRET` and `BUILT_IN_FORGE_API_KEY` appear only under Railway's
  *Suggested Variables* — they are **not set in production**, so there is nothing to rotate
  and the ElevenLabs key referenced in the old audits is not live on this service.

## The list (11 candidates; 10 true rotations)

| # | Variable | Provider / where | Rotate how | Breaks while wrong |
| --- | --- | --- | --- | --- |
| 1 | `UNIFI_API_KEY` | UniFi Site Manager → Settings → API | Create new key → paste → revoke old | D-1 network card only |
| 2 | `IMAGE_API_KEY` | Forge / image gateway (`IMAGE_BASE_URL`) | New key at the gateway → paste → revoke | Image generation only |
| 3 | `LLM_API_KEY` | Perplexity → Settings → API | Generate new → paste → delete old. **Do this one even if you skip others** — this is the key pasted in plaintext on 2026-08-04 | AI falls back to Forge, logs a boot warning |
| 4 | `SENDGRID_API_KEY` | SendGrid → Settings → API Keys | Create (Full Access) → paste → delete old | Owner notification e-mail |
| 5 | `VOICE_WEBHOOK_SECRET` | You choose it: `openssl rand -hex 32` | Paste into Railway **and** into the ElevenLabs agent's server-tool `X-OTB-Secret` header — both sides, same value | AC voice intake fails closed (401). Moot after F-11 cutover |
| 6 | `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret → **Roll** | Roll → paste new → Stripe keeps the old valid for the window you pick (use 24 h) | Payment webhooks (`BILLING_ENABLED=false` today, so low risk) |
| 7 | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Roll** the secret key | Roll with a 24 h expiry → paste → confirm → let the old expire | Charges / billing calls |
| 8 | `VITE_FRONTEND_FORGE_API_KEY` | Forge / maps key used in `client/src/components/Map.tsx` | **This one ships in the browser bundle — it is public by design.** Do not treat it as a secret; instead restrict it by HTTP referrer to `assetcommand.orangeocean.com` in the provider console | Map tiles |
| 9 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase project `pegmtfjexdzuupubgggv` → Settings → API | **Generate new JWT secret** invalidates `anon` *and* `service_role` together — do both in one pass. Expect a short AC outage | All file storage (295 objects, ~1.4 GB, bucket `asset-command`) — every lease/floor-plan download |
| 10 | `JWT_SECRET` | You choose it: `openssl rand -hex 32` | Paste → redeploy | **Signs everyone out.** Do it when nobody is mid-session; users just sign in again |
| 11 | `DATABASE_URL` | TiDB Cloud → Cluster → users | Change the user's password (or create a new user with the same grants), rebuild the connection string, paste, redeploy, then drop the old user | Everything. Do it last, alone |

Suggested sitting: 1–5 in one pass (~20 min, near-zero risk), 6–8 in a second, 9–11 in a third
with the app expected to blink.

## The part rotation does not fix

AC's own code review (`docs/review/code-review.md`, P0-1) found `db-backup-20260707.sql`
(273 KB) and `seed-payload.json` committed to that repo. They contain **real bcrypt password
hashes** (adam@adamabdalla.com, catherine@, alicia@, edward@belle-realty.com), 32 real e-mail
addresses, client IPs, and the production TiDB hostname. They are out of the current tree but
**still in git history**, so anyone who ever cloned it holds them.

That needs its own job, not a variable swap:
1. Force a password reset for every real user in the dump (or confirm AC logins are magic-link
   only now and the hashes are dead weight).
2. Purge both files from history (`git filter-repo` / BFG), force-push, everyone re-clones.
3. Add `*.sql`, `*backup*.sql`, `seed-payload.json` to `.gitignore`.
4. Rotate the TiDB credential — item 11 above covers it.

Cypress Command Platform is unaffected: it holds no service-role key and the hashes are AC's
own auth table, not this platform's (this one is magic-link only).
