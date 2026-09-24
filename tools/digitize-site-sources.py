"""Digitize the operator's site sheets into src/data/site-register.json
(A-1 site register, plan docs/superpowers/plans/2026-09-24-a1-site-register.md).

Every point is reproducible: coloured markers are detected (HSV threshold +
connected components); hand-read points live in MANUAL with their sheet and
source pixel. Each sheet gets a least-squares affine from building-corner
anchors to A-1 plan px; a sheet whose RMS residual exceeds MAX_RMS aborts.
Positions are DIGITIZED from drawings - not surveyed, not field verified.

  python tools/digitize-site-sources.py
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
G = Path("G:/My Drive/00 OTB/01 Belle Files to be placed")
MAX_RMS = 6.0  # plan px (~3 ft) — drawings of record
CONTEXT_MAX_RMS = 10.0  # context tier (1990s greenspace sheet): pre-2007 drawing, anchors approximate
LUS_MAX_RMS = 20.0  # LUS aerial (±10 ft): LUS address points sit off-centre on each suite
GEO = json.loads((ROOT / "src/data/geometry.json").read_text(encoding="utf-8"))
U = GEO["units"]

# A-1 plan-px building corners (from the demising-derived unit rects)
LB = {"x133": U["133"]["x"] + U["133"]["w"], "x101": U["101"]["x"], "front": U["101"]["y"] + U["101"]["h"], "rear": U["101"]["y"]}
SB = {"xfield": U["137"]["x"], "xpat": U["137"]["x"] + U["137"]["w"], "yma": U["135A"]["y"], "yarn": U["149"]["y"] + U["149"]["h"]}
# plat stall curbs bounding the covered walks (from the generator's stall rows): storefront row far edge (y) and the
# Lot 6 walk-row edge along the short building (x)
_Z = {z["id"]: z for z in GEO["assetGeom"]["zones"]}
CURB = {"storefront": min(p[1] for p in _Z["storefront"]["rows"][0]["quad"]),
        "lot6": max(p[0] for r in _Z["lot6"]["rows"] if r["id"] == "walk12" for p in r["quad"])}


def fit_similarity(anchors):
    """Rotation + uniform scale + translation (no shear) - for map-like sources (aerials) whose anchors are nearly
    collinear, where a free affine would extrapolate wildly off the anchor line."""
    A = np.array([a for a, _ in anchors], float); B = np.array([b for _, b in anchors], float)
    ma, mb = A.mean(0), B.mean(0); a, b = A - ma, B - mb
    Uu, S, Vt = np.linalg.svd(b.T @ a); R = Uu @ Vt
    assert np.linalg.det(R) > 0, "reflection"
    s = S.sum() / (a ** 2).sum(); t = mb - s * R @ ma
    M = np.vstack([(s * R).T, t])  # same 3x2 layout apply() expects
    err = np.linalg.norm(np.c_[A, np.ones(len(A))] @ M - B, axis=1)
    return M, round(float(np.sqrt((err ** 2).mean())), 2)


def fit(anchors):
    P = np.array([[x, y, 1.0] for (x, y), _ in anchors]); Q = np.array([q for _, q in anchors])
    M = np.linalg.lstsq(P, Q, rcond=None)[0]
    err = np.linalg.norm(P @ M - Q, axis=1)
    rms = float(np.sqrt((err ** 2).mean()))
    return M, round(rms, 2)


def apply(M, x, y):
    v = np.array([x, y, 1.0]) @ M
    return [round(float(v[0]), 2), round(float(v[1]), 2)]


def blobs(hsv, lo, hi, min_area, lo2=None, hi2=None):
    m = cv2.inRange(hsv, lo, hi)
    if lo2 is not None:
        m |= cv2.inRange(hsv, lo2, hi2)
    n, _, st, cen = cv2.connectedComponentsWithStats(m)
    return sorted([(float(cen[i][0]), float(cen[i][1])) for i in range(1, n) if st[i][4] > min_area])


items, fits, sources = [], {}, []


def add(id, cat, label, xy, source, status="digitized", **kw):
    """xy None = unit-keyed / unlocated row (the register places a unit row at its suite centroid)."""
    items.append({"id": id, "cat": cat, "label": label, **({"point": xy} if xy is not None else {}),
                  "status": status, "source": source, **kw})


# ── Sheet 1: 07 Columns, Benches, and Cans (Floorplanner export, walkway inventory) ──────────────
def sheet_columns():
    import pymupdf
    src = G / "Center Infrastructure/Technical Maps/Columns, Benches, and Cans/07 Columns, Benches, and Cans.pdf"
    pix = pymupdf.open(src)[0].get_pixmap(dpi=200)
    im = cv2.imdecode(np.frombuffer(pix.tobytes("png"), np.uint8), cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    # long-building walls located by black-pixel projection (rendered at 200 dpi): x 195 (133 end) .. 6683 (101 end),
    # front (walkway) wall y 2423, rear (M.A.) wall y 3482 -> 12.42 px/ft along, 12.39 px/ft across (522.31' x 85.45')
    anchors = [((195, 2423), (LB["x133"], LB["front"])), ((195, 3482), (LB["x133"], LB["rear"])),
               ((6683, 2423), (LB["x101"], LB["front"])), ((6683, 3482), (LB["x101"], LB["rear"]))]
    M, rms = fit(anchors)
    # 4 rectangle corners fit exactly by construction, so the residual proves nothing here; the check is the
    # sheet's own scale agreement along vs across the building (must match within 1%).
    along, across = (6683 - 195) / 522.31, (3482 - 2423) / 85.45
    assert abs(along / across - 1) < 0.01, (along, across)
    fits["columns-benches-cans"] = rms
    lab = "07 Columns, Benches, and Cans.pdf (operator walkway inventory)"
    sources.append({"id": "columns-benches-cans", "file": str(src), "anchors": "long-building corners (4, exact fit)",
                    "rmsPx": rms, "check": f"scale along {along:.2f} vs across {across:.2f} px/ft",
                    "note": "items are placed across each walk proportionally (storefront face -> plat stall curb): the sheet draws the walks 14.5' / 13.1' deep vs ~11' / ~12.5' on the plat; "
                            "the 101-end walk is not drawn on A-1 and keeps the sheet's scale"})
    # Walkway depth differs between sources: the Floorplanner sheet draws the long walk 14.5' deep (blue strip
    # y 2243..2423) and the short walk 13.1' (x 36..199), while the plat puts the stall curbs ~11' / ~12.5' off the
    # storefronts. Items are placed ACROSS each walk proportionally (face -> curb) so columns land at the plat curb;
    # ALONG-walk positions keep the affine. The 101-end walk is not drawn on A-1, so it keeps the sheet's scale.
    curb_long = CURB["storefront"]; curb_short = CURB["lot6"]

    def place(x, y):
        p = apply(M, x, y)
        if x < 240 and y < 2300:  # short-building walk strip
            t = min(max((x - 36) / (199 - 36), 0), 1.1)
            p[0] = round(SB["xfield"] - t * (SB["xfield"] - curb_short), 2)
        elif x >= 195 and 2200 < y < 2423:  # long-building storefront walk (incl. the 101 corner column 7)
            t = min(max((2423 - y) / (2423 - 2243), 0), 1.1)
            p[1] = round(LB["front"] + t * (curb_long - LB["front"]), 2)
        return p

    # Column tags: black numbered boxes; the column square sits 68 px below its tag (same x).
    # Tag centres read from the detection pass (connected components 94x100 px):
    tags = {1: (6765, 3478), 2: (6765, 3287), 3: (6765, 3068), 4: (6765, 2815), 5: (6765, 2588), 6: (6765, 2360),
            7: (6765, 2175), 8: (6655, 2175), 9: (6446, 2175), 10: (6339, 2175), 11: (6153, 2175), 12: (6039, 2175),
            13: (5860, 2175), 14: (5748, 2175), 15: (5367, 2175), 16: (5031, 2175), 17: (4747, 2175), 18: (4411, 2175),
            19: (4103, 2175), 20: (3789, 2175), 21: (3489, 2175), 22: (3188, 2175), 23: (2881, 2175), 24: (2572, 2175),
            25: (2260, 2175), 26: (1936, 2175), 27: (1603, 2177), 28: (1507, 2177), 29: (1241, 2175), 30: (922, 2175),
            31: (592, 2175), 32: (281, 2179), 33: (199, 2028), 34: (199, 1714), 35: (199, 1361), 36: (199, 1014),
            37: (200, 660), 38: (199, 311), 39: (199, 169)}
    for n, (x, y) in tags.items():
        add(f"col-{n:02d}", "column", f"Column {n}", place(x, y + 68), lab,
            sub="short-building walk" if n >= 33 else ("101 end" if n <= 6 else "long-building walk"))
    cans = blobs(hsv, (125, 120, 120), (155, 255, 255), 3000)
    benches = blobs(hsv, (0, 120, 120), (8, 255, 255), 3000, (172, 120, 120), (180, 255, 255))
    # number along the walk from the 101 end: long walk right->left, then short walk bottom->top
    order = lambda p: (0, -p[0]) if p[1] > 2300 else (1, -p[1])
    for k, (x, y) in enumerate(sorted(cans, key=order), 1):
        add(f"can-{k:02d}", "can", f"Trash can {k}", place(x, y), lab)
    for k, (x, y) in enumerate(sorted(benches, key=order), 1):
        add(f"bench-{k:02d}", "bench", f"Bench {k}", place(x, y), lab)
    print(f"07 sheet: rms {rms}px · 39 columns · {len(cans)} cans · {len(benches)} benches")


# ── Sheet 2: Water Shutoff Clusters.png (Oct 2020 survey base; Arnould top, Patricia left) ──────
SHUT = G / "Center Infrastructure/Water Meters & Electric Meters/Water Maps/Water Shutoff Clusters.png"
SHUT_ANCHORS = [((507.5, 769), (LB["x133"], LB["front"])), ((507.5, 1025), (LB["x133"], LB["rear"])),
                ((2073.5, 760), (LB["x101"], LB["front"])), ((2073.5, 1017.5), (LB["x101"], LB["rear"])),
                ((217.5, 251), (SB["xpat"], SB["yarn"])), ((470, 251), (SB["xfield"], SB["yarn"])),
                ((217.5, 879), (SB["xpat"], SB["yma"])), ((470, 879), (SB["xfield"], SB["yma"]))]


def sheet_shutoffs():
    im = cv2.imread(str(SHUT)); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    M, rms = fit(SHUT_ANCHORS)
    fits["water-shutoff-clusters"] = rms
    assert rms <= MAX_RMS, rms
    sources.append({"id": "water-shutoff-clusters", "file": str(SHUT), "anchors": "long + short building corners (8)", "rmsPx": rms})
    lab = "Water Shutoff Clusters.png (operator utility map on the Oct 2020 survey)"
    blue = [p for p in blobs(hsv, (110, 150, 150), (130, 255, 255), 300) if p[1] > 150]  # drop the legend swatch
    red = [p for p in blobs(hsv, (0, 60, 150), (10, 255, 255), 300, (170, 60, 150), (180, 255, 255)) if p[1] > 150]
    assert len(blue) == 6 and len(red) == 13, (len(blue), len(red))
    # counts printed in each circle, read off the sheet (sorted left->right, then top->bottom)
    blue_meta = {  # (x) -> (cluster id, printed count, workbook location note)
        264: ("mclu-149", 8, "Right of 149 / Back Right of 149"), 479: ("mclu-131", 1, "Behind 131"),
        1136: ("mclu-119", 8, "Behind 119"), 1586: ("mclu-109", 4, "Behind 109"),
        1715: ("mclu-107", 1, "Behind 107"), 1811: ("mclu-105", 2, "Behind 105")}
    for x, y in blue:
        cid, n, note = blue_meta[min(blue_meta, key=lambda k: abs(k - x))]
        add(cid, "meter-cluster", f"City meter cluster — {note}", apply(M, x, y), lab, count=n,
            sub=f"{n} meter(s) marked on the map")
    red_counts = [2, 1, 4, 1, 10, 2, 4, 2, 4, 2, 1, 3, 1]  # left->right along the sheet (x-sorted)
    for k, ((x, y), n) in enumerate(zip(sorted(red), red_counts), 1):
        add(f"shutoff-{k:02d}", "shutoff", f"Tenant shut-off cluster {k}", apply(M, x, y), lab, count=n,
            sub=f"{n} tenant water shut-off(s)")
    print(f"shut-off sheet: rms {rms}px · {len(blue)} meter clusters · {len(red)} shut-off clusters ({sum(red_counts)} shut-offs)")
    return M


# ── Sheet 3: Plat of Survey October 2020.png — same drawing as the shut-off map at 5485/2500 scale ──────────────
SURVEY = G / "Architecture/Plats/Center/Plat of Survey October 2020.png"
SURVEY_K = 5485 / 2500  # survey px = shut-off-map px x SURVEY_K (checked: 149 Patricia/Arnould corner 477,551 vs 217.5,251)


def sheet_survey(Mshut):
    sv = lambda x, y: apply(Mshut, x / SURVEY_K, y / SURVEY_K)
    lab = "Plat of Survey October 2020.png (read at zoom; registered through the shut-off map fit)"
    sources.append({"id": "survey-2020", "file": str(SURVEY), "anchors": "shared with water-shutoff-clusters (same drawing)",
                    "rmsPx": fits["water-shutoff-clusters"]})
    for k, (xy, where) in enumerate([((1193, 715), "short-building walk row, north of the pad"),
                                     ((1193, 860), "short-building walk row, south of the pad"),
                                     ((1195, 1360), "short-building walk row at the liquor line"),
                                     ((1867, 1540), "storefront row (west)"), ((2524, 1540), "storefront row (middle)"),
                                     ((3107, 1540), "storefront row (east)")], 1):
        add(f"ada-{k:02d}", "ada", f"ADA stall {k}", sv(*xy), lab, sub=where)
    for k, (xy, where) in enumerate([((1177, 785), "short-building walk row"), ((1178, 1407), "short-building walk row, liquor line"),
                                     ((1803, 1529), "storefront row (west)"), ((2452, 1529), "storefront row (middle)"),
                                     ((3041, 1529), "storefront row (east)")], 1):
        add(f"ada-pad-{k:02d}", "ada", f"ADA access aisle / loading pad {k}", sv(*xy), lab, sub=where)
    items.append({"id": "fence-01", "cat": "fence", "label": "6' wood fence (149 rear, Arnould leg)", "status": "digitized",
                  "source": lab, "line": [sv(476, 645), sv(322, 645)]})
    items.append({"id": "fence-02", "cat": "fence", "label": "6' wood fence (149 rear, freezer leg)", "status": "digitized",
                  "source": lab, "line": [sv(322, 645), sv(322, 738), sv(422, 738)]})
    f = [sv(422, 701), sv(476, 701), sv(476, 846), sv(422, 846)]
    items.append({"id": "freezer-149", "cat": "fence", "label": "Walk-in freezer (Jason's Deli, 149 rear)", "status": "digitized",
                  "source": lab, "polys": [f], "unit": "149"})
    add("sign-pylon", "sign", "Monument / pylon sign — Johnston St frontage", sv(4773, 1290), lab,
        sub="14 panels (P1 2x8 · P2 4x8 anchor · P3–P14 2x4) — src/data/pylon.json · zoning Entry 99-041054")


# ── Sheet 4: Greenspace.pdf — Guidry Beazley 9201.0C zoning site plan (1990s), trees as green symbols ──────────
def sheet_trees():
    import pymupdf
    src = G / "Architecture/Plats/Center/Greenspace.pdf"
    pix = pymupdf.open(src)[0].get_pixmap(dpi=200)
    im = cv2.imdecode(np.frombuffer(pix.tobytes("png"), np.uint8), cv2.IMREAD_COLOR)
    anchors = [((516, 1050), (LB["x133"], LB["front"])), ((516, 1174), (LB["x133"], LB["rear"])),
               ((1276, 1050), (LB["x101"], LB["front"])), ((1276, 1174), (LB["x101"], LB["rear"])),
               ((378, 778), (SB["xpat"], SB["yarn"])), ((510, 778), (SB["xfield"], SB["yarn"])),
               ((378, 1094), (SB["xpat"], SB["yma"])), ((510, 1094), (SB["xfield"], SB["yma"]))]
    M, rms = fit(anchors)
    fits["greenspace-9201.0C"] = rms
    # context tier: the 1990s sheet predates the 2007 short-building work (drawn aspect 2.39 vs 2.47 today), so it
    # cannot meet the 6 px drawing tolerance; trees are historic positions to confirm against current aerials
    assert rms <= CONTEXT_MAX_RMS, rms
    lab = "Greenspace.pdf — Guidry Beazley 9201.0C 'Site plan for zoning request' (1990s photo of the sheet)"
    sources.append({"id": "greenspace-9201.0C", "file": str(src), "anchors": "long + short building corners (8)", "rmsPx": rms,
                    "maxRmsPx": CONTEXT_MAX_RMS, "note": "historic context tier — pre-2007 short building"})
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    m = cv2.morphologyEx(cv2.inRange(hsv, (40, 60, 60), (85, 255, 230)), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, _, st, cen = cv2.connectedComponentsWithStats(m)
    pts = []
    for i in range(1, n):
        a, w = st[i][4], st[i][2]
        if not 400 < a < 20000:
            continue
        if w > 45:  # two touching tree symbols
            pts += [(cen[i][0] - w / 4, cen[i][1]), (cen[i][0] + w / 4, cen[i][1])]
        else:
            pts.append((cen[i][0], cen[i][1]))
    pts.sort(key=lambda p: (round(p[1] / 60), p[0]))
    for k, (x, y) in enumerate(pts, 1):
        where = "Arnould R/W planting (city)" if y < 720 else "site landscape"
        add(f"tree-{k:02d}", "tree", f"Tree {k}", apply(M, x, y), lab, status="historic-source",
            sub=f"{where} — 1990s zoning plan; confirm against current aerials")
    print(f"greenspace: rms {rms}px · {len(pts)} trees")


# ── Sheet 5: LUS ArcMap capture image002.png (7/14/2021, 1:1,250) — public water/sewer context ───────────────
LUS = G / "Center Infrastructure/Water Meters & Electric Meters/image002.png"



def sheet_lus():
    # LUS magenta address points (detected) paired with A-1 suite centroids; 101/103/125/131 dropped (their points
    # sit at a suite edge, not mid-roof - residuals 20-54 px)
    dots = {"129": (416, 381), "127": (437, 408), "123": (470, 449), "121": (481, 469), "119.5": (496, 487),
            "119": (511, 506), "117.5": (526, 522), "117": (540, 541), "115": (554, 559), "113": (570, 576),
            "111": (582, 592), "109": (597, 611), "107": (611, 630), "105": (627, 652), "149": (462, 215),
            "145": (445, 235), "143": (430, 240.6), "141": (418, 252), "139": (404, 262), "137": (390, 272)}
    anchors = [(xy, (U[k]["x"] + U[k]["w"] / 2, U[k]["y"] + U[k]["h"] / 2)) for k, xy in dots.items()]
    M, rms = fit_similarity(anchors)
    fits["lus-2021"] = rms
    assert rms <= LUS_MAX_RMS, rms
    lab = "LUS ArcMap capture 7/14/2021 (image002.png, 1:1,250) — Lafayette Utilities System public assets"
    sources.append({"id": "lus-2021", "file": str(LUS), "anchors": "20 LUS address points -> suite centroids (similarity fit)",
                    "rmsPx": rms, "maxRmsPx": LUS_MAX_RMS})
    st = "public-utility-context"
    # ALONG each street the similarity fit is well constrained (the anchor dots run the building lengths); ACROSS it
    # it is not (dots cluster on the roof centrelines). So every LUS feature takes its along-street coordinate from
    # the fit and its across-street coordinate from the line it sits on, placed off the plat R/W line by the spacing
    # measured in the capture (1:1,250 -> ~1.08 ft/px): Arnould water on the property-side edge, sewer 32' further
    # out; Marie Antoinette 2" water on the property side, sewer 24' further out; Patricia sewer on the centreline.
    ky, kx = GEO["boundary"]["transform"]["kyPxPerFt"], GEO["boundary"]["transform"]["kxPxPerFt"]
    ARN_RW, MA_RW, PAT_RW = 662, 96, 1360  # A-1 R/W lines (b = 0, b = -300, a = -25)
    LINE = {"arnould-water": ("y", ARN_RW + 5 * ky), "arnould-sewer": ("y", ARN_RW + 37 * ky),
            "ma-water": ("y", MA_RW - 5 * ky), "ma-sewer": ("y", MA_RW - 29 * ky), "patricia-sewer": ("x", PAT_RW + 25 * kx)}

    def on(line, xy):
        axis, v = LINE[line]; p = apply(M, *xy)
        return [p[0], round(v, 2)] if axis == "y" else [round(v, 2), p[1]]
    for sid, xy, line, what in [("6-3861", (600, 301), "arnould-water", "water valve/structure — Arnould"),
                                ("6-3823", (731, 462), "arnould-water", "water valve/structure — Arnould, mid-frontage"),
                                ("8-1782", (875, 617), "arnould-water", "water structure — Arnould × Johnston"),
                                ("6-3790", (861, 629), "arnould-water", "water structure — Arnould × Johnston"),
                                ("2-2401", (422, 566), "ma-water", "water valve/structure — Marie Antoinette, behind 121"),
                                ("2-2419", (291, 396), "ma-water", "water valve/structure — Marie Antoinette near Lot 8"),
                                ("2-2436", (216, 322), "ma-water", "water valve/structure — Patricia × Marie Antoinette")]:
        add("lus-" + sid, "lus-point", f"LUS {sid}", on(line, xy), lab, status=st, sub=what)
    for k, (xy, line, what) in enumerate([((661, 308), "arnould-sewer", "Arnould (1795, sta 3+08)"),
                                          ((850, 549), "arnould-sewer", "Arnould, 101 end (1796)"),
                                          ((411, 524), "ma-sewer", "Marie Antoinette, behind 121 (1790)"),
                                          ((583, 742), "ma-sewer", "Marie Antoinette, behind 103 (8971 D)")], 1):
        add(f"lus-mh-{k:02d}", "lus-point", f"LUS sewer manhole {k}", on(line, xy), lab, status=st, sub=what)
    add("lus-mh-05", "lus-point", "LUS sewer manhole 5", [round(LINE["patricia-sewer"][1], 2), round(LINE["ma-sewer"][1], 2)], lab,
        status=st, sub="Patricia × Marie Antoinette (1787)")
    for k, (xy, line, what) in enumerate([((617, 322), "arnould-water", "Arnould"), ((437, 531), "ma-water", "Marie Antoinette, behind 121"),
                                          ((324, 375), "ma-water", "Marie Antoinette near Lot 8")], 1):
        add(f"lus-red-{k:02d}", "lus-point", f"LUS red point symbol {k}", on(line, xy), lab, status=st,
            sub=what + " — hydrant or valve per the LUS legend (legend not on the capture; unconfirmed)")
    for mid, line, what in [("water-arnould", "arnould-water", "8\" PVC water main — Arnould Blvd (property side)"),
                            ("sewer-arnould", "arnould-sewer", "8\" VCP sewer main — Arnould Blvd"),
                            ("water-ma", "ma-water", "2\" PVC water line — Marie Antoinette (property side)"),
                            ("sewer-ma", "ma-sewer", "8\" VCP sewer main — Marie Antoinette"),
                            ("sewer-patricia", "patricia-sewer", "8\" VCP sewer main — Patricia St")]:
        axis, v = LINE[line]; v = round(v, 2)
        items.append({"id": "lus-" + mid, "cat": "lus-main", "label": what, "status": st, "source": lab,
                      "line": [[70, v], [1360, v]] if axis == "y" else [[v, 96], [v, 662]],
                      "sub": "street-parallel; across-street offset from the line spacing in the LUS capture"})
    print(f"LUS: rms {rms}px")


# ── Hand-placed from photographed sheets (no reliable anchors): positioned relative to A-1 building features ─────
def hand_placed():
    lab_e = "Main.pdf E1.02 'Modifications to existing improvements — electrical site plan' (Guidry Beazley 9201.C1, 2006; photo)"
    appr = "approximate"
    add("xfmr-t1", "transformer", "Transformer T1 (existing)", [LB["x133"] - 18, LB["rear"] - 10], lab_e, status=appr,
        sub="rear of the long building at the 133 end (Marie Antoinette side)")
    add("xfmr-t2", "transformer", "Transformer T2 (new padmount by utility, 2006)", [SB["xpat"] + 12, 292], lab_e, status=appr,
        sub="Patricia side of the short building at 135B/137, fed from the Patricia pole")
    add("pole-patricia", "pole", "Utility pole — Patricia St (4\" primary to T2)", [SB["xpat"] + 36, 286], lab_e, status=appr)
    add("light-pole-corner", "lighting", "Existing pole + luminaire (Arnould × Patricia corner)", [1340, 640], lab_e, status=appr,
        sub="E1.02 keynote 'existing pole and luminaire to remain'")
    lab_c = "Crist A-1, May 22 2007 (final version June 1 2007) — 'new heat pumps, protect w/ 2 pipe bollards'"
    ylen = SB["yarn"] - SB["yma"]
    for g, t in enumerate([0.16, 0.40, 0.64], 1):  # group positions along the Patricia face, read off A-1 (M.A. end = 0)
        y = SB["yma"] + t * ylen
        for s, dy in (("a", -5), ("b", 5)):
            add(f"ghp-{g}{s}", "ground-hp", f"Ground heat pump {g}{s.upper()}", [SB["xpat"] + 8, round(y + dy, 2)], lab_c, status=appr,
                sub=f"Patricia side, group {g} of 3 (2007 addition)")
        add(f"bollard-{g}", "bollard", f"Pipe bollards, pair {g}", [SB["xpat"] + 17, round(y, 2)], lab_c, status=appr, count=2)
    # walks derived from the building faces + the digitized column lines
    col = {i["id"]: i["point"] for i in items if i["cat"] == "column"}
    yl = CURB["storefront"]  # long walk runs storefront -> plat stall curb
    lab_w = "derived from the A-1 building faces + the digitized column lines (Plat of Survey 2020 'covered walkway')"
    for wid, label, q in [("walk-long", "Covered walkway — long building storefront", [[LB["x101"], LB["front"]], [LB["x133"], LB["front"]], [LB["x133"], yl], [LB["x101"], yl]]),
                          ("walk-101-end", "Covered walkway — 101 end (Johnston)", [[col["col-01"][0] - 2, LB["rear"] - 10], [LB["x101"], LB["rear"] - 10], [LB["x101"], yl], [col["col-01"][0] - 2, yl]]),
                          ("walk-short", "Covered walkway — short building", [[CURB["lot6"], SB["yma"]], [SB["xfield"], SB["yma"]], [SB["xfield"], col["col-39"][1] + 2], [CURB["lot6"], col["col-39"][1] + 2]]),
                          ("breezeway", "Breezeway (133 end ↔ 135A)", [[LB["x133"], SB["yma"]], [SB["xfield"], SB["yma"]], [SB["xfield"], LB["front"]], [LB["x133"], LB["front"]]])]:
        items.append({"id": wid, "cat": "walk", "label": label, "status": "derived", "source": lab_w, "polys": [q]})
    items.append({"id": "sidewalk-arnould", "cat": "walk", "label": "4' public sidewalk — Arnould R/W", "status": "derived",
                  "source": "Plat of Survey 2020 '4' Sidewalk (Existing)' on the R/W", "line": [[70, 668], [1360, 668]]})
    # fire / demising walls per Main.pdf M1.02/E1.02 (photo): 4-hr wall splits converted area 'A' (125-133, 9,265 SF)
    lab_f = "Main.pdf M1.02 / E1.02 fire-rated wall notes (2006; photo, positions approximate)"
    xw = (U["123"]["x"] + U["123"]["w"] + U["125"]["x"]) / 2
    items.append({"id": "firewall-4hr-123-125", "cat": "firewall", "label": "4-hr fire-rated wall + canopy fire curtain (123 | 125)",
                  "status": appr, "source": lab_f, "line": [[xw, LB["rear"]], [xw, yl]],
                  "sub": "separates converted area 'A' (125–133, 9,265 SF) from the 35,025 SF block"})
    for wid, a, b in [("135-137", "135", "137"), ("145-149", "145", "149")]:
        y = (U[a if a != "135" else "135A"]["y"] + U[a if a != "135" else "135A"]["h"] + U[b]["y"]) / 2
        items.append({"id": "firewall-2hr-" + wid, "cat": "firewall", "label": f"2-hr fire-rated wall ({a} | {b})", "status": appr,
                      "source": lab_f, "line": [[SB["xfield"], round(y, 2)], [SB["xpat"], round(y, 2)]], "sub": "confirm on the originals"})


# ── Per-unit building systems (rows; the register places unit-keyed rows at the suite centroid) ─────────────────
def unit_systems():
    hv = json.loads((ROOT / "src/data/hvac.json").read_text(encoding="utf-8"))["units"]
    sched = {"113": "packaged RTU (Carrier) per 2000 Gesser set", "149": "RTUs on E3 roof power plan, 2000 Brooks set",
             "105": "packaged heat pump per Ellis Phase Two set", "111": "packaged heat pump per Ellis Phase Two set"}
    for u in U:
        h = hv.get(u, {})
        caps = f"tenant repair cap {h['repair']} / replace {h['replace']}" if h else "no HVAC split on file"
        add(f"rtu-{u.lower()}", "rtu", f"Rooftop HVAC — Suite {u}", None, "tenant plan sets + src/data/hvac.json (cost split)",
            status="records", unit=u, sub=f"{sched.get(u, 'unit count/tonnage not scheduled on file')} · {caps}")
        add(f"panel-{u.lower()}", "panel", f"Electrical panel — Suite {u}", None, "tenant plan-set panel schedules / risers",
            status="records", unit=u, sub="panel make/position per unit not yet confirmed")
    add("panel-fpe", "panel", "Federal Pacific 42-circuit panel — REPLACEMENT REVIEW", None,
        "Center Infrastructure/Breaker Labeling photos (unit not identified in the photo)", status="photo-unlocated",
        sub="'NEVER turn off' tags + fire alarm panel circuit; Federal Pacific Stab-Lok breakers are a known fire risk")
    clocks = {"101": 1, "103": 1, "105": 1, "107": 1, "109": 1, "113": 1, "115": 1, "117": 1, "117.5": 1, "119": 1, "119.5": 2,
              "121": 1, "123": 1, "125": 1, "127": 1, "129": 1, "131": 2, "135A": 1, "137": 1, "141": 1, "143": 1, "145": 1, "149": 1}
    for u, n in clocks.items():
        for k in range(1, n + 1):
            items.append({"id": f"tc-{u.lower()}" + (f"-{k}" if n > 1 else ""), "cat": "timeclock", "unit": u,
                          "label": f"Lighting time clock — Suite {u}" + (f" #{k}" if n > 1 else "") + (" (131/133)" if u == "131" else ""),
                          "status": "photo", "source": "Center Infrastructure/Unit Time Clocks photos",
                          "sub": "Intermatic T101 24-hr dial" + (" + double-pole T-series" if u == "131" and k == 1 else "")})
    for u in ("111", "135B", "139"):
        items.append({"id": f"tc-{u.lower()}", "cat": "timeclock", "unit": u, "label": f"Lighting time clock — Suite {u}",
                      "status": "no-photo", "source": "Unit Time Clocks folder has no photo for this suite", "sub": "photograph on the next walk"})
    for fid, name in (("A", "recessed canopy downlight"), ("B", "decorative lantern post"), ("C", "wall bracket")):
        items.append({"id": f"light-type-{fid.lower()}", "cat": "lighting", "label": f"Fixture type {fid} — {name}", "status": "records",
                      "source": "Main.pdf E1.02 lighting fixture schedule (2006)", "sub": "fixture positions not yet counted"})
    items.append({"id": "sign-lantern-post", "cat": "sign", "label": "Lantern post (1999 sign sheet)", "status": "records",
                  "source": "Center/Scanned Documents.pdf — Guidry Beazley PA1.01 'New Sign' (08/19/99)", "sub": "position to confirm"})
    items.append({"id": "sign-fire-lane", "cat": "sign", "label": "Fire-lane / no-parking signs", "status": "records",
                  "source": "Main.pdf T1.02 (2006)", "sub": "count and positions to confirm on a walk"})


CODEX = Path("C:/Users/adam/Documents/Codex/2026-09-23/ca/outputs/OTB_Column_Twin/model-data.json")


def codex_crosslink():
    """Attach the Sep 23 Codex column twin's assetId to each operator column within 1.5 m. Both derive from the
    same Floorplanner model; register them by trying the 8 axis orientations, then nearest-neighbour affine ICP."""
    if not CODEX.exists():
        print("codex model-data.json not found - cross-link skipped"); return
    cx = json.loads(CODEX.read_text(encoding="utf-8"))["columns"]
    ops = [i for i in items if i["cat"] == "column"]
    O = np.array([i["point"] for i in ops])
    C = np.array([[c["position"][0], c["position"][2]] for c in cx])  # model metres (X, Z)
    # Seed: the Codex model runs its storefront line along +X toward the 101 end and Z toward the 101 end's return,
    # i.e. plan x = -X, plan y = -Z. Scale m -> ft -> A-1 px (kx 1.8515, ky 1.8866). Translate so the two
    # walk-line corners coincide (Codex's storefront/101-end corner = the (max X, storefront Z) column; ours = col-07).
    P = np.c_[-C[:, 0] * 3.28084 * 1.8515, -C[:, 1] * 3.28084 * 1.8866]
    ci0 = int(np.argmax(C[:, 0] - np.abs(C[:, 1] - np.median(C[:, 1]))))  # corner column
    P = P - P[ci0] + O[6]
    for _ in range(20):  # refine: nearest-neighbour affine ICP on confident pairs
        d = np.linalg.norm(P[:, None] - O[None], axis=2); nn = d.argmin(1)
        keep = d.min(1) < 15
        T = np.linalg.lstsq(np.c_[P[keep], np.ones(keep.sum())], O[nn[keep]], rcond=None)[0]
        P = np.c_[P, np.ones(len(P))] @ T
    tol = 1.5 * 3.28084 * 1.869
    d = np.linalg.norm(P[:, None] - O[None], axis=2)
    taken, matched = set(), 0
    for ci in np.argsort(d.min(1)):
        oi = int(d[ci].argmin())
        if d[ci, oi] <= tol and oi not in taken:
            taken.add(oi); matched += 1
            ops[oi]["codexAssetId"] = cx[ci]["id"]; ops[oi]["codexLabel"] = cx[ci]["label"]
    unmatched_ops = [o["label"] for k, o in enumerate(ops) if k not in taken]
    unmatched_cx = [cx[ci]["label"] for ci in range(len(cx)) if not any(o.get("codexAssetId") == cx[ci]["id"] for o in ops)]
    fits["codex-crosslink"] = {"matched": matched, "toleranceM": 1.5, "operatorUnmatched": unmatched_ops, "codexUnmatched": unmatched_cx}
    print(f"codex cross-link: {matched}/37 matched; operator-only {unmatched_ops}; codex-only {unmatched_cx}")


def main():
    sheet_columns()
    Mshut = sheet_shutoffs()
    codex_crosslink()
    sheet_survey(Mshut)
    sheet_trees()
    sheet_lus()
    hand_placed()
    unit_systems()
    ids = [i["id"] for i in items]
    assert len(ids) == len(set(ids)), "duplicate ids"
    doc = {"_readme": "Digitized site-register items. Generated by tools/digitize-site-sources.py - edit the script "
                      "(anchors / MANUAL table), not this file. Positions are digitized from drawings, NOT surveyed.",
           "maxRmsPx": MAX_RMS, "fits": fits, "sources": sources, "items": items}
    (ROOT / "src/data/site-register.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("site-register.json:", len(items), "items")


if __name__ == "__main__":
    main()
