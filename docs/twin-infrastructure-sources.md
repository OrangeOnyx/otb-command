# Infrastructure source inventory

The supplied records yield **28 water meter IDs, 28 electric meter IDs and 23 time-clock reference groups supported by 24 photos**. These are 79 source inventory records, not a claim that every referenced device is currently installed or operational. The asset register assigns its own permanent UUIDs when importing these stable source keys.

`src/data/twin-infrastructure.json` contains the source inventory, exact workbook cell values and provenance, source hashes, image references, map annotations and unresolved associations. `tools/extract-twin-infrastructure.py` reproduces it without changing the workbook or original images. `test/twin-infrastructure.test.mjs` guards exact identifiers, associations and unresolved counts.

## Meter workbook

Source: `Water Meter Number Reference.xlsx`, **Sheet1!A3:H32**, 30 rows. Columns A–C identify the address/qualifier; D is Electric Meter; E is Water Meter; F contains the Sprinkler designation on row4; G/H report meter size/approximate location. All original A:H values, raw XML cell values and exact row/cell references are retained. Whole-number numeric addresses stored as `101.0` are associated with visible unit `101`, while the raw `101.0` remains in provenance. Meter identifiers are preserved as strings.

- **113:** two distinct water IDs, `W1252003` at E10 and `W1202593` at E11. Their locations differ. Both remain separate records.
- **House services:** rows4,19,27 remain common-area associations (`unit:null`) with the source address preserved. Row4 explicitly identifies `W1217102` as **Sprinkler**.
- **123:** `W1276858` has location `?` at H18. It remains unlocated.
- **117.5:** workbook row14 and a clock-photo filename use this label. It is retained, without aliasing to117 or119.5 when the active suite roster lacks it.
- **105 #2:** the qualifier is preserved without interpreting its meaning or inventing another suite.
- **135 #A / #B:** the explicit suffix maps to135A/135B, while original address/qualifier values are retained.
- **131 size:** G23 literally contains `3/4'`; that punctuation has not been silently corrected.
- No workbook row establishes shared meter service across different units. Repeated nearby-location text does not prove shared plumbing.

Electric records do not inherit water-meter size/location as electrical facts. Workbook source dates are unavailable; source file modification dates are not substituted for an inspection date.

## Water map and GIS references

`Water Shutoff Clusters.png` and `All Water Shutoffs.png` are byte-identical (SHA256 `6f5fa658e34a77b63ea11fad467ed925f6f6b2e7c88510215497f5c162a10929`). They are one map with two filenames.

The legend identifies **six blue City meter markers** and **13 red Tenant Shut Off markers**. It does not define their numeric labels as counts or IDs. The extraction therefore retains19 **map annotations**, with literal labels and circle-center coordinates in the original **2500×1164 image pixel space**. It creates no physical valve records, expands no marker into multiple assets and assigns no workbook meter to a marker. Physical shutoff count and marker membership remain unknown. The map transcription is hash-guarded so a replaced source requires visual review.

`image001 (1).png`, `image002.png` and `image004.png` are historical GIS screenshots, each displaying **7/14/2021** on the Windows taskbar. That is a screenshot UI date, not a survey certification or guaranteed imagery date. Cursor latitude/longitude in the status bar is not treated as an image control point. No 3D, map-registration or underground route coordinates are invented.

## Time-clock references

All24 supplied HEIC originals remain unchanged. Their JPEG previews are under `src/assets/twin/infrastructure/`; each preview is orientation-corrected, fitted within1600pixels and saved at JPEG quality88. Original hashes, original dimensions, EXIF date values and preview dimensions remain in the source catalog. Preview JPEGs omit embedded EXIF/GPS metadata; dates used in the inventory are separately labeled source metadata.

EXIF DateTimeOriginal values place these photos in **November2021**. They are historical references, not current condition observations. The six inspected previews are101,117.5, both119.5 photos,131/133 and145. Image-specific visible labels are recorded only for those previews; remaining photo content is not represented as reviewed. Visible clock dial positions are not interpreted as current switching schedules or evidence of proper operation.

- **101:** visible101 sticker and IntermaticT101 label.
- **117.5:** visible117.5 sticker, corroborating the filename; no model number is asserted.
- **119.5:** the first photo shows an IntermaticT103 with119.5 sticker. The second shows a TORK1101; a119.5 sticker is not visible in that frame. Both images remain in one reference group, and their different device appearances are flagged. Current physical clock count, circuitry and placement remain unresolved.
- **131/133:** one photo contains **two timer boxes**; the left box is labeled131/133. The source group retains `servedUnits:["131","133"]`, with `unit:null`. Individual device-to-unit assignment is not inferred.
- **145:** its filename lacks “Time Clock,” but the supplied folder and visible145 sticker support the reference. Its visible model label isT103.

Time clocks use existing asset type `other` with `metadata.assetKind:"time_clock"`. No database enum expansion is needed. Multiple photos do not automatically become multiple physical assets.

## Reproduction and integration

Run from the isolated checkout with the bundled Python runtime:

```text
python tools/extract-twin-infrastructure.py --source-dir ../infrastructure-intake --heif-package ../heif-decoder
node --test test/twin-infrastructure.test.mjs
```

The decoder path contains the explicitly installed `pillow-heif` package. If its sandbox ACL prevents reading, run the same authorized local extraction with filesystem escalation; do not change ACLs or silently discard image references. The extractor fails instead of replacing verified preview references when the decoder is unavailable.

Pass `items` to `initializePhysicalAssets({items})`. Metadata preserves identifiers, source references and associations, while unknown condition, circuit and placement stay unknown. `metadata.sourceImage`/`sourceImages` are logical paths such as `infrastructure/time-clock-101.jpg` for the UI's bundled-image lookup. `mapAnnotations` are reference-only; they are not input to physical-asset seeding. No source item contains `metadata.position` or invented 3D geometry.
