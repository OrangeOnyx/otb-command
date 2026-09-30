# Source audit: Codex folders (2026-09-30)

Scope: `C:\Users\adam\Codex Projects\` and `C:\Users\adam\Documents\Codex\`. The audit was read-only: nothing was moved, copied, renamed or deleted. Files up to 200 MB were stream-hashed (SHA-256). Three larger files were listed without a hash: two Kimi ZIPs and one 2021 tenant video.
Manifest: `codex-manifest.csv` (23,615 rows = 23,386 file rows + 229 boundary rows).

## Counts

| Action | Files |
|---|---:|
| duplicate-within-sources | 12,160 |
| unrelated (tooling, dependencies, other ventures, system files) | 4,234 |
| register-external | 4,042 |
| sensitive-decision | 1,475 |
| superseded | 878 |
| already-in-repo | 573 |
| ingest-copy | 24 |

In addition, 1,950 files inside the five otb-command repo copies are byte-identical to the current repo. They are not itemised, and each copy has one boundary row.

**Read "duplicate-within-sources" carefully.** It means the same bytes also sit in another audited source (G: Drive `00 OTB`, the D: archive rescue, Downloads, the capture siblings, or elsewhere in the Codex folders). It does **not** mean the repo has them. Only the 573 `already-in-repo` rows are actually in git.

## What OTB_Master_Source_Package is

- **Built:** 2026-07-11 at 10:02, in `C:\Users\adam\Codex Projects\`, as the source pack for the first Codex/ChatGPT sessions. It contains 8,169 files and 9.5 GB. The pack itself has no README or manifest. The only generated files, `00 OTB/OTB-Command-Platform.md` and `OTB-Property-Dossier.md`, say "Generated 7/11/2026" and describe the otb-command app. The operator assembled the pack from existing Drive exports; Claude/otb-command produced the dossier files. No builder process wrote into the pack.
- **Structure:** Google Drive exports from three eras:
  - `00 OTB/` (4,858 files) mirrors `G:\My Drive\00 OTB` as of July 2026. It holds `01 Belle Files to be placed`, `Belle Realty SOT Documents` (with Kimi uploads, SOT chat documents, brand docs, plats, floor plans and HVAC), `Belle Leases`, `OTB PYLON SIGN` and three `OTB-LLM-Export*` variants.
  - 2021 Belle Google Drive: `August 2 2021 Belle GDrive` and `Belle Financial Documents` (751 files, 1.8 GB of refinance, tax and loan material).
  - Google Takeout ZIPs from 2023-08-18: `Breaker Labeling`, `Unit Time Clocks` and `Water Meters & Electric Meters`.
  - Working folders from 2022–2024: `DEC 23 work`, `Draft Leases`, `HOTWORX`, `JD Bank Parking`, `OSC Parking`, `MISC 101-103-105 plans`, `Misc Center Plans`, `145 Plans`, `Plats`, `Forms` (1,723) and `Welcoming Package`.
  - `will@belle-realty.com`: an employee's Drive shortcuts, all `.gdoc` stubs with no content.
- **Coverage:** 7,844 of the 8,169 files (96%) are duplicates, mostly of the D: archive (3,111) and G: Drive (604), or of each other inside the pack (4,057). Only 161 are in the repo. The files that exist nowhere else are 73 sensitive-decision, 50 register-external, 21 ingest-copy and 20 unrelated.

## Other folders found

**OTB-relevant, itemised in full:**

| Folder | Contents |
|---|---|
| `Codex Projects\otb-command-consolidation` (2026-07-25) | Canonical multi-property spec, plus an OCR'd executed-lease corpus (18 PDFs) and per-suite Markdown extractions with a reconciliation |
| `Documents\Codex\2026-09-23` (the named root) | `ca/` asset-twin, column, fixture, Google Earth, water and film outputs; infrastructure intake (1993 plans, time clocks, water meters); 3D-plat-workflow chat transcripts |
| `2026-08-04\referenced-…` | OTB Master Lease v2 / v2.1 / v2.2 (Louisiana house form, counsel redline, Robertson example) and the **OTB Leasing System Package V3.1** (≈45 forms) |
| `2026-09-27\referenced-…-2` | **Cypress Command OTB Jumpstart v1**, the 2026-09-23 executed-lease pack copy (`private-source-copy`), and the **2026-09-27 local lease audit** (`lease-audit.md/.json`) |
| `2026-09-10\new-chat` | 145 Upstream sign permit: owner authorisation and signed Big Mouth Signs proof |
| `2026-09-28\otb-unreal` | UE 5.8 + Cesium / Google 3D Tiles exterior workspace |
| `2026-09-28\a5-packaging` | Loose scripts |
| `2026-09-29` (two folders) | CRE Asset Library starter v0.1, Style B v0.2 and v1.0.0 (the repo's A-6 library came from here; 106 files already in the repo) |
| `2026-08-23\i-x20` | Adam-OS vault, which includes OTB reconciliation queue notes |
| `2026-07-15\…untrusted` | Early voxel model and source-inspection texts (2019 appraisal, BOE pro forma) |
| `2026-07-28\orange-ocean-atlas` | Atlas monorepo |

**Repo copies/worktrees**, each with one boundary row plus the files whose bytes differ:
- `2026-07-15\…\work\otb-command-package\otb-command`
- `2026-07-28\orange-ocean-atlas\work\archive-reference\otb-command`
- `2026-09-23\ca\work\otb-cces-reconciliation`
- `2026-09-23\ca\work\otb-asset-twin`
- `2026-09-23\ca\work\otb-twin-integration`

**Cypress brand and sales material** (low property relevance): `2026-09-05` brand system v1.0/v1.0.1/04C, `2026-09-07` sites and impeccable-init, `2026-09-19` AI Playbook design system, `2026-09-20` sales, assessment and onboarding kits plus the inheritance review, and `2026-09-24` architecture diagram.

**Boundary rows, not OTB:** acquisition-diligence-platform, anatomy-of-intelligence, CIA, both Kimi Knowledge Hub folders, 532 Alonda Dr, 742-744 Albertson Pkwy, Cypress Landry feasibility (another site), AI Playbook book, Volleypop, Stephanie job engine, Broussard-Newkirk residential lease, Adam-OS release, kinetic animation lab, and about 40 empty Codex session folders.

## Top 40 items the repo lacks (no bytes in git)

S = sensitive-decision · I = ingest-copy · R = register-external. Private values are withheld.

| # | Item | Where | Action |
|---|---|---|---|
| 1 | 2026-09-27 local executed-lease audit (`lease-audit.md` / `.json`, 47 files hashed, page-cited conflicts) | 2026-09-27 …-2/work | S |
| 2 | OTB Jumpstart v1 lease register + local lease reconciliation (`installations/otb/registers/*`) | 2026-09-27 outputs | S |
| 3 | Executed-lease pack copy, 20 suite folders (`private-source-copy/`, STATUS, LEASE_MATRIX) | 2026-09-27 …-2/work | S |
| 4 | OCR'd executed leases, 18 PDFs (101-103 … 149, text-searchable) | otb-command-consolidation/output/pdf/lease-ocr | S |
| 5 | Per-suite lease Markdown extractions + `LEASE-RECONCILIATION.md` / `.json` (2026-07-25) | otb-command-consolidation/lease-extraction | S |
| 6 | OTB Master Lease v2.2 Louisiana House Form (docx + pdf) | 2026-08-04 outputs | S |
| 7 | OTB Master Lease v2.2 Counsel Redline Against Original | 2026-08-04 outputs | S |
| 8 | Belle Realty Master Lease v2.1 Source-Reconciled | 2026-08-04 outputs | S |
| 9 | OTB Leasing System Package V3.1 (master lease, exhibits F–L, addenda 1–7, notices, abstracts) | 2026-08-04 work/v31 | S |
| 10 | V3.1 Exhibit F: Signage and Monument Sign Rights | 2026-08-04 work/v31 | I (after naming fix, see C-4) |
| 11 | 145 Upstream sign permit: owner authorisation + signed Big Mouth proof. The PDFs are duplicates of Downloads copies; the text extracts and PNGs exist only here. | 2026-09-10 new-chat/work/upstream | I (PDF from Downloads) |
| 12 | Breaker labeling workbooks (101 ×4, 115, 135B, 137, template) | PKG Breaker Labeling-20230818 | I |
| 13 | `145 Plans/2007 Expansion.zip` + `Misc Center Plans.zip` | PKG 145 Plans | I |
| 14 | `MISC 101-103-105 plans.zip` (1993 plan set 93-003) | PKG August 1 to file | I |
| 15 | 135 A/B plans (3 pages) + dollhouse views 129 / 131-133 / 135A / 137 | PKG DEC 23 work | I |
| 16 | Pylon artwork: `PYLON.png`, `pylon no back.png/.xcf` | PKG August 1 to file | I |
| 17 | Traffic-light study, Johnston × Arnould (screenshots + WRT toolkit) | PKG DEC 23 work/Traffic Light | R |
| 18 | Belle Realty Package 2023 / "On The Blvd Package for Taylor" (129–135A marketing package) | PKG DEC 23 work | R |
| 19 | `129-131and133-135A.zip` (77 MB) | PKG DEC 23 work | R |
| 20 | CSM executed quote (vendor) | PKG DEC 23 work | R |
| 21 | Elle Rae executed lease, units 125-127-129 (historical) + payment schedule | PKG August 1 to file, DEC 23 work | S |
| 22 | Dealertrack addendum; Revised LAF lease | PKG August 1 to file | S |
| 23 | 22-23 insurance/premium-finance set (WC policy, IPFS contract, property application, carrier receipts) | PKG August 1 to file (+ INS JULY) | S |
| 24 | PP rent breakdown options A/B (xlsx/pdf), 145 Rent.xlsx | PKG August 1 to file | R |
| 25 | ACH notices June 2022 | PKG August 1 to file | S |
| 26 | Belle refinance 2019 financial package (tax returns, entity financials) | PKG Belle Financial Documents | S (never git) |
| 27 | `Tennant Contact Info.docx` | PKG root | S |
| 28 | `OTB Prop Intelligence.docx`, `new 1.txt` | PKG root | R |
| 29 | Leasing poster set (pdf/png/svg), `OTB-Buyer-Overview.zip` | PKG 00 OTB | R |
| 30 | `Kimi Uploads.zip` (308 MB, unhashed) | PKG Belle Realty SOT Documents | R |
| 31 | Edge Yoga video, 2021 (368 MB, unhashed) | PKG 00 OTB/01…/135A-Edge Yoga | R |
| 32 | Drive compliance matrix + drive dossier (2026-09-22 sweep) | 2026-09-27 work | R |
| 33 | Jumpstart independent review (R1–R4 authority/verification defects) | 2026-09-27 work | R |
| 34 | Source-inspection text of the 2019 appraisal and BOE pro forma | 2026-07-15 work/source_inspection | S |
| 35 | OTB Unreal workspace: `setup_otb_level.py`, `validation.json`, `README`; `credential-audit.json` is S | 2026-09-28 otb-unreal | R |
| 36 | Twin film `OTB-Twin.blend` + mesh summary; `otb-twin-film` frames (1.3 GB) | 2026-09-23 ca/outputs | R |
| 37 | Water evidence/map, Google Earth, site-context packs (2026-09-25) | 2026-09-23 ca/outputs | R (most are duplicates of capture-siblings) |
| 38 | Adam-OS OTB occupancy/unit authority reconciliation queue | 2026-08-23 vault/90 Review | S |
| 39 | Early OTB voxel model (obj/mtl) | 2026-07-15 outputs | R / superseded |
| 40 | otb-command-consolidation canonical spec (schema.sql, workflows, migration-map, MCP tool defs) | Codex Projects | R |

## Contradictions and gaps against CLAUDE.md / HANDOFF.md / units.json

The 2026-09-27 lease audit compared signed local PDFs, with page citations, against the register. The repo does not record these conflicts:

- **C-1 · 107 Great American Cookies.** units.json `end` = 2027-03-31. The signed lease in the local pack reads **2027-09-30** (§3.01).
- **C-2 · Term-end conflicts.**
  - 123 Tux: repo 2029-12-31. The term clause says 2029-04-30 and the rent schedule runs to 2030-04.
  - 125/127 Shoetique: repo 2028-04-30. The local copy is lessor-signed only (lessee signature blank) and says 2029-08-31.
  - 137 Greek Expressions: repo 2030-10-31. The signed instrument says 2030-09-30.
- **C-3 · 149 Jason's Deli.** The signed Fifth Addendum's monthly total differs from the operating amount in the repo (figures withheld). Its signature dates are April 2025, but the chat described it as a February 2026 addendum. The audit's ruling is "no billing change until reconciled".
- **C-4 · 113 Graze.** The local base lease has a blank lessee signature, although the register calls it verified. A counterpart is needed.
- **C-5 · 115/117 Clothing Loft.** units.json `end` = **2026-09-30**, which is today. A 2026-09-13 extension to 2029-09-30 appears in chat but no file was located. Also, a later rent is effective 2026-10-01 but is described as "current" in one table. This conflicts with the CLAUDE.md line "No holdovers" from tomorrow onward.
- **C-6 · 145 Upstream.** CLAUDE.md says "executed lease". Locally there is only a lessor-signed copy plus the claim that "Adam confirmed signed 2026-09-23, scan pending". The fully countersigned PDF was never dropped into the pack.
- **C-7 · 105, 117.5, 119.5, 121 renewals.** Only the historical instruments are local, which matches CLAUDE.md "signed copies pending". 119.5 has an HVAC contribution conflict between pages 2 and 3 of the lease, consistent with "Pending verification".
- **C-8 · Sign naming.** The operator ruled "pylon" on 2026-09-29. Three places still say "monument":
  - `src/lib/lease.js:115` ("monument signage")
  - `src/store.js:127` ("Monument sign site")
  - HANDOFF.md generator line ("npm run pylon (monument sign)")

  The Codex V3.1 Exhibit F is also titled "Monument Sign Rights".
- **C-9 · 145 sign criterion.** The Big Mouth proof records "Per Landlord: overall sign height NTE 26 in." This landlord signage rule is not in CLAUDE.md.
- **C-10 · Unreal.** HANDOFF (Sep 28, later) says the Unreal script "was not executed (no UE run)". The Codex `otb-unreal` README records a live UE 5.8 exterior view verified on 2026-09-28, with Google Photorealistic 3D Tiles in the twin's geographic frame. The repo never mentions `otb-unreal`.
- **C-11 · Stale grounding still circulating.**
  - `00 OTB/OTB-Property-Dossier.md` (7/11), the three `OTB-LLM-Export*` folders and `OTB-Buyer-Overview` still list 105, 109, 117.5, 119 and 143 as holdovers, along with old terms and rents. All of that is superseded by the September 2026 review.
  - These copies also sit on G: Drive. Any LLM grounded on them will reintroduce facts that were already corrected.
- **C-12 · Historical tenancy not in memory.** Elle Rae held an executed lease on 125-127-129 before HotWorx and Shoetique. Also missing: the 2023 traffic-light study (Johnston × Arnould) and the 2023 CSM vendor quote.
- **Consistent, no action needed.** Parking figures (324/344, plat 314), Lot 7/Lot 8 counts, the church liquor waiver, the JD Bank 13 spaces and the easement entries in the package dossier all match CLAUDE.md.

## Recommended next steps (ranked)

1. Adjudicate C-1 through C-6 against the signed PDFs and update `leaseEvidence` and `end` in units.json. Start with 115/117, which expires today in the app.
2. Retrieve and hash the missing counterparts: 145 countersigned, the 115/117 9/13 extension, 105/117.5/119.5/121 renewals, and the 113 counterpart.
3. Ingest the 24 ingest-copy rows: breaker labels, 1993/2007 plan ZIPs, 135 plans, pylon art and the 145 sign permit.
4. Decide where the 1,475 sensitive rows belong (Owner Safe bucket vs. never). Leases, OCR corpus, refinance, insurance and contacts should never go into git.
5. Retire or re-stamp the July dossier and LLM exports on G: Drive.
6. Fix the "monument" strings (C-8).
