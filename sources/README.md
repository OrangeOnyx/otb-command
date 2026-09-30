# Operator sources (ingested 2026-09-30)

This folder holds the operator's original documents, copied into the repo so they can't be forgotten again (operator decision, 2026-09-30).

## What's in it

**2,072 files, 1.6 GB**, drawn from the Tier 1 ingest list and the leases:

- **Tier 1:** plats and surveys, CAD, recorded instruments, floor plans, permits and zoning, HVAC and meter sources, SOT workbooks, signage and brand art, marketing, insurance, and tax records.
- **Leases:** every executed lease, amendment and lease package found anywhere. These are grouped in `leases/`.

## How the files were chosen and copied

- **Deduplicated by SHA-256 across all roots.** Where copies overlapped, the Google Drive copy was preferred.
- **Excluded:**
  - credential files
  - files for The Boulevard Shopping Center at 100–128 Arnould (a different property)
  - anything already in the repo
- **Verified after copying:** every file was re-hashed.

## Finding a file

- **`INDEX.csv`** has one row per file. It gives:
  - the repo path
  - the SHA-256
  - category and relevance
  - what the file governs
  - its original location and other copies
  - which audit manifest it came from
- **File names** are `<first 8 hex of sha256>__<original name>`.
- **Full provenance** for every file is in `docs/source-audit-2026-09-30/`.

## Not included

Two files are over GitHub's 100 MB limit, so they stay on Drive. They are registered in `INDEX.csv` as external:

- `OTB_Master_Lease_Package_2026-08-01.pdf`
- `Belle Leases.zip`

Drone footage, raw scans and video (about 23 GB) stay on `E:\OTB-CAPTURE`, with a Drive mirror. They are registered in the audit manifests.

## Privacy

- This folder is **never uploaded to Vercel** (`.vercelignore`) and never served by the app.
- Leases may contain personal details of tenants and guarantors. Treat the whole folder as confidential.
- Several leases have confidentiality clauses; for example, §6 of the Clothing Loft addendum. Do not quote their business terms in anything tenant- or public-facing.
- Files are byte-exact (`.gitattributes` has `sources/** -text`), so the hashes in `INDEX.csv` stay valid.

## Tier-1 authority

Tier-1 authority rules in CLAUDE.md are unchanged. Documents here are **evidence**. The app's data files (`src/data/*`) stay the operating record until a document is reviewed and adopted, as was done with the Clothing Loft extension on 2026-09-30.
