"""Read supplied infrastructure sources into a traceable, unlocated inventory.
Never edits the workbook/original imagery. XLSX extraction uses standard XML.
HEIC previews are optional format conversions; original photo bytes are retained.
"""
import argparse
from collections import Counter, defaultdict
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
WORKBOOK = "Water Meter Number Reference.xlsx"
MAP_FILE = "Water Shutoff Clusters.png"
MAP_ALIAS = "All Water Shutoffs.png"
TRANSCRIBED_MAP_SHA256 = "6f5fa658e34a77b63ea11fad467ed925f6f6b2e7c88510215497f5c162a10929"
# Literal map labels transcribed visually, ordered left to right in each color.
# These are NOT interpreted as physical meter/valve IDs or quantities.
MAP_LABELS = {"city-meter": ["8", "1", "8", "4", "1", "2"],
              "tenant-shutoff": ["2", "1", "4", "1", "10", "2", "4", "2", "4", "2", "1", "3", "1"]}
PHOTO_OBSERVATIONS = {
    "101 Time Clock.HEIC": {"visibleDeviceCount": 1, "unitStickerText": "101", "manufacturerText": "INTERMATIC", "modelText": "T101"},
    "117.5 Time Clock.HEIC": {"visibleDeviceCount": 1, "unitStickerText": "117.5", "manufacturerText": "INTERMATIC", "modelText": None},
    "119.5 Time Clock.HEIC": {"visibleDeviceCount": 1, "unitStickerText": "119.5", "manufacturerText": "INTERMATIC", "modelText": "T103"},
    "119.5 Time Clock 2.HEIC": {"visibleDeviceCount": 1, "unitStickerText": None, "manufacturerText": "TORK", "modelText": "1101"},
    "131 133 Time Clock.HEIC": {"visibleDeviceCount": 2, "unitStickerText": "131/133 (left box)", "manufacturerText": "INTERMATIC (left box label)", "modelText": None},
    "145.HEIC": {"visibleDeviceCount": 1, "unitStickerText": "145", "manufacturerText": "INTERMATIC", "modelText": "T103"},
}

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def source_record(root, relative, kind):
    path = root / relative
    return {"id": relative, "filename": path.name, "relativePath": relative,
            "sourcePath": str(path.resolve()), "kind": kind, "sha256": digest(path), "bytes": path.stat().st_size}

def read_workbook(path):
    """Preserve underlying strings/identifiers and raw cell values, including blanks."""
    with ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            shared = ["".join(el.itertext()) for el in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = workbook.findall("s:sheets/s:sheet", NS)
        if len(sheets) != 1 or sheets[0].get("name") != "Sheet1":
            raise ValueError("Unexpected workbook sheets; inspect the changed source before extraction")
        cells = {}
        for cell in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).findall(".//s:sheetData/s:row/s:c", NS):
            address = cell.attrib["r"]
            value = cell.find("s:v", NS)
            raw = value.text if value is not None else None
            typ = cell.get("t", "n")
            if cell.find("s:f", NS) is not None:
                raise ValueError(f"Formula at {address}: extraction requires an explicitly reviewed formula/cached value")
            if typ == "s" and raw is not None:
                decoded = shared[int(raw)]
            elif typ == "inlineStr":
                decoded = "".join(cell.find("s:is", NS).itertext())
            else:
                decoded = raw
            cells[address] = {"value": decoded, "raw": raw, "storageType": typ}
        rows = []
        for row in range(3, max(int(re.sub(r"\D", "", a)) for a in cells) + 1):
            values = {col: cells.get(f"{col}{row}", {}).get("value") for col in "ABCDEFGH"}
            if not any(values.values()):
                continue
            if not values["A"]:
                raise ValueError(f"Missing address at row {row}")
            rows.append({"sheet": "Sheet1", "row": row, "range": f"A{row}:H{row}", "values": values,
                         "rawCells": {f"{col}{row}": cells.get(f"{col}{row}", {"value": None, "raw": None, "storageType": None}) for col in "ABCDEFGH"}})
    return rows

def address_unit(values):
    # XLSX stores whole-number addresses as e.g.101.0. Preserve that exact raw
    # value in sourceRows, while matching the visible unit label101 in the app.
    address = format(Decimal(str(values["A"])).normalize(), "f")
    suffix = values["C"]
    if suffix == "House":
        return None, f"{address} House"
    if suffix in ("#A", "#B"):
        return address + suffix[1:], address + " " + suffix
    return address, address + (" " + suffix if suffix else "")

def meter_items(rows):
    items = []
    for row in rows:
        v = row["values"]
        unit, original_unit = address_unit(v)
        for column, utility in [("D", "electric"), ("E", "water")]:
            meter = v[column]
            if not meter:
                continue
            items.append({"sourceKey": f"utility-meter:{utility}:{meter}", "type": "meter",
                "label": f"{utility.title()} meter {meter}", "unit": unit,
                "modelId": "water-meter-reference-workbook", "modelVersion": "source-workbook-v1", "objectId": meter,
                "metadata": {"assetKind": "utility_meter", "utility": utility, "meterIdRaw": meter,
                    "originalUnitLabel": original_unit, "sourceAddressNumber": v["A"], "sourceStreet": v["B"], "addressQualifierRaw": v["C"],
                    "associationBasis": "Explicit workbook row; present service connections not field verified",
                    "serviceAreaRaw": v["C"] if v["C"] == "House" else None,
                    "purposeRaw": v["F"] if utility == "water" else None,
                    "reportedMeterSizeRaw": v["G"] if utility == "water" else None,
                    "approximateLocationRaw": v["H"] if utility == "water" else None,
                    "locationStatus": "unknown" if utility != "water" or v["H"] in (None, "?") else "source-description-only",
                    "sourceImage": None, "sourceRefs": [{"file": WORKBOOK, "sheet": row["sheet"], "row": row["row"], "range": row["range"], "meterCell": f"{column}{row['row']}"}],
                    "physicalVerification": "not-verified", "currentCondition": "unknown"}})
    counts = Counter(i["sourceKey"] for i in items)
    if any(n > 1 for n in counts.values()):
        raise ValueError("Duplicate meter identifier requires explicit source reconciliation")
    return items

def color_components(path):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    width, height = im.size
    pools = {"city-meter": set(), "tenant-shutoff": set()}
    pixels = im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()
    for n, (r, g, b) in enumerate(pixels):
        x, y = n % width, n // width
        if x > 2100 and y < 180:  # legend symbols, not map observations
            continue
        if b > 220 and r < 45 and g < 45:
            pools["city-meter"].add(n)
        elif 200 < r < 250 and 65 < g < 135 and 65 < b < 135:
            pools["tenant-shutoff"].add(n)
    markers = []
    for category, pool in pools.items():
        components = []
        while pool:
            start = pool.pop()
            seen, queue = [start], [start]
            while queue:
                n = queue.pop()
                for neighbor in (n - 1, n + 1, n - width, n + width):
                    if neighbor in pool:
                        pool.remove(neighbor); queue.append(neighbor); seen.append(neighbor)
            if len(seen) > 250:
                xs, ys = [p % width for p in seen], [p // width for p in seen]
                components.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2))
        components.sort()
        if len(components) != len(MAP_LABELS[category]):
            raise ValueError(f"Unexpected {category} marker count {len(components)}; do not carry old transcriptions into changed image")
        for index, ((x, y), label) in enumerate(zip(components, MAP_LABELS[category]), 1):
            markers.append({"id": f"water-map:{category}:{index:02d}", "category": category,
                "legendText": "City meter" if category == "city-meter" else "Tenant Shut Off",
                "markerLabelRaw": label, "markerLabelMeaning": "unresolved: source does not define counts versus IDs",
                "physicalAssetCount": None, "memberMeterIds": [], "servedUnits": [],
                "sourceImage": "infrastructure/water-shutoff-map.png",
                "sourceRefs": [{"file": MAP_FILE, "aliases": [MAP_ALIAS]}],
                "imagePoint": {"x": x, "y": y, "width": width, "height": height, "units": "source-image-pixels", "method": "colored circle bounding-box center"},
                "registration": "2D source image only; no 3D or geographic transform"})
    return markers

def preview_name(path):
    return "time-clock-" + re.sub(r"[^a-z0-9]+", "-", path.stem.lower().replace(" time clock", "")).strip("-") + ".jpg"

def time_clock_items(root, preview_dir, heif_package=None):
    if heif_package:
        sys.path.insert(0, str(Path(heif_package).resolve()))
    decoder = False
    decode_note = None
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
        decoder = True
    except (ImportError, AttributeError, PermissionError) as exc:
        decode_note = f"HEIC preview decoder unavailable: {type(exc).__name__}"
    if not decoder:
        raise RuntimeError(decode_note + "; run with access to the supplied HEIC decoder instead of replacing verified photo references with missing previews")
    from PIL import Image, ImageOps
    groups = defaultdict(list)
    files = []
    for path in sorted((root / "Unit Time Clocks").glob("*.HEIC")):
        original_group = re.sub(r"\s+Time Clock(?:\s+\d+)?$", "", path.stem, flags=re.I)
        units = original_group.split()
        source = source_record(root, path.relative_to(root).as_posix(), "time-clock-photo")
        source["previewStatus"] = "not-generated"
        if decoder:
            try:
                with Image.open(path) as im:
                    source["sourceDimensionsPixels"] = list(im.size)
                    exif = im.getexif()
                    source["exifDateTimeRaw"] = exif.get(306)
                    source["captureDateRaw"] = exif.get_ifd(34665).get(36867)
                    source["dateBasis"] = "EXIF DateTimeOriginal; source camera metadata, not a field-inspection date"
                    preview = ImageOps.exif_transpose(im).convert("RGB")
                    preview.thumbnail((1600, 1600))
                    filename = preview_name(path)
                    preview.save(preview_dir / filename, "JPEG", quality=88)
                    source["previewPath"] = "infrastructure/" + filename
                    source["previewDimensionsPixels"] = list(preview.size)
                    source["previewStatus"] = "converted"
            except Exception as exc:
                source["previewStatus"] = "decode-failed"
                source["previewError"] = str(exc)
        elif decode_note:
            source["previewError"] = decode_note
        if path.name in PHOTO_OBSERVATIONS:
            source["visualObservations"] = {**PHOTO_OBSERVATIONS[path.name], "basis": "Visual reading of converted source photo; no current operation, circuitry or schedule inferred"}
        files.append(source)
        groups[original_group].append(source)
    items = []
    for name, sources in groups.items():
        units = name.split()
        items.append({"sourceKey": "time-clock-reference:" + name.replace(" ", "+"), "type": "other",
            "label": "Time clock reference · " + ("Units " if len(units) > 1 else "Unit ") + "/".join(units),
            "unit": units[0] if len(units) == 1 else None, "modelId": "unit-time-clock-photo-folder", "modelVersion": "source-photos-v1", "objectId": name,
            "metadata": {"assetKind": "time_clock", "servedUnits": units, "originalUnitLabel": name,
                "associationBasis": "Source folder and filenames only; served circuits and present operation unverified",
                "sourceImage": next((s["previewPath"] for s in sources if s.get("previewPath")), None),
                "sourceImages": [s["previewPath"] for s in sources if s.get("previewPath")],
                "sourceRefs": [{"file": s["relativePath"], "sha256": s["sha256"]} for s in sources],
                "photoObservations": [{"file": s["relativePath"], **s["visualObservations"]} for s in sources if s.get("visualObservations")],
                "captureDatesRaw": [s["captureDateRaw"] for s in sources if s.get("captureDateRaw")],
                "physicalClockCount": None, "photoCount": len(sources), "circuit": None, "schedule": None,
                "currentCondition": "unknown", "locationStatus": "unlocated", "physicalVerification": "not-verified",
                "notes": "Multiple photos do not establish multiple clocks." if len(sources) > 1 else "No circuit, schedule or location has been inferred from the filename."}})
    return items, files

def extract(source_dir, preview_dir, heif_package=None):
    root, preview_dir = Path(source_dir).resolve(), Path(preview_dir).resolve()
    preview_dir.mkdir(parents=True, exist_ok=True)
    rows = read_workbook(root / WORKBOOK)
    meters = meter_items(rows)
    clocks, clock_sources = time_clock_items(root, preview_dir, heif_package)
    if digest(root / MAP_FILE) != digest(root / MAP_ALIAS):
        raise ValueError("Shutoff maps are no longer identical; review before treating them as aliases")
    if digest(root / MAP_FILE) != TRANSCRIBED_MAP_SHA256:
        raise ValueError("Map image changed; visually recheck numeric label transcriptions before extraction")
    shutil.copyfile(root / MAP_FILE, preview_dir / "water-shutoff-map.png")
    map_annotations = color_components(root / MAP_FILE)
    sources = [source_record(root, WORKBOOK, "workbook"), source_record(root, MAP_FILE, "annotated-water-map"), source_record(root, MAP_ALIAS, "identical-map-alias")]
    for filename in ["image001 (1).png", "image002.png", "image004.png"]:
        record = source_record(root, filename, "historical-gis-screenshot")
        record.update({"dateVisibleInScreenshot": "2021-07-14", "dateBasis": "Windows taskbar display; not a guaranteed GIS survey date",
                       "geographicRegistration": "Unavailable: cursor coordinates are not image control points"})
        sources.append(record)
    sources += clock_sources
    ambiguities = [
        {"id": "source-113-two-water-meters", "detail": "113 appears with W1252003 at E10 and W1202593 at E11, with different approximate locations. Both identifiers are retained; no meter is merged."},
        {"id": "source-123-location", "detail": "W1276858 (E18) has approximate location '?' (H18); it remains unknown."},
        {"id": "source-house-services", "detail": "House rows 4,19,27 are common-area/source-service associations, not tenant assignments. Row4 water purpose is explicitly Sprinkler."},
        {"id": "source-117-5", "detail": "117.5 appears in workbook row14 and a time-clock filename. Preserve this source label even if absent from the active suite roster; do not alias to117 or119.5."},
        {"id": "source-105-qualifier", "detail": "105 row6 qualifier '#2' is preserved; its meaning is not supplied and has not been turned into a separate suite."},
        {"id": "source-131-size", "detail": "G23 literally contains 3/4' rather than 3/4\". The punctuation is preserved, not silently corrected."},
        {"id": "source-131-133-time-clock", "detail": "The single '131 133 Time Clock' photo visibly contains two timer boxes. The left sticker reads131/133. Record servedUnits [131,133] with no individual circuit or unit assignment; present installation count is unverified."},
        {"id": "source-119-5-time-clock", "detail": "Two119.5 photos are grouped as one source reference. One shows IntermaticT103 with119.5 sticker; the other shows TORK1101 without a visible unit sticker in its frame. They depict different device appearances, but current inventory and served circuits remain unverified."},
        {"id": "source-clock-history", "detail": "Photo EXIF DateTimeOriginal values are in November2021. These are historical references, not a September2026 condition inspection."},
        {"id": "source-water-map-numbers", "detail": "The legend defines colors, not numeric labels. Marker numbers are not treated as meter IDs, valve IDs or quantities. No workbook-to-marker membership is asserted."},
        {"id": "source-gis-history", "detail": "All three GIS screenshots display7/14/2021 in the taskbar; they are historical reference with no inferred pipe survey or 3D registration."},
    ]
    return {"schemaVersion": 1, "title": "On The Boulevard infrastructure source inventory", "sourceAsOf": None,
        "status": "Source references; physical verification and 3D placement pending",
        "counts": {"workbookRows": len(rows), "waterMeters": sum(i["metadata"]["utility"] == "water" for i in meters),
                   "electricMeters": sum(i["metadata"]["utility"] == "electric" for i in meters),
                   "timeClockPhotoFiles": len(clock_sources), "timeClockReferenceGroups": len(clocks),
                   "timeClockPreviews": sum(s["previewStatus"] == "converted" for s in clock_sources),
                   "mapAnnotations": len(map_annotations), "physicalShutoffCount": None},
        "sources": sources, "sourceRows": rows, "items": meters + clocks,
        "mapAnnotations": map_annotations, "ambiguities": ambiguities,
        "notes": ["Source keys link imported records; the asset register issues separate permanent physical UUIDs.",
                  "No file contains inferred 3D coordinates, operating condition, wiring, valve connectivity or current tenant status.",
                  "The two water maps are byte-identical and are counted once."]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", default="../infrastructure-intake")
    parser.add_argument("--out", default="src/data/twin-infrastructure.json")
    parser.add_argument("--preview-dir", default="src/assets/twin/infrastructure")
    parser.add_argument("--heif-package", default="../heif-decoder")
    args = parser.parse_args()
    result = extract(args.source_dir, args.preview_dir, args.heif_package)
    output = Path(args.out); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"], indent=2))

if __name__ == "__main__":
    main()
