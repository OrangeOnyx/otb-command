# Walkway column detection: COLMAP dense cloud -> plan-space column grid.
#   python tools/detect-columns.py [fused.ply]
# Default input: C:/Users/adam/tools3dgs/otb-work/dense/fused.ply (the 121-frame solve
# the splat + mesh share; its frames are the Oct-2020 Bailey DJI flight).
# Output: src/data/walkway-columns.json (plan px, same frame as geometry.json units).
#
# Method: bake splat-align.json (COLMAP -> Lens-B world), invert layout3d centering to
# plan px, keep points 3-9 ft above grade (under the canopy fascia, above curbs/wheel
# stops), histogram them along the building run in a thin band at the column line, then
# grid-search a REGULAR lattice (pitch x phase) that maximizes the density z-score at
# every predicted column. A lattice beats per-peak picking: cars, signs and people make
# spurious peaks, but only the columns repeat at a fixed pitch.
# Re-run after any dense re-reconstruction (e.g. the Insta360/drone re-capture).
import json, pathlib, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else \
    pathlib.Path("C:/Users/adam/tools3dgs/otb-work/dense/fused.ply")
OUT = ROOT / "src" / "data" / "walkway-columns.json"
ALIGN = json.loads((ROOT / "src" / "data" / "splat-align.json").read_text())
UNITS = json.loads((ROOT / "src" / "data" / "geometry.json").read_text())["units"]
WORLD = 0.06            # scene3d-layout.js
PLAN_PER_FT = 1.8657    # splat-align.js
MODULE_FT = 2.0         # operator 2026-09-23: columns 24"x24"; walkway scored in 24" squares
H_BAND = (3.0, 9.0)     # ft above grade


def quat_to_R(q):  # [x,y,z,w]
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])


def read_ply(path):
    raw = path.read_bytes()
    hdr = raw.index(b"end_header") + len(b"end_header")
    hdr += 2 if raw[hdr:hdr + 2] == b"\r\n" else 1
    n = int(raw[:hdr].split(b"element vertex ")[1].split()[0])
    dt = np.dtype([("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("nx", "<f4"), ("ny", "<f4"),
                   ("nz", "<f4"), ("r", "u1"), ("g", "u1"), ("b", "u1")])
    v = np.frombuffer(raw, dtype=dt, count=n, offset=hdr)
    return np.stack([v["x"], v["y"], v["z"]], 1).astype(np.float64)


def fit_lattice(along, lo, hi, pitches):
    """Best regular lattice over [lo, hi]; returns score, pitch, positions, per-column z."""
    hist, edges = np.histogram(along, bins=np.arange(lo - 10, hi + 10, 0.5))
    centers = edges[:-1] + 0.25
    sm = np.convolve(hist, np.ones(5) / 5, "same")
    z = (sm - np.median(sm)) / (sm.std() + 1e-9)
    best = None
    for p in pitches:
        for ph in np.arange(0, p, 0.25):
            cols = lo + ph + np.arange(-2, int((hi - lo) / p) + 3) * p
            cols = cols[(cols > lo - 2) & (cols < hi + 2)]
            idx = np.clip(((cols - centers[0]) / 0.5).astype(int), 0, len(z) - 1)
            s = z[idx].mean()
            if best is None or s > best[0]:
                best = (s, p, cols, z[idx])
    return best


def main():
    P = read_ply(SRC) @ (quat_to_R(ALIGN["quaternion"]) * ALIGN["scale"]).T + np.array(ALIGN["position"])
    us = list(UNITS.values())
    minX = min(u["x"] for u in us); maxX = max(u["x"] + u["w"] for u in us)
    minY = min(u["y"] for u in us); maxY = max(u["y"] + u["h"] for u in us)
    cx, cy = (minX + maxX) / 2, (minY + maxY) / 2
    px = P[:, 0] / WORLD + cx
    py = P[:, 2] / WORLD + cy
    hf = P[:, 1] / (PLAN_PER_FT * WORLD)
    inH = (hf > H_BAND[0]) & (hf < H_BAND[1])

    # Long building 101-133: storefronts face +y (the main field); run is along x.
    lu = [u for u in us if abs(u["y"] - 131.35) < 1]
    x0, x1 = min(u["x"] for u in lu), max(u["x"] + u["w"] for u in lu)
    face = max(u["y"] + u["h"] for u in lu)
    near = inH & (px > x0) & (px < x1) & (py > face - 40) & (py < face + 20)
    hy, ey = np.histogram(py[near], bins=np.arange(face - 40, face + 20, 0.5))
    colY = ey[np.argmax(hy[len(hy) // 2:]) + len(hy) // 2] + 0.25   # outer peak = column line
    storeY = ey[np.argmax(hy[:len(hy) // 2])] + 0.25                 # inner peak = storefront
    band = inH & (py > colY - 6) & (py < colY + 3) & (px > x0 - 10) & (px < x1 + 10)
    score, pitch, cols, zs = fit_lattice(px[band], x0, x1, np.arange(45, 54, 0.05))
    # Cross-axis: the splat fit is scored on roof outlines, so it carries a few feet
    # of bias perpendicular to the storefront. CCTV (suite-113 N/S) shows the columns
    # standing on the walkway's parking edge, which the CAD draws as the sidewalk
    # strip in front of the footprint. Seat column centers half a column inside it.
    base = json.loads((ROOT / "src" / "data" / "geometry.json").read_text())["layers"]["base"]
    strip = next(p for p in base if p["t"] == "rect" and abs(p["x"] - x0) < 1 and face <= p["y"] <= face + 5)
    curbY = strip["y"] + strip["h"]
    seatY = curbY - 1.0 * PLAN_PER_FT

    out = {
        "source": f"{SRC.name} (Oct-2020 DJI dense solve) via tools/detect-columns.py; splat-align.json baked",
        "status": "DETECTED — pending operator tile-count confirmation (see docs/walkway-digital-twin-2026-09-23.md)",
        "moduleFt": MODULE_FT,
        "columnSizeFt": 2.0,
        "longBuilding": {
            "axis": "x", "columnLineY": round(seatY, 2), "curbY": round(curbY, 2),
            "cloudColumnLineY": round(colY, 2), "cloudStorefrontY": round(storeY, 2),
            "crossAxisBiasFt": round((seatY - colY) / PLAN_PER_FT, 1),
            "walkwayDepthFt": round((colY - storeY) / PLAN_PER_FT, 1),
            "heightFt": 10, "heightNote": "schematic — canopy underside not yet measured",
            "positionToleranceFt": 3,
            "pitchPx": round(pitch, 2), "pitchFt": round(pitch / PLAN_PER_FT, 2),
            "latticeScore": round(float(score), 2),
            "columns": [{"id": f"L{i + 1:02d}", "x": round(float(c), 2), "y": round(seatY, 2),
                         "evidenceZ": round(float(z), 2)} for i, (c, z) in enumerate(zip(cols, zs))],
        },
        "shortBuilding": {
            "status": "NOT RESOLVED — the 2020 cloud is too thin under the 135-149 canopy (lattice score ~1.2); needs the ground capture",
        },
    }
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    lb = out["longBuilding"]
    print(f"long bldg: {len(cols)} columns, pitch {lb['pitchFt']} ft, walkway {lb['walkwayDepthFt']} ft, score {lb['latticeScore']}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
