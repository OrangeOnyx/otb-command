# Asset twin integration - September 27, 2026

This change merges `codex/otb-asset-twin` into the current OTB main branch, preserving the standalone site viewer and the A-1 register already on main.

## What is combined

- The integrated asset twin, source models, upper floors, fixtures, site context, permanent asset/evidence code, maintenance links and local launcher.
- The standalone site viewer under `tools/site-twin/viewer` and its existing `npm run site-twin` builder.
- Both handoff histories. Neither register is relabeled or automatically merged with the other.

The integrated model has 37 source column candidates. The A-1 register has 39 operator-numbered supports and explicit cross-links. Those identities remain distinct; a branch merge is not asset reconciliation. Existing local browser records and photos remain tied to their original origin. No browser data is migrated.

## Production boundary

The main branch automatically deploys to the existing hosted app. The integrated asset twin remains available in explicit local review, while hosted activation requires `VITE_ASSET_TWIN_ENABLED=1`. Leave it unset until the hosted rollout checklist in `asset-twin-release.md` is complete: both database migrations exercised in isolation, permissions and private photo access verified, and source publication reviewed. This flag is a rollout control, not an authorization mechanism.

The default production build excludes the twin view's imported source images/catalogs and `public/twin` files. This does not make files committed to the repository private. It prevents an unactivated feature from being published as the running website. Existing production features and the standalone site build remain intact.

No migrations are applied by this merge. Ordinary maintenance requests retain their existing schema payload when no asset linkage is supplied. Local review continues on `http://127.0.0.1:5174/?view=twin&layout=interior#spatial`.

## Source provenance

The site-context catalog has been regenerated against the latest main-branch `geometry.json`. All eight frame controls still match. Site-context and complete-model GLB bytes are unchanged. JSON source checksums now explicitly use UTF-8 with LF line endings (`hashEncoding: utf8-lf`), so Windows CRLF checkout conversion does not invalidate provenance; binary hashes remain byte exact.

## Validation

Validated September 27, 2026:

- Full automated suite: 915 tests passed, zero failures or skips.
- Default and enabled production builds passed. Disabled output contains no twin model directory, twin JavaScript chunks or clock photos; enabled output includes the model, twin chunks and 24 clock photos.
- Standalone site build and byte-identical rebuild check passed.
- Merged local viewer checked in the browser: ground-floor interiors, Unit 103 upper floor, exterior/site water layers and C12 permanent record with five saved research references. No browser console errors were reported during these checks.
- Read-only model review found no changes to native source identities or GLB geometry. No field verification, hosted database acceptance or browser-data migration is implied by these checks.
