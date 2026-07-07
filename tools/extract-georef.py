# -*- coding: utf-8 -*-
"""
Georeference the unit footprints: CAD-feet bay rectangles -> WGS84 GeoJSON.

Method: the same bay-rectangle layout poster.py/extract-heights.py use (CAD feet),
pushed through a documented affine: anchor CAD point -> anchor lat/lng, plus the
plat's rotation (north arrow -51.5 deg => CAD +y ~ azimuth 51.5 deg). All tunables
live in GEOREF below and are emitted alongside the features so the transform is
inspectable, not magic. Output: src/data/footprints-geo.json.

Tune by eye against Esri World Imagery (A-2 satellite lens): tweak ANCHOR_LL /
AZ_Y / SCALE_TWEAK and re-run `npm run extract-georef`.
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))

# ---- tunables (documented in the output) ------------------------------------
GEOREF = {
    # CAD anchor: center of the long building's Johnston-end face region (near unit 101 / pylon)
    "anchorCad": [1051.4, 215.55],
    # real-world anchor: Nominatim address point for 101 Arnould Blvd (30.20195, -92.05315),
    # nudged to the building rather than the street after visual registration
    "anchorLL": [30.201785, -92.054218],
    # CAD +y axis azimuth in degrees east of north (plat north arrow = -51.5 deg screen)
    "azY": 70.5,
    "scaleTweak": 1.0,   # multiply CAD feet by this if imagery says the model runs long/short
    "notes": "CAD feet -> WGS84 local-tangent affine. Tune anchorLL/azY/scaleTweak by eye vs Esri imagery."
}

FT_M = 0.3048
LAT_M = 111320.0  # meters per degree latitude (good enough at this scale)

def cad_to_ll(x, y):
    ax, ay = GEOREF["anchorCad"]
    dx = (x - ax) * FT_M * GEOREF["scaleTweak"]
    dy = (y - ay) * FT_M * GEOREF["scaleTweak"]
    azy = math.radians(GEOREF["azY"])
    azx = math.radians(GEOREF["azY"] + 90.0)  # CAD +x is 90 deg clockwise of +y
    east = dx * math.sin(azx) + dy * math.sin(azy)
    north = dx * math.cos(azx) + dy * math.cos(azy)
    lat0, lng0 = GEOREF["anchorLL"]
    lat = lat0 + north / LAT_M
    lng = lng0 + east / (LAT_M * math.cos(math.radians(lat0)))
    return [round(lng, 7), round(lat, 7)]

# ---- bay rectangles in CAD feet (identical layout to poster/heights) ---------
LB_X0, LB_X1, LB_Y0, LB_Y1 = 522.5, 1051.4, 172.5, 258.6
SB_X0, SB_X1, SB_Y0, SB_Y1 = 425.7, 510.2, 227.6, 436.3
LB = [(b[0], b[1]) for b in g["demising"]["longBuilding"]["bays"]]
SB = [(b[0], b[1]) for b in g["demising"]["shortBuilding"]["bays"]]

def bay_rects():
    out = []
    scale = (LB_X1 - LB_X0) / sum(w for _, w in LB); cur = LB_X0
    for unit, w in LB:
        out.append((unit, cur, cur + w * scale, LB_Y0, LB_Y1)); cur += w * scale
    scale = (SB_Y1 - SB_Y0) / sum(w for _, w in SB); cur = SB_Y0; xmid = (SB_X0 + SB_X1) / 2
    for unit, w in SB:
        y0, y1 = cur, cur + w * scale
        if unit == "135":
            out.append(("135B", SB_X0, xmid, y0, y1)); out.append(("135A", xmid, SB_X1, y0, y1))
        else:
            out.append((unit, SB_X0, SB_X1, y0, y1))
        cur += y1 - y0
    return out

features = []
for unit, x0, x1, y0, y1 in bay_rects():
    ring = [cad_to_ll(x0, y0), cad_to_ll(x1, y0), cad_to_ll(x1, y1), cad_to_ll(x0, y1), cad_to_ll(x0, y0)]
    features.append({
        "type": "Feature",
        "properties": {"unit": unit},
        "geometry": {"type": "Polygon", "coordinates": [ring]}
    })

out = {"type": "FeatureCollection", "georef": GEOREF, "features": features}
path = os.path.join(ROOT, "src", "data", "footprints-geo.json")
json.dump(out, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
lls = [c for f in features for c in f["geometry"]["coordinates"][0]]
print("OK ->", os.path.relpath(path, ROOT), "|", len(features), "footprints | lng",
      round(min(p[0] for p in lls), 5), "..", round(max(p[0] for p in lls), 5),
      "| lat", round(min(p[1] for p in lls), 5), "..", round(max(p[1] for p in lls), 5))
