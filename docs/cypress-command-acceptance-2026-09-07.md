# Cypress Command local acceptance

Completed September 7, 2026 (America/Chicago) in the existing Vite application. Open `http://127.0.0.1:5174/#spatial` while `npm run dev:review` is running. Setup, audit decisions and qualifications are in [the repository audit](cypress-command-audit-2026-09-07.md).

## Automated verification

- `npm test`: **534 passed, 0 failed**. Baseline was 519; the added checks cover private client dependencies, OTB authorization, local review restrictions, safe source links, evidence/briefing provenance, Central-time draft dates, and missing financial inputs. Full output: [test results](cypress-test-results.txt).
- `npm run build`: passed using installed Vite 7.3.5. Existing mixed JSON import-attribute and large-chunk warnings remain. Heavy capture/map viewers are still separate chunks; no migration or dependency was added.
- Final production output includes the command UI, with no sampled confidential legal name, private note or maintenance UUID in JavaScript and no confidential roster/archive file in `dist`. The private evidence is read through the scoped server endpoint, not a public archive asset.
- The final built horizontal logo matches the pinned GitHub original byte-for-byte. All 12 imported brand assets were checked, and their hashes are recorded in [brand provenance](cypress-command-brand-provenance.md).
- `geometry.json` has no changes. No generator was run and no source boundaries were redrawn.

## Actual Chrome journey

These checks used the rendered app, not only source inspection:

| Journey | Observed result |
| --- | --- |
| First open | Property workspace loads by default; full property, remote Lot 7, street labels, bank exclusion and source qualifications are visible. |
| Physical suite selection | Clicked all **27 SVG suite targets individually**; each selected the matching suite detail. Derived boundaries are identified. |
| Directory | Searched Jason, received suite 149, selected it and reviewed its 4,613 SF roster record. Clearing the filter restores the directory. |
| Keyboard | Enter on suite 135A selected its matching detail. Source dialogs close with Escape and restore focus. Hidden mobile navigation is inert. |
| Property navigation | Model/Plan toggle changes the roof representation; zoom and drag change the SVG viewBox; reset restores full-site framing. |
| Sources | Opened per-suite roster/boundary excerpts, work-order/archive/location records and geometry qualifications. The actual supplied scan loaded with natural width 2,592 pixels; CAD reproduction is separately identified. |
| Maintenance | The frontage association opens Pothole Repair with the literal source description, August 29 archive date, and explicit missing exact point/vendor/cost/completion/payment evidence. |
| Owner update | Generated cited text with Central calendar date September 7. Edited text survives closing/reopening the dialog in the same tab. Copy confirmed the expected clipboard text. Download created the expected draft text file and its contents were inspected. Nothing was sent. |
| Mobile | Inspected at **390 CSS pixels**: approved 260px horizontal logo, no document overflow, plan defaults for the narrow canvas, stacked inspector, reachable source and draft dialogs. Viewport override was reset afterward. |
| Brand/theme | Original 04C artwork rendered intact; computed typography is Fraunces for headings and Inter for UI. Inspected light and dark shell; restored light. Amber labels use Charcoal text. |
| Existing navigation/viewers | Retained 3D view opened with one canvas; closing its section removed the canvas. Dashboard and Property navigation worked and reset content scroll. Missing dashboard rents now show Unavailable rather than NaN or zero. |
| Console | No application errors observed during the acceptance journey. |

The tested downloaded artifact is `C:\Users\adam\Downloads\Cypress-Command-owner-update-DRAFT-2026-09-07.txt` (1,785 bytes). Draft edits are held in the current tab until reload; download provides a reviewable local copy.

## Boundaries of acceptance

- This is a **local evidence review**, not production deployment. Normal Supabase sign-in behavior remains in `npm run dev`; authenticated hosted API behavior needs a deployment smoke test when that release is authorized.
- The maintenance status is historical, not a live sync. The frontage is associated through the roster; exact pothole position, condition today, cost, completion and payment remain unknown.
- The long building follows the recorded NW–SE course rather than exact north–south. Dashed suite divisions and CAD-assigned heights remain interpretations. Parking/area discrepancies and legal-instrument priority remain unresolved.
- All 17 existing sheets remain available. Financial/accounting correctness across the older modules was not accepted as part of this slice; they require their authorized source hydration. Legacy localStorage account/property isolation and older API authorization patterns remain documented in [the security review](security-cypress-review-2026-09-07.md).
- No email, dispatch, payment, Supabase business-record mutation, GitHub push or deployment was performed.
