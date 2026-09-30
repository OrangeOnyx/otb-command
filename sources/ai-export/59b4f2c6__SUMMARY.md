# Cypress Command CRE Asset Library audit — finish package summary

**Finish pass:** 2026-09-29 ~04:55–05:00 America/Chicago (CT, UTC-5)  
**Repo:** `otb-command` @ `ace81d8087a51764f63ec6e0707918507a770212` (master)  
**Audit folder (Belle):** `C:\Users\adam\Projects\otb-command-claude-code-kit\Cypress_Command_CRE_Audit_2026-09-29_01\`  
**Production mutations:** none (git tracked tree clean at finish check)

## Success criteria

| Criterion | Result |
| --- | --- |
| Inventory script ran | YES — `python scripts/assemble_inventory.py` OK; 4595 files, 276 dup groups, 2245 literal edges |
| Master-prompt deliverables present | YES — report-contract set completed/refined in audit folder |
| No production mutations | YES |
| A-5 patch proposal | YES — under `patches/` (not applied) |
| Box copy | YES — this folder `/workspace/cypress-cre-audit-finish/` |

## Key findings

1. **Coordinate frame mismatch (critical):** Frame A = A-1 plat/site-twin metres via `geometry.json` + `tools/site-twin/coords.mjs`. Frame D = LiDAR/Polycam `EPSG:6344` local origin `E591000 N3341600` + NAVD88 (`tools/register-polycam.py`). **No verified bridge matrix in-repo** — do not silently merge.
2. **IDs:** Production suite keys `101`…`149` and property UUID/slug must stay; use reversible aliases in `schema-alias-map.csv` (59 rows).
3. **A-5 dark mode:** Embedded site-twin iframe hardcodes light `:root` tokens and never syncs `otb-theme` / `dataset.theme`. Host chrome OK; aside/provenance panel stays light.
4. **Duplicates:** 276 exact-byte groups; refined dispositions favor retain delivery mirrors; no deletes.
5. **Brand:** 3433 occurrence rows; Cypress Command forward for this package; preserve Orange Ocean legal/historical; scoped `.cc-cre` only until approved cutover.
6. **Master board:** styling only — never invent SF/tenants/geometry from it.

## Needs Adam approval

1. Apply A-5 dark-mode patch to `tools/site-twin/viewer/{styles.css,viewer.js}` + `src/main.js` theme postMessage, then rebuild site-twin.
2. Default export masthead → Cypress (keep OO legal footer).
3. Any exact-duplicate deletion/archive.
4. Global CRE token cutover of `src/styles.css`.
5. Enable any Frame A↔D bridge after verified matrix+RMS.
6. Deploys / live DB / Drive or drone broad intake.

## Key file list (audit folder)

### Inventory / evidence (Codex + re-validated)
- `scripts/assemble_inventory.py`
- `asset-inventory.csv`, `scope-ledger.csv`, `exact-duplicates.csv`
- `evidence/archive-members.csv`, `evidence/external-local-inventory.csv`
- `evidence/literal-dependency-edges.csv`, `evidence/coverage-summary.json`
- `brand-reference-audit.csv`, `evidence/brand-findings.md`, `evidence/brand-conflicts.csv`
- `schema-mapping.csv`

### Finish-pass new / refined
- `dependency-map.csv` (22 semantic rows)
- `coordinate-systems-reconciliation.md`
- `schema-alias-map.csv`
- `stale-brand-review.md`
- `duplicate-conflict-register.csv` (276 + 2 semantic)
- `source-register.csv`, `geometry-validation.csv`, `migration-map.csv`
- `target-architecture.md`, `change-plan.md`, `release-checklist.md`
- `AUDIT_REPORT.md` / `audit-report.md`
- `patches/a5-dark-mode-panel.md`, `patches/a5-dark-mode-panel.diff`
- `FINISH_MANIFEST.json`, `scripts/finish_complete.py`

### Copied onto box here
- `AUDIT_REPORT.md`, `FINISH_MANIFEST.json`, `dependency-map.csv`
- `coordinate-systems-reconciliation.md`, `schema-alias-map.csv`, `stale-brand-review.md`
- `migration-map.csv`, `change-plan.md`
- `patches/a5-dark-mode-panel.md`, `patches/a5-dark-mode-panel.diff`
- `SUMMARY.md` (this file)

## A-5 patch proposal location

- Belle: `...\Cypress_Command_CRE_Audit_2026-09-29_01\patches\a5-dark-mode-panel.md` (+ `.diff`)
- Box: `/workspace/cypress-cre-audit-finish/patches/a5-dark-mode-panel.md`
