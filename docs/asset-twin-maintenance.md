# Asset-linked maintenance

The twin uses the existing M-1 maintenance requests, append-only events, service-vendor roster and request photo folders. A permanent physical asset is an optional link on a request, not a new work-order system. A model column label such as C01 is never stored as a suite.

## Integration contract

```js
import { submitRequest, addMrPhoto } from '../lib/maintenance.js';
import { openMaintenanceRequest } from '../views/maintenance.js';

const requestId = await submitRequest({
  unit: 'common-area', // or the asset's actual suite, e.g. '101'
  title: 'Review reported issue',
  detail: 'Describe the observation; do not infer a defect from the model.',
  urgency: 'routine',
  assetId: asset.id, // pa_<UUIDv4>, independent of C01/model revision
  assetLabel: asset.label, // optional snapshot; the asset register supplies it
  spatialLocation: {
    modelId: 'otb-floorplanner',
    sourceKey: 'model:otb-floorplanner:column:C01',
    label: 'Column C01 model location',
    position: { x: 1, y: 0, z: 2 }, // optional, actual model values only
    units: 'm', // required if position is present
  },
}, account.email);
await addMrPhoto(photoFile, requestId); // optional image, max 25 MB
await openMaintenanceRequest(requestId);
```

`submitRequest` resolves the asset in the initialized physical-asset register. Hosted assets must already be explicitly saved in the same property; missing, retired, unsaved or mismatched assets fail. An asset with no suite association uses `common-area`. No source geometry or condition is fabricated. Stored request fields are `asset_id`, `asset_label` and `spatial_location`; existing `deriveRequest` preserves them while deriving status/assignment from events.

`openMaintenanceRequest(requestId)` navigates the existing `#maint` route, refreshes the RLS-visible queue, expands and focuses the card, including a finished request beyond the normal first 20. It resolves `true`, or throws if the queue/request is unavailable. It must be called after the app initializes maintenance. Opening a request does not change its status.

## Local review

Run `npm run dev:review` and use the loopback URL printed by Vite. Only explicit development review mode enables local maintenance writes. Requests and events persist under `otb-maintenance:local-review:v1:otb` in localStorage; image blobs use IndexedDB `otb-maintenance-photos-local-review-v1`, store `photos`. The request heads and events are append-only in the app. Local cards and the queue display a local-only notice. Vendor assignment records a review event; no message or dispatch is sent. The existing service-vendor roster populates the selector.

Reloading retains the review copy on the same browser/origin. Another browser, port or origin has separate data. Clearing site data removes it. There is no production sync, migration of review records, or fallback into local storage after a hosted failure. Tenant-login administration is unavailable in review mode. Normal offline mode cannot submit requests or photos.

## Hosted schema and access

Prepared migration `20260924121000_maintenance_asset_links.sql` follows `20260924120000_physical_assets.sql`. Neither is applied by this feature. The composite foreign key enforces the same organization/property, and an insert trigger verifies the active asset and suite/common-area association. Operators can create common-area and asset-linked requests; tenants retain creation for their actual suite without asset/spatial linkage. Owners retain read access, assigned vendors retain the existing workflow, and tenant reads/notes/photos exclude common-area requests.

No update/delete permission is added to request heads or maintenance events. Existing bucket policies still use the repository's single-property bridge; this change does not claim multi-property photo isolation has been redesigned. Test the prepared migrations and role matrix in an isolated Supabase environment before deployment. No database or production writes are part of local verification.

## Validation

Run `node --test test/maintenance.test.mjs test/maintenance-evidence.test.mjs test/local-review.test.mjs test/maintenance-asset-twin.test.mjs` and `npm run build`. The integration tests exercise local submission, asset identity checks, append-only assignment/status, reload persistence and request-scoped photo storage through Vite's development module loader. Browser acceptance should also create a review request from a model asset, open M-1, assign a vendor, change status, upload a photo and reload.

In a restricted Windows sandbox, the default bundled config loader may report an esbuild parent-directory access error. `npm run build -- --configLoader runner` builds the same production configuration without that config-bundling path. This passed during local validation; existing JSON import-attribute and chunk-size warnings remain.
