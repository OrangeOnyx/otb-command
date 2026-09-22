# Shopping Center Operator Series — gap plan (2026-09-22)

Inputs: Google AI Mode transcript (`google articles.txt`, 12-article product roadmap + generic strip-mall list),
the live site articles.cypresscommand.com (38 articles / 11 parts, read 2026-09-22), the manual sources in
`docs/manual/` (regenerated 2026-09-22 05:11, version line "17-sheet production build (624 tests)").

## A. Manual — needs a content update, not just a regen

| # | Gap | Where |
|---|-----|-------|
| 1 | Version line says 17 sheets / 624 tests; nav (`src/lib/pages.js`) has 18 sheets, prod is 777 tests | operator-manual.md:2 |
| 2 | Four nav sheets have no section: B-1 Marketing, L-1 Comm Log, N-1 Matters, O-1 Operations | Part III |
| 3 | Shipped after the last content pass, undocumented: L-1 voice call cards + recording proxy + send_leasing_package (Sep 18); B-1 flyers / overview / tenant cards / photo library + public /tour (Sep 18); Asset Command picks 1–8 — P-1 charts, A-1 view presets, tenant health, T-1 timeline + pipeline, ribbon, C-1 coverage, pylon sign (Sep 19–20); 26–27 insurance register (Sep 22); H-3 owner list (Sep 22) | Parts III, IV, V |
| 4 | orangeoceanatlas.com still listed as an alias (manual line 3, build-manuals.py docstring) — fine if the alias stays live | cosmetic |

Onboarding manual: no stale host refs; re-read the "Phase C-1 rail" framing once the intake flow is next touched.

## B. Live articles — corrections owed (facts contradict CLAUDE.md)

| # | Article | Issue | Fix |
|---|---------|-------|-----|
| 1 | 31 Field Notes | "Arnold Blvd" | Street is **Arnould Blvd** (subdivision of record stays "Arnold Heights Subd. Ext. No. 1") |
| 2 | 03, 31, 34 | "70,000 SF" | GLA is 62,883 SF — say "63,000 SF" or "a ~63,000 SF neighborhood center" |
| 3 | 34 | Title "OTB Command: The Property Management Program…" | Product is Cypress Command Platform; OTB is the flagship deployment at otb.cypresscommand.com |
| 4 | 35 | "Why OTB Command Is Becoming Cypress Command" | Superseded twice (Cypress Command → Cypress Command Platform, 2026-09-22). Add a dated postscript or fold into a revised 34 |
| 5 | Publisher blurb | "Cypress Command" bare | Acceptable as the practice/brand name; the product must read "Cypress Command Platform" wherever the software is named |

## C. Google's 12-article product roadmap — verdict

Google's Module 1–4 list (onboarding intake JSON, magic links, sheet index, unit drawer, daily walk, 11:00 UTC scan,
C3 cameras, AI voice agents, Stripe ACH, stamped rent rolls, Owner Safe briefs) is the operator manual re-cut as
articles. Do not publish it as Part X of the series — it duplicates `docs/manual/` and will drift from it. If product
guides are wanted publicly, host them as a separate "Platform guides" section generated from the manual sources.
Google's generic list (underwriting, anchor tenants, CAM, exclusivity, takeover checklist, vendor roster, welcome kit)
is already covered by articles 05–07, 13–17, 19, 36. Google also used GLA 62,810 SF in its intake example — wrong.

## D. What to write next — forced ranking (grounded in OTB's own case files)

| Rank | Working title | Part | Source material |
|------|---------------|------|-----------------|
| 1 | Parking Is the Lease: How a 324/344 Variance Governs Every Deal | IV Leasing | Entry 99-11797, 314 vs 324 reconciliation memo, restaurant/gym stall math |
| 2 | Easements That Outlive Their Contracts: Church Liquor Waivers, Bank Stalls, and the Parcel You Don't Own | II Acquiring | Our Savior's §3a, JD Bank 12/30/2034 + 13 spaces, "NOT A PART" notch, Entry 2004-00057697 |
| 3 | The September Lease Review: Building a Source of Truth Suite by Suite | VI Financial Mgmt | lease-population-2026-09-10, leaseEvidence, blank-end-by-design, no-holdover rule |
| 4 | Exclusive-Use Clauses in Practice: The HotWorx / C. Wolf Watch | IV Leasing | exclusive-use watch, compliance C-1 |
| 5 | Reading the Recorded Plat: Bearings, Curb Cuts, and Why the Subdivision Isn't Misspelled | II Acquiring | Montagnet & Domingue plat, site-access-inventory-2026-09, Arnould/Arnold ruling |
| 6 | Abstracting an Insurance Program: Flood, Alarm Monitoring, and the Register That Remembers | V Operating | 26–27 program abstract, insurance register, C-1 coverage |
| 7 | Abatements, Amendments, and Countersignatures: Booking the Messy Leases on the Roll | VI Financial Mgmt | 145 abatement, 143 amendment, 139/141 pending signature, stated-rent exceptions |
| 8 | The Anchor's Fine Print: A Named HVAC Contractor and 100% of Unit 149 | IV Leasing | Jason's Deli §9.01, Butcher Air Conditioning |
| 9 | A 24/7 Tenant Line That Knows Its Limits | X AI & OS | Twilio ConversationRelay build, call records, escalation rules |
| 10 | Vendor COI Compliance: The ACORD 25 Checklist | XI Tools | C-1 compliance, coi-parse seam (interactive) |
| 11 | Capturing a Legacy Center: Drone, Photogrammetry, and the Plat-Based Model | X AI & OS | A-2 lenses, capture drive, poster.py |
| 12 | Five Parcels and a Remote Lot: Packaging Title for a Sale | VIII Selling | assessor parcels incl. 6009649 Lot 7 |

Rule for every article: rents and tenant-specific economics stay out unless already public; the property facts
above are matters of public record (plat, variance entry, recorded easements).
