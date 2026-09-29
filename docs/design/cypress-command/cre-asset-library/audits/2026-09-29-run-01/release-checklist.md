# Release checklist · OTB reference slice · run 2026-09-29-01

Status: **DRAFT. Not released, not approved.** Every record is `draft` or `unverified`, and every `release.state` is `candidate`.

## Package and record checks (passed and reproducible)

- [x] The package validator passes all 16 positive fixtures and rejects all 15 negative fixtures. Command: `schemas/validate_examples.py`.
- [x] The OTB slice passes: 55 records (6 sources, 46 entities, 3 assets) clear the schema, cross-record and **file-integrity (SHA-256)** checks. Command: `validate_examples.py --records <otb>/provenance --records <otb>/records --repo-root .`
- [x] The builder is deterministic. Running `node tools/cre-library/build-otb-slice.mjs` twice produces identical outputs.
- [x] Unit tests pass 7/7: `node --test test/cre-library-otb-slice.test.mjs`.
- [x] `node --check` passes on both builder modules.

## Source and geometry fidelity

- [x] Frontage closure: long building Σ bays = 522.31 ft = recorded length; short building = 208.65 ft. This checks closure only. It is not a survey tolerance.
- [x] Joins: 27/27 units resolve to suite records; 14/14 pylon panels resolve to suites.
- [ ] **Foot definition** (international vs US survey) is unconfirmed for the plat transcription and the CAD. This is immaterial at elevation scale (2 ppm), but it stays open for measurement-grade claims.
- [ ] **Parapet heights**: 22 of 27 units read 16.4 ft, which is also `extract-heights.py`'s fallback value. Resolving this needs a rerun of the script that flags annotated vs. defaulted values.
- [ ] **Height datum** (finished floor vs grade) for the CAD `BLD_HT` annotations is unstated.
- [ ] Derived bays (101, 103, 109, 111, 113, 131, 133, 139–145) are SF splits, not plat dimensions. The plat-footprint vs. lease-SF gaps are listed in `geometry-validation.csv`.
- [ ] 135A/135B: this slice assigns the field face of the 37.4 ft section to 135A, inferred from the mid-depth-split description. A field check is needed.
- [ ] Pylon: panel sizes are nominal operator-schedule values. No measured sign drawing exists, so the cabinet, header, posts and gaps are not drawn.

## Visual and interaction checks (run in the browser pane at 800 px width)

- [x] Light and dark themes both render. The reverse lockup sits on the Charcoal band only, and the primary lockup is ≥ 260 px wide.
- [x] Clicking a drawing, activating a list row, or pressing Enter/Space on a focused SVG group all select the same stable entity ID, and the evidence panel updates.
- [x] The operations overlay toggles independently of the geometry. Vacant (131, 133), owner-occupied (135B) and conflict (P13) states each show both text and a colour.
- [x] No horizontal page scroll at 789 px. Each elevation scrolls inside its own sheet at true scale (4 px/ft), and z is never stretched.
- [x] No console errors.
- [ ] Contrast has not been measured on the rendered overlay fills. Only the package's declared token pairs are covered by `tokens/contrast-report.json`.
- [ ] Not checked: narrow mobile (375 px), screen reader or print.

## Not done, by design (needs approval)

These actions need explicit approval first. See `change-plan.md`:

- Production viewer cutover
- Adding a sheet to `src/lib/pages.js`
- Database writes
- Deploy or push
- Rebrand edits
- Token remap into the app
