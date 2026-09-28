# -*- coding: utf-8 -*-
"""
Raster stage of the Google Earth export (tools/export-google-earth.mjs packs the results).
Writes export/google-earth/media/ + manifest.json:

  plan-sheet.png     A-1 site plan (geometry.layers + unit rects), full viewBox, opaque paper
  plan-lines.png     same drawing, transparent background, linework + units only
  photos/*.jpg      Skydio photo thumbnails + per-photo pose (RTK lat/lng, relative alt, yaw/pitch/roll)

Georeferencing of the plan is done in Node (src/lib/geoproject.js); this stage only records the
plan viewBox the PNGs cover. Capture inputs stay on E: — nothing here is committed.
Run: python tools/ge-media.py [--photos-max N]
"""
import json, os, re, sys, glob, math
import fitz  # PyMuPDF — rasterizes the SVG
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "export", "google-earth", "media")
CAP = r"E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07"
PHOTOS = os.path.join(CAP, "OTB-mesh-photos-skydio")
os.makedirs(os.path.join(OUT, "photos"), exist_ok=True)
geo = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))
units = json.load(open(os.path.join(ROOT, "src", "data", "units.json"), encoding="utf-8"))
manifest = {}

# ---------------------------------------------------------------- 1. A-1 plan sheet
STATUS_FILL = {"active": "#2F6B4F", "anchor": "#1E4F3C", "expired": "#C25E33", "vacant": "#FCFCF9", "owner": "#5F6E64"}
esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# PyMuPDF paints SVG <pattern> fills solid black — swap the plan's hatches for flat tints
PATTERN_TINT = {"url(#hatch)": "#FCFCF9", "url(#hatch2)": "#E1E4DA"}

def attrs(a, drop_fill=False):
    out = []
    for k, v in (a or {}).items():
        if k == "class":
            continue
        if k == "fill" and str(v).startswith("url("):
            v = PATTERN_TINT.get(v, "#E1E4DA")
        if drop_fill and k == "fill" and v not in ("none",):
            v = "none"
        out.append(f'{k}="{esc(v)}"')
    return " ".join(out)

def prims(ps, lines_only=False):
    s = []
    for p in ps:
        t = p["t"]; a = p.get("attrs", {})
        if t == "rect":
            s.append(f'<rect x="{p["x"]}" y="{p["y"]}" width="{p["w"]}" height="{p["h"]}" {attrs(a, lines_only)}/>')
        elif t == "line":
            s.append(f'<line x1="{p["x1"]}" y1="{p["y1"]}" x2="{p["x2"]}" y2="{p["y2"]}" stroke="#1C2B26" {attrs(a)}/>')
        elif t == "path":
            s.append(f'<path d="{p["d"]}" {attrs(a, lines_only)}/>')
        elif t == "text":
            s.append(f'<text x="{p["x"]}" y="{p["y"]}" font-family="Arial" font-size="11" fill="#1C2B26" {attrs(a)}>{esc(p["s"])}</text>')
    return "\n".join(s)

def plan_svg(lines_only):
    vb = geo["viewBox"]["full"]
    x0, y0, w, h = map(float, vb.split())
    L = geo["layers"]
    body = []
    if not lines_only:
        body.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="#EDEFE8"/>')
    for k in ("base", "remoteLot", "parking", "access"):
        body.append(prims(L.get(k, []), lines_only))
    for u in units:
        r = geo["units"].get(u["unit"])
        if not r:
            continue
        fill = STATUS_FILL.get(u["status"], "#5F6E64")
        body.append(f'<rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" rx="2" fill="{fill}" stroke="#1C2B26" stroke-width="1.2"/>')
        cx, cy = r["x"] + r["w"] / 2, r["y"] + r["h"] / 2
        rot = f' transform="rotate(-90 {cx} {cy})"' if r["h"] > r["w"] else ""
        col = "#1C2B26" if u["status"] == "vacant" else "#FFFFFF"
        body.append(f'<text x="{cx}" y="{cy + 5}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="15" fill="{col}"{rot}>{esc(u["unit"])}</text>')
    for k in ("annotations", "easements"):
        body.append(prims(L.get(k, []), False))
    defs = ('<defs><pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
            '<rect width="7" height="7" fill="#FCFCF9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#B9BFAD" stroke-width="2"/></pattern></defs>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">{defs}' + "\n".join(body) + "</svg>")

SCALE = 4  # 1480x1300 viewBox -> 5920x5200 px (~0.14 ft/px along the long axis)
for name, lines_only in (("plan-sheet.png", False), ("plan-lines.png", True)):
    svg = plan_svg(lines_only)
    doc = fitz.open("svg", svg.encode("utf-8"))
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), alpha=lines_only)
    pix.save(os.path.join(OUT, name))
    print("plan", name, pix.width, "x", pix.height)
x0, y0, w, h = map(float, geo["viewBox"]["full"].split())
manifest["plan"] = {"viewBox": [x0, y0, w, h], "sheet": "plan-sheet.png", "lines": "plan-lines.png", "rev": geo["rev"]}

# ---------------------------------------------------------------- 2. Skydio photos (pose from XMP)
def xmp_of(path):
    b = open(path, "rb").read(400000).decode("latin1")
    i = b.find("<x:xmpmeta")
    return b[i:b.find("</x:xmpmeta>")] if i >= 0 else ""

def tag(x, name):
    m = re.search(rf"<drone-skydio:{name}>([^<]+)<", x)
    return float(m.group(1)) if m else None

def block(x, name, keys):
    m = re.search(rf"<drone-skydio:{name}[^>]*>(.*?)</drone-skydio:{name}>", x, re.S)
    if not m:
        return None
    return {k: float(re.search(rf"<drone-skydio:{k}>([^<]+)<", m.group(1)).group(1)) for k in keys}

photos = []
files = sorted(glob.glob(os.path.join(PHOTOS, "*.JPG")))
if "--photos-max" in sys.argv:
    files = files[:int(sys.argv[sys.argv.index("--photos-max") + 1])]
for f in files:
    x = xmp_of(f)
    lat, lng = tag(x, "GPSLatitudeRaw") or tag(x, "Latitude"), tag(x, "GPSLongitudeRaw") or tag(x, "Longitude")
    if lat is None:
        continue
    cam = block(x, "CameraOrientationNED", ("Roll", "Pitch", "Yaw"))
    foc = block(x, "CalibratedFocalLength", ("X", "Y"))
    ts = re.search(r"<xmp:CreateDate>([^<]+)<", x)
    im = Image.open(f)
    W, H = im.size
    im.draft("RGB", (W // 4, H // 4))
    im = im.convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    base = os.path.splitext(os.path.basename(f))[0] + ".jpg"
    im.save(os.path.join(OUT, "photos", base), quality=80, optimize=True)
    fx, fy = (foc["X"], foc["Y"]) if foc else (0.602 * W, 0.602 * W)
    photos.append({
        "file": "photos/" + base, "source": os.path.basename(f), "lat": lat, "lng": lng,
        "relAltM": tag(x, "RelativeAltitude"), "yaw": cam["Yaw"] if cam else None,
        "pitch": cam["Pitch"] if cam else None, "roll": cam["Roll"] if cam else 0.0,
        "hfov": 2 * math.degrees(math.atan(W / 2 / fx)), "vfov": 2 * math.degrees(math.atan(H / 2 / fy)),
        "taken": ts.group(1) if ts else "", "hAccM": tag(x, "GpsHorizontalAccuracy"),
    })
print("photos", len(photos))
manifest["photos"] = photos

# ---------------------------------------------------------------- 3. LiDAR terrain (USGS 3DEP 1 m DEM, public domain)
# public/elevation/OTB-dem-1m.tif (npm: node tools/fetch-otb-lidar.mjs). Bare-earth, NAVD88 metres, 2017 flight —
# regrading since then is not reflected. Output: color relief + hillshade overlay (north-up WGS84 resample),
# 0.1 m contours, and local low spots (candidate ponding / inlet locations) for the exporter to clip to the parcels.
DEM = os.path.join(ROOT, "public", "elevation", "OTB-dem-1m.tif")
if os.path.exists(DEM):
    import numpy as np
    from scipy import ndimage
    from pyproj import Transformer
    im = Image.open(DEM)
    z = np.array(im, dtype="float64")
    z[z < -1000] = np.nan
    x0u, y0u = im.tag_v2[33922][3], im.tag_v2[33922][4]  # UTM 15N top-left, 1 m pixels
    zf = ndimage.gaussian_filter(np.nan_to_num(z, nan=np.nanmean(z)), 1.5)
    to_utm = Transformer.from_crs("EPSG:4326", "EPSG:26915", always_xy=True)
    W_, E_, S_, N_ = -92.0564, -92.0527, 30.2010, 30.2040  # parcels + ~40 m margin
    def sample(step):
        lngs = np.arange(W_, E_, step); lats = np.arange(N_, S_, -step)
        LG, LT = np.meshgrid(lngs, lats)
        ux, uy = to_utm.transform(LG, LT)
        rows, cols = (y0u - uy) - 0.5, (ux - x0u) - 0.5
        return lngs, lats, ndimage.map_coordinates(zf, [rows, cols], order=1, mode="nearest")
    # color relief x hillshade, 0.5 m pixels
    lngs, lats, g = sample(0.000005)
    lo, hi = np.percentile(g, 2), np.percentile(g, 98)
    t = np.clip((g - lo) / (hi - lo), 0, 1)
    ramp = np.array([[33, 102, 172], [103, 169, 207], [209, 229, 240], [199, 234, 180], [120, 198, 121], [217, 180, 106], [166, 97, 26]], float)
    idx = t * (len(ramp) - 1); i0 = np.floor(idx).astype(int).clip(0, len(ramp) - 2); fr = (idx - i0)[..., None]
    rgb = ramp[i0] * (1 - fr) + ramp[i0 + 1] * fr
    dy, dx = np.gradient(g, 0.555, 0.48)  # metres per 0.5 m-ish pixel (lat, lng)
    slope = np.arctan(np.hypot(dx, dy) * 3.0); aspect = np.arctan2(-dx, dy)
    az, alt = np.radians(315), np.radians(45)
    hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    rgb = (rgb * (0.55 + 0.45 * hs[..., None])).clip(0, 255).astype("uint8")
    a = np.full(g.shape, 190, "uint8")
    Image.fromarray(np.dstack([rgb, a]), "RGBA").save(os.path.join(OUT, "relief.png"), optimize=True)
    relief_box = {"north": float(lats[0]), "south": float(lats[-1]), "west": float(lngs[0]), "east": float(lngs[-1])}
    # contours by marching squares on a ~1 m grid, chained into polylines
    lngs, lats, g = sample(0.00001)
    STEP = 0.1  # site relief is only ~1.2 m — 0.1 m minor / 0.5 m major contours read the drainage
    levels = [round(float(v), 2) for v in np.arange(np.ceil(np.nanmin(g) / STEP) * STEP, np.nanmax(g), STEP)]
    def contour(level):
        segs = []
        H, W = g.shape
        ab = g >= level
        for r in range(H - 1):
            for c in range(W - 1):
                q = (ab[r, c], ab[r, c + 1], ab[r + 1, c + 1], ab[r + 1, c])
                if all(q) or not any(q):
                    continue
                v = (g[r, c], g[r, c + 1], g[r + 1, c + 1], g[r + 1, c])
                P = ((c, r), (c + 1, r), (c + 1, r + 1), (c, r + 1))
                pts = []
                for k in range(4):
                    a_, b_ = k, (k + 1) % 4
                    if q[a_] != q[b_]:
                        f_ = (level - v[a_]) / (v[b_] - v[a_])
                        pts.append((P[a_][0] + f_ * (P[b_][0] - P[a_][0]), P[a_][1] + f_ * (P[b_][1] - P[a_][1])))
                for k in range(0, len(pts) - 1, 2):
                    segs.append((pts[k], pts[k + 1]))
        # chain
        key = lambda p: (round(p[0], 4), round(p[1], 4))
        ends = {}
        for i, (p, q_) in enumerate(segs):
            ends.setdefault(key(p), []).append((i, 0)); ends.setdefault(key(q_), []).append((i, 1))
        used, lines = set(), []
        for i in range(len(segs)):
            if i in used:
                continue
            used.add(i); line = [segs[i][0], segs[i][1]]
            for end in (1, 0):
                while True:
                    tip = line[-1] if end else line[0]
                    nxt = next(((j, s) for j, s in ends.get(key(tip), []) if j not in used), None)
                    if not nxt:
                        break
                    j, s = nxt; used.add(j); other = segs[j][1 - s]
                    line.append(other) if end else line.insert(0, other)
            if len(line) >= 4:
                lines.append([[round(float(lngs[0] + x * 0.00001), 7), round(float(lats[0] - y * 0.00001), 7)] for x, y in line[::2] + [line[-1]]])
        return lines
    contours = [{"elevM": lv, "major": bool(abs(lv * 2 - round(lv * 2)) < 1e-6), "lines": contour(lv)} for lv in levels]
    # low spots: local minima over ~25 m, at least 5 cm below the neighbourhood mean
    zs = ndimage.gaussian_filter(g, 2)
    mn = ndimage.minimum_filter(zs, size=25); avg = ndimage.uniform_filter(zs, size=25)
    lows = []
    for r, c in zip(*np.where((zs == mn) & (avg - zs >= 0.05))):
        if 12 < r < zs.shape[0] - 12 and 12 < c < zs.shape[1] - 12:
            lows.append({"lng": round(float(lngs[c]), 7), "lat": round(float(lats[r]), 7), "elevM": round(float(zs[r, c]), 2), "depthM": round(float(avg[r, c] - zs[r, c]), 2)})
    manifest["terrain"] = {"relief": "relief.png", "box": relief_box, "minM": round(float(lo), 2), "maxM": round(float(hi), 2),
                           "contourStepM": STEP, "contours": contours, "lows": lows,
                           "source": "USGS 3DEP LA_Catahoula_Concordia_2017_D17 1 m DEM (bare earth, NAVD88) — public domain"}
    print("terrain", f"{lo:.2f}..{hi:.2f} m", len(levels), "contour levels", sum(len(c["lines"]) for c in contours), "lines", len(lows), "low spots")
else:
    print("terrain skipped — run node tools/fetch-otb-lidar.mjs")

# The 2025-10-15 roof orthomosaic on E: is deliberately NOT exported: it is plane-projected without
# SfM and does not register against the imagery (roof fragments land on the parking field, 2026-09-28
# check). Re-add only after a proper photogrammetric ortho exists.

json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), indent=1)
print("OK ->", os.path.relpath(OUT, ROOT))
