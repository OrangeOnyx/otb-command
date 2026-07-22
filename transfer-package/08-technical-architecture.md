# 08 — Technical Architecture

System code: **OTBC**. VERIFIED unless noted (all claims traced to files/commits
in this repo).

## Stack (VERIFIED)

| Layer | Choice | Evidence |
|---|---|---|
| Language | Vanilla JavaScript (ES modules), no framework, no TypeScript | src/ tree; package.json |
| Build | Vite 7 (`vite@^7.1.0`) | package.json:27 |
| Frontend shape | Single static `index.html` shell → `/src/main.js`; 12 sheet sections show/hidden by nav (no router) | index.html:202, main.js:56-75 |
| 3D/geo libs | three@0.185 (Lens B), maplibre-gl@5.24 (Lens C), @mkkellogg/gaussian-splats-3d@0.4.7 (Lens D) — all lazy code-split | package.json:29-35 |
| Backend | Vercel serverless functions (Node ESM) in `api/`; `maxDuration=60` on AI endpoints | api/concierge.js:25 |
| Database | Supabase Postgres (project `kbhsghodquchkgfdzckc`) + Supabase Auth (magic link) + Supabase Storage (4 private buckets) | supabase/security-model.sql; api/_supa.mjs |
| AI | @anthropic-ai/sdk ^0.110 — `claude-opus-4-8` (concierge), Claude Haiku (C3 stall classifier, offline pipeline) | api/concierge.js:154-161; tools/c3-stalls.py |
| Voice | ElevenLabs TTS proxy (`eleven_turbo_v2_5`) | api/voice.js |
| Hosting | Vercel — https://otb-command.vercel.app, team `adams-projects-0c52918e` | docs/path-b-supabase-scope.md:72 |
| Test framework | `node --test` native runner — 29 test files, **197 unit tests** (HANDOFF 2026-07-22) | test/*.test.mjs; package.json:11 |
| Offline tooling | Python (ezdxf CAD extraction, Pillow posters, openpyxl proforma) + Node tools; PowerShell scheduled tasks | tools/ |

## Architecture pattern: "pure seam" discipline (VERIFIED, load-bearing)

The codebase's defining convention: every feature is split into a **pure,
unit-testable module** in `src/lib/` (no DOM, no network) and a thin view/API
consumer. Examples: `lib/unifi.js shapeUnifi` (API reshape), `lib/occupancy.js`,
`lib/coi.js`, `lib/ledger.js`, `lib/brief.js`, `lib/calc/*`, `lib/splat-align.js`
(quaternion math), `lib/iso.js`. This is why 197 tests exist with no test
framework dependency, and it is the single most transferable implementation
practice in the project.

Other systemic patterns:
- **Single-source registries:** `lib/pages.js` (nav → owner-whitelist → print
  stamps), `lib/layers.js` (one table drives store shape, resets, persistence,
  export AND remote sync allowlist — built 2026-07-20 to kill a hand-synced
  twin-list bug class), `lib/cards.js` (chat card-line registry),
  `lib/bucketstore.js` (bucket-store factory: docs/safe/vendors are thin configs).
- **Generated artifacts, never hand-edited:** `api/_context.mjs` (concierge
  dossier — `npm run concierge-context`), `api/_seed.json` (`npm run split-seed`),
  `src/data/*.json` extracted from SOT workbook / DXF by tools/.
- **Derived seed + override layer:** W-1 board and camera positions merge
  computed seeds with persisted operator overrides.

## Persistence topology (VERIFIED)

Three tiers behind seams:
1. **localStorage** — persisted layers (comp, notes, actions, contacts,
   documents, financials, features, cameras, ownerSheets) via `store.js`,
   write-through, round-trips through Export/Import JSON.
2. **IndexedDB** — binary assets (photos/floor plans/roof/signage) via
   `lib/assets.js` + `lib/bucketstore.js` micro-backend; local fallback for
   docs (`otb-docs`).
3. **Supabase (Path B, REMOTE mode)** — `property_state` JSONB mirror of the
   layers (sync allowlist from `lib/layers.js`), private storage buckets
   (assets/documents/safe/vendor-docs, 25MB caps), and normalized tables for
   append-only facts: `compliance_events`, `ledger_entries`, `owner_briefs`,
   `chat_threads`/`chat_messages`, `occupancy_samples`, `vendors`, `profiles`,
   `authorized_emails`, `api_usage`, `app_secrets`.

Local mode (no `.env`) runs the full UI on skeleton public data with no rents —
by design after the C1 confidential-seed split.

## Auth & authorization (VERIFIED)

- Supabase magic-link only (no passwords, no MFA; CAPTCHA pending operator).
- Roles operator/owner/vendor/pending resolved by DB trigger at first sign-in
  (vendor roster > allowlist > pending). See 03-roles-permissions.md.
- Server gate `api/_auth.mjs requireOwnerOrOperator` verifies the JWT against
  Supabase `/auth/v1/user` then reads `profiles.role`; vendors/pending → 403.
- Per-user daily caps via `check_and_bump_usage` RPC (concierge 200 / voice
  150). **Fails open** on infra error — documented tradeoff.
- No service-role key anywhere; cron writes go through secret-gated SECURITY
  DEFINER RPCs checked against the `app_secrets` table (deny-all RLS).

## API surface (VERIFIED)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/concierge` | POST | owner/operator + cap 200/day | Streaming 3-agent AI desk; `run_calc` + operator-only `assemble_lease_package` tools; transcripts to chat_threads/messages; `X-Thread-Id` header; `[[package:]]` card lines |
| `/api/voice` | POST | owner/operator + cap 150/day | ElevenLabs TTS proxy; 2,400-char cap; audio/mpeg stream |
| `/api/unifi` | GET | owner/operator | UniFi Site Manager proxy (hosts/sites/devices → shaped summary; private, max-age=60) |
| `/api/seed` | GET | owner/operator | Confidential seed hydration (rents, tenant PII, lease links, AP roster) — kept out of the public bundle |
| `/api/auto-trigger` | GET | `Bearer CRON_SECRET` | Daily cron: renewal/holdover thread seeding, monthly owner brief, monthly rent charges |

Failure behavior: 401/403 on auth, 429 over cap, 502 on upstream error (or
`[Agent error]` appended if the stream already started); canned decline on model
refusal; transcript writes best-effort (swallowed).

## Environment variables (VERIFIED)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client-safe, in .env.example) ·
server-only: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
(optional), `UNIFI_API_KEY`, `CRON_SECRET`. Local tooling (not Vercel):
`~/.otb-cube.env` (CUBE_USER/CUBE_PASS for DW Spectrum), `~/.otb-unifi.env`.
Operational drill: secrets pulled from Vercel env at runtime
(`npx vercel env pull` → load → delete), never on disk/chat/repo.

## Deployment (VERIFIED)

- **CLI-only deploys**: `npx vercel deploy --prod --yes --scope
  adams-projects-0c52918e`. Commits do NOT auto-deploy (no git remote / no
  Vercel git integration) — deliberate, because the 16MB splat + 3MB mesh are
  gitignored and ride via `.vercelignore`.
- Cron: `vercel.json` schedules `/api/auto-trigger` daily 11:00 UTC.
- Security headers (vercel.json): strict CSP (`script-src 'self' blob:
  'wasm-unsafe-eval'` — the WASM token exists for the splat sorter; allowlisted
  hosts: fonts, *.supabase.co, server.arcgisonline.com), HSTS, X-Frame-Options
  DENY, nosniff, Referrer-Policy, Permissions-Policy `microphone=(self)` only.
- Dev server port **5199** (`--strictPort`, .claude/launch.json).
- Quality gate: `node --check` per module + `npm run build` + console clean;
  "deployed means done" — prod bundle grep-verified after each deploy.

## Background/scheduled jobs (VERIFIED)

| Job | Runner | Schedule | Purpose |
|---|---|---|---|
| `/api/auto-trigger` | Vercel cron | daily 11:00 UTC | AI-thread seeding + monthly brief + monthly rent charges (all idempotent) |
| `OTB-C3-Sampler-Watchdog` | Windows Task Scheduler | logon + 5 min | Self-heals the detached camera frame sampler (`tools/sampler-watchdog.ps1`) |
| `OTB-C3-Nightly` | Windows Task Scheduler | daily 23:45 local | Classify banked frames (Haiku) + upload occupancy JSONL to Supabase (`tools/c3-nightly.ps1`; PYTHONUTF8=1 lesson) |
| Camera sampler | detached node process | 300s loop | `tools/cube-frames.mjs` pulls 17 camera JPEGs via Tailscale to a capture dir outside the repo |

Note the split-brain risk: half the automation lives on Vercel cron, half on one
Windows machine's Task Scheduler + a Tailscale-reachable NVR — see
12-weaknesses.

## Logging / monitoring (VERIFIED-absent)

No structured logging, error tracking, or uptime monitoring beyond Vercel
function logs, `sampler.log` in the capture dir, and append-only audit tables
(safe_log, vendor_log, compliance_events, api_usage). Numeric guardrail failures
fail closed silently to the user.

## Verified vs inferred

Everything above is VERIFIED from source/docs in-repo. STRONGLY INFERRED only:
exact Supabase migration contents (the repo carries a snapshot
`supabase/security-model.sql`, not the migration SQL — authoritative history
lives in the Supabase project); Vite config details (no vite.config observed in
listing — defaults + launch.json flags assumed).
