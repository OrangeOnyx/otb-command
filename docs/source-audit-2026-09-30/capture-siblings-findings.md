# Source audit: capture drive and sibling folders (2026-09-30)

Read-only audit. Nothing was moved, copied, renamed or deleted. The per-file record is `capture-siblings-manifest.csv` in this folder (3,520 rows covering **15,277 files, about 12 GB**).

## Method

- **Hashing.** Every file up to 200 MiB was streamed through SHA-256. The 16 larger files have a blank `sha256`: 9 DJI MOVs, 2 Postshot `.psht` files, `roofsplat.ply`, the 09-28 and 09-29 Polycam raw zips, the 333 MB 09-29 DXF, and `otb-command (7).zip`.
- **"In repo".** A file counts as in the repo only when its SHA-256 matches the repo hash index (1,282 tracked and 653 ignored files at HEAD `332e39d`). A file whose name matches but whose bytes differ is not counted.
- **`name_referenced_in_repo`.** A fixed-string `git grep` for the file's basename across tracked files. Names that are too common to mean anything are marked `generic-name`.
- **Folder-summary rows.** Some folders get one row instead of one row per file. These rows have `ext = (folder)`, and the `notes` column carries the file count.
  - **Image sequences** (more than 200 frames of one kind): OTB-3DGS-frames and the 11 daily cube-capture folders. These were still hashed, and the count found in the repo is given (0 in every case).
  - **Dependency and tooling trees**, which were not hashed: `node_modules`, `.git`, `validation-venv`, `__pycache__`, `heif-decoder`, `.cache` and `qr-library/package`.
- **Pipeline check.** Each repo tool's hard-coded input path was read to decide `consumed-by-pipeline`.

## Totals

| Root | Files | Size | consumed-by-pipeline | already-in-repo | ingest-copy | register-external | superseded / dup / unrelated | sensitive |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| E:/OTB-CAPTURE | 4,813 | 10.3 GB | 4,400 | 0 | 0 | 413 | 0 | 0 |
| Assets for digital twin | 1,689 | 0.34 GB | 37 | 581 | 36 | 114 | 921 | 0 |
| Claude outputs | 3 | 29 MB | 0 | 0 | 0 | 0 | 0 | 3 |
| otb-command-obsidian | 7,377 | 0.27 GB | 0 | 439 | 0 | 0 | 6,937 | 1 (`.env`) |
| Cypress_Command_CRE_Audit_2026-09-29_01 | 1,388 | 0.28 GB | 0 | 234 | 7 | 13 | 1,134 | 0 |
| Kit loose files | 7 | 0.77 GB | 0 | 2 | 0 | 2 | 3 | 0 |

## 1. E:/OTB-CAPTURE (4,813 files, 10.3 GB)

| Capture | Date | Coverage | Twin pipeline status |
|---|---|---|---|
| `Drone-Footage-RAW-2026-07/DJI_00{01,02,03,08,15,16,23,29,30}.MOV` | 2026-07-07 | DJI orbit video of the whole site | Nothing reads the MOVs directly. They are the source of `OTB-3DGS-frames` (243 frames + 121 clean + 26 culled), which fed COLMAP/Brush in `C:/Users/adam/tools3dgs/otb-work`. `build-twin-mesh.py` reads the DJI dense cloud from there, **outside both this drive and the repo**. |
| `OTB-splat-v1.ply` (97.6 MB) | 2026-07-08 | DJI Gaussian splat | **Consumed** by `build-twin-pack.py`, `convert-splat.mjs` and `fit-splat-align.mjs`. It becomes `public/OTB-splat.ksplat` (LFS) and the twin-pack splat. |
| `roofsplat.ply` (678 MB), `untitled.psht` (690 MB), `OTB POSTMATE FREE Version Save.psht` (361 MB) | 2026-07-08 / 07-12 | Postshot roof splat experiments | Not used. The name `roofsplat` is referenced in the repo, but no tool reads the file. |
| `OTB-mesh-photos-skydio/` (165 JPG) | 2025-10-15 flight | Skydio X10 RTK roof photos | **Consumed** by `skydio-rectify.py` (38 photos LiDAR-locked) and `ge-media.py`. |
| `OTB-roof-ortho-2025-10-15.png` (90 MB) + `.txt` | 2025-10-15 | Roof orthomosaic, GSD 3 cm, plane-projected from RTK poses (no SfM) | Named in the repo, but no current tool reads it. It is not in the repo. |
| `OTB-cube-capture/` (4,199 frames in 11 day folders, 08-04 → 08-24; 24 occupancy JSONL files; 2 logs) | 2026-07-21 → 08-24 | Security-camera frames per parking zone for C3 occupancy | **Consumed** by `c3-nightly.ps1`, `c3-stalls.py`, `c3-upload.mjs` and `cube-backfill.mjs`. The frames may show people and plates. |
| `OTB_Capture_2026-08-18/` | 2026-08-18 | Polycam LiDAR of the 149 Jason's Deli corner + 145/143 frontage | GLB/PLY/LAZ are **consumed** by `register-polycam.py`. Accepted (75%) and **in the twin pack**. The raw zip (893 keyframes) and the DXF are not used. |
| `OTB_Capture_2026-09-28/` | 2026-09-28 | 101 end cap + 103 frontage | Consumed, but it **failed acceptance** (49.7% of points within 0.3 m, against a 50% bar). It is not in the pack. |
| `OTB_Capture_2026-09-29/` | 2026-09-29, copied 09-30 16:56 | 101–107 storefronts, 41 × 69 m | Consumed and **accepted** (77.3%, 0.161 m median). It is behind A-1 REV 15, which put the 101/103 line at 83.0 ft and the 101 projection at 13.4 ft. The DXF (333 MB) duplicates the PLY. The raw zip holds 1,321 keyframes. |

Findings:

- **No asset IDs.** All three capture logs say "No permanent asset IDs assigned yet." None of the Polycam scans is tied to register asset IDs.
- **Stale twin-pack README.** `docs/twin-pack-README.md` still lists only the 08-18 Polycam scan in the pack. The 09-29 scan was accepted on 09-30 and would need a pack rebuild to appear.
- **C3 occupancy pipeline stalled since 2026-08-24.** `c3-nightly.log` records 29 "nightly run start" entries from 08-29 to 09-30 with no pull, classify, upload or "done" lines. The last successful upload was 08-24 12:00. The newest frame folder and newest occupancy file are both dated 08-24. The job also prunes frames older than 21 days, noting that they are "still recoverable from the archive".
- **Occupancy gap.** There are no JSONL files for 08-06 → 08-16.
- **Off-drive dependency.** The DJI dense cloud and COLMAP workspaces live in `C:/Users/adam/tools3dgs/`. That folder is not in this audit, not on E:, and not in the repo. It is a single point of failure for rebuilding the twin mesh.

## 2. Assets for digital twin (1,689 files)

This folder is a copy of the Codex workspace `C:/Users/adam/Documents/Codex/2026-09-23/ca/`.

### `ca/work/otb-asset-twin/` (about 1,300 files)

- It is a copy of the git worktree for branch `codex/otb-asset-twin` @ `35a871a`, dated 2026-09-26.
- That branch is **fully merged into master**, and master is 63 commits ahead.
- The copy shows 37 uncommitted changes, most of them deletions of research files that master still has.
- 581 files are byte-identical to repo files. The rest are superseded.

### `ca/work/infrastructure-intake/` (operator-supplied originals, the most important content here)

Two repo tools read this folder by default from `../infrastructure-intake`. That path resolves **outside the repo**, to the Codex workspace:

- `tools/extract-twin-infrastructure.py`
- `tools/build-twin-upper-floors.mjs` (hash-pinned)

**Not in the repo:**

- **Floor plans for 19 suites:** `Floor Plans/105 … 149` (21 images, 2021–2022). The repo only has the harvested metadata (`docs/harvest/ac-archive-2026-08-29/floor_plans.json`, pointing to `/manus-storage/…`).
- **The 103 architectural and electrical set, 14 Jun 1993 (job 93-003):** A1.1, A2.1, A2.2, A7.1, A7.2, E1–E4.
  - A2.3 and A5.1 are consumed by the upper-floors build, but the original bytes are not in the repo either.
- **101/103 second-floor documents:**
  - `101 103/SECOND FLOOR DEMOLITION PLAN.pdf` (2021)
  - `JOHN S. ELLIS1.pdf` (2023)
  - `project.pdf` (consumed, not in the repo)
- **Other drawings:** `103/Scanned Documents.pdf` and `07 Columns, Benches, and Cans.pdf` (2025-07-18).
- **Time-clock photos and the water-meter workbook:**
  - 24 time-clock HEIC originals (Nov 2021). The repo has only JPG previews in `src/assets/twin/infrastructure/`.
  - `Water Meter Number Reference.xlsx` (2021). Its data is extracted into `twin-infrastructure.json`, but the workbook itself is not in the repo.

**Already in the repo by hash:** the 101/103 first- and second-floor plans (`src/assets/twin/plans/`), the water-shutoff map and the three LUS GIS images.

### `ca/outputs/`

- **Already in the repo under new names.** The water evidence and water map were integrated as `docs/twin-water-*.md` and `src/data/twin-water-map.json`.
- **Codex build outputs, now superseded.** The Floorplanner model, column twin, fixture models and asset-twin release packages are replaced by `public/twin/*` and `reference/floorplanner/*`.
- **Not in the repo:**
  - `OTB_Floorplanner_Review.md`. It records live Floorplanner project 109978485 (that ID is already in the repo) and cites an original `.fml` under `C:/Users/adam/Codex Projects/OTB_Master_Source_Package/`. **That source package appears nowhere in the repo and was outside every audited root.**
  - `OTB_Google_Earth_2026-09-25/Source-Gaps.md`. It sets field-collection priorities: corners for both wings, the order for walking the water locations, the Johnston striping count, and Lot 7 ground photos.
  - The Google Earth KML/GeoJSON. These can be regenerated with `tools/export-google-earth.mjs`, and the Google screenshots are internal-only.

### Other folders

- **`marketing-reference/`** has 46 images extracted from a marketing PDF. None of them is in the repo.
- **`referenced-chatgpt-conversation*`** holds two exports of a ChatGPT "3D Building Prompt" conversation about the 3D plat workflow. Neither is in the repo. They are useful as history only.
- **`heif-decoder/`, `qr-library/` and the build/test logs** are tooling. They are unrelated to the property.

## 3. Claude outputs (3 PDFs, marked sensitive-decision)

- `OTB_Rezoning_Exposure_Brief_2026-09-24.pdf`: 126 pages, confidential brief to ownership with Exhibits A–K.
- `OTB_Rezoning_Brief_Transmittal_Becker-Hebert_2026-09-29.pdf` and `OTB_Cover_Letter_Becker-Hebert_2026-09-29.pdf`: marked attorney–client privileged.

The repo has no rezoning material at all. The only mentions are "Lot 7 rezoning" as an example matter in `docs/platform-consolidation-decision-2026-08-25.md` and in HANDOFF, plus Becker & Hebert as a vendor. The operator should decide whether a non-privileged fact summary belongs in `docs/` while the PDFs stay in Drive only. The facts missing from the repo are:

- **2022 proposal.** LCG's 2022 "100 Block Leonie" administrative rezoning named **Lot 7 (110 Marie Antoinette St) for CH → MN-1**. It was never adopted. The program behind it is still active, and the Johnston–Louisiana corridor code review is the likely vehicle for a revival.
- **Parking arithmetic.** Lot 7's 32 stalls appear to be counted in the variance's "324 provided". Without them the center is **52 short against the 20** the variance covers.
- **MN zoning effect.** MN does not permit a stand-alone parking facility, so Lot 7 would depend on the contiguous-parking rule, § 89-39(d)(2).
- **Rent exposure.** About **41% of rent** sits in uses that MN-1 restricts.
- **Recommended action.** The brief recommends putting Lot 7's role on the public record now.

## 4. otb-command-obsidian (7,377 files)

- **What it is.** It is not a separate notes vault. It is a **full clone of the repo as of 2026-08-01** (196 commits, remote `OrangeOnyx/otb-command-obsidian`, a separate private GitHub repo).
  - Its hashes predate a history rewrite: its HEAD `44e1ad0` is the same commit as repo `267cfb0`.
  - It also holds graphify output opened as an Obsidian vault: 609 notes in `docs/graph/graphify-out/obsidian/`, plus a 46-page `wiki/`.
- **File matches.**
  - 439 files are byte-identical to the current repo. 992 are older versions of repo files.
  - The remaining 5,932 are `node_modules/`, `.git/` and caches.
  - Every non-generated vault path still exists in the repo working tree.
- **Notes check.** The notes are graphify extractions from repo docs. I checked all 95 source files they cite, and every one is still tracked. I also spot-checked the concept notes (Butcher HVAC, the 99-11797 variance, Arnold Heights, JD Bank expiry 12/30/2034, the 175-ft liquor waiver, the retracted thermal anomaly, the 2026-07-08 security audit, the 3DGS pipeline, split-seed and ElevenLabs), and all are in the current repo docs.
- **HANDOFF and CLAUDE check.** Line by line, 11 of 839 vault HANDOFF lines and 12 of 114 vault CLAUDE.md lines are absent. All of them are superseded July status: 12 sheets, `property_state`, "brand sheet pending", "no holdovers per the July SOT", and the old remote.
- **Facts missing from the repo: none.** The only vault-unique items are the old remote name `otb-command-obsidian` and `docs/graph/graphify-out/wiki/`. The wiki is regenerable, and the repo copy of graphify output has no `wiki/`.
- **`.env`.** The vault's `.env` is a secrets file, marked sensitive-decision. Its contents were not read into this report.

## 5. Cypress_Command_CRE_Audit_2026-09-29_01 (1,388 files)

- **Already in the repo, or throwaway.** 234 files match the repo byte for byte (`build-*/` brand, fonts, logos, manual images). The `build-disabled/` and `build-enabled/` Vite outputs are regenerable. `validation-venv/` (1,084 files) is tooling.
- **Differs from the repo copy.** The repo holds a different version of the report set at `docs/design/cypress-command/cre-asset-library/audits/2026-09-29-run-01/`: `audit-report.md`, `change-plan.md`, `source-register.csv`, `geometry-validation.csv` and others. Diff them before relying on either.
  - **Wrong path in HANDOFF.md.** It says the audit is at `audits/2026-09-29-run-01/`, but it lives under `docs/design/cypress-command/cre-asset-library/audits/2026-09-29-run-01/`.
- **Finish-pass files not in the repo (ingest-copy):**
  - `coordinate-systems-reconciliation.md`. It finds that Frame A (plat/site-twin metres) and Frame D (EPSG:6344 LiDAR/Polycam) have **no verified bridge matrix**.
  - `schema-alias-map.csv` (59 reversible ID aliases).
  - `stale-brand-review.md`.
  - `SUMMARY.md`, with six items that need operator approval.
  - `FINISH_MANIFEST.json`.
  - `patches/a5-dark-mode-panel.{md,diff}`: the A-5 site-twin dark-mode fix. It is **still not applied**; `tools/site-twin/viewer/` has no theme sync.
- **Bulk evidence.** Files such as `evidence/archive-members.csv` (6 MB) are best registered externally.

## 6. Loose files in `otb-command-claude-code-kit/`

| File | Verdict |
|---|---|
| `otb-command.zip` (32 MB) | Repo snapshot. Its newest member is 2026-06-27, so it is **older than HEAD**. It contains `.env` and `.git`. Every untracked member still exists in the repo working tree. Superseded. |
| `otb-command.7z` (161 MB) | Snapshot with 8,861 members, the newest dated Aug 25. Older than HEAD; contains `.env`. Superseded. |
| `otb-command (7).zip` (564 MB) | Snapshot with 30,486 members including `node_modules`, the newest dated 2026-09-22 06:41. **Older than HEAD** (09-30). It contains `.env` and `.claude/settings.local.json`. All 11 untracked non-generated members still exist in the working tree. Superseded. |
| `Cypress_Command_CRE_Asset_Library_v1.0.0.zip` | 103 of 105 members are tracked at identical paths under `docs/design/cypress-command/cre-asset-library/`. The 2 missing are `.gitkeep` files. |
| `Cypress_Command_CRE_Master_Implementation_Prompt.md` | Already in the repo, under `…/cre-asset-library/prompts/`. |
| `ChatGPT Image Sep 29, 2026, 03_10_33 AM.png` | AI concept board for the asset library. It is not in the repo. Styling reference only; per the audit's own rule, never take geometry from it. |
| `.cypress-backup-path` | Points to `C:/Users/adam/Backups/OTB/20260908-135228`, which is outside this audit. |

The extracted `Cypress_Command_CRE_Asset_Library_v1.0.0/` folder was not in scope. Its zip already matches the repo.

## Git ingestion limits

GitHub rejects files over 100 MB. `deploy.yml` checks out LFS on every deploy, so every LFS asset adds download to every production build.

| Group | Files | Bytes | Verdict |
|---|---:|---:|---|
| DJI MOVs | 9 | 0.33–1.05 GB each (4.97 GB) | Impossible in git. Keep external. |
| Postshot `.psht` + `roofsplat.ply` | 3 | 361 / 690 / 678 MB | Over 100 MB each. Keep external. |
| Polycam raw zips | 3 | 205 / 245 / 443 MB | Over 100 MB each. Keep external. |
| `9_29_2026.dxf` | 1 | 333 MB | Over 100 MB. It duplicates the PLY. Keep external. |
| Polycam GLB/PLY/LAZ | 9 | 10–89 MB each | Under the limit but heavy for LFS-on-deploy. Register externally; the tools already read them from E:. |
| `OTB-roof-ortho-2025-10-15.png` | 1 | 90 MB | Just under the limit. External, or a downsampled derivative in the repo. |
| Cube-capture frames | 4,199 | ~557 MB | Keep external (and private). |
| OTB-3DGS frames (all three folders) | 390 | ~0.3 GB | Keep external. |
| Intake originals (floor plans, 1993 set, HEICs, xlsx, PDFs) | 71 | ~61 MB total, none over 3 MB | **Small enough for plain git** under `reference/`. |

## Source locations found outside the audited roots (not inventoried)

- `C:/Users/adam/Documents/Codex/2026-09-23/ca/`: the live Codex workspace, including the worktrees `otb-asset-twin`, `otb-cces-reconciliation` and `otb-twin-integration`. The tools' default `../infrastructure-intake` path points here.
- `C:/Users/adam/Codex Projects/OTB_Master_Source_Package/00 OTB/Belle Realty SOT Documents/`: the original Floorplanner `.fml` and plats/site-plan files.
- `C:/Users/adam/tools3dgs/`: the DJI dense cloud and COLMAP workspaces used by `build-twin-mesh.py`.
- `C:/Users/adam/Backups/OTB/`.
