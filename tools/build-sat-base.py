# -*- coding: utf-8 -*-
"""
Freeze the A-2 satellite base (operator decision 2026-07-21: static base now,
swap to the owned drone ortho after the roof re-fly).

Why frozen: Esri serves DIFFERENT imagery captures per zoom level and silently
refreshes them over time — a live-tile lens can never be registered at every
zoom at once, and drifts whenever Esri updates (two refits already). This tool
downloads the z19 tiles the georef was FITTED against, composites them into one
mercator-aligned image, and emits the corner lat/lngs for a MapLibre image
source. Registration is then pixel-identical at every zoom, forever.

Re-run ONLY together with tools/fit-georef.py + npm run extract-georef (the
base and the footprints must come from the same imagery vintage):
  python tools/build-sat-base.py
Outputs: public/OTB-sat-base.jpg + src/data/sat-base.json (corners, committed).
Swap-to-ortho later = same corners contract, different image.
"""
import io, json, math, os, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = 19
GRID = 6  # 6x6 tiles = 1536px ≈ 460m square around the site

georef = json.load(open(os.path.join(ROOT, "src", "data", "footprints-geo.json"), encoding="utf-8"))["georef"]

def tile_xy(lat, lon):
    n = 2 ** Z
    return ((lon + 180) / 360 * n,
            (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)

def tile_ll(xt, yt):
    n = 2 ** Z
    lon = xt / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yt / n))))
    return lat, lon

# same centering as fit-georef.py so the composite covers the fitted area
center = (georef["anchorLL"][0] + 0.0006, georef["anchorLL"][1] + 0.0006)
xt, yt = tile_xy(*center)
# fitter covers int-2..int+2; take one extra tile west so the 135-end footprint
# corner (min lng -92.05517) sits inside with margin
TX0, TY0 = int(xt) - 3, int(yt) - 2
mosaic = Image.new("RGB", (GRID * 256, GRID * 256))
for dy in range(GRID):
    for dx in range(GRID):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{TY0+dy}/{TX0+dx}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        mosaic.paste(Image.open(io.BytesIO(urllib.request.urlopen(req).read())), (dx * 256, dy * 256))

out_img = os.path.join(ROOT, "public", "OTB-sat-base.jpg")
mosaic.save(out_img, quality=88)

nw = tile_ll(TX0, TY0)
se = tile_ll(TX0 + GRID, TY0 + GRID)
meta = {
    "image": "/OTB-sat-base.jpg",
    "zoom": Z,
    # MapLibre image-source corner order: TL, TR, BR, BL as [lng, lat]
    "coordinates": [[nw[1], nw[0]], [se[1], nw[0]], [se[1], se[0]], [nw[1], se[0]]],
    "source": "Esri World Imagery z19 composite (frozen; fitted vintage)",
    "note": "Regenerate ONLY with fit-georef + extract-georef so base and footprints share a vintage."
}
json.dump(meta, open(os.path.join(ROOT, "src", "data", "sat-base.json"), "w", encoding="utf-8"), indent=1)
print("OK ->", os.path.relpath(out_img, ROOT), mosaic.size,
      f"{os.path.getsize(out_img)//1024} KB | corners", meta["coordinates"])
