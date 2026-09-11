# Cypress Command · final local acceptance

September 8, 2026. The requested four-part local slice is complete in the existing Vite application. This entry accepts the final work-order reading and browser-state isolation changes after the [independent requirements audit](cypress-completion-audit-2026-09-08.md). It does not certify the hosted deployment.

## Delivered journey

1. Open **A-2 Property** at `http://127.0.0.1:5174/#spatial`. Existing REV 12 footprints, 27 suite targets, plan/model controls and Lot 7 remain. Source geometry was not regenerated or edited.
2. Select a suite. The panel provides the dated adopted roster and the relevant boundary authority. Sources include the original supplied plat scan, separately identified CAD reproduction and geometry discrepancies.
3. Select the real Pothole Repair frontage association at suites 101/103. **Open linked work order** opens a read-only record within existing M-1. The archive and later database verification are separately dated.
4. **Draft owner update** opens an editable review dialog with four cited sources. Reading-mode citations select their actual excerpts. Tab recovery, explicit regeneration and branded HTML/text exports remain local review actions.

This reuses the existing store, unit data, geometry, routing, maintenance event derivation and owner-review builder. No second app, business-state store, synthetic maintenance ticket or platform migration was introduced. The evidence snapshot and exported draft are dated derivatives of their sources.

## Maintenance verification

The read-only Supabase connector query at **2026-09-08T05:24:33.481499+00:00** (September 8, 00:24 CDT) was scoped to project `kbhsghodquchkgfdzckc`, Orange Ocean / OTB and request `ac:c005cdc5-fd30-41a7-b71c-e40d3b3d1874`. The project matched the configured repository endpoint.

- Request: Pothole Repair, Common Area, detail associates Pink Paisley at 101–103.
- Exactly one retrieved event: status `open`, import note, logged `2026-07-28T00:23:58+00:00` (July 27, 19:23 CDT).
- No assignment event; no files in the `maintenance-photos` folder for this request.
- This establishes the database record at the read time. It does not establish physical condition, repair completion, a vendor company, quote, invoice or payment. The folder count does not establish that no photographs exist elsewhere.

The bounded [verification snapshot](harvest/maintenance-verification-2026-09-08.json) discloses that the query used privileged database access, **not** a browser-user RLS acceptance test. Local review serves this snapshot through the existing loopback-only evidence adapter. It displays “Verification snapshot” and a check date; it is not continuously live.

The hosted GET-only `/api/command-evidence` still requires verified OTB owner/operator membership and returns `private, no-store`. It loads the historical archive with `includeSnapshot:false`, then performs fresh caller-JWT/RLS request/event reads scoped by organization, property and exact request ID. Wrong binding, outage, missing request, failed/limited event retrieval and photo-folder failure have explicit outcomes. A failed read never falls back to the verification snapshot or legacy maintenance cache. Photo listing is a read operation; the flow performs no request/event writes.

## State-isolation fix

The shared mutable store no longer reads an unscoped localStorage snapshot at module import. Boot binds account, organization and property before rendering. Authenticated sessions require remote state and clear previous overrides even when the remote snapshot is empty. Private unit fields are cleared in place on scope changes. Sign-out/account changes stop queued sync, hide the old interface, close review dialogs and reload; property switches also stop queued sync and clear the store before reload.

Browser recovery copies are keyed by scope and retained separately from remote authority. Remote hydration cannot overwrite the last user-edited recovery copy. Explicit local/offline modes can copy the legacy snapshot into their own scope without deleting or changing the original. Authenticated JSON imports reject unbound and other-account/property exports. Automatic legacy backend seeding and unscoped asset uploads at login were removed. Deliberate recovery of old authenticated edits is not a new UI feature in this delivery; those copies are preserved rather than silently replayed.

Tests verify these store boundaries. Full hosted sign-in, sign-out and multi-property switching were not exercised in this local-only browser session. The legacy M-1 queue and older asset caches/API authorization remain broader release-review areas; this acceptance does not claim platform-wide hardening.

## Actual browser acceptance

Observed in the in-app browser, with desktop and 390px mobile viewport requests. The tool's screenshot presentation scales its backing frame; layout decisions used the rendered interface and DOM rather than assuming image pixels equal viewport pixels.

- Fresh local load; suite 103 selected on the map and its 3,054 SF adopted area and derived-boundary source displayed. Earlier acceptance covers all 27 targets; geometry is unchanged.
- Plan selection, zoom and full-property reset operated; source drawer exposed the suite-specific demising record and new system-read source.
- Property maintenance panel displayed the archive date and separately dated system check. The linked M-1 page showed request text, activity, assignment absence, photo-folder count and explicit unknowns.
- M-1 **Read system source** returned to the property source dialog with the exact canonical ID, timestamp, method and event excerpt. M-1 **Draft owner update** opened the same existing review dialog.
- The generated draft included the system check and four references, while retaining unknown payment/condition/completion fields. Reading-mode `[maintenance-system-record]` selected the linked record excerpt.
- HTML briefing preparation succeeded. No external send or business-record operation occurred. The downloaded browser file itself was not retrieved for print testing.
- Added a temporary review note, reloaded, reopened the draft and observed the recovery message with the note retained. Explicit regeneration displayed its replacement prompt, then rebuilt from the records; the temporary test note was removed.
- Desktop and mobile work-order layouts were visually inspected. The mobile source button initially wrapped its label into three lines; shortening its date label to the property-calendar date fixed the cramped control. The full timestamp remains in source detail. The final mobile source list and dialog had equal client/scroll widths, with no horizontal overflow observed.
- No captured application console errors at the end of acceptance. The existing preview process had stopped before the fresh-load check; restarting the same review server resolved the connection refusal. A fresh tab was used after the old tab became stuck on the browser's unsupported offline error page. No browser security setting was changed and no blocked file preview was retried.
- Temporary viewport override reset; the completed property model was left open as the deliverable.

## Checks and review artifacts

- **566 tests passed, zero failed**: [full results](cypress-final-test-results.txt). Includes 16 added tests for scoped storage and maintenance evidence failure boundaries.
- **Production build passed**: [build results](cypress-final-build-results.txt). Existing large scene/application chunk warnings remain; no platform splitting was added to this slice.
- Client dependency-graph privacy test passed; confidential archives/verification data remain outside client imports.
- Impeccable detector returned no findings for the new maintenance stylesheet: [result](cypress-maintenance-design-detection.json). Manual desktop/mobile inspection supplied the visual acceptance; the detector is not a visual-certification substitute.
- Approved 04C logo/font assets and `src/data/geometry.json` remain unchanged. [Brand authority and hashes](cypress-command-brand-provenance.md) pin the reviewed GitHub 04C v1.0.1 release.
- Updated four-source review packet: [HTML](owner-review/2026-09-08-owner-update-system-read-DRAFT.html), [text](owner-review/2026-09-08-owner-update-system-read-DRAFT.txt). Generated locally by the same pure builders from the verified evidence response; 249,543 HTML bytes; SHA-256 `f4cc7c9a047e247b6b2335a445647efe5ec39b326d2b9b516293aedb21d72e54`. Original earlier three-source artifact retained. The new files were saved in this repository only.
- Standalone HTML print pagination remains unverified after the earlier local-file browser-policy block. The application review/export journey is verified; no alternative mechanism was used to bypass that file block.

## Opening and remaining limits

From `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`, run `npm run dev:review`, then open `http://127.0.0.1:5174/#spatial`. It runs the same application on loopback with Supabase disabled and its bounded source endpoint enabled. Normal `npm run dev` retains configured authentication; no new environment variables or dependencies are needed.

Eleven suite divisions remain derived; 135A/B is interpreted; heights are CAD-assigned estimates. The plat bearing is NW–SE rather than exact north–south. Parking counts (314 traced versus 324 stated / 344 required), area measures (62,810 roster SF versus 62,883 plan headline), legal instrument conflicts and current occupancy remain unresolved and visible. No physical inspection has been performed.

The local deliverable is complete. Hosted deployment, fresh owner/operator/rejected-role access testing, current on-site condition and legal/source reconciliation require their own evidence and scope. No push, deployment, external communication, payment, dispatch or change to external business records was performed.
