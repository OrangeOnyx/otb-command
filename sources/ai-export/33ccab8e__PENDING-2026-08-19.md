# OOAC — Pending Work (2026-08-19)

**Snapshot as of Wednesday, August 19, 2026 · 07:51 CDT**

App live at [assetcommand.orangeocean.com](https://assetcommand.orangeocean.com) · main HEAD `077cedc` (pre-#24 merge) · 0 open PRs at snapshot time.

---

## 1. Ship-ready (do first)

- [x] **[PR #24](https://github.com/OrangeOnyx/orange-ocean-asset-command/pull/24)** — Schedule G escalation window fix. Merged this session; branch deleted. Wait ~5 min for Railway build to go green.
- [ ] **Live end-to-end DOCX test on Suite 105.** Tenant: Bayou Brew Test Cafe, LLC. $2,400 initial base. 3-month construction abatement.
  - G-1 should show exactly one row at `2026-10-01 · $2,400.00`.
  - G-3 should use `$2,400` across all 9 non-abated months.
  - A document row must appear in Suite 105's Documents tab.
  - Success on all three closes the Lease Assembler workstream.

---

## 2. Manus wind-down (billing renews 2026-08-27)

- [ ] Set `SCHEDULER_ENABLED=true` on Railway `ooac-web` — **only after** Manus Heartbeat stops firing (double-fire risk otherwise).
- [ ] Cancel Manus subscription before 2026-08-27.
- [ ] Remove `noreply@mail.manus.im` notification dependency — audit anywhere still expecting Manus email.

---

## 3. Security — HIGH priority

Rotate the 9 secrets exposed in plaintext during the Postgres/Manus cutovers. Metabase security incident (2026-08-10) adds urgency.

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SENDGRID_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `JWT_SECRET`
- [ ] `UNIFI_API_KEY`
- [ ] `VOICE_WEBHOOK_SECRET`
- [ ] `LLM_API_KEY`
- [ ] Supabase DB password
- [ ] OpenAI `IMAGE_API_KEY`
- [ ] Flip `NL_QUERY_DIALECT` from `mysql` → `postgres` on Railway (still wrong).

---

## 4. Data hygiene

- [ ] Upload **site-plan backdrops for all 7 view tabs** (unit-overlay alignment matters).
- [ ] Upload **latest site plan** — straight-in parking + Marie Antoinette remote lot. `sitePlanGeometry.json` is stale.
- [ ] Verify three lease term-end shortenings held back by the reconciler against executed leases: **Units 107, 125, 127**.
- [ ] Fix `maintenance@ontheblvdops.com` bouncing since 2026-07-30.
- [ ] Verify Dickey Dupuis viewer login end-to-end against production (`dickeydupuis@icloud.com`, viewer on OTB — never confirmed).

---

## 5. Wave 3 — voice-agent web parity

The only formally planned wave left. Estimated 1–2 days.

- [ ] Add server-side STT via `concierge.transcribe` mutation. Use ElevenLabs STT (vendor already in stack).
- [ ] Add mic button to `AIChatBox` → `MediaRecorder` → post audio → feed transcript into existing `handleSend` path (already wired by PR A / #12).
- [ ] Optional: replace standalone `<elevenlabs-convai>` widget on `TenantPortal.tsx:601` with unified Concierge scoped by tenant token.

Not blocking anything — phone voice path (voice → intake → idempotent WO) is already hardened via PR G / #19.

---

## 6. Housekeeping / infra

- [ ] Wire a test `DATABASE_URL` to unblock the **50 "Database not available"** integration tests. Pre-existing baseline, not new.
- [ ] Admin-prune GitHub branches blocked by delete-protection rule: merged `feat/*` branches, plus `fix/storage-proxy-floor-plans` and `postgres-conversion-wip`.
- [ ] **Google Workspace admin action on Google Meet note-taking controls before 2026-09-21.**
- [ ] `orange-ocean-website` — upgrade Vercel Node.js 20 → 24 before **2026-10-01** or builds break.
- [ ] Decide on CodeRabbit — trial ended, review limit reached.

---

## 7. Open operations items (from Notion Morning Brief 2026-08-18)

- [ ] **Unit 129 burst pipe still open** — origin 2026-07-30, 19+ days.
- [ ] **Vitest Holdings LOI** — Unit 131, restaurant, 2,400 SF, 5-year term. Awaiting legal review since 2026-07-30.
- [ ] **Belle Realty rent-roll** — unanswered since 2026-07-24.
- [ ] **AI-persona agreement draft to Rusty Randol** — unsent since 2026-07-25.

---

## 8. Domain

- [ ] Decision needed: `orangeoceanassetcommand.com` becomes transferable **2026-09-26**. Keep as strategic secondary or drop. `orangeocean.com` remains the strategic home.

---

## Plain-English summary

**Waves left: one and a half.**

Wave 2 is done and shipped. The "Wave 2.5" Lease Assembler cleanup is 90% finished — PR #24 just merged, and you owe it one real DOCX test on Suite 105 to prove the two Schedule G bugs are dead. Under an hour of work.

**Wave 3 is the only formally planned wave left**, and it's narrowly scoped: unify the voice agent so the tenant-portal ElevenLabs widget stops being a bolt-on and everything routes through the AI Concierge via server-side STT. Estimated 1–2 days when you get to it. Nothing blocks on it — the phone voice path is already hardened.

Everything else isn't really a "wave" — it's operational cleanup that piled up during the Postgres cutover and Manus exit. The urgent chunk is a **~2-week security debt window**: nine secrets exposed in plaintext need rotation, and Manus billing resumes 2026-08-27 unless you flip `SCHEDULER_ENABLED=true` and cancel. Miss the date and you're paying for a platform you've fully decoupled from.

After those two things (Wave 3 + Manus/security), the rest is **housekeeping and asset uploads** — site-plan backdrops, the fresh site plan with the remote lot, three unit term-end verifications, a bouncing mailbox, and one login that was never confirmed. Then calendar-driven infra deadlines: Google Meet admin action by **2026-09-21**, Vercel Node 24 upgrade by **2026-10-01**, and the `orangeoceanassetcommand.com` domain unlocks **2026-09-26** if you want to move it.

Four ops items are aging in Notion (Unit 129 burst pipe, Vitest LOI, Belle Realty rent-roll, Rusty Randol AI-persona agreement) — your call, not code work.

**Net:** the code side is basically at a resting state. Test that PR #24 fix live, then you're in cleanup mode until Wave 3.
