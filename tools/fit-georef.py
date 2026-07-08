# -*- coding: utf-8 -*-
"""
Fit the A-2 satellite-lens georef against the imagery itself (no eyeballing).
Re-runnable whenever Esri refreshes its imagery: python tools/fit-georef.py
Then paste the printed GEOREF into extract-georef.py and `npm run extract-georef`.

Method (two-stage; a single blended score plateaus and lets rotation trade the
two buildings against each other — don't regress to that):
  1. Mosaic the same Esri World Imagery tiles the lens renders (z19).
  2. STRICT white-roof mask (measured: membrane roofs ~250-255 brightness /
     chroma<5; the parking field's light concrete ~185-196 / chroma~35 — a
     loose mask lets the optimizer park bays on the FIELD).
  3. Sweep azimuth; per az, fit EACH building's translation independently.
     Accept only azimuths where the two buildings AGREE (<6 m) — the rigid
     plat assembly must register both; pick the best combined coverage.
  4. Final = shared translation (mean) folded into anchorLL. scaleTweak stays
     1.0: plat feet are surveyed truth.
Sanity anchors: fitted azY ≈ 51.5 = the plat's north-arrow rotation; the
Skydio nadir control point (S1002328, drone directly over the short-building
thermal spot, GPS ±0.15 m) must land on/near the short building.
Writes export/georef-fit.png (red = current tunables, green = fitted).
"""
import io, json, math, os, urllib.request
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))

# current tunables from extract-georef.py = search center + "before" overlay
cur_georef = json.load(open(os.path.join(ROOT, "src", "data", "footprints-geo.json"), encoding="utf-8"))["georef"]
CUR = {"anchorCad": cur_georef["anchorCad"], "anchorLL": cur_georef["anchorLL"], "azY": cur_georef["azY"]}
FT_M = 0.3048; LAT_M = 111320.0; Z = 19

LB_X0, LB_X1, LB_Y0, LB_Y1 = 522.5, 1051.4, 172.5, 258.6
SB_X0, SB_X1, SB_Y0, SB_Y1 = 425.7, 510.2, 227.6, 436.3
LB = [(b[0], b[1]) for b in g["demising"]["longBuilding"]["bays"]]
SB = [(b[0], b[1]) for b in g["demising"]["shortBuilding"]["bays"]]

def bay_rects():
    out = []
    scale = (LB_X1 - LB_X0) / sum(w for _, w in LB); cur = LB_X0
    for unit, w in LB:
        out.append((unit, cur, cur + w * scale, LB_Y0, LB_Y1)); cur += w * scale
    scale = (SB_Y1 - SB_Y0) / sum(w for _, w in SB); cur = SB_Y0
    for unit, w in SB:
        out.append((unit, SB_X0, SB_X1, cur, cur + w * scale)); cur += w * scale
    return out

def samples(x0, x1, y0, y1, nx, ny):
    xs = x0 + (np.arange(nx) + 0.5) / nx * (x1 - x0)
    ys = y0 + (np.arange(ny) + 0.5) / ny * (y1 - y0)
    return np.array([(x, y) for x in xs for y in ys])
S_long = samples(LB_X0, LB_X1, LB_Y0, LB_Y1, 60, 10)
S_short = samples(SB_X0, SB_X1, SB_Y0, SB_Y1, 10, 24)

def tile_xy(lat, lon):
    n = 2 ** Z
    return ((lon + 180) / 360 * n,
            (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)

center = (CUR["anchorLL"][0] + 0.0006, CUR["anchorLL"][1] + 0.0006)
xt, yt = tile_xy(*center)
TX0, TY0 = int(xt) - 2, int(yt) - 2
mosaic = Image.new("RGB", (1280, 1280))
for dy in range(5):
    for dx in range(5):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{TY0+dy}/{TX0+dx}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        mosaic.paste(Image.open(io.BytesIO(urllib.request.urlopen(req).read())), (dx * 256, dy * 256))
arr = np.asarray(mosaic).astype(np.int16)
mask = (arr.mean(axis=2) > 230) & ((arr.max(axis=2) - arr.min(axis=2)) < 12)
H, W = mask.shape
print("mosaic 1280² · roof pixels:", int(mask.sum()))

AX, AY = CUR["anchorCad"]
RES = 156543.03392 * math.cos(math.radians(center[0])) / (2 ** Z)  # m per px

def to_px(pts, azY):
    dx = (pts[:, 0] - AX) * FT_M; dy = (pts[:, 1] - AY) * FT_M
    azy = math.radians(azY); azx = math.radians(azY + 90)
    east = dx * np.sin(azx) + dy * np.sin(azy)
    north = dx * np.cos(azx) + dy * np.cos(azy)
    lat = CUR["anchorLL"][0] + north / LAT_M
    lon = CUR["anchorLL"][1] + east / (LAT_M * math.cos(math.radians(CUR["anchorLL"][0])))
    n = 2 ** Z
    px = ((lon + 180) / 360 * n - TX0) * 256
    lr = np.radians(lat)
    py = ((1 - np.log(np.tan(lr) + 1 / np.cos(lr)) / math.pi) / 2 * n - TY0) * 256
    return px, py

def best_t(px, py, half=50, step=0.75):
    r = np.arange(-half, half + 1e-9, step) / RES
    best = (-1, 0, 0)
    for ddx in r:
        xi = (px + ddx).astype(int)
        for ddy in r:
            yi = (py + ddy).astype(int)
            ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
            if not ok.all():
                continue
            f = mask[yi, xi].mean()
            if f > best[0]:
                best = (float(f), float(ddx * RES), float(ddy * RES))
    return best

# stage 1: coarse az sweep with per-building translations + agreement gate
cands = []
for az in np.arange(44, 80.1, 1.0):
    fL, exL, eyL = best_t(*to_px(S_long, az), step=1.5)
    fS, exS, eyS = best_t(*to_px(S_short, az), step=1.5)
    d = math.hypot(exL - exS, eyL - eyS)
    if d < 6:
        cands.append(((fL + fS) / 2, az))
if not cands:
    raise SystemExit("no azimuth where both buildings agree — inspect the mask")
cands.sort(reverse=True)
az0 = cands[0][1]
print(f"coarse az winner {az0} (combined {cands[0][0]:.3f})")
# stage 2: fine az
fine = []
for az in np.arange(az0 - 1, az0 + 1.01, 0.25):
    fL, exL, eyL = best_t(*to_px(S_long, az))
    fS, exS, eyS = best_t(*to_px(S_short, az))
    if math.hypot(exL - exS, eyL - eyS) < 6:
        fine.append(((fL + fS) / 2, az, exL, eyL, exS, eyS, fL, fS))
fine.sort(reverse=True)
sc, az, exL, eyL, exS, eyS, fL, fS = fine[0]
ex, ey = (exL + exS) / 2, (eyL + eyS) / 2  # +ey (px) = south
lat0 = CUR["anchorLL"][0] - ey / LAT_M
lon0 = CUR["anchorLL"][1] + ex / (LAT_M * math.cos(math.radians(CUR["anchorLL"][0])))
print(f"fine az {az} · long {fL:.3f} / short {fS:.3f} · shared shift E{ex:+.1f}m S{ey:+.1f}m")
print("\nFITTED GEOREF (paste into extract-georef.py):")
print(json.dumps({"anchorLL": [round(lat0, 6), round(lon0, 6)], "azY": float(az), "scaleTweak": 1.0}, indent=1))

# control point: Skydio nadir over the short-building thermal spot
CTRL = (30.2034755, -92.0538833)
def cad_to_ll_final(pts):
    dx = (pts[:, 0] - AX) * FT_M; dy = (pts[:, 1] - AY) * FT_M
    azy = math.radians(az); azx = math.radians(az + 90)
    east = dx * np.sin(azx) + dy * np.sin(azy)
    north = dx * np.cos(azx) + dy * np.cos(azy)
    return lat0 + north / LAT_M, lon0 + east / (LAT_M * math.cos(math.radians(lat0)))
bd, bu = 1e9, None
for unit, x0, x1, y0, y1 in bay_rects():
    la, lo = cad_to_ll_final(np.array([((x0 + x1) / 2, (y0 + y1) / 2)]))
    d = math.hypot((lo[0] - CTRL[1]) * LAT_M * math.cos(math.radians(CTRL[0])), (la[0] - CTRL[0]) * LAT_M)
    if d < bd:
        bd, bu = d, unit
print(f"control (Skydio thermal-spot nadir): nearest fitted bay CENTER = unit {bu} at {bd:.1f} m")

# before/after visual
vis = mosaic.copy()
d = ImageDraw.Draw(vis)
def draw(anchor, azY, color):
    for _, x0, x1, y0, y1 in bay_rects():
        cs = np.array([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)])
        dx = (cs[:, 0] - AX) * FT_M; dyy = (cs[:, 1] - AY) * FT_M
        azy = math.radians(azY); azx = math.radians(azY + 90)
        east = dx * np.sin(azx) + dyy * np.sin(azy)
        north = dx * np.cos(azx) + dyy * np.cos(azy)
        la = anchor[0] + north / LAT_M
        lo = anchor[1] + east / (LAT_M * math.cos(math.radians(anchor[0])))
        n = 2 ** Z
        px = ((lo + 180) / 360 * n - TX0) * 256
        lr = np.radians(la)
        py = ((1 - np.log(np.tan(lr) + 1 / np.cos(lr)) / math.pi) / 2 * n - TY0) * 256
        d.line([tuple(p) for p in zip(px, py)], fill=color, width=2)
draw(CUR["anchorLL"], CUR["azY"], (220, 60, 40))
draw((lat0, lon0), az, (40, 200, 80))
os.makedirs(os.path.join(ROOT, "export"), exist_ok=True)
vis.save(os.path.join(ROOT, "export", "georef-fit.png"))
print("wrote export/georef-fit.png (red=current, green=fitted)")
