# Naming, IDs and versioning

Names are lookup aids, never proof of authority. IDs identify entities; source revisions identify evidence; asset revisions identify outputs. Keep these concerns separate.

## Paths and filenames

- Lowercase kebab-case for new folders and files. Use forward slashes in manifests and repo-relative links.
- Property slug: `on-the-boulevard`. New properties receive their own slug, not a copy with hard-coded OTB labels.
- Proposed filename pattern: `{scope}--{entity}--{view}--{variant}--v{revision}.{ext}`.
- `scope` is `shared` or a property slug; `view` can be `plan`, `front`, `rear`, `isometric`, `detail`, `icon`, `model`; `variant` can be `light`, `dark`, `neutral`, `outline` or a documented state.
- Example patterns (not shipped measured assets): `on-the-boulevard--sign-001--front--neutral--v1.svg`; `shared--light-pole--icon--outline--v1.svg`.
- Pair asset metadata by identical basename with `.asset.json`, using `asset.schema.json`. Keep source hashes and tool settings in metadata, not in a very long filename.
- Preserve native source filenames and revisions. Register an alias rather than renaming a survey or CAD drawing during intake.

## Stable entity and source IDs

Use the existing canonical IDs whenever possible. When new IDs are needed, the schemas permit lowercase letters/numbers with hyphenated segments. Recommended readable IDs: `property-on-the-boulevard`, `building-<stable-key>`, `suite-<stable-key>`, `sign-<stable-key>`, `panel-<stable-key>`, `source-<stable-key>`, `asset-<stable-key>`.

Tenant names, suite numbers, array positions, file paths and display labels are mutable. Do not use them as the sole database identity. Keep legacy IDs, source-system keys and lookup aliases in the migration register. Property-scoped IDs must be globally disambiguated when joined across properties. Preserve suite numbers exactly as display labels (including letters/leading zeroes); normalize only lookup keys with a recorded mapping.

For geometry, name selectable SVG groups/model nodes with a stable entity link; attach the canonical ID as data/metadata. Separate panel slot identity from the artwork currently occupying it. Revision changes do not manufacture a new physical entity.

## Versions and lifecycle

- Package and schema contract: semantic versions. A breaking consumer contract needs a versioned adapter/migration and consumer tests.
- Source: retain supplier revision plus hash/immutable version and applicable dates. `LastWriteTime` is only filesystem metadata.
- Derivative: increment output revision when input, transform, simplification, labels or style changes. Record all of them.
- Visual approval and geometry verification are independent. Never call a draft `verified` because its filename contains `final`, `approved`, `accurate` or `production`.
- Do not overwrite released artifacts in place. Preserve the old revision and aliases until the mapped consumers have migrated and removal has explicit approval.

## Duplicates and collisions

Exact content hashes identify byte duplicates, not necessarily duplicate business entities. Different files may be necessary delivery variants or carry different rights. Near-duplicates need visual/semantic comparison, source lineage and consumer checks. A case-only filename change can break deployments or collide on Windows; include case sensitivity and URL checks in migration QA. Never delete all but the newest copy automatically.
