# OTB Property Command — Session Handoff

**Read this + `CLAUDE.md` at the start of a new session.** Start Claude Code from
inside this repo folder so `CLAUDE.md` auto-loads.
Repo: `C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`
Last updated: 2026-07-11.

## ⚡ NEXT SESSION — START HERE
**Live app:** https://otb-command.vercel.app (magic-link; operator = adam@adamabdalla.com).
**State:** 12 sheets incl. A-2 Spatial (4 lenses, 🎥 Reality now CLICKABLE) + S-1 Owner Safe
+ **AI-1 Concierge (P4)** + **V-1 Vendor Portal (P3)** — both SHIPPED 2026-07-08 — + doc
attachments + global search + dark mode. 58 unit tests. ALL SHIPPED PHASES ARE DEPLOYED.
**Deploy rule:** commits do NOT auto-deploy → `npx vercel deploy --prod --yes --scope adams-projects-0c52918e`
(CLI logged in as orangeonyx). `.vercelignore` governs uploads (NOT .gitignore — the 16MB splat rides in public/).
**Open items, ranked:**
1. **OPERATOR: call the roofer** — `docs/roof-condition-brief.md` (updated 2026-07-08): membrane
   failure on the long-building roof (RTU row, ~101–109; frames S1002424/27/33), open to weather.
   Register row on K-1 + action card on W-1 are live. **The "thermal moisture anomaly near 149"
   was RETRACTED** — after the georef refit, frames S1002330/28 locate on the NEIGHBOR's roof
   north of Patricia (the Skydio sweep covered neighbor roofs for mesh context). Courtesy
   heads-up to that neighbor = operator's call; no Belle repair scope from it.
2. ~~Photogrammetry mesh~~ **SHIPPED 2026-07-11 (v1, $0, no RealityCapture)** — see P6d mesh note
   below. Optional v2 upgrade: re-run the dense pass with the Skydio nadir set folded in
   (better roofs) once RealityCapture/Metashape is available, or after the 15-min supplemental
   flight in `README-TRAINING.md`.
**SHIPPED 2026-07-11 (this session, all deployed):** A-2 polish (⇅ True-heights toggle on
iso+3D · north arrow + 100′ scale bar on the iso · ⤓ standalone-SVG export) · tenant-logo
thumbnails in unit drawer + R-1 (`npm run logo-thumbs`) · **P6d mesh in Lens B** (in-pane
🏗 Mesh / ◧ Massing toggle) · v9 concept + stale Drive "(1)" duplicates moved to
`G:\My Drive\00 OTB\_archive\` (operator empties at will).
**SITE-ASSET PINS (digital twin) SHIPPED + DEPLOYED 2026-07-11:** A-1 → Overlay → "📍 Assets"
+ "＋ Pin": operator drops typed pins (💧 shutoff ⚡ meter 🧯 hydrant 🏛 column 🪑 bench
🗑 can 💡 light 🪧 sign 📍 other) anywhere on the plan; click a pin → label/notes editor;
owners see read-only pins. New persisted `features` layer (store → property_state → 
Export/Import). Operator's mapping walk = drop a pin per shutoff/bench/can/column with a
label. Deferred: pins on the 🛰 satellite lens (needs plan→geo transform reuse), photo per pin.
NOTE: dev server moved to port 5199 (`.claude/launch.json`) — 5173 is held by another project.
**ROOF ORTHOMOSAIC 2026-07-11:** `OTB-roof-ortho-2025-10-15.png` (3 cm/px, north-up, 91 MB)
in `Drone Footage RAW/` + `G:\My Drive\00 OTB\` — direct-georeferenced from the Skydio set's
XMP RTK poses (`tools3dgs/build-roof-ortho2.py`); annotate maintenance issues on it (it's the
Oct-2025 baseline, pre-dating the current 101–109 membrane state). **ROOF SPLAT — CLOSED AS CAPTURE-LIMITED 2026-07-12:** exhaustive: COLMAP SfM (6 configs),
Postshot SfM (operator ran it — fog), pose-injected triangulation from XMP RTK poses, 3DGS on
true poses, and dense MVS on true poses (330 pts) ALL fail — the white membrane has no texture
and the X10 zoom was used at two presets mid-flight. The ortho is that set's ceiling. The
10-min RE-FLY RECIPE that fixes it is in `Drone Footage RAW/OTB-3DGS-frames/README-TRAINING.md`
(one zoom, one altitude, 75–80%-overlap nadir grid + low RTU orbit); once flown, the scripted
pipeline (`tools3dgs/build-roof-ortho2.py` + `build-posed-model.py` + Brush) yields both a
gap-free ortho and the roof splat with zero manual SfM. Postshot's `roofsplat.ply` in
Drone Footage RAW is fog — operator may delete.
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
**SECURITY:** the Anthropic key was pasted into a chat session on 2026-07-08 — rotate it at
console.anthropic.com when convenient, then update Vercel env `ANTHROPIC_API_KEY` (Production)
and redeploy. Key lives ONLY in Vercel env; never in the repo or client bundle.

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

## What's built (8 sheets)
D-1 Dashboard · A-1 Site Plan (plat-exact + photo/overlay layers; **whole-center floor-plan overlay** registered to the unit envelope w/ unit-fill opacity slider; unit numbers uniform, tenant names off A-1) · R-1 Rent Roll (11 cols, PSF breakdown) ·
P-1 Financial (income composition + NOI worksheet) · C-1 Compliance · T-1 Critical Dates ·
W-1 Action Board (live kanban) · K-1 Directory (contacts + document register + site imagery).
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
### Poster edits — DONE on B (2026-06-20)
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
