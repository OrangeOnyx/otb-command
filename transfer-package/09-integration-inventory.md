# 09 — API and Integration Inventory

System code: **OTBC**. Status: LIVE = deployed and verified; LOCAL = runs on
the operator's Windows machine; PLANNED = discussed/designed only.

## OTBC-INT-001 · Supabase (auth + Postgres + storage) — LIVE
- **Purpose:** the entire hosted backend (Path B): magic-link auth, role
  profiles, `property_state` layer mirror, append-only event/money tables,
  4 private storage buckets.
- **Auth method:** anon key + user JWT (RLS-enforced); secret-gated SECURITY
  DEFINER RPCs for cron writes; **no service-role key anywhere**.
- **Direction/trigger:** client SDK (`lib/remote.js`, debounced 800ms push on
  store events) + server REST (`api/_supa.mjs`).
- **Failure behavior:** REMOTE flag false → app degrades to
  localStorage/IndexedDB-only local mode. Money writes throw; audit writes
  swallowed.
- **Security:** all buckets private, 25MB caps, RLS matrix in
  supabase/security-model.sql. Project `kbhsghodquchkgfdzckc`.
- **Replacement options:** any Postgres+RLS stack (Neon+PostgREST, self-hosted
  Supabase); the seam (`remote.js` + `_supa.mjs`) is the only touchpoint.

## OTBC-INT-002 · Anthropic Claude API — LIVE
- **Purpose:** AI-1 agent desk (`claude-opus-4-8`, adaptive thinking, streaming,
  4 tool rounds) + C3 stall classifier (Claude Haiku, offline Python pipeline).
- **Auth:** `ANTHROPIC_API_KEY` Vercel env (rotated 2026-07-14); local pipeline
  pulls key at runtime via `vercel env pull` → load → delete.
- **Data sent:** prompt-cached property dossier (~7.6k tokens, `api/_context.mjs`),
  live-state digest, user chat; per-stall image crops (C3).
- **Data received:** streamed text + tool calls; strict-JSON stall verdicts.
- **Failure:** 502/canned decline; numeric guardrail fails closed; C3 nightly
  task logs and skips.
- **Replacement:** any tool-calling LLM API; the guardrail + card protocol are
  provider-neutral.

## OTBC-INT-003 · ElevenLabs TTS — LIVE
- Voice replies for AI-1 (`api/voice.js`, model eleven_turbo_v2_5, voice "Jack
  John", 2,400-char cap, 150/day/user). Key server-side. Failure → 502, feature
  degrades to text. Replacement: any TTS (OpenAI, Azure, browser SpeechSynthesis).

## OTBC-INT-004 · UniFi Site Manager (api.ui.com) — LIVE
- D-1 "Network" card: hosts/sites/devices → shaped summary (up/total, health
  line, client count, flags unlisted-down units). `UNIFI_API_KEY` server-side;
  60s private cache; card absent on outage/local mode. Covers the UDM Pro
  "Belle" + switch + 6 APs. Deferred: offline-device auto-trigger, per-AP
  uptime history.

## OTBC-INT-005 · DW Spectrum NVR over Tailscale — LOCAL (production-critical)
- 17-camera Blackjack Cube NVR (cloud system "Belle Reality"), reached at
  Tailscale IP 100.73.185.15. `tools/cube-frames.mjs` samples 17 JPEG frames /
  300s to a capture dir outside the repo; `tools/cube-backfill.mjs` recovers
  archive frames via `/ec2/cameraThumbnail?time=<epochMs>` (the /rest/v2 image
  endpoint ignores timestamps — hard-won lesson). Creds in `~/.otb-cube.env`
  (local user, never committed). Self-healed by Task Scheduler watchdog.
- **Failure behavior:** sampler has died 3× (2 reboots, 1 silent); watchdog
  re-registers at logon+5min. Frames bank locally; classification is nightly.
- **Risk:** whole pipeline is single-Windows-machine + Tailscale dependent.

## OTBC-INT-006 · C3 occupancy pipeline (composite) — LIVE end-to-end
- Chain: sampler (INT-005) → `tools/c3-stalls.py --classify` (Haiku, hourly
  sampling, strict JSON) → `<capture>/occupancy/<date>.jsonl` →
  `tools/c3-upload.mjs` (idempotent POST via secret-gated
  `post_occupancy_samples`) → `occupancy_samples` table → A-1 🚗 chip + D-1
  card. Nightly Task `OTB-C3-Nightly` (23:45) runs classify+upload hands-free.
  Cost note: Batches API halves cost for historical sweeps (documented,
  not wired).

## OTBC-INT-007 · Vercel (hosting + cron + env) — LIVE
- Static hosting + serverless functions + daily cron `/api/auto-trigger`
  (11:00 UTC) + secret store. CLI-only deploys (no git integration —
  deliberate). CSP/security headers in vercel.json.

## OTBC-INT-008 · Esri World Imagery — LIVE (frozen)
- Satellite basemap. Live tile source was replaced by a **frozen z19 composite**
  (`public/OTB-sat-base.jpg` + sat-base.json corners) because silent Esri
  refreshes kept breaking georegistration. Re-fit drill: `fit-georef.py` →
  `extract-georef.py` → `build-sat-base.py` together (one imagery vintage).
  Planned swap: owned drone ortho after roof re-fly (same corners contract).

## OTBC-INT-009 · Google Drive — LIVE (links only)
- Executed leases, floor plans, logos referenced by URL in link registries
  (Path A "Drive-link files"); exports copied to `G:\My Drive\00 OTB`. No API
  integration — links open in browser; confidential links ride in the
  auth-gated seed.

## OTBC-INT-010 · Web Speech API — LIVE (browser)
- 🎙 mic input for AI-1 (Chrome/Edge only, auto-hidden elsewhere). No server.

## OTBC-INT-011 · Email — PARTIAL (deliberate)
- Outbound "✉ Email" on lease packages = `mailto:` prefilled with signed URL +
  OTB signature (human-in-the-loop). True in-app send (Resend/SendGrid) is a
  known later step gated on a key + custom-domain/SMTP decision. Magic-link
  auth email currently on Supabase default SMTP.

## OTBC-INT-012 · Windows Task Scheduler — LOCAL
- `OTB-C3-Sampler-Watchdog` (logon+5min) and `OTB-C3-Nightly` (23:45,
  PYTHONUTF8=1 lesson: cp1252 stdout killed a run that looked successful).
  Registration scripts self-document (`-Register`).

## Planned / discussed only (not implemented)
- **B4 Supabase Realtime** (live multi-client sync) — deferred.
- **Custom domain + SMTP** (`command.ontheblvd.com`; canonical-domain decision
  ontheblvd.com vs shopontheblvd.com blocks vinyl QR print run) — operator DNS.
- **B2 public leasing microsite + B4 scoped public leasing bot** — deferred
  (awaits new footage / domain).
- **Avatar for voice concierge** — needs provider decision.
- **C2 homography/de-warp, C4 VLM night-watch, C5 timeline lens** — camera
  roadmap phases (docs/camera-4d-brief.md).
- **DoorLoop import — OFF the roadmap permanently** (operator decision Jun 2026;
  DoorLoop demoted to authority rank 99). Do not re-propose.
- Never discussed/absent: QuickBooks, Stripe, Twilio, listing syndication,
  document e-sign (e-sign schemas queued as harvest #6), OCR (queued, gated on
  data surfaces), weather.
