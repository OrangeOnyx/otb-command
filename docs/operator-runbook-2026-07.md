# Operator Runbook — everything only YOU can do (2026-07-25)

Every remaining item that requires the operator, with exact steps. Claude-doable
work is DONE and deployed (269→272 tests; UniFi offline auto-trigger shipped
2026-07-25). Ranked by impact — work top-down.

---

## 1 · A-5 Stripe ACH activation (pairs with the Aug 1 ledger go-live)

The webhook is deployed and DORMANT (returns 503 until configured). Rent is
all-electronic per the A-4 SOP, so this is the collections rail.

1. **Get the key:** dashboard.stripe.com → Developers → API keys → copy the
   **Secret key** (`sk_live_…`). Never paste it in chat.
2. **Add to Vercel** (from the repo folder, key via stdin so it never hits
   shell history — NO trailing newline, Vercel rejects it at deploy):
   ```
   npx vercel env add STRIPE_SECRET_KEY production --scope adams-projects-0c52918e
   ```
   (paste the key at the prompt)
3. **Point Stripe at the endpoint:** dashboard.stripe.com → Developers →
   Webhooks → Add endpoint → URL
   `https://otb-command.vercel.app/api/stripe-webhook` → events:
   `payment_intent.succeeded` + `payment_intent.payment_failed`.
   (No signing-secret needed — the endpoint verifies by re-fetching the event
   from Stripe, so the dashboard's signing secret can be ignored.)
4. **Redeploy:** `npx vercel deploy --prod --yes --scope adams-projects-0c52918e`
5. **Tell Claude "smoke ACH"** — Claude runs the end-to-end verification
   (test event → ledger row / manager-thread paths).
6. To map payments to units, the PaymentIntent must carry `metadata.unit`
   (e.g. `117.5`) — set that in whatever Stripe payment links/invoices you
   create. Unmapped payments don't get lost: they open a manager thread.

## 2 · A-3 Voice go-live (full detail: `docs/a3-voice-runbook.md`)

Everything is built and deployed; nothing rings until these run, in order:

1. **Twilio ConversationRelay onboarding** (console.twilio.com → Voice →
   ConversationRelay → Onboard). NOT instant — **start this first**. Pick
   ASR Deepgram, TTS ElevenLabs (if error 64101 later, set the bridge to
   `TTS_PROVIDER=Deepgram` until ElevenLabs is enabled on the account).
2. **Buy two local 337 numbers** (Phone Numbers → Buy, ~$1.15/mo each):
   one TENANT, one LEASING.
3. **Fly.io bridge:** create account at fly.io, install flyctl,
   `flyctl auth login`, then `cd bridge && flyctl launch --copy-config
   --no-deploy` (accept name `otb-voice-bridge`, region dfw) → `flyctl deploy`.
4. **Secret drill** (exact commands in the runbook §3 — pull env → 
   `node tools/rotate-voice-secret.mjs` → set VOICE_SECRET in Vercel + Fly →
   delete temps → redeploy).
5. **Point each number** → Voice Configuration → "A call comes in" → Webhook
   POST: tenant `https://otb-voice-bridge.fly.dev/twiml?line=tenant`,
   leasing `…?line=leasing`.
6. **Smoke calls:** call the tenant line, file a fake leak (check M-1 + the
   transcript thread); call the leasing line, book a tour (check
   tour_bookings + thread).
7. **Set a Twilio usage trigger** (Console → Monitor → Usage triggers) —
   v1 has no daily call cap by design; the trigger is the cost backstop.

## 3 · Two-minute console toggles

1. **CAPTCHA** (stops magic-link email-bomb abuse; no API for this):
   supabase.com/dashboard → project `kbhsghodquchkgfdzckc` → Authentication →
   Bot and Abuse Protection → enable (Turnstile or hCaptcha) → Save.
2. **Identify the dead WiFi unit:** unifi.ui.com → Belle console → Devices —
   one unit has been offline so long Site Manager dropped it from the API
   list (AI-1 now has a manager thread for it, opened by the new auto-trigger).
   Name/power-cycle it; if it's retired gear, remove it so the count heals.

## 4 · Decisions Claude is blocked on (answer by number/letter)

1. **Owner-layer read policy** — today RLS lets owners read ALL persisted
   layers; the owner D-1 renders actions+comp, so blanket per-layer RLS would
   break it. Pick: **(A)** keep as-is (client-side hiding only) ·
   **(B)** owners read {comp, actions, contacts, financials, ownerSheets} —
   notes/documents/features/cameras operator-only · **(C)** you name the set.
2. **Canonical domain** — ontheblvd.com (Apr-2026 brand doc) vs
   shopontheblvd.com (2025 package). Gates: vinyl QR re-print, microsite,
   `command.ontheblvd.com` app domain + custom SMTP.
3. **Auto-deploys** — flip to git-integration deploys? Prereq Claude can do
   on your "go": move splat/mesh (19MB) to Supabase storage, create a GitHub
   repo + Vercel git link. Ends the "commit ≠ deployed" footgun.
4. **B-queue resume** — rank what's next: B3 twin fly-through · B4 public
   scoped leasing bot · C2 sandbox login for prospects · C3 LinkedIn series
   (B2 microsite stays deferred until new footage).

## 5 · Field / physical (when on-site)

1. **Call the roofer** — `docs/roof-condition-brief.md`: membrane failure,
   long-building RTU row (~101–109), open to weather since ≤Oct-2025.
2. **Roof re-fly** (next Skydio flight) — recipe in
   `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`; unlocks gap-free
   ortho + real roof splat.
3. **Stall walk** — confirm the est-geometric stall indexes (A-1 🚗 zones);
   corrections go to `src/data/stall-map.json` via Claude.
4. **Asset-pin walk** — A-1 → ＋ Pin: water shutoffs, meters, benches, cans.
5. **Blessed photos** — drag `_BLESSED-2020-shoot/app-ready-2000px/` into
   K-1 Site imagery + unit drawers (2 min).

## 6 · Pending smoke tests (open the live app, check each)

From 07-25: ▶ PLAY WITH VOICE full loop in `docs/pitch/commercial.html` ·
skim both brief-variant PDF covers · unit drawer → E-Sign → create → Copy
link → open incognito → sign · M-1 as tenant → "Your account" · ask 🤝
Leasing the $45K-RTU reserve question.
Older, still open: K-1 PDF attach · 🎥 Reality orbit · lease-package
assembly · V-1 vendor-folder upload · V-1 🤖 Parse cert (real ACORD PDF) ·
M-1 submit→assign→W-1 card→V-1 work order · add one real tenant login ·
leasing-calc question ("retain at $17 vs replace at $20…").

## 7 · Data gaps (hand Claude the facts, Claude wires them)

1. **Missing deposits** for units 107 / 137 / 143 / 149 — pull from the lease
   files; give Claude the four numbers.
2. **Magnolia 121 executed lease** — provide the signed copy; Draft→Executed
   swap is ready.
3. **Parking variance 99-11797 / electric easement 577566 hard copies** —
   parish records, only if ever needed for the K-1 register links.
