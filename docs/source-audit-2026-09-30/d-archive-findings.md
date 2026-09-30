# D: drive rescue archives: source audit findings (2026-09-30)

**Scope.** Two read-only roots under `D:\2026-09 C-Drive Offload\`:

- `OTB-ARCHIVE-RESCUE-2026-08-17`: 5,779 files, 11.19 GB. This is the robocopy of the 2026-06-04 "OTB-Belle-Realty" sort (folders 00–15 and 99, plus 5 folder zips) and `OTB-Staging\_FROM-DOWNLOADS`.
- `D-ARCHIVE-RESCUE-2026-08-19`: 2,593 files, 13.01 GB. **This is mostly personal and unrelated** (family and school files, books, games, AI repos, personal finance and legal). It still holds a real OTB seam, about 360 files: `Adam Dell Jan 29 2023\Jan 2023\MISC` (2019–2022 leases, lease abstracts, pylon sign rental agreements, Butcher HVAC), `April 23 2024 HD DOCS` (lease drafts) and `July 112026` (26-27 CPKG policy, Greek Expressions lease, exclusive-use waivers, AI-generated reports). Every file is in the manifest. Personal files are marked `none`/`unrelated`.
- **Boundaries (not audited).** `Genspark Claw AppData (Roaming)` is an application profile with no property content. `cleanup_log.txt` and `wslmove_log.txt` sit at the offload root.

**Method.** Each file was SHA-256 hashed in 1 MB streaming chunks. Files over 200 MB are blank and noted: 18 files, including 3 folder zips, 4 Google-Drive zips and five Illustrator PDFs of 0.6–1.3 GB. Hashes were matched against a fresh repo index built from 1,954 files at 17:3x. That index includes the `reference/pylon` and `reference/instruments/jd-bank` ingests made earlier today. For zips, only member names and sizes were listed; nothing was extracted. `name_referenced_in_repo` is checked against a filename-token set built from the repo's `*.md, *.json, *.js, *.mjs, *.py, *.csv, *.html` files, with `node_modules`, `dist`, `.cache` and this folder excluded. For renamed archive files the check also uses the original name from the archive's `MANIFEST.csv`. Classification works from file name and folder. A first-page text glance was used only where the purpose was unclear (8 files). No rent amounts, account numbers or contacts are reproduced here.

Scripts are in the session scratchpad: `darch_scan.py`, `darch_classify.py` and `darch_patch1-5.py`. They can be re-run.

## 1. Totals

| Action | OTB-ARCHIVE | D-ARCHIVE | Total |
|---|---:|---:|---:|
| ingest-copy | 421 | 48 | **469** |
| register-external | 1,223 | 224 | 1,447 |
| already-in-repo | 67 | 3 | **70** |
| duplicate-within-sources | 121 | 55 | 176 |
| superseded | 308 | 35 | 343 |
| sensitive-decision | 172 | 18 | 190 |
| unrelated | 3,467 | 2,210 | 5,677 |
| **Files** | **5,779** | **2,593** | **8,372** |

Property relevance: high 2,115 · medium 329 · low 3,237 · none 2,691.

**Only 70 of 8,372 files (0.8%) are byte-identical to anything in the repo.** Those 70 are tenant logos, the 2019/2020 plats, the JD Bank servitude and exhibits, the pylon master, twin floor-plan PNGs and GIS PNGs. None of the executed leases, amendments, recorded easements (other than JD Bank), CAD sheets, HVAC or meter sources, or insurance policies are in the repo as source bytes. In 151 cases the repo knows the file by name but the bytes are absent (`name_referenced_in_repo=yes`, `in_repo_path` blank, relevance high).

### By category × action

| category | ingest-copy | register-external | already-in-repo | duplicate | superseded | sensitive | unrelated | total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| other | 0 | 142 | 0 | 17 | 0 | 63 | 3764 | 3986 |
| template | 0 | 35 | 0 | 10 | 0 | 4 | 1581 | 1630 |
| code-backup | 0 | 0 | 0 | 47 | 116 | 0 | 328 | 491 |
| rent-roll-financial | 25 | 170 | 2 | 4 | 152 | 37 | 0 | 390 |
| lease | 91 | 105 | 0 | 19 | 49 | 67 | 0 | 331 |
| lease-amendment | 73 | 112 | 0 | 8 | 5 | 5 | 2 | 205 |
| site-photo | 0 | 151 | 20 | 1 | 0 | 0 | 2 | 174 |
| ai-export | 0 | 138 | 20 | 13 | 3 | 0 | 0 | 174 |
| tenant-compliance | 0 | 100 | 0 | 4 | 0 | 5 | 0 | 109 |
| lease-package | 24 | 74 | 0 | 5 | 0 | 0 | 0 | 103 |
| correspondence | 0 | 92 | 0 | 0 | 0 | 3 | 0 | 95 |
| marketing | 0 | 87 | 1 | 7 | 0 | 0 | 0 | 95 |
| vendor-contract | 0 | 68 | 0 | 8 | 0 | 0 | 0 | 76 |
| insurance | 7 | 42 | 0 | 9 | 16 | 0 | 0 | 74 |
| floor-plan | 62 | 0 | 4 | 3 | 0 | 0 | 0 | 69 |
| hvac-mechanical | 36 | 26 | 0 | 1 | 0 | 0 | 0 | 63 |
| cad-drawing | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 57 |
| plat-survey | 43 | 1 | 6 | 6 | 0 | 0 | 0 | 56 |
| utility-meter | 6 | 32 | 0 | 1 | 2 | 0 | 0 | 41 |
| signage | 14 | 1 | 13 | 5 | 0 | 0 | 0 | 33 |
| permit-zoning | 10 | 17 | 0 | 0 | 0 | 0 | 0 | 27 |
| tax-assessment | 6 | 13 | 0 | 5 | 0 | 1 | 0 | 25 |
| aerial-drone | 0 | 21 | 0 | 1 | 0 | 0 | 0 | 22 |
| recorded-instrument | 11 | 1 | 3 | 0 | 0 | 5 | 0 | 20 |
| brand | 0 | 17 | 1 | 1 | 0 | 0 | 0 | 19 |
| scan-3d | 4 | 2 | 0 | 1 | 0 | 0 | 0 | 7 |

The CSV is authoritative.

**Action semantics.**
- `ingest-copy`: an authoritative property record under 50 MB, not in the repo, that should be copied into `reference/` with provenance.
- `register-external`: keep in place and cite by path. Used for large files, working copies, photos, collateral, historical tenants and anything belonging to The Boulevard.
- `superseded`: drafts and redlines, pre-2026 rent rolls, prior-term insurance, and pre-repo app builds.
- `sensitive-decision`: guaranties, POAs, loan and bank documents, tax returns, entity/EIN documents and credential files. The operator decides whether any of these are kept.

## 2. Top 40 authoritative files NOT in the repo

Paths are relative to `OTB-ARCHIVE-RESCUE-2026-08-17\OTB-Belle-Realty\` unless marked **D:** (for `D-ARCHIVE-RESCUE-2026-08-19\`).

| # | Path | Governs | Why it matters |
|---|---|---|---|
| 1 | `08_Legal_and_Easements/executed-access-and-parking-easement-belle-realty-and-our-savior-s-church.pdf` | Church access and parking easement: fee, 25-year term, §3a liquor waiver | This is the source for a CLAUDE.md audit-grade fact (the §3a waiver survives termination and restaurants are OK within 175 ft). The repo cites it but does not hold it. |
| 2 | `01_Leases_and_Tenants/osc-midtown-belle-realty-parking-agreement-executed-version.pdf` | Our Savior's Church (Midtown) parking agreement | A second executed church instrument. We need to confirm which one governs the Sunday/evening zone fill order. |
| 3 | `08_Legal_and_Easements/cross-easement-agreement.pdf` | Cross easement and servitude, likely Entry 03-060864 (title exception #27) | The June-2026 handoff lists it as "not yet retrieved". The repo draws its geometry, but the instrument itself is missing. |
| 4 | `08_Legal_and_Easements/purchase-agreement-cash-sale-120.pdf` | Cash-sale instrument | Possibly the JD Bank corner sale behind the "NOT A PART" notch. Needs verifying. |
| 5 | `01_Leases_and_Tenants/fast-pass-dealertrack-asset-sale-agreement-and-act-of-sale.pdf` | Dealertrack to Fast Pass asset sale | The assignment chain behind the 139/141 tenancy, whose renewal was executed 9/2026. |
| 6 | `03_Financials_and_Appraisals/snda-protectivelife.pdf` and `01_.../subordination-agreement-owner-tenant-related-project.pdf` | Lender SNDA and subordination | Encumbrances on the leasehold. |
| 7 | `05_Construction_and_Maintenance/existing-parking-spaces.pdf` | Striped-stall count exhibit | Direct evidence for the open 314 vs 324 variance reconciliation (Δ −10). |
| 8 | `05_Construction_and_Maintenance/greenspace.pdf` | 20% green-area zoning exhibit | The repo references this file by name, but the bytes are absent. |
| 9 | `03_Financials_and_Appraisals/plat-of-survey-5-11-09.pdf` | 2009 plat of survey | An intermediate survey revision that is not in the CLAUDE.md plat chain (1994, revised 7/19/2019). |
| 10 | `04_Plans_Plats_and_Survey/otb-plat-detailed.pdf` | Detailed plat, a different hash from `reference/plats/plat-of-survey-detailed-2019.pdf` | A possible alternate revision. Diff it before adopting. |
| 11 | `03_Financials_and_Appraisals/survey-on-the-blvd.pdf` | Survey | An unregistered survey copy. |
| 12 | `04_Plans_Plats_and_Survey/plat-135a-135b.pdf`, `plat-139-141.pdf`, `plat-143-145.pdf` | Suite demising plats | These govern the 135A/135B split and the 139/141 and 143/145 lines used in A-1. |
| 13 | `04_Plans_Plats_and_Survey/belle-realty-combined-plats-compresed.pdf` and `key-plan.pdf` | Combined plats and key plan | These are the compact set. The 59 MB combined set with photos is register-external. |
| 14 | **D:** `July 112026/filled_plat_units_sf.pdf` | Plat annotated with suite square footage | Cross-check against the GLA of 62,883 SF and the per-suite SF. |
| 15 | `04_Plans_Plats_and_Survey/a1-1, a2-01…a2-3, a5-1, a7-1/2, e1…e4, e1-01.pdf` and `05_.../a-1…a-5, e-1, e-2, m-1, m-8, p-1, s-1.pdf` | Architect drawing set (arch/elec/mech/plumb/struct) | The repo has only the DXF poster geometry. These sheets are the building record behind the twin and the roof-height work. |
| 16 | `05_Construction_and_Maintenance/2007-expansion-1.pdf`, `-2.pdf` | 2007 expansion drawings | The construction history of the building additions. |
| 17 | `04_Plans_Plats_and_Survey/131-133-plans.pdf`, `129-plans.pdf`, `135-plans.pdf` | Suite plans | 131/133 are vacant with an LOI pending, so these are needed for leasing now. |
| 18 | `01_Leases_and_Tenants/149-executed-jasons-lease-and-addendums.pdf` (19 MB) | Anchor lease, including §9.01 Butcher HVAC PM | The CLAUDE.md fact is cited, but the source is absent. |
| 19 | `01_Leases_and_Tenants/04-butcher-red-agreement.pdf` and `butcher-hvac.pdf` | Butcher Air Conditioning PM agreement for 149 | The compliance evidence for §9.01. |
| 20 | `01_Leases_and_Tenants/143-0-first-franklin-financial-corp-lease-agreement-fully-executed.pdf` | Lease for suite 143 | Tier-1 suite. |
| 21 | `01_Leases_and_Tenants/lafayette-2nd-amend-12-17-25.pdf` | Second amendment for 143 (1st Franklin; the first-page party check confirms it) | Very likely the "signed amendment 12/22/2025" that CLAUDE.md relies on. The source is not in the repo. |
| 22 | `01_Leases_and_Tenants/101-103-executed-pp-lease-agreement.pdf` | Combined lease for 101/103 (Pink Paisley) | This is the basis for the stated-rent exception that the owner accepted. |
| 23 | `01_Leases_and_Tenants/105-executed-painted-bayou-lease-agreement.pdf` | Lease for 105 | The renewal copy is still pending, so this is the current base document. |
| 24 | `01_Leases_and_Tenants/107-executed-great-american-lease.pdf` | Lease for 107 | Executed original. |
| 25 | `01_Leases_and_Tenants/109-jc-kate-lease-and-addendum.pdf` | Lease and addendum for 109 | The ownership-change consent of 8/31/2026 sits on top of this. |
| 26 | `01_Leases_and_Tenants/111-executed-lola-pink-lease-agreement.pdf` and `executed-lola-pink-addendum-2022.pdf` | Lease and addendum for 111 | Now BERNINA (formerly Lola Pink). |
| 27 | `01_Leases_and_Tenants/113-executed-graze-lease-agreement.pdf` | Lease for 113 | Executed original. |
| 28 | `01_Leases_and_Tenants/115-117-executed-clothing-loft-lease-agreement.pdf` | Lease for 115/117 | Executed original. |
| 29 | `01_Leases_and_Tenants/117-5-executed-victoria-nails-lease-agreement.pdf` and 1st/3rd/4th addenda | Lease for 117.5 | Needed to settle the HVAC cap, which is "Pending verification". |
| 30 | `01_Leases_and_Tenants/119-5-executed-lease-and-addendums.pdf` | Lease for 119.5 (Cat Clinic) | Needed to settle the HVAC cap, which is "Pending verification". |
| 31 | `01_Leases_and_Tenants/123-executed-lease-the-tux-shoppe.pdf` | Lease for 123 | Executed original. |
| 32 | `01_Leases_and_Tenants/125-127-executed-jordan-amanda-lease.pdf` | Lease for 125/127 | Executed original. |
| 33 | `01_Leases_and_Tenants/129-executed-hotworx-lease-agreement.pdf` | Lease for 129, with the exclusive-use clause | This is one side of the exclusive-use watch (129 vs 135A). |
| 34 | `01_Leases_and_Tenants/135a-executed-c-wolf-lease-agreement.pdf` | Lease for 135A | This is the other side of the exclusive-use watch. |
| 35 | `01_Leases_and_Tenants/137-executed-greek-expressions-lease.pdf` (plus **D:** `July 112026/Greek Expressions-Belle -LEASE AGREEMENT.pdf`, `LIMITED WAIVER OF EXCLUSIVE USE RIGHTS - …pdf`) | Lease for 137 and the exclusive-use waivers | The waivers modify other tenants' exclusives. |
| 36 | `01_Leases_and_Tenants/hvac-info-tenant-july-2021.pdf` and `05_.../belle-hvac-info-per-unit.xlsx` | HVAC responsibility by unit | CLAUDE.md names the "HVAC PDF (2021)" as a Tier-1 source. It is not in the repo. |
| 37 | `05_Construction_and_Maintenance/rev-belle-realty-arnould-blvd-property.xlsx` and `water-meter-number-reference.xlsx`, `belle-water-meter-info.pdf` | Meter register | Tier-1 per CLAUDE.md (`Rev_Belle_Realty_Arnould_Blvd_Property.xlsx`). It is referenced by name only. |
| 38 | `12_Operations_App_and_SOT/_MASTER_SOT/otb-master-template-set-sot-corrected.xlsx`, `00-otb-master-sot.docx`, `adam-on-the-blvd-source-of-truth-owner-corrected-final.xlsx` | Tier-1 SOT workbook, Master SOT v1.1, and the owner-corrected rent roll | These are the provenance sources for `docs/sot-2026-07/`. The repo has only the derived CSVs. |
| 39 | **D:** `July 112026/26-27 CPKG Pol.pdf`, `25-26 PROP Policy.pdf`, `12.30.2025 Notice of Non-Renewal.pdf`; `12_.../25-26-bop-policy.pdf` | Current and prior property/package policies and a carrier non-renewal notice | `docs/insurance-program-2026-27.md` cites these. The policy PDFs are absent. |
| 40 | `01_Leases_and_Tenants/ar-19-020836-*.pdf`, `ar-20-009286-*.pdf`; `04_.../beacon-lafayette-parish-la-report-6026788.pdf`; `06_.../belle-current-pylon-sign-as-of-feb-2020.pdf`; **D:** `Adam Dell Jan 29 2023/Jan 2023/MISC/PylonSignUseAgmt_VictoriaNails.pdf`, `PYLON SIGN SPACE RENTAL AGREEMENT.doc` | State Fire Marshal plan reviews for 101 Arnould (2019, 2020); the assessor report for parcel 6026788; the pre-v2 pylon and pylon-panel rental agreements | The pylon library record says "2′×4′ spaces per the pylon rental agreements", but those agreements are not in the repo. |

Also worth ingesting soon:
- the 2019 appraisal (`03_/2019-appraisal-101-149-arnould-blvd.pdf`, 12.8 MB);
- the EagleView roof reports and `rimkus-report-of-findings.pdf`, which support `docs/roof-condition-brief.md`;
- `executed-roof-replacement-contract-pinaire-blvd-7-15-22.pdf`;
- the Polycam capture of 2026-02-03 (`03_/polycam-floor-plan-2-3-2026.zip`, which holds DXF/SVG/CSV; `2-3-2026-76aa6d.zip` holds an OBJ mesh);
- the Jason's Deli sign package (**D:** `July 112026/JD-54-Lafayette-LA.pdf`).

## 3. Duplicate groups

- **269 exact-hash groups, 499 redundant copies, about 695 MB.** 63 groups span both roots. 124 groups contain property-relevant files. Examples:
  - `belle-package.pdf` (64 MB) ×2;
  - the Nov-2020 marketing brochure ×4 across roots;
  - the 2019 appraisal ×2;
  - `26-27 CPKG Pol` ×3;
  - the `26-27 Proposal` ×4;
  - `JD-54` ×3;
  - the pylon PSD, zip and SVG ×2;
  - the three identical 229 KB code zips (`OTBPROPOPS.zip`, `all CC files.zip`, `all.zip`).
- **48 zips are 100% already loose in the sources (about 4.1 GB).** These include the five folder zips `01_/04_/07_/09_/12_*.zip` (members match their folders 918/918, 142/142, 23/23, 35/35 and 287/287), `plats-…zip`, `center-infrastructure-…zip`, `145-documents*.zip`, `acquisition-docs.zip`, `on-the-blvd-docs-for-chad…zip` and `kimi-uploads.zip`.
- **Zips with content found nowhere else:**
  - `03_/arnould-blvd-docs.zip` ≈ `the-blvd-and-on-the-blvd-docs-as-of-2024-…zip` (216 MB each, not hashed). Each has 57/190 members not loose: "BLVD Survey.pdf", "BLVD Survey Info.pdf", "BLVD Property Condition Assessment.pdf", operating statements 2010–2012, "BLVD CAM 2011.xls", 2024-06-24 and 2024-10-09 site photos. These appear to be **The Boulevard** acquisition files (see §5). Confirm before any OTB use.
  - `99_/tsl-belle.zip`: the TSL 25-26 insurance proposal pack.
  - `13_/belle-lease-assembler.zip`: `BELLE_DRAFT_LEASE_2026_MASTER_v2.1`. This is the current lease template master, marked register-external.
- `05_/belle-hvac-contracts-2005-1053-…zip` is **empty (0 members, 364 bytes)**. The 2005 HVAC contracts it was meant to hold are missing from this archive.

## 4. Old app copies and backups (code-backup, 491 files)

- `OTB-Staging/_FROM-DOWNLOADS` and `12_Operations_App_and_SOT` hold `OTB_Ops_Tool` v4 → v6.6 (single-file HTML, 62 KB–1.5 MB), `OTB_Site_Plan_Interactive.html`, the `OTB 6.6.zip` / `OTB Clsude.zip` / `latest.zip` / `OTBPROPOPS` / `all CC files` bundles, `kimi-agent-interactive-site-plan-editor` (79-file React/TSX app), `tenant-signage-workflow` (125 files: scripts, prompt library, tenant logos) and `kimi-uploads.zip` (307 MB, all members also loose). Also present: the SOT exports `otb-sot-v6*.json` (5/20, 5/25, 5/30/2026) and `otb-project-state-handoff.md` (6/3/2026).
- **Nothing is newer than the repo.** The latest code-backup mtime is 2026-06-04. The repo's first commit is 2026-06-10 (baseline v7, Rev 4), and the modular app has superseded all of these. The v6.5 SOT JSON carries 27 units, 2 licenses, 3 lots and view backgrounds. The repo absorbed those long ago and has since corrected them.
- The tenant logos in `tenant-signage-workflow/ON_THE_BOULEVARD/TENANT…` are already in `tools/brand-assets/tenant-logos/`. That accounts for 20 of the 70 already-in-repo files.
- Other code in scope is unrelated to OTB: `15_Non_Property_Unrelated/volleymentor` (463 files); on D:, ollama, rasa, gemini-cli, lyra, whisper, and the Orange Ocean social PWA and agent kits.

## 5. Items contradicting (or at risk of contaminating) CLAUDE.md facts

1. **The Boulevard Shopping Center is a separate property.** It sits at 100–128 Arnould Blvd, across Arnould (source: the D: `July 112026/Boulevard_20Shopping_20Center-LAFAYETTE_20LA-OM` first page and `10_/boulevard-country-club-retail-center-portfolio-om-2.pdf`). 144 files are tagged `THE BOULEVARD … NOT OTB` in the notes: its income statements and CAM recs, the tenants Harbor Freight, Dollar Tree, Piccadilly, golf balls, City Nails, Siro's, Asian grocery and ABC Network, `psa-blvd.docx`, the `the-boulevard-v1c/v2a` models, and tax bills for **parcels 6028633 / 6053097**. Those parcel numbers are *not* in the CLAUDE.md Belle list (6026783/84/85/88, 6009649) and must not be merged into OTB. The 2026-06-04 sorter filed many of these under OTB categories.
2. **`Lafayette_LA 100 Arnould Blvd 110114 - FULLY EXECUTED.pdf`** (D:) has a date matching the OTB Dealertrack abstract (2014-11-01 to 2019-10-31) but gives the address as *100* Arnould. Either Dealertrack's lease was at The Boulevard or the abstract is misfiled. Resolve this before citing Dealertrack history for 139/141.
3. **`otb-project-state-handoff.md` (6/3/2026 backup) conflicts with CLAUDE.md:**
   - Lot 7 "~24 spaces" vs 32;
   - "1 building / net ~36,057 sf" vs 2 buildings / 62,883 SF;
   - "Arnould Heights" vs the recorded subdivision "Arnold Heights Subd. Ext. No. 1";
   - JC Kate, Victoria Nails and OUPAC shown as "Holdover" vs "No holdovers".

   The file is superseded. Do not re-import it.
4. **`belle-realty-management-on-the-boulevard-shopping-center-2021-12-01-2029-12-31.pdf`** is a lease abstract implying a Belle Realty Management tenancy (likely 135B) running to 12/31/2029. CLAUDE.md has 135B owner-occupied at $0. Confirm whether an internal lease exists.
5. **Suite designations outside the 27-unit roster:** `145a-lease-agreement-edge-yoga.pdf` / `zen-den-…2021-05-01-2024-06-30.pdf` (a "145A") and `142-steiner-lease-agreement.rtf` (an even suite, so probably another property).
6. **Survey chain:** `plat-of-survey-5-11-09.pdf` (2009) and `otb-plat-detailed.pdf` (a different hash from the 2019 repo plat) are revisions not named in the CLAUDE.md plat chain.
7. **Church instruments:** there are two executed church documents (the Our Savior's easement and the "OSC Midtown" parking agreement), plus `osc-history-of-parking.docx`. CLAUDE.md models one easement ($350/mo, 25-yr).
8. **Street spelling:** "Arnold" appears in file names (`131 Arnold Blvd AC.pdf`, `pro-forma-arnold-boulevard-boe-v2.pdf`). This is cosmetic, but those two files belong to different properties (131 is OTB; the BOE is The Boulevard).
9. **`12.30.2025 Notice of Non-Renewal.pdf`** is an insurance-policy non-renewal (checked from its first page), not a tenant notice. It does not contradict "Vacant: 131, 133".

## 6. Sensitive items needing an operator decision (190)

- Guaranties, POAs, entity and EIN documents, loan closing files (Investar 2011/2019, commitment, UCC, pledge, mortgage), tax returns, PFS, bank and ACH reports, and `oupac-unit-119-executed-lease-guaranty.pdf`.
- **Credential files (never ingest; the operator should secure or destroy them):**
  - `12_Operations_App_and_SOT/lock-codes.xlsx`;
  - D: `July 112026/Google Passwords.csv`;
  - D: `Adam Dell Jan 29 2023/Downloads/Backup-codes-5-11-22.txt`;
  - a password-named `.txt` in D: `July 112026/`.

## 7. Files

- `docs/source-audit-2026-09-30/d-archive-manifest.csv`: 8,372 rows, header exactly as specified.
- Duplicate map (sha → paths): `darch_dups.json` in the session scratchpad.
