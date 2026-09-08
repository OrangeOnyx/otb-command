# Owner review workflow

September 8, 2026. Extends the existing Property workspace and its owner-update dialog. No new application, business-state layer, schema, integrations, or deployment.

## Delivered

- Side-by-side draft editing and source review, using the same allowlisted archived maintenance response. Read draft links known citation tokens to the original work order, archive verification, and dated frontage association. Operator text and source excerpts stay visibly separate.
- Draft recovery across reload within the same browser tab. The key is scoped to local OTB review or authenticated user ID plus property ID and issue ID. Restoration also requires SHA-256 agreement on the exact issue and selected sources. The payload contains text, dates and binding only, with a 50,000-character limit; it does not enter the legacy store, source records, or automatic remote-sync registry.
- Empty drafts disable copy/export. Regeneration requires choosing Replace draft, with Keep edits available. Storage denial, quota, invalid records and changed sources have explicit recovery messaging. Repeated keystrokes do not repeat identical screen-reader announcements.
- A standalone HTML briefing download and retained text/copy actions. The HTML embeds the original approved 04C logo, all three approved font files and their license notices, selected source excerpts, source paths/dates, and record gaps. Known citations link to the appendix. Strict CSP denies scripts, remote resources, forms and base URLs; source paths are plain text. The packet remains a draft regardless of operator edits.
- Export captures text and preparation date at the click, disables duplicate export while assets load, and discards completion after session invalidation. Sign-out clears only the draft-session namespace. The live drafting view and private command evidence are cleared on auth invalidation. Late evidence responses cannot republish data after sign-out because publication requires a matching request generation and a positive matching user ID.

## Verification

All **550 tests pass**; production build passes. New tests cover storage isolation, source changes, corrupted and oversized recovery data, blocked storage, selective cleanup, malicious text/URLs/CSS, source allowlisting, embedded fonts, and inert license notices. See `cypress-owner-review-test-results.txt`. Existing JSON import-attribute and bundle-size warnings remain; final assets are `index-BIHzRMkb.js` and `index-zQXClslM.css`.

Rendered app checks in the in-app browser:

1. Opened the new owner-update dialog from Property; the source date remains August 29, 2026 while the prepared date is September 8.
2. Appended a review note, reloaded the tab, and confirmed exact edited-text recovery.
3. Used Read draft and its frontage citation; the correct source appeared and keyboard focus moved to its excerpt. At the mobile width the source was within the viewport with no dialog horizontal overflow.
4. Chose Regenerate then Keep edits and verified the note remained; then deliberately replaced it with a clean source-generated draft.
5. Exercised Download briefing; the UI completed its preparation state with no app errors captured. Desktop and mobile layouts were inspected; desktop export actions now remain reachable in a sticky footer. Temporary viewport overrides were reset.

The focused Impeccable CSS scan returned no findings (`cypress-owner-review-detector.json`); it is not a comprehensive accessibility audit. Independent code review caught and verified correction of the auth-response race, export race and repeated live-region announcements. Authenticated server behavior was reviewed in code, not exercised against production accounts.

## Review artifact

`owner-review/2026-09-08-owner-update-DRAFT.html` was generated through the same pure briefing builder from the real source response and an unedited owner draft. It is a derivative review copy, not a new source of truth. Structural checks confirm three selected source sections, three embedded font faces, included license notices, and no script tags. Size: 246,077 bytes.

Also copied, per the repository export rule, to:

`G:\My Drive\00 OTB\Cypress Command\Owner Review\2026-09-08-owner-update-DRAFT.html`

Both files have SHA-256 `472612EAD8CCF36C50F9668ED3A232526185036C4BD19F5E98CCD815B0984520`.

The browser tool's URL policy blocked opening the local HTML artifact. No alternate route was used to bypass that block. Its standalone print pagination has **not** been visually verified; the application UI and file structure were verified separately. Open the file locally and use Print to inspect or save a PDF.

## Remaining limits and next priority

Draft recovery is for the current tab, not a long-term document store. Browser session restoration can retain sessionStorage; explicit sign-out clears this app's draft namespace. Download a copy for durable review. Current condition, exact defect point, repair scope, vendor, completion, cost and payment remain unverified. Geometry and approved asset files are unchanged.

The older global localStorage / IndexedDB isolation concerns remain outside this bounded recovery path. `hydrateRemote` itself resets layers; the remaining risk is that app boot skips hydration on an empty or failed load after reading the global local snapshot. See the earlier security review before release expansion.

The next functional extension should be a read-only bridge from this archived issue's existing `liveRequestId` into the canonical M-1 request and its supporting events/photos. It requires explicit fresh/error/stale outcomes: existing maintenance refresh can return old cache on error, and a failed photo list can look empty. A current-status claim must wait for a verified successful read. No live status was inferred here.

Run `npm run dev:review`; open `http://127.0.0.1:5174/#spatial` and select **Draft owner update**. No deployment, GitHub push, dispatch, payment, email, or external business-record mutation occurred. The existing unrelated `docs/graph/labels.json` modification remains excluded.
