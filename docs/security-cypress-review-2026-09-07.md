# Cypress Command security review — 2026-09-07

Scope: existing application, the A-2 property/evidence slice, source packaging, and local review runtime. This is a code and local-runtime review, not a penetration test or a fresh audit of deployed Supabase policies.

## Corrected in this working tree

| Finding | Verified behavior and correction |
| --- | --- |
| Confidential rent roll in public JavaScript | `src/lib/leaseUI.js` directly imported full `units.json`; the baseline build contained a sampled private legal name and note despite the authenticated seed design. It now uses `UNITS` from the shared store. `test/client-privacy.test.mjs` traverses the actual frontend import graph and rejects confidential data, server modules, tools, and document archives. |
| Seed authorization used a global UI role | `api/seed.js` previously accepted `profiles.role` without OTB membership. `api/_seed-auth.mjs` verifies the user session, the Orange Ocean/OTB property, and current owner/operator membership through the caller JWT and RLS. Other-property, other-organization, vendor, tenant, revoked, and missing memberships fail closed. No authorization is cached across users. |
| Stored document links accepted executable schemes | `recordsUI.js` now uses `safeReferenceUrl`: HTTPS external references and explicitly allowed same-origin source paths only. Script, data, file, protocol-relative, traversal, and credential-bearing URLs are rejected. Existing `doc://` references retain their separate authenticated bucket-store handling. |
| Local development could attach to business systems | `LOCAL_REVIEW` requires both Vite development mode and `VITE_LOCAL_REVIEW=1`; it disables Supabase client creation. `npm run dev:review` launches the existing app on `127.0.0.1:5174` with strict port selection, without editing `.env`. The development flag cannot disable authentication in a production build. |

## Property slice boundaries verified

- One Vite application and one shared `UNITS`/`byUnit`/selection store remain. A-2 contains the new operating view; the prior capture/spatial controls are retained within that sheet. Existing geometry is consumed, not rewritten or copied into another geometry dataset.
- `tools/command-evidence-data.mjs` reads the original archive server-side and returns one allowlisted real maintenance record plus bounded source excerpts. The frontend does not import the archive or hard-code its private ticket UUID. No sample work order replaces missing evidence.
- Hosted evidence uses the same scoped membership gate as the corrected seed endpoint. Responses are `private, no-store`; the endpoint permits GET only. The frontend also declines private evidence for vendor/tenant roles and a different active property.
- Local `/__review/evidence` is GET-only, requires explicit review mode, checks loopback address and host, and rejects mismatched browser origins. A local request returned HTTP 200, one issue, seven source excerpts, suites 101/103, and the dated 2026-08-29 archive status.
- Source titles, excerpts, paths, tenant strings, and issue descriptions are HTML-escaped. Source images link only to the supplied plan asset or the existing `/plat-render.svg`; arbitrary response image URLs are not rendered.
- Suite source excerpts whitelist public fields even when `UNITS` has been hydrated with confidential information. Maintenance location is a frontage association; it does not claim a surveyed point or defect extent. Archived status is dated, and current condition, completion, cost, and payment remain unknown.
- Owner updates are deterministic text drafts. The slice offers editing, download and copy; it has no send, dispatch, payment, or business-record mutation action. Draft edits remain in the current tab.
- `.vercelignore` selectively admits only the three required document source files; `vercel.json` includes the five exact source files in the evidence function. They are not copied into Vite's `public` directory. The rest of the archive remains excluded from deployment upload.

## Verification evidence

- Baseline: 519 tests passed; production build passed. Production dependency audit reported zero vulnerabilities (`npm audit --omit=dev --json`).
- After bounded security changes and evidence helpers: 532 tests passed. Targeted tests exercise membership denial, no authorization cache, unsafe URL rejection, private frontend dependencies, and review endpoint restrictions.
- After the new command view was integrated, the frontend privacy import-graph regression passed again.
- The security-stage production build no longer contained the sampled private legal name, sampled private note, or private maintenance UUID. That build preceded final command-view integration; final release verification must inspect the final built artifacts, not reuse this earlier result.
- Independent local browser check: the source dialog opened with escaped source content. Switching source tabs replaced the focused control and moved focus to the document; Escape still returned to the originating Geometry & sources button in Chromium. The main implementation review owns the focus refinement and final responsive journey acceptance.

## Remaining limitations

1. **Legacy localStorage isolation is unresolved.** `store.js` still uses one `otb-command-state-v1` key; sign-out does not clear it, and hydration overlays available layers. Shared-browser account switching or future multi-property use may retain earlier local overrides. This slice does not broaden or migrate that state model. Its source excerpts deliberately exclude private hydrated fields.
2. **Other API authorization was not migrated in this change.** Endpoints using the older shared `_auth.mjs` continue to use the profiles-role pattern. The new scoped gate applies to the fixed OTB seed and command-evidence endpoints. Review the remaining endpoints before expanding beyond the current property deployment.
3. **Production remains a separate release step.** No deployment or external record mutation occurred during this work. These local corrections are not applied to the published application until an explicitly approved deployment. A hosted owner/operator read, unauthorized-role rejection, and function source-file availability still require acceptance on that deployment.
4. Existing import-attribute and large-chunk build warnings are performance/consistency concerns, not proof of an authorization failure. They were not used to justify a platform migration.

No credentials, environment values, full private archive, or authorization tokens are recorded in this review.
