# -*- coding: utf-8 -*-
"""
OTB recorded-plat RENDER — faithful measured site plan from the architect CAD.

Unlike poster.py (marketing: buildings/dims/tenant text suppressed, boundary
stylized into dashes), this keeps the *survey* layers: building footprints,
legal boundary, easements, parking striping, concrete/curbs, plus the CAD's own
text labels (unit & lot numbers, street names, bearings, boundary dimensions),
each placed at its DXF insert point. North −51.5°, scale bar, surveyor title block.

Emits public/plat-render.svg (served at /plat-render.svg, ships with the app) so
the K-1 document register's "Recorded plat" row links to a portable schematic.

HONEST LABEL: this is a schematic reproduction from the architect CAD
(Boulev_CLEAN.dxf), NOT the certified recorded instrument.
"""
import ezdxf, math, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DXF = os.path.join(ROOT, "cad", "Boulev_CLEAN.dxf")
OUT = os.path.join(ROOT, "public"); os.makedirs(OUT, exist_ok=True)
NORTH_DEG = -51.5

# plan-room palette (matches the app)
INK = "#1C2B26"; PAPER = "#EDEFE8"; CARD = "#F6F7F1"; BRASS = "#A87E2F"
SAGE = "#5F6E64"; GRN = "#2F6B4F"; FAINT = "#B9C0B4"; CURB = "#9aa39a"

# ---- layer policy -----------------------------------------------------------
# geometry: layer -> (stroke, width, dash, fill)
GEO_STYLE = {
    "LINBLDG":  (INK,   1.1, None, "#E3E7DD"),   # building footprints (solid, light fill)
    "LINLEGAL": (INK,   1.6, None, None),         # legal property boundary (bold)
    "LINLEG2":  (INK,   1.6, None, None),
    "LINLEG3":  (INK,   1.6, None, None),
    "PROPLINE_DIVIDE": (SAGE, 0.7, "4 3", None),
    "EASEMENT": (BRASS, 1.0, "6 4", None),        # easements (brass dashed)
    "PARKING":  (SAGE,  0.5, None, None),         # stall striping (thin)
    "LINCONC":  (CURB,  0.5, None, None),         # concrete / curb
    "LINCON2":  (CURB,  0.5, None, None),
    "LINEDGRD": (CURB,  0.55, None, None),        # edge of road
    "LINCLRD":  (CURB,  0.5, None, None),
    "TRAVLAN":  (FAINT, 0.5, "4 4", None),        # travel lanes
    "LINELEC":  (FAINT, 0.4, "2 3", None),        # electric
}
# text: layer -> (color, min_fs, max_fs, weight)
TXT_STYLE = {
    "TXTSTRNAME":     (SAGE,  12, 18, 700),
    "SUBNAME":        (BRASS, 12, 20, 700),
    "UNITS":          (INK,    8, 15, 700),
    "LOTNUM":         (SAGE,   7, 12, 600),
    "BEARING":        ("#8a8270", 6, 9, 400),
    "BEARING_DIVIDE": ("#8a8270", 6, 9, 400),
    "TXTBOUDIM":      ("#6f7468", 6, 10, 400),
    "TXTBOU3":        ("#6f7468", 6, 10, 400),
    "BORTXT":         ("#6f7468", 6, 10, 400),
    "EASEMENT_TXT":   (BRASS,   6, 10, 400),
    "PARKING_TXT":    (SAGE,    6, 9, 600),
    "TXTMISC":        ("#6f7468", 6, 10, 400),
}
TREE_LAYER = "TREES"

# ---- DXF parse --------------------------------------------------------------
doc = ezdxf.readfile(DXF); msp = doc.modelspace()

def arc_pts(cx, cy, r, a0, a1, n=48):
    if a1 < a0: a1 += 360
    return [(cx + r*math.cos(math.radians(a0 + (a1-a0)*i/n)),
             cy + r*math.sin(math.radians(a0 + (a1-a0)*i/n))) for i in range(n+1)]

def clean(t):
    # strip common AutoCAD inline codes
    for a, b in (("%%p", "±"), ("%%d", "°"), ("%%c", "Ø"), ("%%u", ""), ("%%U", "")):
        t = t.replace(a, b)
    return t.strip()

geo = []        # (layer, [(x,y),...])
labels = []     # (layer, text, x, y, rot, height)
trees = []
for e in msp:
    L = e.dxf.layer; t = e.dxftype()
    try:
        if L == TREE_LAYER and t == "INSERT":
            trees.append((e.dxf.insert[0], e.dxf.insert[1])); continue
        if L in GEO_STYLE:
            if t == "LINE":
                geo.append((L, [(e.dxf.start[0], e.dxf.start[1]), (e.dxf.end[0], e.dxf.end[1])]))
            elif t == "ARC":
                geo.append((L, arc_pts(e.dxf.center[0], e.dxf.center[1], e.dxf.radius,
                                       e.dxf.start_angle, e.dxf.end_angle)))
            elif t == "CIRCLE":
                geo.append((L, arc_pts(e.dxf.center[0], e.dxf.center[1], e.dxf.radius, 0, 360)))
            elif t == "LWPOLYLINE":
                geo.append((L, [(p[0], p[1]) for p in e.flattening(0.5)]))
        if L in TXT_STYLE:
            if t == "TEXT":
                s = clean(e.dxf.text)
                if s:
                    labels.append((L, s, e.dxf.insert[0], e.dxf.insert[1],
                                   e.dxf.rotation, e.dxf.height))
            elif t == "MTEXT":
                s = clean(e.plain_text())
                if s:
                    labels.append((L, s, e.dxf.insert[0], e.dxf.insert[1],
                                   getattr(e.dxf, "rotation", 0), e.dxf.char_height))
    except Exception:
        pass

# ---- bounds & transform -----------------------------------------------------
xs = [p[0] for _, ps in geo for p in ps] + [x for _, _, x, _, _, _ in labels]
ys = [p[1] for _, ps in geo for p in ps] + [y for _, _, _, y, _, _ in labels]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)

MARGIN = 40
TITLE_H = 92                       # bottom title-block strip
DRAW_W = 1600
s = DRAW_W / (maxx - minx)
DRAW_H = (maxy - miny) * s
W = DRAW_W + MARGIN*2
H = DRAW_H + MARGIN*2 + TITLE_H
TX = lambda x: MARGIN + (x - minx) * s
TY = lambda y: MARGIN + (maxy - y) * s

def esc(t): return html.escape(str(t))
def clamp(v, lo, hi): return lo if v < lo else hi if v > hi else v

o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" font-family="\'IBM Plex Mono\',ui-monospace,monospace">' % (W, H)]
# raw '&' is an invalid XML entity ref in a standalone SVG — escape for the register link
o.append("<style>@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&amp;family=IBM+Plex+Mono:wght@400;600;700&amp;display=swap');</style>")
o.append('<rect width="%.0f" height="%.0f" fill="%s"/>' % (W, H, PAPER))
o.append('<rect x="%d" y="%d" width="%.1f" height="%.1f" fill="%s" stroke="#CDD2C2"/>' % (
    MARGIN-8, MARGIN-8, DRAW_W+16, DRAW_H+16, CARD))

# geometry — draw curbs/parking first (back), boundary/buildings last (front)
ORDER = ["LINCONC","LINCON2","LINEDGRD","LINCLRD","LINELEC","TRAVLAN","PARKING",
         "EASEMENT","PROPLINE_DIVIDE","LINBLDG","LINLEGAL","LINLEG2","LINLEG3"]
for layer in ORDER:
    col, wd, dash, fill = GEO_STYLE[layer]
    da = ' stroke-dasharray="%s"' % dash if dash else ""
    for L, ps in geo:
        if L != layer: continue
        d = "M " + " L ".join("%.1f %.1f" % (TX(x), TY(y)) for x, y in ps)
        closed = " Z" if fill and ps[0] == ps[-1] else ""
        o.append('<path d="%s%s" fill="%s" stroke="%s" stroke-width="%s"%s/>' % (
            d, closed, fill or "none", col, wd, da))

# trees
for x, y in trees:
    o.append('<circle cx="%.1f" cy="%.1f" r="3.4" fill="%s" opacity="0.45"/>' % (TX(x), TY(y), GRN))

# labels (rotation negated for the Y-flip, as in poster.py)
for L, txt, x, y, rot, hgt in labels:
    col, lo, hi, wt = TXT_STYLE[L]
    fs = clamp((hgt or 0) * s, lo, hi)
    px, py = TX(x), TY(y)
    fam = "'Big Shoulders Display',sans-serif" if L in ("TXTSTRNAME", "SUBNAME") else "'IBM Plex Mono',monospace"
    o.append('<text x="%.1f" y="%.1f" font-family="%s" font-size="%.1f" font-weight="%d" fill="%s" transform="rotate(%.1f %.1f %.1f)">%s</text>' % (
        px, py, fam, fs, wt, col, -rot, px, py, esc(txt)))

# north arrow (plan rotated; true north at NORTH_DEG)
ncx, ncy = W - MARGIN - 36, MARGIN + 52
o.append('<g transform="translate(%.1f,%.1f) rotate(%.1f)">'
         '<path d="M0 -26 L7 7 L0 0 L-7 7 Z" fill="%s"/><circle r="2.4" fill="%s"/>'
         '<text x="0" y="-31" text-anchor="middle" font-size="12" font-weight="700" fill="%s" transform="rotate(%.1f 0 -31)">N</text></g>' % (
         ncx, ncy, NORTH_DEG, INK, INK, INK, -NORTH_DEG))

# scale bar (100 ft)
bx, by = MARGIN + 12, MARGIN + DRAW_H - 22
barpx = 100 * s
o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2"/>' % (bx, by, bx+barpx, by, INK))
for i in range(5):
    tx = bx + barpx*i/4
    o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1"/>' % (tx, by-3, tx, by+3, INK))
o.append('<text x="%.1f" y="%.1f" font-size="9" fill="%s">0 ———————— 100 FT</text>' % (bx, by-7, SAGE))

# title block (bottom strip)
ty0 = MARGIN + DRAW_H + 16
o.append('<rect x="%d" y="%.1f" width="%.1f" height="%d" fill="%s" stroke="#CDD2C2"/>' % (MARGIN-8, ty0, DRAW_W+16, TITLE_H-8, "#fff"))
o.append('<rect x="%d" y="%.1f" width="6" height="%d" fill="%s"/>' % (MARGIN-8, ty0, TITLE_H-8, BRASS))
o.append('<text x="%d" y="%.1f" font-family="\'Big Shoulders Display\',sans-serif" font-size="20" font-weight="700" fill="%s" letter-spacing="1">ON THE BOULEVARD — RECORDED PLAT (SCHEMATIC)</text>' % (MARGIN+10, ty0+26, INK))
o.append('<text x="%d" y="%.1f" font-size="11" fill="%s">101–149 Arnould Blvd · Lafayette, LA 70506 · Arnold Heights Subd. Ext. No. 1 · 4.84 ac · zoned CH</text>' % (MARGIN+10, ty0+46, SAGE))
o.append('<text x="%d" y="%.1f" font-size="10.5" fill="%s">Survey of record: Montagnet &amp; Domingue, Inc. · 5/20/1994, last rev. 7/19/2019 · GLA 62,883 SF · 27 units · 324 parking (variance 99-11797)</text>' % (MARGIN+10, ty0+64, SAGE))
o.append('<text x="%d" y="%.1f" font-size="9.5" font-style="italic" fill="%s">Schematic reproduction from architect CAD (Boulev_CLEAN.dxf, in feet) — NOT the certified recorded instrument. Generated by tools/plat.py.</text>' % (MARGIN+10, ty0+80, "#8a8270"))
o.append('<text x="%.1f" y="%.1f" text-anchor="end" font-family="\'Big Shoulders Display\',sans-serif" font-size="13" font-weight="700" fill="%s">A-0 PLAT</text>' % (W-MARGIN-2, ty0+26, BRASS))

o.append("</svg>")
out = os.path.join(OUT, "plat-render.svg")
open(out, "w", encoding="utf-8").write("\n".join(o))
print("OK ->", os.path.relpath(out, ROOT), "(%dx%d, %d geo, %d labels, %d trees)" % (W, H, len(geo), len(labels), len(trees)))
