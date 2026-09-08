# Cypress Command design refinement

September 7, 2026. Local implementation; no deployment or business-record changes.

## Direction and changes

Refined the existing application with the Impeccable skill, following the approved 04C identity already verified against the Cypress Command GitHub brand repository. The original logo files, palette, and local Fraunces / Inter / JetBrains Mono fonts remain authoritative. Removed the obsolete Google Fonts request. No new application, dependencies, property geometry, or source records were introduced.

The shared shell now has consistent typography, readable navigation, clearer focus states, and deliberate spacing. The property workspace has larger source and evidence text, improved directory labels, consistent SVG controls, and an accessible selection announcement. On small screens a suite selection brings its detail into view; Focus suite returns to the map. Scrolling stays inside the workspace, preserving the header. Mouse dragging and Alt+scroll navigate the map; ordinary scrolling and touch scrolling navigate the page. Browser zoom is preserved.

The C-1 compliance view keeps its existing store and audit-event path. It adds search by suite or tenant, a flagged-row filter, a sticky suite column, readable column headings, explicit state labels, and native keyboard controls. The original seed-reference text is retained in an expandable disclosure. Search, filtering, focus, and table scroll survive rerendering. Owner, tenant, vendor, and owner-preview views disable state controls and reject activation; search remains available. These client checks complement existing server authorization and are not a replacement for it.

## Acceptance

- All 536 tests pass, including new filter intersection and read-only activation tests. See `cypress-impeccable-test-results.txt`.
- Production build passes. Existing JSON import-attribute and bundle-size warnings remain. Final main assets: `index-UTrjK41b.js` and `index-BpQVJh_T.css`.
- Inspected rendered Property and Compliance views at desktop and 390px mobile widths in Chrome. Fixed the observed competing scroll containers and oversized compliance source note.
- Verified mobile suite 149 selection, correct suite title and announcement, retained header, and Focus suite returning to the map. Verified source dialog, source-switch keyboard focus, loaded supplied-plan image, and generated owner draft with dated maintenance content and the unsent review status.
- Verified compliance search for 149, flagged-row filtering, readable state names, and owner-preview disabling all 11 controls in the filtered row while preserving search. No compliance state was changed during browser verification; the existing write path was retained and its read-only guard tested separately.
- Confirmed no changes under `src/data` or `public/brand/cypress` in this refinement. Geometry, provenance, unresolved source conflicts, and approval boundaries from the preceding vertical slice remain intact.

The Impeccable detector ran once in degraded regex mode because optional parser packages were unavailable. Its four advisories are recorded in `cypress-impeccable-detector.json`: two font suggestions conflict with the explicitly approved brand fonts; the hidden drawer-logo image receives its source when populated; and existing factual copy triggered an em-dash advisory. These are narrow exceptions, not a claim of a comprehensive accessibility audit. No extra packages were installed solely for the detector.

## Open and remaining limits

Run `npm run dev:review` and open `http://127.0.0.1:5174/#spatial` or `http://127.0.0.1:5174/#comp`. The review server is loopback-only and does not initialize Supabase writes. Normal `npm run dev` retains the configured sign-in workflow.

This pass does not change the outstanding factual and security limits documented in `cypress-command-acceptance-2026-09-07.md` and `security-cypress-review-2026-09-07.md`. No sending, dispatch, payments, external record edits, push, or deployment occurred. Existing unrelated `docs/graph/labels.json` changes are excluded from the design commit.
