# OTB Property Command — Feature & Decision Brief
**Prepared for owners and investors** · Orange Ocean, LLC · July 2026
Live system: https://otb-command.vercel.app · 13 sheets · 269 automated tests · production since June 2026

> **One sentence:** OTB Property Command is a full operating system for a retail
> shopping center — every legal fact, dollar, document, camera, and workflow on
> one governed surface — built and proven on On The Boulevard Shopping Center
> (62,883 SF, 27 units, Lafayette, LA), and architected to carry outside
> properties next.

---

## Why this document exists

Every feature below was a deliberate decision, not an accumulation. This brief
explains each one in three beats: **what it is**, **the decision behind it**,
and **why it matters to the people who own the asset**. The through-line is a
single doctrine:

1. **Audit-grade truth.** One authoritative source for every fact, with
   authority rankings, validation rules, and a logged exceptions register.
   The software refuses to "helpfully" repair data — it stores what was signed
   and flags what disagrees.
2. **Fail closed, never open.** When a safeguard cannot verify — an AI number,
   a rate limit, a signing token, a role — the system declines rather than
   guesses. Errors cost an inconvenience, never a liability.
3. **Append-only memory.** Money, compliance, and access events are never
   edited or deleted — corrections are new entries. The history *is* the audit.
4. **Humans sign; software prepares.** Every outbound consequence — a lease
   proposal, a late fee, an e-signature request, a tenant notice — is drafted
   by the system and released by a person.

---

## The numbers at a glance

| Measure | Value |
|---|---|
| Asset under management | On The Boulevard Shopping Center — 62,883 SF GLA, 27 demised units, 2 buildings, 4.84 ac |
| Occupancy | 25 of 27 units (≈95%); zero holdovers as of July 2026 |
| Effective gross income tracked | ≈ $1.08M / year, unit-by-unit, PSF-decomposed |
| Application surface | 13 drawing-set sheets, 5 user roles, 4 counterparty portals (owner, vendor, tenant, e-sign) |
| Verification | 269 automated tests run before every release; production bundle verified after every deploy |
| Cameras instrumented | 17 on-property cameras; 34 parking stalls classified continuously |
| AI agents | 3 desk personas + 2 phone lines, all grounded in property data, all numerically guardrailed |
| Build economics | ~6-week AI-paired build by a single operator; $0 licensed software in the capture pipeline |

---

## Pillar 1 — A governed source of truth

### The SOT pack (authority-ranked data governance)
**What:** Every tenant, rent, and expiration date traces to a vendored source
pack (`docs/sot-2026-07/`) with an explicit authority ranking (signed rent roll
> workbook > any imported system), blocking validation rules, and a
known-exceptions log.
**The decision:** When the owner-corrected signed rent roll disagreed with a
formula by $4.84/month, we did *not* "fix" the number. We stored the stated
rent, logged the exception, and pinned it with a test.
**Why it matters:** Investors underwrite the rent roll. A system that silently
normalizes data destroys the audit trail that diligence depends on. Here, every
figure answers "says who?" — and the codebase enforces it. Competing platforms
import spreadsheets and hope.

### Audit-grade property facts as code
**What:** The parking variance (Entry 99-11797: 324 provided / 344 required),
recorded easements (church liquor waiver §3a, JD Bank stalls to 12/30/2034),
plat bearings, and the anchor's HVAC covenant (§9.01, Butcher Air) live as
structured data that the UI and the AI agents *derive from* — one source file,
no fact literals scattered in screens.
**The decision:** Legal geometry is data, not decoration. A leasing decision
that ignores the parking variance is a zoning violation; so the variance sits
in the dashboard KPI, the site plan, and the leasing agent's screening logic —
all fed from the same file.
**Why it matters:** The constraints that can kill a deal are in front of every
decision, automatically. No institution-grade competitor models plat-level
legal geometry at all.

### Confidential seed split
**What:** The public application bundle contains a skeleton only. Rents, tenant
contacts, and legal entities hydrate after login, role-gated, from a protected
endpoint.
**The decision:** Verified in production: zero rent values, zero tenant emails
in the public JavaScript.
**Why it matters:** Your rent roll is not sitting in a file any visitor can
download. This was an actual pre-launch fix — found, closed, and verified —
and it is the difference between "password protected" and "protected."

---

## Pillar 2 — The property twin: plan, 3D, satellite, reality

### Plat-exact interactive site plan (A-1)
**What:** A native SVG site plan traced from the recorded plat (Montagnet &
Domingue, rev. 7/19/2019) — true proportions, easement lines, the liquor line,
314 drawn stalls, unit-by-unit status fills — with overlay layers for photos,
parking, cameras, live occupancy, and operator-placed asset pins.
**The decision:** We drew the legal document, not a cartoon. The plan carries a
revision label like an architect's sheet and bumps on every geometry change.
**Why it matters:** Owners and buyers see the asset the way a lender's counsel
sees it — and the same geometry drives leasing screens, so the picture and the
rules can never drift apart.

### Four-lens spatial twin (A-2)
**What:** The same building in four registered views: isometric SVG (real CAD
heights), a Three.js 3D massing with a photogrammetry mesh toggle, a
georeferenced satellite lens on a frozen basemap, and a photoreal 3D Gaussian
splat captured by drone. Click any unit in any lens → the same detail drawer.
**The decision:** We built the capture pipeline on open tools (COLMAP → Brush)
at $0 in licenses, and we *froze* the satellite base imagery so a third-party
tile refresh can never silently mis-register the footprints again.
**Why it matters:** This is the marketing and diligence show-piece — a leasing
prospect or buyer tours the asset from a link. And because alignment is
computational (fitted, scored, committed), it is maintainable, not an art
project.

### Measured parking occupancy (C3) — the differentiator
**What:** The 17-camera system feeds a hands-free loop: frames sampled every
5 minutes → an AI vision model classifies 34 mapped stalls → append-only
samples → live occupancy paint on the site plan and a 7-day dashboard trend.
A heartbeat monitor opens a manager alert if the pipeline goes quiet 36 hours.
**The decision:** Everyone else's "occupancy" is a KPI number typed into a box,
or (Placer.ai) a modeled estimate from phone panels — weak at strip-center
scale. We measure ground truth with hardware the property already owns.
**Why it matters:** Parking is this asset's binding legal constraint
(324/344 variance). Measured utilization is underwriting-grade evidence for
leasing decisions, variance discussions, and — as a product — data no
competitor in our lane can offer.

---

## Pillar 3 — Money, leases, and the numbers that can't lie

### Rent roll and PSF decomposition (R-1)
**What:** An 11-column live rent roll; any bare monthly figure shown anywhere
is TOTAL rent, with base/CAM/tax/insurance decomposition available as an
explicit PSF breakdown. Prints to a measured one-page owner sheet with
unmissable expiry flags (≤6 months ▲, 6–12 △).
**The decision:** Component economics are shown only deliberately — no
ambiguous numbers in owner-facing surfaces. The print layout *measures* itself
and shrinks to guarantee one page.
**Why it matters:** The document an owner forwards to a lender is unambiguous,
current, and formatted like an instrument, not a screenshot.

### Append-only ledger with suggest-only late fees
**What:** Charges, payments, credits, voids — all append-only (a void is its
own entry pointing at its target), FIFO aging buckets, idempotent monthly rent
charges keyed `rent:YYYY-MM:unit`, and late-fee *suggestions* (5-day grace,
$100 + $25/day) that post only when the operator confirms.
**The decision:** The system never invents a receivable: charges were gated to
start August 2026 because going live mid-month would have fabricated
receivables for rent already collected off-system. Money writes fail loud.
**Why it matters:** The ledger reads like a bank statement, not a spreadsheet
with an undo problem. Every historical state is reconstructible — the property
can survive an audit, a dispute, or a sale process.

### Deterministic deal engines
**What:** A library of pure calculation engines: retain-vs-replace and
blend-and-extend NER comparison (with cap-rate asset-value impact), CAM
gross-up (variable-only, to 95%, never grosses down), Louisiana eviction
sequencing (CCP art. 4701→4733 with waiver/self-help traps and 200% holdover
math), capital-reserve gating for capex asks, insurance-claim timelines, and an
occupancy-cost-ratio tripwire for tenant health.
**The decision:** Every engine is pure, versioned, and unit-tested — the same
question always returns the same answer, traceable to formula.
**Why it matters:** "Should I retain at $17 or replace at $20 with 3 months
free?" gets an engine answer in seconds, expressed as NER deltas and asset
value at cap — the analysis an owner would pay an analyst to build, on tap.

### ACH payment rail (Stripe) — groundwork laid
**What:** Rent is all-electronic by policy. The Stripe webhook, event
classification, and idempotent payment posting are built and deployed —
deliberately dormant until the operator arms the production key.
**Why it matters:** Payments land in the ledger untouched by human keying, with
unmapped or failed payments opening a manager thread instead of vanishing.

---

## Pillar 4 — AI that is allowed to talk but not allowed to guess

### The numeric guardrail — our crown jewel
**What:** Three AI desk personas (Concierge, Leasing, Property Manager) answer
questions grounded in the property dossier and live state. The moment a
conversation involves arithmetic, replies are buffered server-side and **every
dollar figure, percentage, and decimal must trace to a deterministic engine
output within 0.5% — or the model's reply is discarded and replaced with the
engines' own summary.** It fails closed.
**The decision:** Generative AI drafts language well and invents numbers
confidently. We split the two: the model persuades, the engines compute, and
the guardrail enforces the boundary mechanically.
**Why it matters:** This is the trust story of the whole product. No AI-native
competitor makes this posture claim. An owner can let the AI answer financial
questions because the numbers literally cannot be hallucinated.

### Proactive detection, idempotently
**What:** A daily automated scan detects holdovers, renewal windows entering
180 days, and occupancy dips — and opens exactly **one** AI thread per
condition, ever, routed to the right persona. Re-runs are safe by construction.
**Proof it works:** The system surfaced the 115/117 renewal window; the
operator entered discussions early and renewed on strict terms.
**Why it matters:** Critical dates stop depending on anyone's memory, and
automation that can't duplicate itself is automation an operator can trust.

### Monthly Owner Intelligence Brief — deliberately AI-free
**What:** On the first of the month the system generates a branded owner
report: occupancy and scheduled-rent KPIs with real month-over-month deltas,
vacancies, the 12-month expiration table, and NOI/cap-value only when a real
expense worksheet exists. **No language model touches it** — every figure is
computed.
**The decision:** Owner reporting is a fiduciary artifact. It is generated
once, stored immutably, and archived in-app.
**Why it matters:** Owners get analyst-grade reporting on the first of every
month without an analyst — and without wondering whether an AI embellished it.

### Voice operations (two phone lines) — built, awaiting carrier go-live
**What:** Two 337 numbers on a real-time voice stack: a **tenant line** that
answers 24/7, triages per the operator's codified SOP (emergencies dispatch
after-hours; agents never speak eviction timelines), and files real work
orders; and a **leasing line** that screens per the exclusive-use ledger and
books tour slots against a conflict-gated calendar. Every call lands as a
transcript thread.
**The decision:** The scripts were not improvised — they derive from a
7-domain SOP capture interview with the operator, versioned in the repo.
**Why it matters:** A missed 2 a.m. water-leak call is a five-figure loss; a
missed leasing call is a lost tenant. The phone now answers with the owner's
actual policies — and nobody else in the competitive field has voice at all.

---

## Pillar 5 — Counterparty rails: vendors, tenants, signatures

### Vendor portal with AI-parsed insurance certificates
**What:** 69-vendor roster; each service vendor gets a private, audited
document folder and a self-service portal (magic-link, sealed by database
policy to their own folder). Certificates of insurance are tracked with expiry
badges (expired / ≤30 days / ≤60 days), and an operator can drop an ACORD PDF
on the panel — an AI parse pre-fills carrier, limits, and expiry for one-click
save.
**Why it matters:** COI lapses are an uninsured-loss exposure that ends up on
the owner. The chase is now systematic, the filing is audited, and payment
gates (COI/W-9/license verified at payment, not dispatch) are policy in the
system, not in someone's head.

### Maintenance module (M-1) — event-sourced work orders
**What:** Tenants file requests (with photos) from their own portal or the
phone line; the operator assigns from the trade→vendor roster; vendors see
assigned work orders in their portal and mark complete; every status change is
an append-only event. Unassigned requests age into manager alerts (2 days,
1 day for emergencies).
**Why it matters:** The maintenance file for any dispute, insurance claim, or
sale diligence is already assembled — who reported what, when, with pictures,
and who fixed it.

### E-signatures, in-house
**What:** A token-lifecycle e-sign flow (pending→sent→viewed→signed/declined/
expired) with a public plan-room-styled signing page, E-SIGN/LA-UETA consent
language, and database-enforced transitions — double-sign and
decline-after-sign fail closed. The operator sends the link through his own
channel; the system sends nothing on its own.
**The decision:** v1 keeps the release valve human — the software prepares and
records; the operator transmits.
**Why it matters:** Signature workflow without a per-envelope SaaS tax, with a
verifiable lifecycle for every executed document.

### Tenant portal-lite ("Your account")
**What:** Tenants see their own unit's balance and recent ledger entries —
scoped by database policy to exactly their unit, nothing else.
**Why it matters:** "What do I owe?" stops being a phone call, and the balance
they see is the same append-only ledger the owner sees.

### Owner Safe
**What:** A role-sealed vault (proforma, leases, tax, insurance, banking) where
every view, upload, and delete is logged — with the access log visible to the
operator.
**Why it matters:** Sensitive owner documents get bank-style access
accounting; vendors and tenants are sealed out at the database layer, not by
hiding buttons.

---

## Pillar 6 — Security posture and engineering discipline

- **Role-based access that fails closed:** operator / owner / vendor / tenant /
  pending, enforced by row-level security in the database. A vendor cannot
  read another vendor's folder even with a modified client. New sign-ins land
  in a holding pen until authorized. Verified by a dedicated multi-agent
  security audit (July 2026); all code-implementable findings fixed and
  deployed.
- **Rate limiting that fails closed:** paid AI endpoints enforce per-user
  daily caps; if the limiter itself cannot answer, the endpoint declines
  honestly rather than serving unmetered traffic.
- **Secrets hygiene:** API keys live only in the hosting environment; secret
  rotation is a rehearsed, scripted drill (executed live), with values that
  never touch chat, code, or disk.
- **269 automated tests** — money math, data-integrity pins on every known
  exception, generated-file freshness guards (a stale build artifact fails the
  suite), seed round-trips, print-fit math.
- **Deploy discipline:** nothing is "done" until the production bundle is
  verified to carry the change and the operator smoke-tests the live URL.

**Why this pillar matters most:** Every feature above is only as valuable as
the confidence that it works and keeps working. The discipline layer is the
difference between a demo and an operating system for other people's money.

---

## What we deliberately did *not* build (and why that's a feature)

| Non-build | Reasoning |
|---|---|
| Our own general ledger | Accounting stays in QuickBooks (sync planned) — the STRATAFOLIO-proven model. We refuse to make an unauditable second GL. |
| Auto-sent notices, emails, or signature requests | Every outbound consequence is human-released. AI drafts; the operator sends. |
| Rent reminder nag messages | Operator policy decision — tenant relationships are managed personally. |
| DoorLoop import | Evaluated and rejected: its dates were provably unreliable against signed documents. The governed SOT replaced it. |
| A second codebase | Two sibling builds were harvested for their best engines and archived. One authoritative system, no federation. |

---

## Competitive position (researched July 2026)

The field: Yardi/MRI ($30K–$150K+/yr, institutional), mid-market generalists
(Breeze, DoorLoop, Re-Leased — shallow retail/CAM depth), and **Pickspace**,
the AI-native direct rival. Verified against their published materials,
Pickspace has **no site plan or spatial layer, no camera-measured occupancy,
no voice operations, no fail-closed numeric guardrail, and no governed
onboarding**. Those are exactly our four wedges:

1. **Measured reality** — camera-derived occupancy and a registered spatial
   twin, vs. KPI tiles and modeled panels.
2. **Numbers that can't hallucinate** — deterministic engines + the guardrail.
3. **Governed onboarding** — the SOT authority/validation/exceptions pack as
   the activation funnel.
4. **Voice-first operations** — phone lines that run the owner's SOPs.

**Target wedge:** owner-operators of 1–20 retail centers — too small for
Yardi/Cove, underserved by the generalists. Demand is already validated:
outside owners have asked to get on the software before it has a name.

---

## Where this goes (the committed plan)

- **Phase A (nearly complete):** COI AI-parse ✓ · maintenance ✓ · voice built
  (carrier go-live in progress) · SOP capture ✓ · Stripe ACH armed for the
  August 1 ledger go-live.
- **Phase B:** multi-property schema (`org_id`/`property_id` shapes already in
  the newest modules), design-partner pilots on the validated demand — free,
  in exchange for reference data.
- **Phase C/D:** QBO sync · white-label brand kit (already modeled) · public
  leasing funnel (microsite + scoped bot) when new footage lands.

OTB is tenant #1 and the permanent reference dataset: every feature ships
proven on a real asset with real money before any outside property touches it.

---

*Prepared by Orange Ocean, LLC — manager of Belle Realty of Lafayette, LLC.
Figures as of July 2026; sources: signed rent roll (docs/sot-2026-07),
recorded plat, live production system. This brief describes software built and
operated by Orange Ocean; it is not an offer of securities.*
