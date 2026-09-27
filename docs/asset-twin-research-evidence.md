# Permanent asset research evidence

September 25, 2026 · Cypress Command Platform · OTB local review

Open the asset twin, select a record, then choose **References**. The **References & verification** section holds saved source links, dated reference views, and verification notes. Its form adds further evidence; **Export this record’s evidence** downloads JSON with the permanent asset ID and saved evidence entries.

## Attached research

The dated catalog in `src/data/twin-site-research.json` includes the native Earth site project, January 27, 2026 and March 19, 2024 selector references, and the official Louisiana DOTD 2024 aerial source. Site context is explicitly separated from asset-specific observations. The March 2024 selector option was not individually reviewed; selector dates are not acquisition dates for every pixel, and Earth links may reopen with currently available imagery. No Google imagery, 3D mesh, or native catalog features are copied into the application.

Applicable follow-up notes cover the 24-map/28-workbook water-meter discrepancy, unassigned shutoff service relationships, the 39-source/37-model column discrepancy, estimated bench/bin geometry, and unverified elevations/stairs in Units 101 and 103. Water-meter notes use explicit source utility metadata and never classify an electric or unknown meter by its label.

Local review attaches this catalog to existing permanent records in one atomic browser-storage write when the twin opens. Stable evidence IDs make repeated opens idempotent. The first attached snapshot is retained when a catalog entry changes; later corrections require a new evidence ID. A newly created record can receive available catalog references through its **Attach research references** button.

## Record contract and storage

Each entry stores `id`, `title`, HTTPS `url` (optional for a note), `kind`, `status`, `scope`, `sourceDate`, `sourceDateLabel`, `dateMeaning`, `reviewedAt`, `provider`, and `notes`. Date labels preserve partial dates and imagery ranges without inventing a day. The date's meaning is displayed alongside the distinct review date. New evidence does not update inspection condition, field-verification status, model location, or served-unit relationships.

Evidence reuses the existing append-only `physical_asset_bindings` storage:

- `source_key`: `evidence:<permanent asset ID>:<stable evidence ID>`
- `model_id`: `otb-evidence`; `model_version`: `evidence-v1`; `object_id`: empty
- `metadata.evidence`: the validated snapshot, without geometry or placement fields

The API returns the asset ID, binding ID and created timestamp with each entry. It does not claim an attested author. Renaming or rebinding a model object keeps the evidence on the same permanent ID. JSON exports are records of evidence, not a verified asset survey or an automatic import/sync mechanism.

Local review uses the existing property-scoped localStorage register; photos remain in IndexedDB. Evidence survives reload on the same browser/origin. It does not sync to another browser or the hosted database, and clearing browser site data removes the local copy. Export important records before clearing site data.

Hosted initialization remains read-only. An authenticated operator must explicitly save the candidate and attach references. Owner access remains read-only. Input validation precedes candidate registration. Hosted writes reuse the prepared bindings table, property scope, RLS and session guards, with no new migration or local fallback. Hosted batches are sequential; if an item fails, earlier successful entries remain and the panel refreshes to show actual saved progress. Cross-client unique-key conflicts retain the stored original and surface an error for reload/retry.

No deployment, migration application or live Supabase write was performed for this change. Existing hosted rollout checks in `asset-twin-release.md` remain required.

## Validation

- Automated coverage: safe links, real dates and date meanings, immutable snapshots, duplicate/concurrent calls, source mapping isolation, rename/rebind/reload persistence, property separation and storage failure rollback. Hosted mocks cover candidate gates, property-scoped payloads, denied writes without fallback and sign-out races.
- UI rendering tests cover escaping, read-only controls and date/scope caveats. Catalog mapping tests cover water/electric distinction and appropriate fixture/unit notes.
- Full suite: 873 tests; 872 passed under the restricted sandbox. The remaining Vite config-loader test was blocked by parent-directory permissions and passed on rerun with normal filesystem access (all 10 tests in its file passed).
- Production build passed using the supported runner config loader; existing bundle-size warnings remain.
- Live browser: C12 showed five saved references; an explicitly labeled QA note saved on the existing QA asset survived reload with the same permanent ID, prior Monitor inspection and verification-pending state.

Run with the existing dependencies: `npm run dev:review`. Validate with `npm test` and `npm run build -- --configLoader runner`.
