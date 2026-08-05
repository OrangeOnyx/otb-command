# Phase B-4 · Observability — design (2026-08-04)

Final build plan §Phase B item B-4: "cron/job heartbeats (the C3 lesson —
silence is an alert), error tracking, CI deploy-verify." Autonomous session
under `/goal`, following B-3 (docs/phase-b/10).

## What ships

1. **CI test+build verify on push** (`.github/workflows/ci.yml`)
   - `npm ci` → `npm test` (323 node:test) → `npm run build` on every push
     to master and every PR. Kills the "commit broke the suite/build and
     nobody noticed until the next session" class.
   - **Deliberately NOT auto-deploy.** The Vercel git-link decision is
     operator-open (blocked-decisions list since 2026-07-25); deploys stay
     manual `vercel deploy --prod`. CI is a tripwire, not a pipeline.
   - Build runs env-less (remote.js falls back local-only at build time) —
     no secrets in CI at all.

2. **Automation heartbeat** (migration `cron_heartbeat`, additive-only)
   - The C3 lesson applied to the watcher itself: every downstream detector
     (maintenance aging, voice leads, c3-stale, UniFi, rent posting, brief)
     rides the ONE daily auto-trigger cron — if Vercel cron dies, every
     alert goes quiet at once, silently.
   - `cron_heartbeats(id pk, org_id, property_id, ran_at, summary jsonb)`,
     stamps via the `default_org_id()/default_property_id()` bridge; read =
     member operator/owner; writes only via secret-gated definer RPC
     `post_cron_heartbeat` (same `app_secrets.auto_trigger` gate as every
     cron RPC). Cron writes it best-effort at end of run with the scan
     summary — a heartbeat outage never fails the cron.
   - **D-1 card** ("Automation (cron)"): green with last-run age + scan
     line; **brick past 26 h** (daily 11:00 UTC + 2 h grace). No row (or
     read failure) → no card, like the UniFi/C3 cards. Pure seam
     `src/lib/heartbeat.js` (+tests).

3. **Voice-bridge `esc()` null-safety** — the queued 07-29 one-liner:
   `String(s)` → `String(s ?? "")` (a null greeting rendered "null" into
   TwiML welcomeGreeting). Redeployed to Fly + /twiml smoke.

## Error tracking — no-vendor baseline SHIPPED (same session, follow-up round)

Option 3 (window.onerror → Supabase, no vendor) shipped as the baseline: it
forecloses nothing — a Sentry-class vendor can replace it later and the
table just stops growing. Migration `client_error_log`: client_errors table
(operator-only read), inserts ONLY via `log_client_error` definer RPC —
authed sessions only, per-user 50/hour cap, 30-day retention sweep on the
write path, field clamps server-side. Client: `src/lib/errlog.js` (pure
dedupe + 5-per-session cap, tested) wires window error/unhandledrejection in
boot; D-1 shows a brick "Client Errors (24h)" card only when the count is
non-zero — quiet is the normal state. Vendor upgrade (Sentry / log drains)
remains an operator menu item, now non-blocking.

## Deliberately not shipped

- **Auto-deploy on green** — the Vercel git-link operator decision stays
  open; CI remains a tripwire only.

## Rollout

Additive migration applied direct to prod (pre-Phase-B convention for
additive DDL; wrong-secret raise + rollback body smoke, advisors check),
then cron code + card deploy, then a manual secret-drilled cron run proves
the heartbeat row lands and the card renders.
