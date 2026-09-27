# Program review — 2026-09-25 · open punch list + proposed next sprint

Read of `HANDOFF.md`, `docs/status/atlas-punch-list.html` (Rev 18, state r38) and the repo at
master `43912e4`. Nothing was built this session; this is the review and the ranked sprint.

## Build health verified today

| Check | Result |
| --- | --- |
| `npm test` | **809 pass / 0 fail** (matches the Sep 24 handoff figure) |
| `npm run build` | clean (only the pre-existing >500 kB chunk warning) |
| Open PRs | none |
| Unmerged work | none — 12 of 13 remote branches are fully contained in master; `origin/voice-main-router` is the pre-squash copy of `92c408f` (the router IS in master) |

Housekeeping: those 13 stale remote branches can be deleted; `docs/graph/labels.json` and the
`.claude/launch.json` entries (`otb-review-5213`, `otb-site-twin-8770`) are still local-only by choice.

## 1. Time-critical — decide today

**`orangeoceanassetcommand.com` lapses Sep 26 (tomorrow).** Flagged four days out on Rev 18 and still
unconfirmed. Asset Command holds live data until H3 decommission, and H0-3 (its 9 exposed secrets) is
open — so the domain is still pointing at a live system with unrotated credentials. Two clean answers:
renew one year and let it die with H3, or confirm the lapse is intended and accept that the old address
stops resolving tomorrow. Nothing in the repo depends on it.

## 2. The sheet is three sessions behind the build

Rev 18 was published Sep 22. Built and shipped since, none of it catalogued on the sheet:

- **Sep 23** — one-number voice router (337-769-1554 → tenant line), review fixes, the unbooked-lead
  migration applied on prod. 782 tests.
- **Sep 24** — A-1 Site Register, 745 assets / 41 categories (PR #14, live). 799 tests.
- **Sep 24 (later)** — Site Twin Stage 2, portable GLB keyed to the register IDs (PR #16). 809 tests.

That is three missing Schedule F rows and three missing smokes; the KPI strip, the "33 items" count and
the build-health line all read stale.

## 3. Open and owned by you (no code left to write)

| # | Item | Where |
| --- | --- | --- |
| 1 | Assign Edward in the sidebar → *Sign-in access…* → owner (the insert was classifier-blocked twice) | F-10 |
| 2 | `cd bridge && flyctl deploy` — until then the 6 AM sweeper writes call records a morning late | F-26 runbook |
| 3 | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` in Vercel (unlocks ▶ Play recording) | F-26 runbook |
| 4 | Resend key + `NOTIFY_FROM` (owner call e-mails, leasing package) | F-26 runbook |
| 5 | Re-paste the two published numbers — prod `voice_settings` read blank on Sep 18 despite the SMK-7 pass | SMK-7 |
| 6 | H0-3 — rotate AC's 9 exposed secrets | F-12 |
| 7 | 131 / 133 Insta360 scans | SMK-24 |
| 8 | Smokes: SMK-5 (waits on the world) + SMK-21…28. **SMK-27 first** — P-1's charts and tenant health have only ever been seen against synthetic figures | Schedule B |

## 4. Register: 18 / 25

Left: #1 voice intake (AC-side cutover, F-11) · #2 vendor uploads (F-8, identity call) · #7 accounting
(F-6, design session) · #9 tenant portal (F-7, scope call) · #17 document + floor-plan binaries (F-9) ·
reference rows #22 / #25. Every one is gated on a decision or a hand-step — which is why no un-gated
Schedule F work remains.

## 5. Open data questions (not build work, but they age)

- Site register flags: meter cluster "behind 131" reads 1 on the map vs 4 in the workbook · 123 meter
  location "?" · no time-clock photo for 111 / 135B / 139 · civil sheets C1.02–C1.05 not on file.
- **Contradiction to close:** the Sep 24 register still carries a "Federal Pacific panel (unit unknown)
  → replacement review" flag; your Sep 22 ruling was **no Federal Pacific panels**. One of the two is wrong.
- Lease terms still unresolved by design: 119 OUPAC · 145 Upstream commencement/expiry · signed copies
  pending for 105 / 117.5 / 119.5 / 121 · HVAC caps 117.5 / 119.5 "pending verification" · deposits
  missing for 107 / 137 / 143 / 149 (F-21).
- Insurance: 77,749 rated SF vs 62,883 GLA — still open with TSL.
- Parking Δ −10: the CAD's 10-stall Johnston row is the candidate resolution, pending ground confirmation.

## 6. Proposed sprint — forced ranking

| # | Item | Why it ranks here | Gate | Size |
| --- | --- | --- | --- | --- |
| **1** | **Punch list Rev 19** — catalogue the voice router, site register and site twin as F-38/39/40 with smokes SMK-29…31; refresh counts, build health (809) and the Sep 23–25 notes; carry state r38 verbatim | The sheet is the instrument you steer with and it is three sessions stale; everything below is easier to pick once it reads true | none | ½ session |
| **2** | **A-2 Lens-B loads the Stage 2 GLB** — the twin becomes a sheet instead of a zip, picks keyed to the same register IDs | The only un-gated build work on the board, and it is the payoff for Stage 1 + Stage 2 | none | 1 session |
| **3** | **Verification pass on production** — walk SMK-21…28 myself where a login is enough, and report what reads wrong against R-1 before you spend your own minutes on them | SMK-27 has never been seen with real figures; a demo-facing risk sitting unexercised for five days | prod login | ½ session |
| **4** | **F-20 Supabase hygiene** — 47 unindexed FKs, 45 duplicate permissive policies, 9 RLS initplan notices, 20 unused indexes, as one reviewed migration | Small tables, low risk, and it clears the advisor board before any pilot looks at it | apply on prod | ½ session |
| **5** | **F-9 document + floor-plan binaries** — keyed copy of 247 documents + 57 floor plans out of AC storage | The largest remaining H3-gate step; every day it waits is a day AC's secrets stay live | AC storage key | 1 session |
| **6** | **F-8 vendor upload links** — service key vs dedicated upload identity | Short build, closes register #2, but I will not pick your identity model for you | your pick | ½ session after the call |
| **7** | **F-6 accounting / QBO** and **F-7 tenant portal** — design sessions, not builds | The two biggest rocks; both change what other people see, so they start with you talking, not me typing | design session | multi-session |

Recommendation: **1 + 2 + 3 as the next session** — the sheet reads true, the twin lands in the app, and
the demo-facing surfaces get exercised before you show them again.
