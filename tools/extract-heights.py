# -*- coding: utf-8 -*-
"""
Assign each demised unit its real parapet height from the CAD BLD_HT layer.

Method: replicate poster.py's bay-rectangle layout (CAD feet space) to get each
unit's centroid, then match the NEAREST "BUILDING HEIGHT: N.N'" annotation.
Output src/data/heights.json = { "<unit>": <feet> }. Fallback 16.4' (the
dominant annotated value) if no annotation is within range.
"""
import ezdxf, json, os, re, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DXF = os.path.join(ROOT, "cad", "Boulev_CLEAN.dxf")
OUT = os.path.join(ROOT, "src", "data", "heights.json")
g = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))

# same envelopes + bay lists poster.py uses (CAD feet)
LB_X0, LB_X1, LB_Y0, LB_Y1 = 522.5, 1051.4, 172.5, 258.6
SB_X0, SB_X1, SB_Y0, SB_Y1 = 425.7, 510.2, 227.6, 436.3
LB = [(b[0], b[1]) for b in g["demising"]["longBuilding"]["bays"]]
SB = [(b[0], b[1]) for b in g["demising"]["shortBuilding"]["bays"]]

def bay_centroids():
    out = {}
    scale = (LB_X1 - LB_X0) / sum(w for _, w in LB); cur = LB_X0
    for unit, w in LB:
        out[unit] = ((cur + cur + w * scale) / 2, (LB_Y0 + LB_Y1) / 2); cur += w * scale
    scale = (SB_Y1 - SB_Y0) / sum(w for _, w in SB); cur = SB_Y0; xmid = (SB_X0 + SB_X1) / 2
    for unit, w in SB:
        y0, y1 = cur, cur + w * scale
        if unit == "135":
            out["135B"] = ((SB_X0 + xmid) / 2, (y0 + y1) / 2)
            out["135A"] = ((xmid + SB_X1) / 2, (y0 + y1) / 2)
        else:
            out[unit] = ((SB_X0 + SB_X1) / 2, (y0 + y1) / 2)
        cur += y1 - y0
    return out

doc = ezdxf.readfile(DXF); msp = doc.modelspace()
annos = []
for e in msp:
    if e.dxf.layer == "BLD_HT" and e.dxftype() == "TEXT":
        m = re.search(r"(\d+\.?\d*)'", e.dxf.text)
        if m:
            annos.append((float(m.group(1)), e.dxf.insert[0], e.dxf.insert[1]))

def nearest(cx, cy):
    best, bh = 1e18, 16.4
    for ht, ax, ay in annos:
        d = (cx - ax) ** 2 + (cy - ay) ** 2
        if d < best:
            best, bh = d, ht
    return bh

heights = {unit: nearest(cx, cy) for unit, (cx, cy) in bay_centroids().items()}
json.dump(heights, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("OK ->", os.path.relpath(OUT, ROOT), "|", len(heights), "units |", len(annos), "annotations")
