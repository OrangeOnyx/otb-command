# OTB site-context release - 2026-09-25

## Delivered

The existing asset twin now loads an additive parking/common-area model in the native building coordinate frame. There are 51 visual zones and 41 managed common-area records. Parking, grass/planting, sidewalks, service areas, street context and off-parcel context can be toggled separately. Streets, shoulders, the excluded bank corner and the unclassified base do not seed property asset records.

Select Site overview, select an area in the model or Common areas register, then open its photos, references, inspection history or linked maintenance. Area identity uses a permanent asset UUID bound to a stable site-area source key. Existing column, fixture, meter and suite IDs are unchanged. The record can be renamed without changing its identity or attached evidence.

W1217102's record can highlight eight Arnould planting zones as a broad search guide. The workbook only says Grass near Blvd. No exact meter position or cluster membership is created. Individual utility placement can use a visible site surface and remains operator-placed/unverified.

The complete-model.glb includes base buildings, both upper floors, walkway fixtures and site surfaces, preserving source geometry bytes, transforms, materials and extras. Separate GLB and JSON downloads remain available. Flat surface elevations are presentation offsets, not measured terrain. Drawing registration residuals do not establish survey accuracy.

Sources now include the dated five-sheet 1993 architectural review and the field capture checklist. Original plans are evidence, not execution instructions or a current-condition inventory.

## Validation

- 886 automated tests: 885 passed in the restricted environment. The remaining Vite configuration test was blocked by a parent-directory read restriction; its entire 10-test file passed with normal filesystem access.
- Production build passed using Vite's runner config loader. Existing large-bundle warnings remain.
- Live browser: site overview; area selection and focus; permanent area record with four saved source references surviving reload; sprinkler search with no meter point; water map counts; Unit 103 upper-floor isolation; presentation view; current downloads; no browser console errors.
- Capture HTML was visually checked in the browser. Built-in browser PDF export is unavailable; HTML provides a print control and an editable Markdown counterpart.
- Export checks preserve every source primitive, material, transform, identity and binary range and reach all 51 site zones. Seed checks confirm 41 unique managed records and exclude context-only/unclassified surfaces.

## Run and storage

Use the existing Node dependencies and npm run dev:review. In a restricted environment that prevents the default config bundler from reading parent directories, start Vite with VITE_LOCAL_REVIEW=1, --configLoader runner, --host 127.0.0.1, --port 5174 and --strictPort.

No additional dependencies, Google API key or environment variables are required. Local review records and photos remain in this browser/origin; the geometry handoff package is not a register/photo backup. Hosted integration still requires its existing backend/schema setup. No production deployment or live database write was performed.

## Field work remaining

Confirm actual grass/curb boundaries, pavement and grade, meter serials and individual shutoff connections, the 24-versus-28 meter inventory discrepancy, the 39-versus-37 column discrepancy, and upper-floor heights/stairs. New scan observations should append to permanent records; geometry improvements must preserve their IDs. Capture-device/app specifics and native project export compatibility remain to be checked with the actual files.
