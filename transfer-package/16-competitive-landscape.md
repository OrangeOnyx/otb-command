# 16 · Competitive Landscape (researched 2026-07-22)

Market scan run at the operator's request across nine PM platforms + Placer.ai,
to position the multi-property product (OTBC-Q-002 decision: OTB = tenant #1).
Pricing verified via web 2026-07-22; quote-based vendors hedged accordingly.

## The field, by segment

| Segment | Players | Cost order | Notes |
|---|---|---|---|
| Enterprise / institutional | **Yardi Voyager**, **MRI Software** | $30K–$150K+/yr + $25K–$100K implementations | The upmarket ceiling. Deep GL, lease admin, multi-entity billing. Not reachable, not the target. |
| Experience layer on enterprise | **Cove** (Blackstone/Nuveen/RXR, 600M+ SF) | Enterprise quote | Tenant-experience + ops layer, not a PM system. AI COI extraction is its headline (we replicate — see A-1 in the build plan). |
| Mid-market generalists | **Yardi Breeze** ($2/unit/mo, $200 min), **DoorLoop** (~$70/mo+), **Re-Leased** (listed $69/user/mo, real quotes higher) | $2.4K–$10K/yr | Full accounting + payments; shallow retail/CAM depth (Breeze best of the three). The benchmark to beat on price-to-capability. |
| CRE-on-QuickBooks | **STRATAFOLIO** | Quote + onboarding fee | Model to note: no GL of their own — QBO bi-directional sync. Cheapest credible accounting story. |
| AI-native retail/mixed-use | **Pickspace** | "Per-unit, 30–60% below Yardi/MRI", no per-user fees | **The direct competitor.** See teardown below. |
| Niche / out of scope | **Leasecake** (tenant-side lease tracking, $6–8/location/mo), **Bidrento** (EU conventions: indexation, submetering) | — | Wrong side of the table / wrong market. |
| Data vendor, not PM | **Placer.ai** | ~$5K–$30K+/yr | Modeled foot traffic from device panels. Weak sample at strip-center scale. Our camera-measured occupancy is ground truth they can't offer — a differentiator AND a possible future benchmark-data integration. Brokers with Placer seats will pull one-off reports free. |

## Pickspace teardown (the lane rival)

**Positioning:** "modern alternative to Yardi/MRI", embedded AI everywhere,
portfolios "1 to 5,000+ properties", SOC 2, transparent per-unit pricing
(actual numbers still demo-gated).

**Feature inventory (verified from their site 2026-07-22):**
- **Accounting:** full accrual GL (property-level CoA), AP/AR, recurring
  billing, QBO/Xero bi-directional sync.
- **Payments:** online rent/CAM, autopay — Stripe + Plaid.
- **Lease admin:** AI lease abstracting (PDF → terms), NNN/modified-gross/
  full-service, CAM with pro-rata pools, base-year stops, caps, gross-ups,
  audit-ready reconciliation statements.
- **Retail-specific:** percentage rent (natural/unnatural breakpoints, tenant
  sales uploads, automated overage billing), sales-per-SF dashboards, tenant-mix
  analytics, renewal-risk prediction, pop-up/short-term leases, marketing-space
  self-service booking (kiosks/signage/events).
- **Maintenance:** tenant submits work orders **with photos**, auto-routes to
  vendor, mobile dispatch, preventative maintenance, inspections, move-in/out.
- **Portals:** branded (white-label) web + native iOS/Android tenant/owner
  apps; COI & document tracking; announcements.
- **Leasing:** listing syndication, CRM/lead pipeline, property websites.
- **Platform:** workflow automations ("no Zapier required"), smart alerts,
  AI assistant on every surface, DocuSign, HubSpot, Brivo/Kisi access control,
  REST API + webhooks, Zapier.

**What Pickspace does NOT have (verified absent from their materials):**
- No site plan / map / spatial anything.
- No camera integration or measured occupancy — "occupancy" is a KPI number.
- No phone/voice agents.
- No deterministic-calc + fail-closed numeric guardrail posture (their AI
  drafts narratives; nothing suggests engine-verified numbers).
- No governed-SOT onboarding (authority ranking, validation rules,
  known-exceptions log).
- No plat/legal geometry as data (variances, easements, liquor lines driving
  UI + agent screening).

## Positioning conclusion

**Wedge:** owner-operators of 1–20 retail centers — too small for
Voyager/MRI/Cove, underserved by generalists, and Pickspace's feature war is
winnable on the dimensions they don't play in:

1. **Measured reality** — camera-derived occupancy + spatial twin vs everyone
   else's KPI tiles and Placer's modeled panels.
2. **Numbers that can't hallucinate** — deterministic engines + guardrail as a
   trust story no AI-native rival makes.
3. **Governed onboarding** — the SOT authority/validation/exceptions pack as
   the activation funnel; competitors import spreadsheets and hope.
4. **Voice-first operations** — call-in maintenance + leasing agents with
   transcripts (nobody in the table has this).

**Parity items we must build to sell at all** (Pickspace/Breeze set the bar):
payments rails (Stripe/Plaid), a credible accounting answer (recommend the
STRATAFOLIO model: QBO sync, not our own GL, at least initially), e-sign
(DocuSign at the DRAFT→execute boundary), maintenance w/ photos, white-label
theming (per-org brand kit already modeled by tools/otb_brand.py).

Sources: pickspace.com (commercial / retail-malls / features pages),
yardibreeze.com pricing blog, bcsolut.com + agorareal.com Yardi guides,
cove.is + PR Newswire CoveAI announcement, bidrento.com, leasecake.com,
stratafolio.com, goodfirms.co (Re-Leased). Full URLs in session log 2026-07-22.
