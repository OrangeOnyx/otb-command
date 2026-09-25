# Official aerial context for the OTB water-reference comparison

## Included files

- `src/assets/twin/infrastructure/dotd-2024-aerial.jpg`: the unchanged JPEG returned by the official image service, 3072 × 3072 pixels, 2,979,845 bytes.
- `src/data/twin-water-official-imagery.json`: UI source entry `dotd-2024`, source attribution, retrieval evidence, image hash, projection, exact crop bounds and limitations.

The source is the [Louisiana DOTD 2024 Lafayette 6-inch RGBI ImageServer](https://maps.dotd.la.gov/imagery/rest/services/Imagery/2024_Lafayette_6IN_RGBI/ImageServer). Its description identifies 2024 aerial imagery with approximately six-inch source resolution. The exact flight date is not established; the service's January 1 time extent is not used as a capture date. The service metadata permits free use in products and publications, with informational/as-is and accuracy limitations.

## Retrieval and image identity

Retrieved at `2026-09-25T05:44:21.5858111Z` without an account or paywall. One bounded `exportImage` request returned this JPEG. No source map, frozen basemap, footprint geometry, asset location or registry record was changed.

- SHA-256: `2ea723da13726d3eae86dd0417acb8ca058217dc6cfcd0ce754069b31028d71f`
- Export projection: EPSG:3857 (ArcGIS 102100, latest WKID 3857).
- Source native projection: EPSG:6344, NAD 1983 (2011) UTM Zone 15N.
- RGB bands: 0, 1, 2; JPEG quality: 95; interpolation: bilinear.
- Returned bounding box, xmin/ymin/xmax/ymax: `[-10247606.63408044, 3529326.907011441, -10247148.011910727, 3529785.5291811535]`.
- Geographic bounding box: `[-92.05581665039062, 30.200333349994068, -92.05169677734375, 30.203893976001527]`.

The geographic crop comes from `src/data/sat-base.json` and contains the existing `src/data/footprints-geo.json` extent. It shows the OTB L-shaped center, parking, and Arnould/Johnston/Marie Antoinette/Patricia road arrangement. The property identity was checked visually against the supplied OTB GIS screenshots. Image values were not edited.

The complete reproducible request URL is retained in `provenance.exportRequestURL`; the transient ArcGIS output URL is intentionally not used as a permanent source link.

## Registration contract

The UI record initially has `registrationStatus: "unregistered-context-only"` and empty `annotations`. This means the image itself is georeferenced, but the water-source markers have not yet been registered to it. The full image is displayed with crop `{ x: 0, y: 0, width: 3072, height: 3072 }`.

The image is north-up. Pixel x increases east, pixel y increases south. For pixel-edge coordinates:

```text
projectedX = xmin + pixelX / imageWidth  * (xmax - xmin)
projectedY = ymax - pixelY / imageHeight * (ymax - ymin)
```

Pixel centers use `column + 0.5` and `row + 0.5`. Web Mercator spacing is a projected map spacing, not a surveyed ground distance. The repository's footprint georeference explicitly describes visual fitting to imagery; any water points derived through that transform must remain approximate. If an independent source registration is later added, retain its control points, transform, residuals, provenance and uncertainty.

## What the aerial adds

Use it to compare roofs, curbs, parking, rear service lanes and the overall position of source-map references. No individual water meter or shutoff was established by inspection of this image. It does not prove below-ground pipe routes, which unit a valve serves, ownership, accessibility or operability.

The supplied 2021 LUS ArcMap screenshots carry utility symbols that this aerial does not. No authoritative legend for their red boxed M symbols and blue/green line colors was found in the public official sources checked, so those symbols must not be silently converted into tenant shutoffs or traced pipe connections.

## Other official sources checked

- [LUS Builders & Developers](https://lus.org/business/builders-developers/) publicly links a [Sewer Service Laterals Map](https://luslaf.maps.arcgis.com/apps/webappviewer/index.html?id=0fe84e2e6aa8491fa03faf3e739d9cea). This is sewer context, not evidence of OTB water meter or shutoff membership. The research tool could not inspect the app's live layers or legend.
- [LCG Maps and GIS](https://www.lafayettela.gov/business-development/maps-and-gis/) publishes an official map gallery. Its [Lafayette Parish Address Search](https://www.arcgis.com/home/item.html?id=21b5c44c57564935aef09adcb6f0028b) description advertises aerial layers from 1958 through 2023, useful for historical comparisons.
- No current public OTB water-meter/shutoff inventory or exact legend for the supplied GIS screenshots was verified. This is a search result, not proof that such records do not exist.

The primary material addition from public sources is the bounded DOTD 2024 image. Preserve the user's utility map and workbook as separate evidence until their location and membership claims can be reconciled.

