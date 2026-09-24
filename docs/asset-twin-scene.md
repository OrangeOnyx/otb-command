# Asset twin scene engine

`src/lib/asset-twin-scene.js` owns the canvas, source model, local marker overlay and camera. It does not own application panels, global CSS, records or persistence. The container must have a nonzero rendered height. Call `dispose()` when its route closes.

```js
import { createAssetTwinScene } from './lib/asset-twin-scene.js';

const scene = createAssetTwinScene(container, {
  data: modelData, // public/twin/model-data.json, unchanged source schema
  modelUrl: '/twin/model.glb',
  onSelect(selection) { /* update the application inspector */ },
  onMeasurement(measurement) { /* display model distance */ },
  onChange(event) { /* mode, layers, tour state, loading/error status */ },
});
await scene.ready;
```

Coordinates are meters with Y up. Column `position` is its geometry center, not its ground point. Stable source IDs are `modelData.columns[].id`. Geometry and source metadata are never written by the engine.

## Selection and cameras

- `selectSource(sourceId | null)` and `focusSource(sourceId)` select or frame a source column. Unknown IDs return `false`. Programmatic selection does not echo `onSelect`.
- `selectAsset(assetId | null)` and `focusAsset(assetId)` select or frame a located asset pin; unlocated assets should remain in the application register.
- User picks emit `{kind:'source', sourceId, column}` or `{kind:'asset', assetId, pin}`. Selection uses the nearest visible, unclipped hit; opaque geometry occludes other objects. Faded walls and translucent source glazing allow selecting visible columns behind them. Marker buttons and the external register are explicit selection shortcuts.
- `setView('overview' | 'plan' | 'eye')` changes camera mode. Overview fits the entire source bounds; plan uses an orthographic camera. Eye view frames the selected or first source column from a ray-tested position.
- `getEyePlacement(sourceId)` returns `{position, target, onWalkway}` or `null`. The engine ray-tests walls and other columns, then prioritizes the native walkway surface. It does not use an obstructed fallback. Current geometry tests confirm all 37 candidates have a clear eye position on that walkway.
- Eye controls: drag to look, WASD to move, Shift for a larger step, left/right arrows to step through columns, Escape to cancel tools and selection. Movement respects source walls/columns and a bounded site envelope; it is not a surveyed route or accessibility clearance check.
- `saveView()` returns a JSON-serializable versioned camera/layer/section/selection snapshot. `restoreView(snapshot)` validates positions, zoom, layer IDs and section height before restoring. Invalid snapshots return `false`.
- `startTour(stops)` accepts source IDs or `{sourceId, durationMs}` records. Only registered columns with tested eye positions are visited. Durations are bounded to 1.5–60 seconds, with a four-second default. `stopTour()` cancels the timer. No tour starts automatically. Tour transitions are camera cuts rather than camera travel through buildings; reduced-motion users receive the same motion-free cuts. Canvas interaction stops playback.

## Layers and appearance

`setLayer(category, visible)` accepts the source category IDs (`walls`, `floors`, `walkway`, `canopy`, `columns`, `openings`) plus `assets` for registered pins. The source canopy defaults hidden according to metadata.

- `setHighlight(boolean)` controls column emphasis, and `setLabels(boolean)` controls overview/plan labels.
- `setConditionColors(mapOrObject)` accepts stable source/asset IDs mapped to explicit hex/CSS colors, `{color}` records, or `unknown`, `good`, `monitor`, `attention`, `critical`, `unverified`. No condition is inferred from geometry.
- `setFadeWalls(boolean)` reduces wall opacity; it does not remove wall geometry or change collision checks.
- `setSectionHeight(meters | null)` clips source walls and canopy above a clamped horizontal height. It adds no invented cut-face geometry. Columns remain visible for inspection. Set `null` to remove clipping.
- `setPresentation(boolean)` hides grid, labels, asset pins, measurement overlays and column highlighting/condition overlays. The underlying source geometry and record data are unchanged.
- `setFinishPalette({walls, columns, walkway, canopy, canopyTop, glazing})` accepts hex colors supplied by the caller. Pass `null` to restore the original GLB material colors. It can be called before or after `ready`. Upward-facing triangles of the existing flat canopy use `canopyTop`; sides and underside use `canopy`. This material split uses existing normals and does not create roof pitch, fascia, storefront frames or other new geometry. Palette values may represent reference-photo interpretations, not verified material specifications.

Example appearance palette supplied from the user's current exterior reference:

```js
scene.setFinishPalette({
  walls: '#e6e2d7', columns: '#f0eee6', walkway: '#aaa9a1',
  canopy: '#d8cfba', canopyTop: '#666760', glazing: '#a8bdc5',
});
scene.setPresentation(true);
```

## Located assets and manual placement

`setAssetPins([{assetId, label, position:[x,y,z], kind, condition}])` replaces the current pin set. It requires unique IDs and explicit finite positions within the source model's bounds plus a two-meter allowance; it returns `{accepted, rejected}`. It never invents a position for an unlocated asset. Pins are small display markers, not measured asset geometry. Caller records must retain position provenance and verification status.

`beginPlacement(callback)` activates an actual model-surface picker. On a valid hit it calls:

```js
{
  position: [x, y, z],
  verification: 'operator-placed-unverified',
  source: { meshAssetId, category }
}
```

`cancelPlacement()` or Escape cancels. The caller decides whether to persist the result and then sends the resulting registered pin through `setAssetPins`. Picking cannot place an asset on empty space or a highlight proxy. Placement and measurement are mutually exclusive.

## Measurement and capture

`beginMeasurement()` waits for two clicks on visible, unclipped GLB surfaces; highlight proxies and asset pins are excluded. `onMeasurement` emits `{status, points, distanceMeters, label:'Model distance'}` with statuses `started`, `point`, `complete`, `cleared`. Distance is the full 3D meter distance between picked points, not a field measurement, walkway path length or construction dimension. `clearMeasurement()` removes the overlay. Translucent glazing in the source GLB remains a model surface.

`captureImage()` returns a PNG data URL of the rendered canvas or `null` before load. It captures geometry and rendered overlays, not DOM labels or application UI.

`getState()` returns mode, selection, layer, section, tool and tour state. `onChange` includes this snapshot plus a `reason`; `ready` includes `eyePlacementCount` and `eyePlacementGaps`. `error` and `graphics-context-lost` include a message. `resize()` is available, although a local ResizeObserver normally handles it.

## Validation

```powershell
node --test test/asset-twin-scene*.test.mjs
```

Tests cover real meter distances, invalid measurement bounds, camera containment across portrait/landscape ratios, malformed saved views, blocked eye candidates, all 37 source IDs and dimensions, and ray-tested eye placement against the packaged GLB. Browser acceptance still needs to exercise route lifecycle, canvas picking, clipping, pin placement, measurements and controls in the integrated application.
