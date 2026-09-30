# Source audit, 2026-09-30: Downloads and referenced external sources

Read-only audit. Nothing was moved, copied, or deleted. Files of 200 MB or less were stream-hashed one at a time. Filenames are listed here, but no document contents are reproduced.

- `downloads-manifest.csv` has 1,665 rows:
  - 1,605 OTB-relevant file rows.
  - 6 aggregate rows for predecessor-app code trees.
  - 54 boundary rows, one for each unrelated top-level folder.
  - By action:
    - 627 ingest-copy
    - 450 register-external
    - 324 duplicate-within-sources
    - 115 sensitive-decision
    - 73 unrelated
    - 50 already-in-repo
    - 26 superseded
- `referenced-sources-ledger.csv` has 188 rows: 164 extracted locators and 24 named-source rows.
  - Extracted locators are paths, `My Drive` paths, Downloads paths and Drive URLs found in HANDOFF.md, CLAUDE.md, `docs/**/*.md`, `tools/**`, `src/data/*.json` and `reference/README.md`.
  - Named-source rows are documents cited by name or as open items, searched in an index of G:\My Drive, G:\Shared drives, E:\OTB-CAPTURE, and the Belle/OTB folders on D: and E: (147,232 files).
  - Status: 142 referenced-only, 21 consumed, 19 open-item, 6 missing.

How relevance was decided: a match on the file name or path; for root-level Downloads files, a keyword match on the first pages (PDF, Office, text) or on archive member names; and GPS EXIF near the site. The Downloads count is 7,279 files once `node_modules` and `.git` are excluded. The 62,207 figure includes them.

## A. "We forgot we have it": open items whose source already exists on disk

| # | Open item (where the repo says so) | What exists now |
|---|---|---|
| 1 | **JD Bank servitude Entry 2004-00057697 plus exhibit.** CLAUDE.md calls it "exhibit not yet pulled", and `tools/export-package.mjs:202` repeats that in the export. | `G:\My Drive\3600 Johnston Reciprocal Access and Parking Easement and Servitude Agreement.New.pdf` (2020). A Whitney 2004 original is in `D:\2026-09 C-Drive Offload\OTB-ARCHIVE-RESCUE-2026-08-17\...\reciprocal-access-and-parking-easement-and-servitude-agreement.pdf`. `src/data/directory.json` has **already linked the Drive original** (verified by Drive metadata, 708,192 B). It was copied today into `reference/instruments/jd-bank/` (3 PDFs + README), but those files are **untracked, not committed**, so they are not in the nightly bundle. The CLAUDE.md and export wording is still stale. |
| 2 | **Missing deposits for 107 / 137 / 143 / 149** (CLAUDE.md "STILL OPEN"; runbook: "pull from the lease"). | The executed leases for all four are in `G:\My Drive\00 OTB\Belle Leases\` and `Downloads\OTB-Executed-Leases\`. There are also deposit ledgers: `G:\...\01 Belle Files to be placed\Belle Tax Folder 2019\9.  Belle Security Deposits as of 123119.xlsx`, `...\POA - RENTS\Rent Rolls\Seurity Deposits - From Catherine.xlsx`, `G:\My Drive\00 OrangeOceanAssetCommand\extract_security_deposits.csv`, and per-suite `SOT_SECURITY_DEPOSIT_NOTE.txt` files in `G:\My Drive\00 OTB\tenant-compliance-2026-09-22\*\deposit\`. |
| 3 | **Signed renewals 105 / 117.5 / 119.5 / 121** ("signed copies pending"). | 119.5: `119.5 Cat Clinic Extension.pdf` is in `G:\My Drive\Belle Lease Agreements 2026\` and in `Downloads\OTB-Executed-Leases\119.5_Cat_Clinic\`. 117.5: First, Third and Fourth Addenda are under `G:\...\00 - Current Leases\117.5-Victoria Nails\`, plus `Downloads\OTB-Executed-Leases\117.5_Victoria_Nails\Victoria_Nails_Third_Addendum.pdf`. 121: only the draft exists (`NOTE_DRAFT_ONLY_no_executed.md`). The execution status of each still needs operator review. |
| 4 | **115/117 Clothing Loft.** The repo still shows the term ending **2026-09-30 (today)** with "renewal in discussion". | `Downloads\Clothing_Loft_Lease_Extension_Addendum_Fully_Executed.pdf`. It is not referenced anywhere in the repo. |
| 5 | **Our Savior's Church easement.** Terms are cited from the SOT, and the instrument is not in the repo. | The executed easement is at the `G:\My Drive\` root and in `G:\...\00 - Current Leases\OSC Parking\`, where there is also **`OSC Midtown Belle Realty Parking Agreement - executed version.pdf`**, `OSC History of Parking.docx` and `OSC Belle Business Hours Parking.pdf`. None of these are referenced in the repo. |
| 6 | **HVAC PDF (2021)**, a Tier-1 source. The 117.5/119.5 HVAC caps are "pending verification". | `HVAC_Info_Tenant_July_2021.pdf` is on Drive (verified; linked in directory.json). The Butcher agreements are `G:\My Drive\00 OTB\04 BUTCHER RED AGREEMENT.pdf` and `...\HVAC Tenant Info\Butcher HVAC.pdf`. None are hashed into the repo. |
| 7 | **Pylon sign drawing.** The asset-library audit says Guidry Beazley PA1.01 is "on Drive, unread". | No file with that name was found. Related pylon sources: `G:\My Drive\01 Personal POA and Files\POA - RENTS\Pylon Sign\Belle Current Pylon Sign as of Feb 2020.pdf`, `G:\...\01 Belle Files to be placed\Belle Pylon Sign - Blank.pdf`, and pylon rental agreements (BEX Fitness 2007; Naked Pizza sign criteria). PA1.01 is still unlocated. |
| 8 | **Parking variance 99-11797.** | The variance instrument itself was **not found**. The zoning context is in `G:\My Drive\00 OTB\01 Belle Files to be placed\Zoning Issue\` (Belle Plat of Survey, Combined Issue, COMMUNITY DEVELOPMENT, LDC 14-25, LDC 61-76). The repo never references this folder. |
| 9 | **Title.** CLAUDE.md never mentions it. | The Drive folder "Title Commitment" is linked from `directory.json` (verified). `Downloads\OTB Property Ops Tooling Fresh\reoldtitlecommitmentdecpagepolicy.zip` holds a title commitment, dec page and policy. Financing instruments `G:\My Drive\28 Pledge scan.pdf` and `29 Mortgage scan.pdf`, plus `D:\July 10 2021\...\Whitney Bank Purchase Agreement\`, are never referenced. |
| 10 | **2019 appraisal**, held in the repo as a fact only. | `G:\My Drive\2019 Appraisal - 101-149 Arnould Blvd.pdf`. There are also older appraisals: `G:\My Drive\00 OTB\Additional Files to Consider\BELLE REALTY\BELLE.Refinance transaction - 2007 1628\03 Appraisal Report Part 1/2.pdf` and `...\DropBox from Alex\Appraisal Report Boulevard.pdf`. |
| 11 | **Tenancy history.** | `Downloads\AI OS GPT\vault\40 Real Estate\OTB Tenancies\` has 34 tenancy notes covering prior tenants (Sneaker Politics, Edge Yoga, Elle Rae, Dealer Track, Bella Grace, Boulevard Nutrition, the JD Bank and OSC parking tenancies). The repo has no equivalent. |
| 12 | **Site imagery and drone footage.** The Downloads\Drone paths in the repo are stale. | `Downloads\The Boulevard.zip` (>200 MB: 'Drone Footage RAW' plus the On The Boulevard photo set) and `Downloads\Dropbox.zip` ('Blvd Pics 2020' plus drone RAW) are not in E:\OTB-CAPTURE. `D:\July 112026\Drone Footage RAW\` also exists. |
| 13 | **Proforma and financials.** | `Downloads\proforma.zip` (OTB-Proforma.xlsx), `Belle Rent Roll 2-26.xlsx`, `Belle Realty expense 010124-083126.xlsx` and `Belle Customer Balance as of 100126.xlsm`. All are marked sensitive-decision. |
| 14 | **Rezoning.** | `OTB_Rezoning_Exposure_Brief_2026-09-24.pdf` and `OTB_Rezoning_Brief_Transmittal_Becker-Hebert_2026-09-29.pdf` are in Downloads only. The repo has no rezoning doc. |

**Already archived:** all Polycam exports in Downloads (8_18, 9_28 and 9_29 .dxf/.glb/.laz/.ply) match files of the same name and size under `E:\OTB-CAPTURE\OTB_Capture_*\04_model_exports\`. The Downloads copies are duplicates.

## B. Top 40 OTB files in Downloads that are not in the repo

Ranked by governing weight. "Ref" means the filename already appears somewhere in the repo text.

| # | File (Downloads\...) | Category | Action |
|---|---|---|---|
| 1 | Clothing_Loft_Lease_Extension_Addendum_Fully_Executed.pdf | lease-amendment | register-external |
| 2 | JC_Kate_109_Arnould_Consent_and_Release.pdf | lease-amendment | register-external |
| 3 | 01_Replacement_Guaranty_Lakin_Carlin.docx | lease-amendment | sensitive-decision |
| 4 | 02_Consent_and_Release_of_Prior_Guarantors.docx | lease-amendment | sensitive-decision |
| 5 | OTB-Executed-Leases\119.5_Cat_Clinic\119.5_Cat_Clinic_Extension.pdf | lease-amendment | register-external |
| 6 | OTB-Executed-Leases\117.5_Victoria_Nails\Victoria_Nails_Third_Addendum.pdf | lease-amendment | register-external |
| 7 | OTB-Executed-Leases\139-141_Fast_Pass\FastPass_Lafayette_2026_EXECUTED.pdf (Ref) | lease-package | register-external |
| 8 | OTB-Executed-Leases\109_JC_Kate\JC_Kate_Replacement_Guaranty_Executed.pdf | lease-amendment | sensitive-decision |
| 9 | OTB-Executed-Leases\111_Lola_Pink_BERNINA\Lola_Pink_Addendum.pdf | lease-amendment | register-external |
| 10 | OTB-Executed-Leases\119.5_Cat_Clinic\Cat_Clinic_First_Addendum.pdf | lease-amendment | register-external |
| 11 | OTB-Executed-Leases\ (20 executed leases, 101-149; most Ref by Drive name) | lease-package | register-external |
| 12 | leases.zip (20 executed lease PDFs) | lease-package | register-external |
| 13 | OTB Property Ops Tooling Fresh\reoldtitlecommitmentdecpagepolicy.zip | recorded-instrument / title | register-external |
| 14 | OTB Property Ops Tooling Fresh\BellAllLeases.pdf (83 MB) | lease-package | register-external |
| 15 | otb-full-lease-abstracts-2026-09-18.csv | lease-package | ingest-copy |
| 16 | OTB_Master_Lease_Package_manifest.csv | lease-package | ingest-copy |
| 17 | otb-renewal-pipeline-2026-08-10.csv | lease-package | ingest-copy |
| 18 | otb-lease-review-714e0730-...json | lease-package | ingest-copy |
| 19 | OTB-Executed-Leases\LEASE_MATRIX.md / STATUS.md / 00_README.md | lease-package | register-external |
| 20 | OTB_Rezoning_Exposure_Brief_2026-09-24.pdf | permit-zoning | ingest-copy |
| 21 | OTB_Rezoning_Brief_Transmittal_Becker-Hebert_2026-09-29.pdf | permit-zoning | ingest-copy |
| 22 | 26-27 PROP / CPKG / WCOM Policy.pdf, 26-27 IPFS FINC NOA.pdf, 26-27 PFA.pdf | insurance | sensitive-decision |
| 23 | Belle Rent Roll 2-26.xlsx | rent-roll-financial | sensitive-decision |
| 24 | proforma.zip (OTB-Proforma.xlsx) | rent-roll-financial | sensitive-decision |
| 25 | Belle Realty expense 010124-083126.xlsx; Belle Customer Balance as of 100126.xlsm | rent-roll-financial | sensitive-decision |
| 26 | Catherine_AP_Complete_Packet_2026-09-07.pdf | rent-roll-financial | sensitive-decision |
| 27 | 145 Sign Criteria.pdf; 145_Sign_Approval_Letter(_1).pdf/.docx; 137_Sign_Approval_Letter.docx | signage | ingest-copy |
| 28 | 2026_0721 / 2026_0910 Lafayette West LA - Clinic#2577 - Sign Proof - Big Mouth Signs.pdf; Upstream_Lafayette_West_Unsigned_Signing_Packet.pdf; Authorization of the Property Owner - Lafayette West.pdf | signage | ingest-copy |
| 29 | Belle_Pylon_Sign_Blank_Clean.png | signage | ingest-copy |
| 30 | Magnolia Salon page 2.pdf; Unit 121 - Magnolia - Butcher Invoice.pdf | hvac-mechanical | ingest-copy |
| 31 | The Boulevard.zip / Dropbox.zip (drone RAW + 2020 photo sets, >200 MB) | aerial-drone | register-external |
| 32 | OTB-Google-Earth.kmz (Ref); On The Boulevard — Site Research.kml; CYPRESS OTB TWIN.kml | aerial-drone / scan-3d | register-external |
| 33 | On The Boulevard.json.fml; 2026-09-23\ca\outputs\OTB_Editable_Export_2026-09-23\ | floor-plan | ingest-copy |
| 34 | tenant-compliance-2026-09-22\ and tenant-cois-2026-09-22\ (COIs, 119 files) | tenant-compliance | sensitive-decision |
| 35 | attachments (1)\ (Belle_Realty_Brian_Zorn_Invoice_2026-09-04.pdf + 20 site photos) | site-photo / vendor | register-external |
| 36 | Claude_Broussard / Josh_Arceneaux invoices 2026-08-18; Invoice_202627707-1.pdf; Est_15559_from_Perfect_Fitz_3712.pdf | vendor-contract | sensitive-decision |
| 37 | Shopping_Center_Handover_Checklist_Filled chat_OnTheBlvd.docx | ai-export | ingest-copy |
| 38 | AI OS GPT\vault\40 Real Estate\OTB Tenancies\ (34 notes) + OTB Tenancy Register.md | ai-export | ingest-copy |
| 39 | Board Report - On The Boulevard - 8_10_2026 / 9_11_2026.pdf; Owner/Lender/Investor/CPA/Lawyer/Buyer_Report_2026-08-10.pdf | ai-export | ingest-copy |
| 40 | orange-ocean-full-package-2026-08-23\ (Asset Command + Atlas snapshots, extraction JSON, CONTINUITY/WIKI/PENDING docs) | code-backup | register-external |

## C. Locators in repo docs that are stale or missing

- `Downloads\Drone\` and `Downloads\Drone Footage RAW\` no longer exist. The content moved to `E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\` and is also at `D:\July 112026\Drone Footage RAW\`.
- `C:\source\On_The_Boulevard.native.fml` and `C:\source\infrastructure-intake` do not exist. They are example arguments in the upper-floors tool docs.
- `E:\OTB-CAPTURE\2026-09-24\` does not exist. Capture folders use `OTB_Capture_YYYY-MM-DD`.
- 30 per-unit floor-plan Drive IDs in `src/data/floorplan-links.json` were not individually verified. The other 8 Drive links in `directory.json` were verified to exist.

## D. Boundaries

The 54 unrelated top-level Downloads folders each have one boundary row in the manifest. They include:

- AI Playbook bundles
- sticky-crew / sticky-tech
- Orange Ocean articles and core-intelligence kits
- CLAWS Albertson
- Statewide Restoration
- website-assets
- grok-assets

Also excluded from the manifest: root-level files that name or reference OTB only as an example (AI OS workbooks, deal-intelligence prospect packs, the Landry feasibility study) are marked `unrelated` with low relevance. Credential and recovery files were not opened and are not listed.
