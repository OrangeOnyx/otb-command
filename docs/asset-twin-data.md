# Physical asset register

Each physical asset receives a random `pa_<UUIDv4>` identity at registration. This identity survives display-name changes and model replacement. Model IDs, source wall GUIDs, positions and model dimensions belong to separate source bindings, not to physical identity. An unknown replacement-model object is a new candidate until an operator explicitly binds it to an existing asset. Matching labels do not prove identity.

## Current boundary

- Source candidates start **uninspected**, **unverified**, with unknown actual material/dimensions. Model dimensions remain separately labeled in source-binding metadata.
- Condition derives from the newest inspection date, then entry time. Inspection records and source bindings are append-only. Corrections are additional records/revisions.
- Physical inventory covers units, columns, HVAC, lights, meters, shutoffs, drains, roofs, cameras, signs, walkways and other assets. Only provided units/columns are seeded; no equipment, condition or inspection is invented.
- `unit` is an optional related suite. A common-area column has `unit: null`; its display label is never substituted for a tenant's unit number.
- There are no live sensors, engineering certification, automatic defect diagnosis or guaranteed spatial registration.

## API (`src/lib/physical-assets.js`)

```js
await initializePhysicalAssets({
  units: UNITS, columns: modelData.columns,
  items: [], // genuine inventory: {sourceKey,type,label,unit?,metadata?,objectId?}
  modelId: 'otb-floorplanner', modelVersion: modelData.source.sha256,
  propertyKey: 'otb',
});
listPhysicalAssets({ type: 'column' }); // optional type/unit filters
getPhysicalAsset(id);
getPhysicalAssetForModelObject(column.id);
getPhysicalAssetForSource(physicalAssetSourceKey(column));
await savePhysicalAsset({ id, type, label, unit, material, dimensions, notes, verification });
await bindModelSource(id, {
  sourceKey: 'manual:' + id, modelId: 'manual-placement', modelVersion: 'revision-2',
  objectId: id, metadata: { position: [x, y, z], placement: 'operator-placed-unverified' },
});
await appendPhysicalAssetInspection(id, {
  date: '2026-09-24', condition: 'monitor', notes: 'Observed paint wear',
  inspector: 'Observer name', material: '', dimensions: { unit: 'm' },
});
listPhysicalAssetInspections(id);
await addPhysicalAssetPhoto(file, id, inspectionIdOrNull);
await listPhysicalAssetPhotos(id); // [{ id, name, url, asset_id, inspection_id, ... }]
const unsubscribe = onPhysicalAssetsChange(render);
getPhysicalAssetsStatus();
```

Dimensions use `{width?,depth?,height?,diameter?,unit:'m'|'ft'|'cm'|'in'}`; omitted values mean unknown. Records expose `persisted`, `bindings`, `inspections`, `lastInspection` and derived `condition`. Allowed conditions are `uninspected`, `good`, `monitor`, `repair`, `urgent`. `verification` is `unverified` or `field-verified`; operator entry of that flag is not independent certification.

Optional `items` supports existing inventory and plan pins with a stable caller-supplied `sourceKey`. It imports identity/context only and invents no position, dimensions or condition. Put plan pixels in metadata under a distinct key such as `planPosition`; only an explicit model-coordinate `metadata.position` is spatial placement. Unit bindings retain `sourceUnit` and roster `sourceLabel`. Hosted source seeding rejects a `propertyKey` that does not match the active property slug.

Same source key + model revision can bind only once. A changed/repaired association on the same physical record uses a new revision; its prior binding survives. A source object already owned by another asset cannot be reassigned by changing the revision. Both the API and a database trigger enforce that rule, with a transaction lock for concurrent claims. Link an unclaimed replacement object instead; merging or reconciling two physical records is a separate workflow. Labels and source GUIDs can change without changing the asset ID. Consumers should use the latest applicable binding and keep the history. Photos return object URLs locally: revoke those when no longer displayed; remote signed URLs expire and must be refreshed.

## Persistence and security

Local review uses `otb-physical-assets:v1:<propertyKey>` in localStorage for records and the shared bucket-store factory's IndexedDB backend for binary photos. It reports **browser-only review data**, and does not touch hosted business records. Quota/denied/corrupt storage raises a visible error without pretending a write succeeded or overwriting corrupt data. No automatic browser-to-production migration exists.

Hosted mode reads through the existing `propertyContext()`. Initialization reloads hosted records on every opening and is read-only; missing source candidates are `persisted:false` until an operator explicitly saves. Save uses one database transaction for the physical asset and pending source bindings. Owners can read; operators can write. Sign-out clears the in-memory register; late responses cannot repopulate it. A missing migration/backend failure remains an error, never a silent switch to a browser database.

Migration `20260924120000_physical_assets.sql` provides property-membership RLS, immutable asset identity/tenancy, composite foreign keys for evidence, append-only inspection/binding privileges, and a private photo bucket. A dedicated bucket reuses existing `createBucketStore` code while avoiding the older general assets bucket's default-property security bridge. Only unreferenced failed-upload files can be deleted by the cleanup policy. The client accepts JPEG/PNG/WebP/GIF photos up to 25 MB.

Maintenance integration should reference `physical_assets(id,org_id,property_id)` using the same property context. Preserve original maintenance unit semantics and role policies. Asset data contains no tenant finance or lease details.

## Release verification

Run `node --test test/physical-assets.test.mjs` plus app checks. The tests cover identity preservation, model-revision history, inspection ordering, unknown defaults, property-separated local review, storage failure and corrupt-storage protection. The migration is prepared but **not applied or exercised against a live database** in this implementation. Before hosted deployment, apply it in a disposable Supabase environment and verify operator writes, owner reads, cross-property denials, append-only evidence, private photo access and concurrent registration conflict rollback.
