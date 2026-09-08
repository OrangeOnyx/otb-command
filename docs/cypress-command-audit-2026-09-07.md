# Cypress Command: repository audit and working slice

Date: September 7, 2026. Scope: local reversible development in the existing `otb-command` application. No deployment, email, dispatch, payment, or external business-record change.

## What was verified before implementation

The actual application is `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`. The Downloads path in the parent instructions is stale; the nested `CLAUDE.md` identifies the correct path. This checkout is the authoritative Vite application. The sibling Obsidian copy and ZIP exports were left alone. Existing unrelated changes to `docs/graph/labels.json` were preserved.

Stack: Vite 7, vanilla JavaScript, native SVG, Three.js, MapLibre, GaussianSplats3D, Supabase authentication/storage/state and Vercel API functions. The page registry has 17 sheets. No framework or platform migration was introduced. Baseline: 519 tests passed and the production build passed. Installed production dependencies had no reported audit vulnerabilities.

The existing application was run and inspected in Chrome. Its A-1 plan had clickable suites, a shared drawer, parking overlays, and full-site selection. The drawer exposed a large collection of editing workflows; source review was fragmented and the local maintenance cache was empty. A-2 already offered SVG, 3D, satellite and capture views, but its initial massing omitted site context. Sources and code, rather than HANDOFF completion claims, governed this build.

## Keep, fix, replace

| Decision | Evidence and implementation consequence |
| --- | --- |
| Keep the app and store | Existing `UNITS`, selection, role gates, page registry, all 17 sheets and operational workflows remain. A-2 is now the property operating workspace. |
| Keep REV 12 geometry | 27 suite footprints, streets, parking primitives, remote Lot 7 and bank exclusion are reused directly. No geometry data was regenerated or edited. |
| Replace A-2's initial composition | A focused model/plan canvas, suite inspector, maintenance record and source dialogs now form one working journey. Existing capture/3D/satellite views remain under Capture & legacy views. |
| Fix visual orientation | Plat courses show the long building trending NW–SE, not exactly north–south. Storefront/rear street relationships match the prompt. North arrows now derive from the plat bearing; no footprint rotation was invented. |
| Fix source precision | Derived suite divisions and interpreted 135A/B split are identified. The source scan is available separately from the CAD reproduction. |
| Fix viewer lifecycle | Late asynchronous loads are guarded/disposed; switching away releases expensive viewers. Satellite selection is applied after its layers load. |
| Fix material security defects | Full confidential unit data no longer enters the client through leaseUI. Seed/evidence APIs require current OTB owner/operator membership. Unsafe document schemes are disabled. |
| Fix incomplete financial presentation | Local review deliberately omits confidential rent inputs. D-1 now displays Unavailable for incomplete totals and identifies the July 2026 roster, instead of displaying NaN or implying live figures. |

## Geometry and evidence qualifications

- `geometry.json` is REV 12; `tools/extract-geometry.mjs` remains an older REV 11 generator. Running the generator would regress accepted corrections. Local Git refs had no REV 14 source to adopt; no remote fetch or branch replacement was performed.
- Eleven suite divisions are explicitly area-derived: 101/103, 109/111/113, 131/133 and 139/141/143/145. 135A/B is an interpreted split of a recorded section. Even a plat-dimension classification is a trace of the available source, not a current field survey.
- The supplied plan records total building area of 62,883 SF. The adopted 27-suite roster sums to 62,810 SF. These are not silently treated as equivalent measurements.
- Parking remains 314 traced spaces versus the 324 provided / 344 required variance reference. This work does not reconcile the discrepancy. Bank easement parking does not establish ownership of the excluded bank parcel.
- The long building trends along N38°32′W / S38°32′E. Arnould remains the storefront side, Marie Antoinette the service side, Patricia the northwest end and Johnston the southeast end. General east/west/north/south descriptions are approximate street relationships.
- Satellite footprints use a separately fitted CAD envelope (528.9 × 86.1 feet) versus the plat-model long building (522.31 × 85.45 feet); alignment is approximate. CAD-assigned heights are estimates, and capture mesh/splat assets are photographic context rather than survey geometry.
- Legal-instrument priorities and easement conflicts were not resolved. Historic legal overlays remain reference material, not a conclusion about permitted activity.
- Roof photographs were inspected as an alternative issue source. They show historical surface deterioration, but the exact bay remains unconfirmed in the source brief; the stronger HANDOFF assertion was not adopted. The unrelated thermal finding on a neighbor's roof was excluded.

## Implemented evidence journey

The initial property surface reads the shared suite roster, labels its July 2026 adoption date, and links to per-suite source excerpts. The map supports clicking or keyboard activation of all 27 suites, pan, zoom, focus, reset and Model/Plan views. The remote parking tract is included in full-property framing.

The real maintenance record is `c005cdc5-fd30-41a7-b71c-e40d3b3d1874`, Pothole Repair, reported July 27, 2026, with description “In front of pink paisley.” Its archive status is open as of August 29, 2026. The source has no assigned unit, exact point, photo, vendor, quote, cost, completion or payment evidence. The July roster connects the named business to 101/103. The map marks those storefront edges as a location association; the callout is not a surveyed defect point or area.

The archived work order, import verification and roster are read by `tools/command-evidence-data.mjs` at request time. Only the allowlisted record and curated excerpts are returned. The full archive is not imported into the browser or copied into another data store. The new draft helper creates a deterministic editable owner update with citations, dated status, record gaps and proposed inspection. Copy/download operate on the draft text; there is no send or dispatch action.

Approved palette: Cypress `#1E4D3A`, Moss `#2F6B4E`, Amber `#D97706`, Charcoal `#0A1F16`, Bone `#F3EDE0`. The user's subsequent GitHub direction resolved the initially missing local logo: `OrangeOnyx/cypress-command-brand-system` at commit `4a116e75472415210d05deea13041cb2b74db53a` contains the approved 04C v1.0.1 identity, approved September 6, 2026, and explicitly supersedes earlier 04B exploration. Original outlined SVG variants, favicon/app icon, Fraunces/Inter/JetBrains Mono web fonts and their licenses are now copied into `public/brand/cypress/` with byte-for-byte verification. No logo was recreated or substituted. See [brand provenance](cypress-command-brand-provenance.md) for source authority, constraints, file mappings and exact hashes.

## Running the result

```powershell
cd C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command
npm install # only if dependencies are missing
npm run dev:review
```

Open `http://127.0.0.1:5174/#spatial`. The launcher uses the same Vite application and explicit development-only review flag, binds loopback, leaves `.env` untouched and creates no Supabase client. No API credentials are needed for this local review. The source endpoint accepts GET only and rejects cross-origin browser reads. Private evidence is not available from a normal unauthenticated production build.

Normal `npm run dev` preserves configured Supabase login behavior. The Vite dev server alone does not emulate Vercel APIs. `npm run build` builds production assets; the authenticated evidence function is separately configured to include only its five required source files. Hosted behavior still requires authorized deployment and live smoke testing.

```powershell
npm test
npm run build
```

## Remaining limits

The real ticket is a dated archive, not a live work-order synchronization. Exact defect location and current repair condition remain unavailable. Legacy localStorage overrides remain unscoped across accounts/properties; shared-device hardening is still needed before broader multi-property rollout. The new property slice does not persist business edits into that layer. Existing unrelated operational modules and legal interpretations were not comprehensively re-audited.

See `security-cypress-review-2026-09-07.md` for security evidence and `cypress-command-acceptance-2026-09-07.md` for the final browser and test results.
