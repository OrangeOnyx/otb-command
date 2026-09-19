# Asset Command visual review — 2026-09-18 · ports built 2026-09-19

Source: the operator's 38 full-page captures + a 10-minute screen recording of
`assetcommand.orangeocean.com` (the sibling build, OTB loaded), reviewed
2026-09-18. AC is a light SaaS skin over the same OTB data; about a third of its
screens were empty or seeded with test rows. The value was in specific
information designs, not the shell. Cypress Command keeps the locked plan-room
system; the picks below were ported into the sheet vernacular.

## Ranked list presented (operator picked 1–5, "build them")

1. **Lease expiry timeline** (Gantt, today line, bucket cards, days-to-end) → T-1
2. **Renewal pipeline grouped by option-notice deadline** → T-1
3. **Persistent KPI ribbon in the masthead** (occupancy · rent · vacant · expiring ≤12 mo · needs attention) → app shell
4. **Document coverage matrix** (unit × lease / COI / COI expiry / other docs, gap filters) → C-1
5. **Pylon sign panel roster** (clickable panels + roster, occupancy / reprint) → B-1 + K-1
6. P-1 revenue-composition donut + NOI waterfall (labeled as estimate) — not built
7. A-1 overlay-mode tabs (Leasing / Daily Ops / Building Systems / …) — not built
8. Tenant health score list — gated on real inputs (no AR data) — not built

Skipped on purpose: dark marketing landing, pricing / billing, platform admin,
the SOP library (44 overdue generic procedures), the wholesale vendor directory
(Costco and card issuers as vendors), AR aging / invoices / rent collection
(all draft or zero; AR is off the roadmap), the always-on tenant rail.

## Data flags in AC (nothing copied blindly)

| AC showed | Tier-1 truth |
|---|---|
| $92,431 monthly rent | $88,070.71 |
| 62,810 SF | 62,883 GLA (62,810 demised) |
| 105, 119, 139, 141 "expired" | renewed or landlord signature pending |
| Compliance 11% | no defined score in Cypress |

AC's owner-document cards were already ported as F-27 on 2026-09-18.

## What was built (2026-09-19)

Pure modules, each unit-tested, DOM kept in the views:

| Pick | Module | View | Notes |
|---|---|---|---|
| 1 | `src/lib/leasegantt.js` | `src/views/dates-lease.js` (T-1) | 4-year horizon SVG, Jan/Jul ticks, today line; blank-`end` suites (119 · 139 · 141 · 145) list as **Term unresolved** with their lease-review label — never guessed. Row click → unit drawer. |
| 2 | `src/lib/renewals.js` + `src/data/renewal-options.json` | same | noticeBy = Tier-1 end − notice days. Option terms are REFERENCE ONLY (AI-extracted from the executed leases, AC harvest 2026-08-29; every abstracted notice = 60 days; 24 suites). Groups: Notice window (≤90d) · Deadline passed · Option available · Past recorded end · Term unresolved · No option abstracted. |
| 3 | `src/lib/ribbon.js` | `src/main.js` (`#ribbon` in `.topbar`) | Same math as D-1; attention = W-1 action-lane cards (brick when any is past due). Buttons drill via the hash router. Hidden in print; address block hides ≤1560px to make room. |
| 4 | `src/lib/coverage.js` | `src/views/compliance.js` (`#coverage` above the matrix) | Evidence = a file on the suite's document records **or** the matrix `lease` / `coi` state On file; a matrix Flag always reads as a gap; COI expiry reuses `lib/coi.js` thresholds. Filters Gaps · No lease · No COI · COI lapsed/soon · Complete · All. |
| 5 | `src/lib/pylonsvg.js` | `src/views/marketing.js` (B-1 block) + `src/views/directory.js` (K-1 register) | Native SVG front elevation from `data/pylon.json` (D-19b): P1 2×8 · P2 4×8 · P3–P14 pairs, vacant = hatch, P13 = brick dashed "reprint" showing the installed text. Sign colors are literal (theme-proof). B-1 names tenants without a face **per tenant** (Pink Paisley, Painted Bayou, Graze, Magnolia, C. Wolf, Greek Expressions). |

Verification: 765 tests green (was 733), `npm run build` clean, local review
preview (`npm run dev:review`) exercised T-1 / C-1 / K-1 / B-1 / masthead by
DOM reads; rent reads "—" in local review because the private financial seed
is hosted-only (by design).
