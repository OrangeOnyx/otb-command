# OTB asset twin — release handoff

Date: September 24, 2026. Branch: `codex/otb-asset-twin`.

September 25 addition: asset records now hold saved source links, dated reference views and append-only verification notes. Select an asset, then **References**. Catalog attachment, persistence boundaries and current validation are documented in [Permanent asset research evidence](asset-twin-research-evidence.md). This remains a local review release.

This release adds an asset workspace to the existing OTB Command app. The current acceptance target is **local browser review**. Hosted persistence, permissions and storage migrations are prepared in code but have **not been applied or runtime-tested against Supabase**. Integrated browser acceptance passed for the local workflow. Hosted rollout still requires the checks below.

Work is isolated in `C:\Users\adam\Documents\Codex\2026-09-23\ca\work\otb-asset-twin`. The canonical checkout at `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command` remains untouched by this feature work.

## Delivered in the branch

- **Integrated workspace:** open the existing property workspace and choose **Open asset twin**. Inspect, Present and Field modes share the same model and asset register.
- **Model navigation:** overview, orthographic plan, eye-level navigation, model fitting, column selection, guided walkway stops, saved views, layer controls, wall fading and a section-height control. Two surface picks report a model distance; they do not establish a field measurement.
- **Permanent asset records:** generated `pa_<UUIDv4>` identities survive label changes and source-model revisions. Separate source bindings retain geometry references. The register supports unit and column records plus manually added or existing inventory items, with material, dimensions, notes and an explicit verification field.
- **Recorded evidence:** dated inspections, condition, observer notes and photos attach to the permanent asset. Condition colors reflect recorded inspections. Source candidates begin uninspected and unverified; geometry does not generate a condition finding.
- **Honest placement:** unlocated suites/equipment remain selectable in the register. An operator may place a pin on an actual model surface; the placement is labeled operator-placed and unverified. Existing 2D plan coordinates are not silently treated as 3D coordinates.
- **Existing maintenance workflow:** an issue can link the asset and model location to the existing M-1 request/event/photo system. Real suite or `common-area` context remains separate from the asset label. Linked requests open in `#maint`; assignment, notes and status changes use the existing append-only workflow.
- **Asset links and QR tags:** links identify the permanent record, not its current display label. SVG tags can be downloaded. Local loopback links are review artifacts; field tags require a deployed application, the same persisted record and authorized property access.
- **Exterior reference:** a selectable finish palette and the supplied brochure photographs support visual comparison while retaining the available source geometry.

## Source and geometry boundaries

The packaged GLB and metadata derive from the supplied `On_The_Boulevard.native.fml`, Floorplanner project `109978485`, ground-floor design `241952337`. The source hash and conversion report are retained in `public/twin/model-report.json`.

The model contains **37 column candidates** classified from repeated source wall geometry. The unit register contains **27 roster units**. These numbers are different kinds of records: 37 is not a verified physical support count, and the 27 units are not automatically reconciled to measured model polygons. Additional existing inventory or operator-created assets can increase the register count. Unlocated unit and equipment records receive no guessed spatial position.

The native source coordinates are centimeters. Conversion divides by 100 to produce meters, with Y up and a documented local origin. That conversion preserves source scale; it does not verify the source dimensions. Wall and candidate-column heights share the source value of approximately 3.8862 m and remain unverified. Model geometry is not a survey, structural assessment, as-built record, tenant-area reconciliation or georeferenced site plan.

**C25 remains ambiguous.** Its repeated square loop shares an edge with a larger narrow walkway feature and is about 1.12 m from C26. It remains a model-derived candidate pending source/photo or field review. Do not describe C25 and C26 as two physically verified supports.

The elevated source surface is interpreted as a canopy from its elevation and matching walkway footprint. Available roof/canopy geometry is limited: the finish treatment does not create a verified roof pitch, fascia profile, storefront framing, sign geometry or missing exterior detail. Source door openings and simple glazing proxies are retained; catalog furnishings, fittings and detailed texture assets are not reconstructed. The base `model.glb` remains unchanged. The registered native second-floor design is now additive in `upper-floors.glb`, and `complete-model.glb` combines both. The alternative ground-floor design remains only in the native export.

### Brochure reference

The user-supplied marketing brochure provides storefront/material reference on **page 2**, site/exterior context on **page 4**, and nighttime lighting reference on **page 6**. Adam generally confirmed the supplied reference as current on **September 24, 2026**. This supports the visual finish interpretation; it is not confirmation of every photographed condition or dimension.

Photographed signs and labels are **not tenant-status authority**. They do not update the unit roster, occupancy, lease records or current business status. The finish palette is a visual interpretation, not a verified material specification. Existing operational records retain their own source authority.

## Run locally

This review worktree already links to the canonical checkout's installed dependencies through a node_modules junction. Run the review command directly here; avoid reinstalling through that shared junction. For a fresh independent checkout, run npm ci using the unchanged lockfile first. No new local environment variables, backend credentials or additional service are required.

```powershell
cd C:\Users\adam\Documents\Codex\2026-09-23\ca\work\otb-asset-twin
npm run dev:review
```

Open the loopback address printed by Vite, normally `http://127.0.0.1:5174`, then the property workspace and **Open asset twin**. The existing review runner sets its development flag internally; do not add that flag to production configuration.

Review records persist in this browser/origin using localStorage; photos use IndexedDB. Reloading the same origin retains the review copy. Another browser or port has separate data, and clearing site data removes it. Assigning a vendor or changing a request status in this mode records a local review event; it does not dispatch a vendor or write to production. There is no automatic browser-to-hosted sync or migration of local records. Saved views are browser preferences, not a shared operational record.

For standard verification:

```powershell
npm test
npm run build
```

If a restricted Windows sandbox blocks esbuild's parent-directory access while bundling the Vite config, use `npm run build -- --configLoader runner`. That alternative uses the same production configuration. Existing JSON import-attribute and bundle-size warnings remain separate from test failures.

## Hosted rollout sequence — not performed

Hosted mode uses the app's existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configuration and existing authentication/property context. No service-role credential belongs in the browser. The local-review flag is not a hosted authorization mechanism.

1. Apply and exercise the two prepared migrations in an isolated Supabase environment, in order: `20260924120000_physical_assets.sql`, then `20260924121000_maintenance_asset_links.sql`. The second depends on the first. Do not treat their presence in the repository as a completed deployment.
2. Verify authenticated operator writes, owner read-only access, cross-property denial, stable identities, concurrent source registration, append-only inspection/binding history and private asset-photo access. Verify maintenance tenant access remains confined to the actual suite, common-area/asset-linked creation is operator-only, assigned vendors retain their existing workflow, and unrelated users cannot read request photos. Exercise failures and confirm that hosted errors do not silently fall back to a browser database.
3. After the isolated checks pass, perform the controlled migration rollout to the target hosted database in the same order, verify the target role/storage checks, build and deploy this branch through the existing application deployment process. The older maintenance-photo policies still use the repository's single-property bridge; this release does not claim that bridge was redesigned for multi-property storage.
4. Sign in as an authorized operator, open OTB and explicitly save the first source candidate as a hosted physical asset before relying on it for inspection evidence, linked work orders or a printed tag. Hosted initialization is read-only: a source candidate is not a persisted asset merely because it appears in the model. Confirm the record, linked workflow and photos survive reload under the intended authorized account.
5. Generate field QR tags against the deployed application address only after the referenced permanent records are persisted there. Do not print local-review URLs or assume browser-only asset IDs have been synchronized.

## Verification state

As of this handoff, the full automated suite has **819 passing tests**. The production build passed with the runner config loader. Focused tests cover permanent identity, revision/evidence history, local storage failures, model bounds and eye positions, measurement rules, asset links, and local maintenance request/event/photo integration.

**Integrated browser QA passed locally:** C12 selection and eye view beneath the canopy; photo upload/readback after reload; a clearly labeled test inspection and request retained after reload; linked-request navigation into M-1; start/done status history; asset-link QR rendering; surface-based manual placement for equipment/items and new columns; two-point model measurements; saved sectioned view restoration and control synchronization; neutral/reference finishes; tour stop selection synchronized with the record; desktop and 390 × 844 field layout; no browser console errors. Two labeled QA-only assets, a test viewpoint and a completed test request remain in the review browser, with no asserted property damage and no production write. The hosted migration/RLS runtime checks have not been performed.

Editable geometry is available from Views → Download complete model (.glb), at `public/twin/complete-model.glb`. Upper-only GLB and detailed geometry/provenance JSON are also downloadable. Source IDs and raw geometry are retained; reference-color overrides live in the scene code. Asset histories live separately from geometry.

Implementation detail is in [asset-twin-data.md](asset-twin-data.md), [asset-twin-scene.md](asset-twin-scene.md) and [asset-twin-maintenance.md](asset-twin-maintenance.md).


## Additional plans and infrastructure — September 24 expansion

- Units 101 and 103 have independently selectable upper-floor layers. Unit 101 is the partial rear strip, not an invented full-footprint second story. Unit 103 retains its central void and rear stair openings. Stairs use explicitly schematic envelopes; no invented tread dimensions or guardrail heights are asserted.
- The source upper elevation of 3.05 m conflicts with ground walls reaching 3.8862 m (0.8362 m overlap). Both source values are retained. This limitation appears in the Sources pane and upper-floor JSON; field heights are still needed.
- 28 water and 28 electric meter IDs are imported from Sheet1 rows 3–32 of the supplied workbook. Both water meters associated with Unit 113 remain separate. House-service rows are common-area references, not tenant assignments. Unknowns remain unknown.
- 24 time-clock JPEG previews retain original hashes and EXIF dates in the source catalog. The photographs were captured in November 2021. They form 23 filename-based reference groups, not a verified count of clocks. The 131/133 photo shows two timers; the two 119.5 photos show different device types.
- The supplied fixture register contains 39 column references. Its 37 existing native-object links are shown as provisional correspondences, without renumbering or duplicating permanent column records. Source Columns 1 and 2 remain unmatched. The C25/C26 ambiguity remains open.
- Ten benches and twenty trash cans receive source-derived pins and independent permanent records. Their model-registration residual is 0.537 m RMS / 1.294 m maximum. Positions and ground-reference elevations are explicitly approximate and not field verified.
- Six blue and thirteen red water-map annotations retain literal source labels. The two supplied water-map files are identical. Label numbers are not assumed to be counts or meter IDs; no physical valve records or service connections are invented.
- The Sources pane provides interactive source-image markers. Unit records show both supplied floor-plan images. Meter records retain exact workbook/cell provenance; historical clock photos are separated from current inspection photos.

Additional live acceptance: both upper levels and partial 101 extent; plan and perspective views; upper-wall toggle; actual 103 central void; source map selection (including unmatched Column 1); exact house sprinkler-meter lookup; both 119.5 historical photos; upper-floor pin placement and focus using the existing QA record; existing photo, inspection and linked request retained after reload; pre-upgrade saved ground-view restoration; unchanged C12 permanent ID and under-canopy eye view; mobile field layout without horizontal overflow; no console errors. All 819 automated tests and the production build pass. Two QA-only records remain; the workflow QA pin is now on Unit 103's upper floor solely for testing.

The present source catalogs and reference images are bundled in this local-review branch. Before any public hosted rollout, decide which drawings, meter identifiers and infrastructure photos may be public, and serve restricted source evidence through authenticated storage; client-side route checks do not protect bundled files. This intake did not deploy, publish sources or apply database migrations.

Rebuild details: [upper floors](asset-twin-upper-floors.md), [fixtures](twin-fixture-reconciliation.md), [meters and clocks](twin-infrastructure-sources.md). Merge geometry with `node tools/merge-twin-glb.mjs`; no new runtime dependency or environment variable is required.

## Physical bench and trash-can models — September 24

The existing 10 bench and 20 trash-can records now have selectable physical models. Tan slats and dark frames follow the supplied brochure photograph; exact dimensions, orientation, and individual fixture matches remain assumptions. The original registered X/Z coordinates and permanent asset records are retained. Presentation bases are raised to the existing walkway surface without rewriting source bindings or field measurements.

Bench models and trash-can models have separate layer controls. Fixture labels are optional. Direct mesh selection opens the existing record and highlights its geometry; presentation mode restores natural materials while keeping the furnishings visible. Focus checks candidate sightlines and rejects camera positions inside columns. Upper-floor isolation hides ground fixtures. A manually placed fixture keeps its explicit placement.

The complete GLB now contains ground geometry, both upper floors, and all 30 fixtures. A separate fixture GLB and source/assumption JSON are downloadable from Views. No additional dependency, environment variable, database migration, or production write was introduced for this addition.

Rebuild: `node tools/build-twin-fixtures.mjs`, then `node tools/merge-twin-glb.mjs`. See [model contract and assumptions](asset-twin-fixture-models.md) and [appearance evidence](twin-fixture-appearance-evidence.md).

Validation: all **831 tests pass**; the production build passes with existing JSON-import and bundle-size warnings. Geometry tests cover all 30 identities, actual bounds, bin openings, runtime/export agreement, walkway grounding, independent materials, and unobstructed fixture close-ups against native walls/columns. The merged export preserves the source documents and existing column IDs.

Live local review verified bench and bin mesh clicks, selection colors, natural presentation finishes, independent layers, hidden-layer focus recovery, ground/upper filtering, optional labels, and mobile field layout. Bench 1 and Bench 5 exposed camera/column intersections, which were corrected and regression-tested. C12 retains `pa_1bd53572-8fe3-4582-9467-8288c4159061`; the earlier QA inspection and maintenance link remain. No new physical records or test inspections were created. Browser console showed no errors after reload. The review remains local and has not been deployed.
