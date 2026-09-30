# Source audit: Google Drive `G:\My Drive\00 OTB` (2026-09-30)

**Purpose:** list every file the operator has put on Google Drive, so nothing he provided gets lost again, and show which files the repo already holds.
**Method:** Read-only walk of the Drive folder. Each file ≤ 25 MB was stream-hashed (SHA-256, 1 MB buffer) and matched against the repo hash index. That index was supplemented with 18 `reference/` and `docs/` binaries that were missing from it (the JD Bank instrument set, for example, was committed after the index snapshot). Basenames were then searched in a lowercase text blob built from the repo (`*.md/json/js/mjs/py/csv/html`, excluding `node_modules`, `dist`, `.cache`, `graphify-out`, `.claude/worktrees`). Files were classified by folder and filename. Two documents whose purpose was unclear got a first-page glance, and only the party name was recorded.
**Output:** `gdrive-manifest.csv` has 6,669 rows: one per file (6,668), plus one boundary row for `repo-backups/` (13 files, not enumerated).

## 1. Totals

- **Coverage:** 6,681 files on Drive. 6,668 are itemised; the 13 in `repo-backups/` are covered by the boundary row. Total size is 6.6 GB.
- **Hashing:** 6,638 files were hashed. 27 were over 25 MB and left unhashed ("not hashed (size)"). The other 3 are Google pointer stubs (`.gdoc`, `.gsheet`, `.gprj`) that cannot be read as bytes.
- **Noise:** 1,351 files are `desktop.ini` and are marked `unrelated`. The table below leaves them out, which leaves 5,318 real files.
- **Duplication:** 693 exact-duplicate groups hold 1,272 redundant copies, about 1.8 GB.

| category | ingest-copy | sensitive-decision | register-external | already-in-repo | duplicate | superseded | unrelated | total |
|---|---|---|---|---|---|---|---|---|
| template | 4 | 15 | 2 | 0 | 283 | 9 | 1433 | 1746 |
| lease | 0 | 377 | 0 | 0 | 287 | 129 | 0 | 793 |
| other | 6 | 20 | 16 | 27 | 73 | 345 | 27 | 514 |
| ai-export | 0 | 2 | 0 | 111 | 80 | 227 | 0 | 420 |
| lease-amendment | 0 | 127 | 0 | 0 | 78 | 89 | 0 | 294 |
| signage | 115 | 0 | 0 | 26 | 19 | 31 | 0 | 191 |
| floor-plan | 70 | 0 | 1 | 10 | 65 | 0 | 0 | 146 |
| brand | 37 | 0 | 0 | 81 | 24 | 0 | 0 | 142 |
| site-photo | 0 | 59 | 25 | 1 | 36 | 8 | 0 | 129 |
| correspondence | 0 | 38 | 0 | 0 | 3 | 63 | 8 | 112 |
| cad-drawing | 67 | 0 | 1 | 0 | 32 | 0 | 0 | 100 |
| rent-roll-financial | 0 | 52 | 0 | 1 | 23 | 17 | 0 | 93 |
| marketing | 57 | 0 | 1 | 15 | 8 | 1 | 0 | 82 |
| plat-survey | 29 | 0 | 1 | 16 | 26 | 10 | 0 | 82 |
| hvac-mechanical | 26 | 0 | 35 | 0 | 16 | 0 | 0 | 77 |
| scan-3d | 0 | 0 | 3 | 47 | 2 | 25 | 0 | 77 |
| lease-package | 0 | 20 | 0 | 0 | 16 | 30 | 0 | 66 |
| tenant-compliance | 0 | 60 | 0 | 0 | 0 | 0 | 0 | 60 |
| aerial-drone | 0 | 0 | 24 | 2 | 29 | 0 | 0 | 55 |
| vendor-contract | 6 | 0 | 0 | 0 | 22 | 11 | 0 | 39 |
| insurance | 0 | 23 | 0 | 2 | 3 | 4 | 0 | 32 |
| utility-meter | 11 | 0 | 0 | 10 | 6 | 0 | 0 | 27 |
| recorded-instrument | 9 | 2 | 0 | 3 | 1 | 0 | 0 | 15 |
| permit-zoning | 9 | 0 | 0 | 0 | 2 | 3 | 0 | 14 |
| tax-assessment | 2 | 7 | 0 | 0 | 3 | 0 | 0 | 12 |
| **all** | **448** | **802** | **109** | **352** | **1137** | **1002** | **1468** | **5318** |

**What these numbers mean:**
- **Most of the Drive is noise.** About 1,430 files in `01 Belle Files to be placed/Forms/` are generic CRE templates, articles and personal planners. The `Additional Files to Consider/B&H` and `/ATC` folders are law-firm and title-company letterhead. All of these are marked `unrelated`.
- **The 352 files already in the repo** are almost all things the repo produced itself: LLM exports, the `ac-archive`, twin and site-register exports, posters, manuals and tenant logos. Very few are original evidence the operator supplied.
- **Original evidence is mostly outside git.** Only two operator-supplied evidence sets are byte-present in the repo:
  - the recorded plat set (`reference/plats/*`)
  - the JD Bank servitude set (`reference/instruments/jd-bank/*`)
- **Everything else is outside git,** including leases, amendments, easements, zoning, HVAC, meters and architect sets.
- **Name-only references:** the repo often cites these files by name in its `.md` and `.json` files (column `name_referenced_in_repo = yes`), but the bytes are not in the repo.

## 2. Top 40 authoritative files not in the repo

Every path below is relative to `G:\My Drive\00 OTB\`. Each entry is the canonical copy, and duplicates are listed in the manifest. "S" means `sensitive-decision`: the operator decides whether it belongs in git. "I" means `ingest-copy`. "X" means large file: `register-external`, keeping the file outside git and recording its hash.

**Lease economics and terms (Tier-1 per CLAUDE.md)**

1. **S+X** `OTB_Master_Lease_Package_2026-08-01.pdf` (143 MB, not hashed)
   - Governs: the Tier-1 lease source adopted 2026-09-11.
   - Why it matters: it is cited in the repo but has never been stored or hash-registered.
2. **S** `OTB-Master-Template-Set-SOT-corrected.xlsx` (5 identical copies)
   - Governs: the 27×30 rent-roll workbook, named `OTBMasterTemplateSetSOTcorrected.xlsx` in CLAUDE.md.
   - Why it matters: the repo keeps only the CSVs derived from it in `docs/sot-2026-07/`.
3. **S** `OTB_UPDATED_SOT_August2026.xlsx`
   - Governs: an August 2026 SOT workbook.
   - Why it matters: nothing in the repo mentions it by name. It post-dates `sot-2026-07` and pre-dates the Sept review, so it is the likeliest "forgotten" data file.
4. **S** `Belle Leases/*.pdf`: the 20 executed lease PDFs for units 101-103 through 149 (7–10 copies each across Drive)
   - Governs: the primary lease evidence for every suite.
   - Why it matters: the repo cites the names only.
5. **S** `Additional Files to Consider/Belle Leases/LAF - 5th Amendment 4.3.2025.docx`
   - Governs: the **149 Jason's Deli Fifth Addendum, effective 11/1/2025**. The repo's 149 term (start 2025-11-01) matches it, but no repo file cites it.
   - Why it matters: it is a Word draft, and no executed PDF was found by filename.
6. **S** `Additional Files to Consider/Belle Leases/Lafayette 2nd Amend 12-17-25.pdf`
   - Governs: the 143 1st Franklin Second Amendment.
   - Why it matters: the date line on page 1 is blank. The repo cites a *signed* amendment dated 12/22/2025, so the executed copy still needs to be located.
7. **S** `tenant-compliance-2026-09-22/139-141-fast-pass/lease/FastPass_Lafayette_2026_EXECUTED.pdf`
   - Governs: the executed 139/141 renewal, 2026–2029.
8. **S** `Belle Leases/Clean Unit 145 Lease Executed by Lessor.pdf`
   - Governs: the 145 Upstream lease.
   - Why it matters: the title says it was executed by the lessor only.
9. **S** `Belle Leases/121 Draft Magnolia Salon Lease Agreement.pdf`
   - Governs: 121.
   - Why it matters: this is the only 121 lease document on Drive, and it is a draft.
10. **S** `01 Belle Files to be placed/Scanned Leases/`
    - Contents: the Cat Clinic First Addendum, Lola Pink Addendum, Victoria Nails Third Addendum, Painted Bayou executed lease, and the Pink Paisley 101-103 scan (the TIFF is 38 MB).
    - Why it matters: `tenant-compliance` `DRIVE_POINTER_*.md` files point at these files.
11. **S** `Belle Realty SOT Documents/BELLE/💡 BELLE BLVD [ Shared Drive ]/Cat Clinic Extension 2023_…pdf`
    - Governs: the 119.5 extension.
12. **S** `Belle Realty SOT Documents/Belle Rent Roll 2-26 (1).xlsx`
    - Governs: the Feb 2026 rent roll, the last pre-review snapshot.
13. **S** `Additional Files to Consider/Master Property Info/00_OTB_Master_SOT.docx`
    - Governs: `00_OTB_Master_SOT.docx`, a Tier-1 source per CLAUDE.md.
    - Why it matters: two different byte-versions exist on Drive (the other is in `OTB_Project_Uploads/`).
14. **S** `01 Belle Files to be placed/Scanned Leases/LEASE ABSTRAACT from Leasecake/` (Leasecake export ZIP plus 20 abstract PDFs)
    - Governs: historic lease dates and terms, useful for renewal-history reconciliation.

**Recorded instruments, access and parking**

15. **I** `01 Belle Files to be placed/00 - Current Leases/OSC Parking/(Executed) ACCESS AND PARKING EASEMENT - Belle Realty and Our Savior's Church.pdf`
    - Governs: the OSC easement, including the 25-year term and the §3a liquor waiver.
    - Why it matters: CLAUDE.md states these terms, but the source document is not in the repo.
16. **I** `…/OSC Parking/OSC Midtown Belle Realty Parking Agreement - executed version.pdf`
    - Governs: a second, separate OSC parking agreement.
17. **I** `…/OSC Parking/OSC Belle Business Hours Parking.pdf` and `OSC History of Parking.docx`
    - Governs: OSC business-hours parking and the history of the OSC parking arrangement.
18. **I** `Additional Files to Consider/BELLE REALTY/BELLE.CORPORATE MATTERS - 2007 1596/Cross Easement Agreement.pdf`
    - Governs: a 2007 cross-easement.
    - Why it matters: it is not in `reference/instruments/`. Check whether it is the Whitney/JD servitude or a separate burden.
19. **I** `01 Belle Files to be placed/00 - Current Leases/JD Bank Parking/JD Bank Exhibits.docx` and `Dear Vendor (1).pdf`
    - Why it matters: these are companions to the JD Bank servitude set that is already in the repo.

**Zoning, parking and the 324/344 variance**

20. **I** `01 Belle Files to be placed/Zoning Issue/Combined Issue.pdf`
    - Governs: the zoning-issue compilation, the most likely source for Entry 99-11797 and the parking variance.
21. **I** `01 Belle Files to be placed/Zoning Issue/COMMUNITY DEVELOPMENT.pdf`, `LDC 14-25.pdf`, `LDC 61-76.pdf`, `Untitled.jpg`, `Untitled1.jpg`
    - Governs: the CH zoning rules and parking-requirement citations.
22. **I** `01 Belle Files to be placed/Architecture/Plats and plans/Center/EXISTING PARKING SPACES.pdf`
    - Governs: the parking-stall count, which bears on the unreconciled −10 gap (314 vs 324).
23. **I** `…/Center/Greenspace.pdf`
    - Governs: the 20% green-area requirement.
24. **I** `Additional Files to Consider/Plats and Site Plans and Pictures/Beacon - Lafayette Parish, LA - Report_ 6026788.pdf`
    - Governs: the assessor record for parcel 6026788.

**Plats and surveys**

25. **I** `Belle Realty SOT Documents/Plats and Site Plans/Plat 135A-135B.pdf`
    - Governs: the 135A/135B split, which backs the ~1,580 SF each fact.
26. **I** `Belle Realty SOT Documents/Files and Docs to Place/Plats  Survey/Plat 139-141.pdf` and `Plat 143-145.pdf`
    - Governs: the unit-pair plat details.
27. **I** `Additional Files to Consider/BELLE REALTY/BELLE.CORPORATE MATTERS - 2007 1596/Plat of Survey 5-11-09.pdf`
    - Governs: a 2009 survey revision that the repo does not know about.
28. **I** `Additional Files to Consider/BELLE REALTY/BELLE.Refinance transaction - 2007 1628/Survey - On The Blvd.pdf`
    - Governs: the 2007 lender survey.
29. **I** `01 Belle Files to be placed/00 - Current Leases/{101-Vacant,119- Oupac New,115-…}/…Plat…png`
    - Governs: premises exhibits attached to individual leases.

**HVAC, meters and infrastructure**

30. **I** `04 BUTCHER RED AGREEMENT.pdf`
    - Governs: the Butcher Air Conditioning agreement required by the Jason's Deli §9.01 HVAC PM clause.
31. **I** `Belle Realty SOT Documents/HVAC Tenant Info/HVAC Info Tenant July 2021.pdf`
    - Governs: the "HVAC PDF (2021)" Tier-1 source. It also comes in `.docx` and `OTB_Project_Uploads` variants.
32. **I** `Belle Realty SOT Documents/HVAC Tenant Info/HVAC BELLE TENANT INFO 2023.xlsx`, `OTB MASTER SOT FILES/OTB HVAC INFO .xlsx`, and `HVAC MAP.jpg`
    - Governs: the 2023 HVAC unit inventory and map.
33. **I** `01 Belle Files to be placed/Center Infrastructure/Water Meters & Electric Meters/Rev Belle Realty Arnould Blvd Property.xlsx`
    - Governs: the meter workbook, a Tier-1 source.
    - Why it matters: the repo cites the name only.
34. **I** `Belle Realty SOT Documents/Files and Docs to Place/Center Infrastructure/…/Belle Water Meter Info.pdf`, `Water Meter Locations.jpg`, `Water Shutoff Locations.jpg`
    - Governs: water shutoff locations.
35. **I** `Belle Realty SOT Documents/Breaker Labeling/*.xlsx` (8 sheets)
    - Governs: panel labeling for 101, 115, 135B and 137.
    - Why it matters: the matching HEIC photos and MOV videos are `register-external`.

**Architecture and floor plans**

36. **I** `01 Belle Files to be placed/Architecture/Plats and plans/Center/May 6, 2007 …Crist/` and `May 22, 2007 …Crist/`
    - Contents: 21 sheets, A/E/M/P/S.
    - Governs: the 2007 expansion construction set.
37. **I** `…/Plats and plans/149/RODGER A. BROOKS  ARCHITECT.pdf` and `…/103/June 14, 1993 - 93-003/*`
    - Governs: the 149 building set and the 1993 set for 103.
38. **I** `Belle Realty SOT Documents/Floor Plans/Floor Plans/Combined Floor Plans as of October 12.pdf` and `101 Arnould 1st and 2nd Floors From Old Plans.pdf`
    - Governs: the suite floor-plan compilation.
39. **I** `Belle Realty SOT Documents/Potential Building Plans/{129,131 133,135} Plans.pdf`
    - Governs: prospective build-outs for 131/133, currently vacant.

**Insurance**

40. **S** `Cypress Command/Insurance 2026-27/26-27 {CPKG Pol, PROP Policy, WCOM Policy, PFA, IPFS FINC NOA}.pdf`
    - Governs: the in-force 2026-27 insurance program.
    - Why it matters: the repo holds only the summary (`docs/insurance-program-2026-27.md`, which is byte-matched).

## 3. Exact-duplicate groups worth noting

693 groups hold 1,272 redundant copies (about 1.8 GB). The main patterns:

- **Executed-lease PDFs** are stored 7–10 times each. The copies live in:
  - `Belle Leases/`
  - `Additional Files to Consider/Belle Leases/`
  - `Belle Realty SOT Documents/{Additional Files…, BELLE/Belle Leases, Kimi Uploads, Previous Onboard Attempt, Previous Onboard Attempt/DOORLOOP}/Belle Leases/`
  - `01 Belle Files to be placed/00 - Current Leases/<unit>/`

  The worst case is the 101-103 Pink Paisley lease (13 MB × 10 copies). 149 Jason's is 19 MB × 7.
- **Aerial JPGs `IMG-3914/3916/3917/3918`** (about 13 MB each) are stored 5–10 times.
- **`OTB-Master-Template-Set-SOT-corrected.xlsx`** is stored 5 times (root, `Files and Docs to Place`, `OTB_Project_Uploads` under the name `OTBMasterTemplateSetSOTcorrected.xlsx`, and `XX - Final Versions to be Placed` plus its "- Copy" folder).
- **`Belle Realty Package 2023 Compressed.pdf`** is stored 4 times. `00 Example Master Lease Package.pdf` and `Belle Package_compressed (1).pdf` are the same bytes, stored 9 times in total.
- **The entire `Kimi Uploads/`, `Previous Onboard Attempt/` and `Additional Files to Consider/` trees** are mostly copies of `Belle Leases/`, `Floor Plans/`, `Tenant Logo/` and `Aerial Photos/`. They also exist as `Kimi Uploads.zip` (293 MB), `Belle Leases.zip` (134 MB) and `Previous Onboard Attempt/Belle Leases.zip` (118 MB). Those ZIPs are too large to hash, but they are almost certainly the same content.
- **The `.tiff` twins of the scanned PDFs** in `Scanned Leases/` and **the breaker-labeling HEIC and MOV files** are each stored twice (in `01 Belle Files…/Center Infrastructure/` and in `Belle Realty SOT Documents/Breaker Labeling/`).

## 4. Possible contradictions with repo facts (seen in filenames and metadata only)

| # | What the Drive shows | Repo fact (CLAUDE.md / units.json) | Status |
|---|---|---|---|
| 1 | Unit folders `103-105-Pink Paisley`, `101-Vacant`, `105 - Bayou Painting` | Pink Paisley = 101-103; Painted Bayou = 105 | The folder labels are stale. Pink Paisley's lease is filed under the wrong unit pair. |
| 2 | `121-123-Lola Pink Fabrics`, `111-Bella Grace Paper`; brand docs say `111_BERNINA_LAFAYETTE` | 111 = BERNINA Lafayette (Lola Pink); 121 = Magnolia; 123 = Tux Shoppe | These are historic folder names. Units have been re-demised or re-tenanted since. |
| 3 | `135A-Edge Yoga`, `135B-Vacant - Belle Realty` | 135A = C. Wolf; 135B = owner-occupied | These are historic folder names. |
| 4 | `139-141-Dealer Track-Cox Automotive` (includes an Asset Sale Agreement and Act of Sale to Fast Pass) | 139/141 = Fast Pass | Consistent: Fast Pass took over through the asset sale. The asset-sale document is not in the repo. |
| 5 | `145-Boulevard Nutrition` | 145 = Upstream | The tenant-compliance note already flags Blvd Nutrition as not current. |
| 6 | `129-Oupac Financial` and `119- Oupac New`; `125-127-129-Elle Rae Boutique New`; `131-133-Sneaker Politics` | 119 = OUPAC; 125/127 = Jordan Amanda; 129 = HotWorx; 131/133 vacant | Historic. OUPAC moved from 129 to 119. |
| 7 | `Plat of Survey 5-11-09.pdf`, `Plat of Survey October 2020.png` | Plat "5/20/1994, last rev 7/19/2019" | A 2009 survey exists that the repo does not list. The Oct-2020 file is a cleaned image, not a new revision. Its PDF form, `Simple-Clean Plat of Survey October 2020.pdf`, byte-matches `reference/plats/site-plan-simple-2020.pdf`. |
| 8 | `Lafayette 2nd Amend 12-17-25.pdf`, undated on page 1 | 143 signed amendment dated 12/22/2025 | The executed copy has not been located on Drive by filename. |
| 9 | `LAF - 5th Amendment 4.3.2025.docx` (a 149 Fifth Addendum, effective 11/1/2025) | 149 start 2025-11-01 | The data matches, but the repo does not cite the source document. Only a Word version was found; the executed copy was not located. |
| 10 | `Clean Unit 145 Lease Executed by Lessor.pdf` | "145 Upstream: executed lease" | Confirm that a fully executed counterpart exists. |
| 11 | `121 Draft Magnolia Salon Lease Agreement.pdf` is the only 121 lease | 121 renewal owner-confirmed, signed copy pending | Consistent. The gap is still open. |
| 12 | `reference/instruments/jd-bank/servitude-exhibits-2020.pdf` byte-matches Drive `JD Bank Parking/JD Bank Exhibits.pdf` | CLAUDE.md: "exhibit not yet pulled; servitude area NOT drawn" | The exhibit **is** now in the repo (git-tracked), so the "not yet pulled" line in CLAUDE.md is stale. Drawing the servitude area is still open. |
| 13 | No Drive filename mentions "variance" or "99-11797" | Variance Entry 99-11797 (324/344) | The recorded variance itself is not identifiable by filename. `Zoning Issue/Combined Issue.pdf` is the candidate. |

## 5. Sensitive-content boundary

802 rows are marked `sensitive-decision`. Categories: leases and amendments (504), `tenant-compliance` (60, including ACH, guaranty and deposit notes), rent-roll and financial (52), insurance (23), POA rent memos and correspondence (38), and tenant unit-file photos (59). I did not open these beyond the two first-page glances in §4 (#8, #9), from which only the party names were recorded. No amounts, account numbers or contact details were copied into these outputs.

**Hard stops. Do not open, ingest or publish these without an explicit operator ruling:**
- `01 Belle Files to be placed/PASSWORDS.docx`
- `Belle Realty SOT Documents/BELLE/💡 BELLE BLVD [ Shared Drive ]/Lock Codes.xlsx`
- `01 Belle Files to be placed/New Lock Codes/*.jpg`
- `Contact List Belle.*`
- `Tennant Contact Info.*`
- `Tenant Contact Info .xlsx`
- `ACH Agreement.pdf` and the ACH forms under `tenant-compliance`
- `Belle Tax Folder 2019/` (bank statements, loan history, escrow, security deposits, SBA)
- `ac-archive-2026-08-29/{users,audit_log,rent_payments,ledger_entries,invoices,voice_intake,…}.json`
- `Cypress Command/Extractions 2026-09-12/*.manusaccount`

**Generic templates are not real data.** The `Forms/…/Personal Templates/Passwords` and `/Contact List` files are templates and are marked `unrelated`.

**Recommended rule:** keep lease, financial and insurance PDFs **out of git**. Register each one by hash from this manifest (the `sha256` column is the registration key). Copy into `reference/` only public-record or non-personal items: plats, easements, zoning, architect sets, HVAC and meter inventories. Those are the `ingest-copy` rows.

## 6. Suggested next steps (ranked)

1. **Hash-register Tier-1 sources.** Register the Tier-1 sources that the repo cites by name but does not hold: items 1–4, 13, 31 and 33. Hash the 143 MB lease package off-thread.
2. **Ingest public-record items into `reference/`.** Copy in the OSC easements, the Cross Easement, the Zoning Issue set, the Existing Parking / Greenspace sheets, the unit-pair plats, the 2009 survey and the Beacon report. Then close finding #13.
3. **Resolve the missing executed copies:** 143 Second Amendment, 149 Fifth Addendum, 145 counterpart and 121 lease.
4. **Clean up duplicates on Drive (operator action, outside this audit).** Retire `Kimi Uploads/` and `Previous Onboard Attempt/`, plus their ZIPs, because they duplicate `Belle Leases/`.
5. **Update CLAUDE.md.** The JD Bank servitude exhibit is now in `reference/instruments/jd-bank/`, so the "exhibit not yet pulled" line is stale. Drawing the servitude area is still open.
