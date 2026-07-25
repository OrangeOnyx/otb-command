# OTB Property Command — Operating Manual
**Version July 2026 · covers the 13-sheet production build (269 tests)**
Live app: https://otb-command.vercel.app · Operator: adam@adamabdalla.com

This is the complete instruction set for every role. Part I is orientation,
Part II is the operator's day, Part III covers each sheet in depth, Part IV is
the counterparty guides (owner / vendor / tenant / signer), Part V is the
monthly and periodic rhythms, Part VI is administration and recovery.

---

# Part I — Orientation

## 1.1 Signing in
There are no passwords. Enter your email on the login screen; a **magic link**
arrives by email; clicking it signs you in. Your role is resolved
automatically:

| You are… | How the system knows | You land on |
|---|---|---|
| Operator | adam@adamabdalla.com | Everything |
| Owner | pre-authorized email (see §6.1) | Read-only, operator-chosen sheets |
| Vendor | email matches the vendor roster | V-1 Vendor Portal only |
| Tenant | email in the tenant-contacts list | M-1 Maintenance only, own unit |
| Anyone else | — | A "pending" holding screen; no data |

If a legitimate person lands in pending, the operator promotes them (§6.1).

## 1.2 The drawing-set metaphor
The left sidebar is a **sheet index**, like an architect's drawing set:

- **D-1 Dashboard** — KPIs, action queue, live cards
- **A-1 Site Plan** — the interactive plat
- **A-2 Spatial** — iso / 3D / satellite / photoreal lenses
- **R-1 Rent Roll** · **P-1 Financial** — money
- **C-1 Compliance** · **T-1 Critical Dates** — obligations
- **W-1 Action Board** — kanban of everything needing action
- **K-1 Directory** — contacts, document register, site imagery
- **M-1 Maintenance** — work orders (also the tenant's sheet)
- **S-1 Owner Safe** — sealed document vault
- **AI-1 Agent Desk** — the three AI personas
- **V-1 Vendor Portal** — vendor roster, COIs, work orders

The URL tracks the open sheet (`#roll`, `#plan`…) — the back button walks your
history, and links can deep-link a sheet.

## 1.3 The unit drawer — the universal detail surface
Click any unit anywhere (site plan, rent roll, 3D lens, satellite) and the
**drawer** opens with everything about that unit: term progress, PSF economics,
HVAC responsibility, notes, contacts, documents, photos, compliance rows, the
**Ledger** panel, and the **E-Sign** panel. Most day-to-day work happens here.

## 1.4 Search and shortcuts
- Press **/** anywhere → omni-search units, contacts, documents; Enter opens
  the top hit.
- **⤓ SHEET** (topbar) or **Ctrl+P** → prints the open sheet as a stamped PDF
  (drawing-set footer, date, headline figures). R-1 is guaranteed one page.
- **Export / Import** (topbar) → full state snapshot as JSON; Import restores
  it. This is your portable backup (§6.4).
- Theme toggle (sidebar foot): plan-room (default) ↔ dark. Print always
  reverts to paper.

---

# Part II — The operator's day

A normal day touches five surfaces:

1. **D-1 Dashboard** — scan the KPI row (occupancy, scheduled rent, parking
   variance), the **Parking Occupancy (C3)** card (7-day sparkline of measured
   stall occupancy), the **Network (UniFi)** card (camera/network health), and
   the **Action Queue**.
2. **W-1 Action Board** — the kanban seeds *itself* from live facts
   (holdovers, renewal windows ≤12 months, vacancies, compliance flags,
   covenant obligations, open work orders). Drag cards between lanes, dismiss
   what's handled, add custom cards. You never have to remember to create a
   card for a lease expiring — it appears on its own.
3. **AI-1 History** — the daily automated scan (11:00 UTC) may have opened a
   thread: a renewal window entered 180 days, a holdover appeared, occupancy
   dipped, the camera pipeline went quiet, or a payment arrived that couldn't
   be matched. Each condition opens exactly **one** thread, ever — if there's
   nothing new, there's nothing there.
4. **M-1 Maintenance** — new tenant requests (from the portal or the phone
   line) appear in the queue. Triage per §3.9.
5. **Mail/phone → the system** — anything that arrived outside the system
   (a signed lease, a COI, a check conversation) gets recorded where it
   belongs the same day: SOT update (§5.3), vendor folder (§3.12), ledger
   entry (§3.10).

---

# Part III — Sheet-by-sheet instructions

## 3.1 D-1 Dashboard
Read-only KPIs derived from live data — nothing to maintain here. Cards:
occupancy/rent KPIs, parking variance (from the instruments file, not typed),
Parking Occupancy (C3) with 7-day trend, Network (UniFi) up/down, Action
Queue (same cards as W-1). If a card shows brick-red, it is telling you
something needs attention (e.g., "9/10 devices up" = a camera is down).

## 3.2 A-1 Site Plan
The recorded plat, interactive. **Chips** toggle overlay layers:
- **Lenses:** Status / Expiry / Rent / Use / HVAC / Size — unit fills + legend.
- **🅿 Parking** — the 314 drawn stalls by zone.
- **🎥 Cameras** — 17 mounts with view cones; click one → its live view.
  **✎ Adjust cams** (operator-only): drag pin to move, drag the brass dot to
  re-aim, double-click to reset; corrections persist.
- **🚗 Occupancy** — latest measured stall states painted green/outline over
  the storefront row, Lot 8 pocket, and the 149 corner.
- **📍 Pins / ＋ Pin** — drop a pin per water shutoff, meter, bench, column.
  Pins also appear on the satellite lens.
- **Overlay → Floor plan** — whole-center floor-plan raster under the unit
  boxes, with an opacity slider.
Click any unit → drawer.

## 3.3 A-2 Spatial (four lenses)
- **Iso** — SVG isometric, real CAD heights; ⇅ toggles true heights;
  ⤓ SVG exports a standalone file.
- **◧ 3D** — orbitable massing; **🏗 Mesh** swaps in the photogrammetry mesh.
- **🛰 Satellite** — frozen basemap with georeferenced footprints, unit
  labels, asset pins; opens plan-oriented (Marie Antoinette top).
- **🎥 Reality** — photoreal drone splat; ▦ toggles unit overlays; click a
  storefront → drawer.
All lenses share the same selection — pick a unit in one, it's selected in all.

## 3.4 R-1 Rent Roll
11 sortable columns; any bare monthly amount is **TOTAL rent** (base +
additional). The PSF breakdown chart is the only place component economics
(Base · CAM · Tax · Ins) appear — by design.
**⤓ SHEET** prints the owner one-pager: guaranteed one page (the layout
measures itself and shrinks to fit), with expiry flags — ▲ brick ≤6 months,
△ amber 6–12 months — and a legend in the stamp.

## 3.5 P-1 Financial
Income composition, rollover, and concentration charts; the **NOI worksheet**
(enter opex → NOI → cap-rate value); **Collections & aging** (month
collected-vs-charged and per-unit FIFO aging from the ledger). The Excel
proforma (`npm run proforma`) is the owner-overridable model for underwriting
conversations.

## 3.6 C-1 Compliance
The 11×27 matrix. **Click a cell to cycle** unknown → ok → flag → n/a
(food-service-only fields apply only where relevant). Every flip is recorded —
who, when, from→to — and **⏱ History** shows the trail. You cannot corrupt
this history; corrections are new flips.

## 3.7 T-1 Critical Dates
Lease expirations plus instrument deadlines (JD Bank easement end, etc.) on
one timeline. Derived — nothing to maintain.

## 3.8 W-1 Action Board
See Part II. Card types include seeded facts (holdover, renewal, vacancy,
compliance flag, covenant) and **live work-order cards** (`mr:` prefixed).
Overrides (lane moves, dismissals) persist; the seed recomputes every render,
so a dismissed card returns only if the underlying fact returns.

## 3.9 M-1 Maintenance (operator face)
- **Queue:** every request with status, age, unit, photos.
- **Assign:** pick a vendor from the service roster → the vendor sees it in
  V-1 immediately.
- **Status flips** and notes are append-only events.
- **Tenant logins:** the roster editor (email ↔ unit) controls who may sign in
  as a tenant. Add email + unit; they magic-link in like everyone else.
- **File on behalf:** log a phone-in request yourself.
- **Aging alarm:** unassigned requests older than 2 days (1 for emergencies)
  open a manager thread automatically.
Tenant-side view: §4.3.

## 3.10 The Ledger (drawer → Ledger)
- Balance headline + last entries with running balance.
- **"Payment received"** records a rent payment (all rent is electronic).
- Add charge / credit / adjustment / NSF / write-off as needed.
- **Void** = ✕ on an entry → creates a *reversing entry* (nothing is deleted).
- **Late-fee chips:** past the 5-day grace, a suggestion chip appears
  ($100 + $25/day, the standard schedule). It posts **only when you confirm.**
  If a lease carries different late terms, flag it — policy goes per-unit.
- Monthly rent charges post themselves (idempotently) from August 2026.

## 3.11 The E-Sign panel (drawer → E-Sign)
1. **Create** a request (optionally attach a document for review).
2. **Copy link / Copy message** — the app sends nothing; you deliver the link
   through your own channel (text/email). This is deliberate.
3. The signer opens a plain, branded page — no login needed — reviews, and
   signs or declines (E-SIGN/LA-UETA consent language included).
4. You see the live status (sent → viewed → signed/declined/expired), can
   **re-token** (invalidate + reissue) or **cancel**, and get a signed receipt.
Tokens are single-lifecycle: double-signing or declining after signing is
rejected by the database itself.

## 3.12 V-1 Vendor Portal (operator face)
- Roster (service vendors first, green "portal" tag = they can sign in).
- Per-vendor private folder: upload / open / delete, all audited.
- **COI tracking:** set expiry + note per vendor → badge auto-classifies
  (expired / ≤30d / ≤60d / ok; missing is flagged for service vendors).
- **🤖 Parse cert:** drop an ACORD PDF → AI pre-fills carrier, limits, expiry,
  and a normalized note → review → **Save COI**. Always review before saving.
- Assigned work orders appear on the vendor's face automatically (§4.2).
- **Inviting a vendor** = telling them to magic-link in with their roster
  email. Nothing else to configure.
- Policy: COI / W-9 / license are verified at **payment**, not dispatch.

## 3.13 K-1 Directory
Property contacts, the document register (rows can carry a real uploaded file
— 📎 attach → the row's link becomes an "Open 📎" that always serves a fresh
secure URL), and the site-imagery library.

## 3.14 S-1 Owner Safe
Category folders (Proforma / Leases / Tax / Insurance / Banking / Other).
Upload and open as the operator; owners read-only; vendors/tenants sealed out
at the database layer. **Recent access** (operator-only) shows every view,
upload, and delete with who and when.

## 3.15 AI-1 Agent Desk
Three personas — **🏛 Concierge** (property Q&A), **🤝 Leasing**,
**🔧 Property Manager** — all grounded in the property dossier + live state.
- Conversations persist and resume after reload; **🗂 History** reopens any
  thread; **＋ New** starts fresh.
- **🎙** mic input and **🔊** spoken replies (Chrome/Edge).
- **Numbers are guardrailed:** once a calculation is involved, every figure in
  the reply must trace to the deterministic engines or the reply is replaced
  with the engines' own summary. Ask the leasing agent things like
  *"compare retaining at $17 vs replacing at $20 with 3 months free and $10
  TI, 5-yr term, 1,917 SF, 7.5% cap"* — or the manager
  *"should I spend $45K on an RTU replacement with a $120K reserve, $30K/yr
  contributions, installed 2008, 15-yr life?"*
- **📊 Briefs** — the monthly owner-brief archive; Open 🔒 renders any month.
- **Lease packages (operator-only):** ask 🤝 Leasing to assemble a proposal;
  it collects terms conversationally, then generates a branded DRAFT proposal
  (and optionally the internal owner summary) as a card with **Open 🔒** and
  **✉ Email** (pre-filled mailto — you send it; it never auto-sends).
  Every generated document is DRAFT-stamped, subject to legal review.

## 3.16 The voice lines (once live)
- **Tenant line:** 24/7; triages per the SOP (emergencies = leak / electrical
  / break-in / sewer → dispatch + notify after-hours, never wakes you for
  permission); files real work orders into M-1; never discusses eviction
  timelines.
- **Leasing line:** takes name + number, quotes "high-teens PSF" range only,
  screens against exclusive-use conflicts, books tour slots (18h lead,
  Tue/Thu defaults; double-booking is impossible).
- Every call lands as a transcript thread in AI-1 History.
- Go-live steps + secret rotation drill: `docs/a3-voice-runbook.md`.

---

# Part IV — Counterparty guides

## 4.1 Owners
Sign in with your authorized email. You see the sheets the operator has shared
(dashboard, rent roll, financials, and the Safe are typical), **read-only**.
The **📊 Briefs** panel in AI-1 holds your monthly intelligence brief — every
figure deterministic, archived permanently. You may ask the AI desk questions;
its numbers are guardrailed the same as the operator's.

## 4.2 Vendors
Magic-link in with the email the operator has on file. You see one sheet: your
own folder (your documents + "send a file to management"), your COI status
with a renewal nudge, and **your assigned work orders** — open each to read
notes and photos, add notes, and **✓ Mark complete** when done.

## 4.3 Tenants
Magic-link in with the email your management added. You see M-1 for **your
unit only**: file a maintenance request (describe the problem, attach photos),
watch its status, and **"Your account"** — your current balance and recent
ledger entries. Emergencies (water leak, electrical hazard, break-in, sewer):
call the maintenance line rather than filing a ticket.

## 4.4 Document signers
You'll receive a link from management. It opens a simple page — no account,
no app. Review the request (and the attached document if one is linked), then
sign or decline. The signature is recorded with timestamp and consent language
under the federal E-SIGN Act and Louisiana UETA.

---

# Part V — Rhythms

## 5.1 Daily (mostly automatic)
- 11:00 UTC — proactive scan: renewals/holdovers/occupancy → AI threads;
  work-order aging; camera-pipeline heartbeat; (from Aug) rent-charge posting;
  unmatched-ACH threads.
- 23:45 local — camera frames classified + uploaded (hands-free; the sampler
  is watchdog-healed).
- You: the Part II walk — dashboard, board, AI history, maintenance queue.

## 5.2 Monthly
- **1st:** Owner Intelligence Brief generates itself; rent charges post
  (Aug 2026 onward). Skim the brief before the owner does.
- Record payments as they land (§3.10); confirm or dismiss late-fee chips.
- Documented property walk (per SOP); update C-1 flags as found — the history
  logs itself.

## 5.3 When a lease is signed / a fact changes (governed SOT update)
1. Update the source pack `docs/sot-2026-07/` (authority rank 1).
2. Apply the change to `src/data/units.json`.
3. `npm run split-seed` && `npm run concierge-context` (the test suite fails
   if you forget — deliberately).
4. `npm test` → commit → deploy (§6.3) → verify live.
Never trust an imported system's dates over signed paper; store stated-rent
exceptions as exceptions — do not "fix" them to formula.

## 5.4 Periodic
- COI badges: chase at ≤60 days, escalate at ≤30 (§3.12).
- Semi-annual house HVAC PM (unit 149 excluded — tenant maintains under
  §9.01 with Butcher Air).
- Move-out: solo walk + photos within 30 days; file to the unit's assets.
- Re-run marketing artifacts when availability changes (`npm run poster` etc.).

---

# Part VI — Administration & recovery

## 6.1 Granting and revoking access
- **Owner:** sidebar → "Sign-in access…" → type email → **+ Owner**. Their
  first magic link lands them as owner. Anyone stuck in pending is listed
  there with one-click "make owner". Revoke = ✕ (removes pre-authorization;
  demoting an existing profile is a Supabase console step).
- **Vendor:** ensure their email is on the roster; tell them to sign in.
- **Tenant:** M-1 → Tenant logins → add email + unit. Remove the row to cut
  access.
- **Owner sheet visibility:** the "Owners can see…" panel controls which
  sheets owners get.

## 6.2 Quality gates (never skip)
`node --check` on changed modules · `npm test` (269) · `npm run build` ·
deploy · **grep the prod bundle for the change** · smoke the live URL.
Committing is not shipping: **commits do not auto-deploy.**

## 6.3 Deploying
```bash
npx vercel deploy --prod --yes --scope adams-projects-0c52918e
```
(CLI is logged in as orangeonyx on this machine. `.vercelignore` governs
uploads — the 16MB splat + 3MB mesh ride in `public/`.)

## 6.4 Backup & portability
- Topbar **Export** → full-state JSON. Take one before risky edits; **Import**
  restores.
- The repo is the authoritative system; all exports (dossier, buyer set,
  posters) are disposable and regenerable.
- Local preview without login: dev server on port **5199**; move `.env` aside
  temporarily — and restore it after.

## 6.5 Secrets
Keys live **only** in Vercel env — never in chat, repo, or disk. Rotations are
scripted drills: `tools/rotate-secret.mjs` (shared cron secret),
`tools/rotate-voice-secret.mjs` (voice). Vercel rejects env values with
trailing whitespace at deploy time — the scripts handle this.

## 6.6 The camera (C3) pipeline
Fully hands-free: sampler (5-min ticks, watchdog task self-heals it at logon
+ every 5 min) → nightly 23:45 classify + upload → app surfaces. If it goes
quiet 36 hours, a manager thread opens on its own. After a machine reboot the
watchdog relaunches the sampler; no manual step. Known conventions: capture
day-directories are UTC-keyed; frames live outside the repo.

## 6.7 Known limits (deliberate v1 boundaries)
- E-sign and lease proposals: the operator transmits links/documents; the app
  sends nothing outbound on its own.
- Voice: no SMS notify on dispatch, no live call transfer, no daily call cap
  (set a Twilio usage trigger); settings edits via SQL until a UI lands.
- ACH webhook stays dormant (503) until `STRIPE_SECRET_KEY` is set and the
  Stripe webhook is pointed at it.
- Desktop-first; no native mobile app yet.

---

*Questions the manual doesn't answer: ask the 🏛 Concierge — it is grounded in
the same governed data this manual describes.*
