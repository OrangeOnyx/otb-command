# OTB source index: every file the operator has provided (audit 2026-09-30)

**Read this before you say a source is missing, not pulled, or pending.** The manifests in this folder list every file in every place the operator keeps OTB material. Each row records its hash, category, relevance, whether the repo already holds it, and a recommended action.

## Coverage

The audit was read-only: sources were not moved, changed or extracted. Credential-type filenames are redacted in the manifests.

| Root | Files | Size | Manifest | Findings |
|---|---:|---:|---|---|
| `G:\My Drive\00 OTB` (Google Drive) | 6,681 | 6.7 GB | `gdrive-manifest.csv` | `gdrive-findings.md` |
| `D:\2026-09 C-Drive Offload\` (2 rescue archives) | 8,372 | 10.4 GB | `d-archive-manifest.csv` | `d-archive-findings.md` |
| `E:\OTB-CAPTURE` + kit siblings (Assets for digital twin, Claude outputs, obsidian copy, CRE audit, old zips) | 15,277 | ~12 GB | `capture-siblings-manifest.csv` | `capture-siblings-findings.md` |
| `C:\Users\adam\Downloads` (OTB-relevant + boundaries) | 1,605 OTB | — | `downloads-manifest.csv` | `downloads-and-references-findings.md` |
| `Codex Projects\OTB_Master_Source_Package` + `Documents\Codex\*` | 23,386 | ~13 GB | `codex-manifest.csv` | `codex-findings.md` |
| Every external locator cited by repo docs | 188 | — | `referenced-sources-ledger.csv` | (in downloads findings) |

**Total: 43,841 manifest rows.** Recommended actions are listed below. The unique counts are deduplicated by SHA-256 across all roots.

| Action | Unique files | Size | Meaning |
|---|---:|---:|---|
| ingest-copy | 1,392 | 0.9 GB (none > 50 MB) | Authoritative documents and data that belong in git |
| sensitive-decision | 2,430 | 2.6 GB | Leases, amendments, financials, insurance, site photos, credentials. **Operator decides.** |
| register-external | 6,253 | 23 GB | Drone footage, raw scans, video. Stays out of git; hash-registered here |
| already-in-repo | 2,299 rows | — | Byte-identical to a repo file |
| duplicate-within-sources / superseded / unrelated | 30,669 rows | — | Accounted for; no action |

Before this audit, only the plats, the JD Bank set and the pylon master were original evidence in the repo. Almost everything else the repo "knew" came from transcriptions.

## "Forgot we have it": sources the repo called missing or pending that exist

1. **JD Bank servitude and exhibits.** Filed today in `reference/instruments/jd-bank/`. The **2020 JD Bank agreement** is the current instrument; the repo only ever cited the 2004 Whitney one.
2. **Ground count of the parking row.** The 9/29 Polycam scan shows the unlabeled CAD Johnston row striped, which makes 324. See `docs/parking-reconciliation-memo.md`.
3. **Pylon.** The operator-approved 14-panel master is in `reference/pylon/otb-pylon-final-v2/`. The 1999 "PA1.01" drawing was never found.
4. **Missing deposits 107/137/143/149.** Executed leases, two deposit spreadsheets and deposit notes are all on Drive.
5. **Tier-1 files CLAUDE.md names but the repo never held:**
   - `00_OTB_Master_SOT.docx`
   - `OTB-Master-Template-Set-SOT-corrected.xlsx`
   - `Rev Belle Realty Arnould Blvd Property.xlsx` (meters)
   - `HVAC Info Tenant July 2021.pdf`
   - `04 BUTCHER RED AGREEMENT.pdf`
   - `OTB_Master_Lease_Package_2026-08-01.pdf` (143 MB)
6. **`OTB_UPDATED_SOT_August2026.xlsx`** on Drive. No repo file mentions it.
7. **Our Savior's Church.** The executed easement, plus a second executed parking agreement ("OSC Midtown") the repo never mentions.
8. **Title and property records:**
   - Title commitment and policy
   - 2007 cross-easement agreement (likely Entry 03-060864)
   - `Zoning Issue/` folder, the likely source of variance 99-11797
   - `EXISTING PARKING SPACES.pdf` and `Greenspace.pdf`
   - 2009 plat of survey
   - Plats for 135A/B, 139/141 and 143/145
   - Architect A/E/M/P/S drawing set
   - 1993 and 2007 plan sets
   - Assessor report for parcel 6026788
   - 2019 and older appraisals
9. **Lease evidence:**
   - 20 executed leases on Drive
   - OCR corpus of 18 executed leases with per-suite extractions (`otb-command-consolidation`)
   - 2026-09-27 executed-lease audit and Jumpstart register
   - Master Lease v2.2 and Leasing System Package V3.1
10. **Rezoning** (in `Claude outputs` and Downloads).
    - **What the briefs say:** the city's 2022 "100 Block Leonie" rezoning named Lot 7 for CH → MN-1 and was never adopted. Without Lot 7 the center is 52 spaces short, against the 20 the variance covers.
    - **Letters to Becker & Hebert:** marked privileged.
    - **Repo status:** no rezoning facts at all.
11. **Other:**
    - Breaker-labeling workbooks
    - 145 sign permit text
    - 2023 traffic-light study
    - Tenancy history notes (34 past tenants)
    - Drone footage and 2020 photos inside `The Boulevard.zip` and `Dropbox.zip`, not archived to E:
    - The DJI dense cloud for the mesh rebuild, which lives only in `C:\Users\adam\tools3dgs`

Still not found anywhere: the variance 99-11797 document itself (look in `Zoning Issue/`), the Guidry Beazley PA1.01 pylon drawing, and an executed 121 Magnolia lease (only a draft).

## Contradictions surfaced (operator review; amounts withheld)

- **115/117 Clothing Loft:** `units.json` ends the lease **today, 2026-09-30**.
  - Downloads holds a fully executed extension addendum.
  - The Codex audit could not locate an extension to 2029.
- **Term ends differ between signed PDFs and `units.json`:**
  - 107: signed 2027-09-30 vs 2027-03-31 in `units.json`
  - 123: signed term end differs
  - 125/127: differs; only a lessor-signed copy exists
  - 137: signed term end differs
- **149 Jason's Fifth Addendum:** the signed total differs from the operating rent, and the signature dates are inconsistent.
- **Signatures:**
  - 113: the lessee signature is blank on the local copy.
  - 145: only a lessor-signed copy exists locally.
- **Renewals marked "pending":** addenda for 119.5 Cat Clinic and 117.5 Victoria Nails exist; signature status still needs checking.
- **Stale data:** the July dossier and LLM exports still list five holdovers; CLAUDE.md says none.
- **Another property:** 144 files belong to **The Boulevard Shopping Center, 100–128 Arnould** (tax parcels 6028633, 6053097). That is a different property. **Never merge them into OTB.**
- **Credential files found:** lock codes, a Google passwords export, backup codes, and a password-named text file. Names are redacted here; the operator should secure or destroy them.

## Where ingested material goes

1. **Tier 1 (ingest-copy):** goes to `sources/<category>/`, in plain git (no file is over 50 MB). The folder is excluded from Vercel uploads, and each file gets a provenance row back to its manifest entry.
2. **Tier 2 (sensitive-decision):** stays out until the operator rules per category. The repo is private, and `sources/` is never deployed.
3. **Tier 3 (register-external):** stays on E: with a Drive mirror. The manifests are its register. Git can't carry it: GitHub's 100 MB file limit, 23 GB total, and every deploy checks out the repo.
