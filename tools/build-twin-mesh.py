# Georeferenced photogrammetry mesh of OTB in the twin frame (EPSG:6344 + NAVD88, origin 591000/3341600).
#
#   python tools/build-twin-mesh.py                # all stages, cached
#   python tools/build-twin-mesh.py --stage align  # DJI registration only (writes report)
#
# Inputs
#   DJI orbit (July 2026): 121-frame COLMAP solve + fused dense cloud in C:/Users/adam/tools3dgs/otb-work
#     (COLMAP frame = splat frame; the Reality lens alignment src/data/splat-align.json maps it to lens world)
#   Skydio (2025-10-15): export/skydio-rectify/colmap-world (python tools/skydio-rectify.py), already in the twin frame
#   3DEP LiDAR rasters: .cache/skydio-rectify/lidar.npz (built by skydio-rectify)
#
# DJI -> twin frame, no GPS (video frames carry none):
#   1. seed: splat-align (COLMAP -> lens world) then lens world -> UTM from the 27 unit box centres vs the
#      LiDAR-registered footprints (2-D similarity, 0.68 m RMS);
#   2. horizontal: grid search (rotation, shift, scale) maximising IoU of the DJI roof mask with the LiDAR
#      roof mask (roof edges pin what flat-surface ICP cannot);
#   3. vertical: robust plane fit of z - LiDAR DSM over flat cells (dz + tilts).
#   Checked against the Skydio RTK-locked sparse cloud (independent horizontal reference).
import argparse, json, math, struct, subprocess, sys
from pathlib import Path
import numpy as np
import cv2
from scipy import ndimage as nd
from scipy.spatial import cKDTree
from pyproj import Transformer
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parent.parent
T3 = Path("C:/Users/adam/tools3dgs")
COLMAP = T3 / "bin/colmap.exe"
DJI = T3 / "otb-work"
SKY_WS = T3 / "otb-skydio-v2"
SKY = ROOT / "export/skydio-rectify"
OUT = ROOT / "export/twin-mesh"
CACHE = ROOT / ".cache/twin-mesh"
ORIGIN = np.array([591000.0, 3341600.0, 0.0])
to_utm = Transformer.from_crs(4326, 6344, always_xy=True)


# ------------------------------------------------------------------ io
def read_ply(path):
    """Binary little-endian PLY vertices -> dict of numpy arrays (vertex element only)."""
    raw = open(path, "rb").read()
    k = raw.index(b"end_header")
    end = k + 10 + (2 if raw[k + 10:k + 12] == b"\r\n" else 1)      # COLMAP on Windows writes CRLF headers
    head = raw[:end].decode("ascii", "ignore").splitlines()
    n = 0; props = []; in_v = False
    for l in head:
        p = l.split()
        if p[:2] == ["element", "vertex"]:
            n = int(p[2]); in_v = True
        elif p and p[0] == "element":
            in_v = False
        elif in_v and p and p[0] == "property":
            props.append((p[2], {"float": "<f4", "double": "<f8", "uchar": "u1", "int": "<i4", "uint": "<u4"}[p[1]]))
    dt = np.dtype(props)
    return np.frombuffer(raw[end:end + n * dt.itemsize], dtype=dt, count=n)

def write_ply(path, P, C=None, comment=""):
    dt = [("x", "<f4"), ("y", "<f4"), ("z", "<f4")] + ([("red", "u1"), ("green", "u1"), ("blue", "u1")] if C is not None else [])
    a = np.empty(len(P), dt)
    a["x"], a["y"], a["z"] = P[:, 0], P[:, 1], P[:, 2]
    if C is not None:
        a["red"], a["green"], a["blue"] = C[:, 0], C[:, 1], C[:, 2]
    hdr = "ply\nformat binary_little_endian 1.0\n" + (f"comment {comment}\n" if comment else "") + f"element vertex {len(P)}\n" + \
          "".join(f"property {'float' if t.startswith('<f') else 'uchar'} {n}\n" for n, t in dt) + "end_header\n"
    with open(path, "wb") as fh:
        fh.write(hdr.encode()); fh.write(a.tobytes())

def lidar():
    d = np.load(ROOT / ".cache/skydio-rectify/lidar.npz")
    return {k: d[k] for k in d.files}


# ------------------------------------------------------------------ seed chain
def qrot(q, v):
    qx, qy, qz, qw = q
    t = 2 * np.cross(np.array([qx, qy, qz])[None, :], v)
    return v + qw * t + np.cross(np.array([qx, qy, qz])[None, :], t)

def lens_to_utm():
    """2-D similarity lens (x, z) -> local (E, N) from unit box centres vs LiDAR-registered footprints."""
    subprocess.run(["node", "-e", """
import('./src/lib/splat-align.js').then(({realityBoxes}) => {
  const fs = require('fs');
  const g = JSON.parse(fs.readFileSync('src/data/geometry.json', 'utf8')), h = JSON.parse(fs.readFileSync('src/data/heights.json', 'utf8'));
  const units = Object.entries(g.units).map(([unit, p]) => ({unit, x: p.x, y: p.y, w: p.w, h: p.h, heightFt: h[unit] || 16.4}));
  fs.mkdirSync('.cache/twin-mesh', {recursive: true});
  fs.writeFileSync('.cache/twin-mesh/boxes.json', JSON.stringify(realityBoxes(units).boxes));
});"""], cwd=ROOT, check=True)
    boxes = json.load(open(CACHE / "boxes.json"))
    fp = json.load(open(SKY / "footprints-lidar.geojson"))
    cen = {f["properties"]["unit"]: Polygon([to_utm.transform(*c) for c in f["geometry"]["coordinates"][0]]).centroid for f in fp["features"]}
    A = np.array([[b["x"], b["z"]] for b in boxes if b["unit"] in cen])
    B = np.array([[cen[b["unit"]].x - ORIGIN[0], cen[b["unit"]].y - ORIGIN[1]] for b in boxes if b["unit"] in cen])
    ma, mb = A.mean(0), B.mean(0)
    U, D, Vt = np.linalg.svd((B - mb).T @ (A - ma))
    R = U @ Vt                                     # improper in 2-D (plan-y -> z flips handedness); proper in 3-D with y -> up
    s = D.sum() / ((A - ma) ** 2).sum()
    t = mb - s * R @ ma
    r = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
    return s, R, t, float(np.sqrt((r ** 2).mean()))

def seed_transform(L):
    """4x4-ish similarity (S, R3, t3) mapping DJI COLMAP coords -> local twin frame."""
    al = json.load(open(ROOT / "src/data/splat-align.json"))
    s2, R2, t2, rms = lens_to_utm()
    q = np.array(al["quaternion"], float)
    Rq = np.stack([qrot(q, e[None, :])[0] for e in np.eye(3)], 1)          # columns = rotated basis
    # lens (x, y, z) -> local (E, N, U): [E, N] = s2 R2 [x, z] + t2 ; U = s2 y + ground
    M = np.array([[R2[0, 0], 0, R2[0, 1]], [R2[1, 0], 0, R2[1, 1]], [0, 1, 0]])
    ground = float(np.median(L["dtm"]))
    S = s2 * al["scale"]
    R3 = M @ Rq
    t3 = s2 * (M @ np.array(al["position"])) + np.array([t2[0], t2[1], ground])
    return S, R3, t3, {"lens_to_utm_rms_m": round(rms, 2), "m_per_lens_unit": round(s2, 4), "det": round(float(np.linalg.det(R3)), 3)}


# ------------------------------------------------------------------ refinement
def roof_mask_from_points(P, L):
    H, W = L["roof"].shape
    ix = ((P[:, 0] + ORIGIN[0] - L["X0"]) / L["res"]).astype(int); iy = ((P[:, 1] + ORIGIN[1] - L["Y0"]) / L["res"]).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < W) & (iy < H)
    top = np.full((H, W), -np.inf); np.maximum.at(top, (iy[ok], ix[ok]), P[ok, 2])
    hag = top - L["dtm"]
    m = (hag > 2.5) & (hag < 15)
    m = nd.binary_closing(m, iterations=2) & np.isfinite(top)
    return nd.binary_opening(m, iterations=1)

def refine_horizontal_score(P, L, zone):
    """Roof-mask IoU with the LiDAR in the site zone (diagnostic only: an orbit sees roofs obliquely)."""
    m = roof_mask_from_points(P, L) & zone
    t = L["roof"] & zone
    return (m & t).sum() / max((m | t).sum(), 1)

def refine_walls(P, N, L, zone):
    """Chamfer fit of facade points (|nz| < 0.25, 1-4 m above ground) to LiDAR roof edges: rotation, scale, shift.
    Walls sit on the roof outline (parapets are flush on this centre), so edges pin horizontal and scale."""
    hag = P[:, 2] - np.median(L["dtm"])
    wall = (np.abs(N[:, 2]) < 0.25) & (hag > 1.0) & (hag < 4.0)
    W_ = P[wall][:, :2]
    W_ = W_[np.random.default_rng(2).choice(len(W_), min(len(W_), 150_000), replace=False)]
    edge = (L["roof"] & ~nd.binary_erosion(L["roof"])) & zone
    dt = nd.distance_transform_edt(~edge) * L["res"]
    H, Wd = dt.shape
    c = W_.mean(0)
    base_px = (W_ + ORIGIN[:2] - np.array([L["X0"], L["Y0"]])) / L["res"]
    pc = (c + ORIGIN[:2] - np.array([L["X0"], L["Y0"]])) / L["res"]
    inzone = zone
    def score(rot, sc, dx, dy, trunc=3.0):
        a = math.radians(rot); A = sc * np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        q = ((A @ (base_px - pc).T).T + pc + np.array([dx, dy]) / L["res"]).astype(int)
        ok = (q[:, 0] >= 0) & (q[:, 1] >= 0) & (q[:, 0] < Wd) & (q[:, 1] < H)
        ok[ok] &= inzone[q[ok, 1], q[ok, 0]]
        if ok.sum() < 1000:
            return trunc
        return float(np.minimum(dt[q[ok, 1], q[ok, 0]], trunc).mean())
    best = (score(0, 1, 0, 0), 0.0, 1.0, 0.0, 0.0)
    base = best[0]
    for rot in np.arange(-3, 3.01, 0.5):
        for sc in np.arange(0.92, 1.081, 0.02):
            for dx in np.arange(-8, 8.01, 1.0):
                for dy in np.arange(-8, 8.01, 1.0):
                    s_ = score(rot, sc, dx, dy)
                    if s_ < best[0]:
                        best = (s_, rot, sc, dx, dy)
    for step in (0.5, 0.25, 0.1, 0.05):                        # coordinate-descent refinement, same score
        _, r0, s0, x0, y0 = best
        for rot in r0 + step * np.arange(-2, 3):
            for sc in s0 + step * 0.02 * np.arange(-2, 3):
                for dx in x0 + step * np.arange(-2, 3):
                    for dy in y0 + step * np.arange(-2, 3):
                        s_ = score(rot, sc, dx, dy)
                        if s_ < best[0]:
                            best = (s_, rot, sc, dx, dy)
    _, r, s, x, y = best
    tight = score(r, s, x, y, trunc=1.0)
    return base, best, c, int(wall.sum()), tight, score(0, 1, 0, 0, trunc=1.0)

def plane_fit(P, L):
    flat = (L["hag"] < 0.4) | nd.binary_erosion(L["roof"], iterations=2)
    ix = ((P[:, 0] + ORIGIN[0] - L["X0"]) / L["res"]).astype(int); iy = ((P[:, 1] + ORIGIN[1] - L["Y0"]) / L["res"]).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < flat.shape[1]) & (iy < flat.shape[0])
    ok[ok] &= flat[iy[ok], ix[ok]]
    c = P[ok].mean(0); X = P[ok] - c
    r = P[ok, 2] - L["dsm"][iy[ok], ix[ok]]
    A = np.stack([np.ones(len(X)), X[:, 0], X[:, 1]], 1); w = np.ones(len(r))
    for _ in range(12):
        sol = np.linalg.lstsq(A * w[:, None], r * w, rcond=None)[0]
        e = r - A @ sol; sc = max(1.4826 * np.median(np.abs(e)), 0.05); u = e / (4.685 * sc)
        w = np.where(np.abs(u) < 1, (1 - u ** 2) ** 2, 0)
    return sol, c, {"n_flat": int(ok.sum()), "within_0p3": float(np.mean(np.abs(e) < 0.3)),
                    "rms_inliers": float(np.sqrt(np.mean(e[np.abs(e) < 0.5] ** 2))), "median_before": float(np.median(r))}


def align_dji(L):
    f = CACHE / "dji-twin.npz"
    if f.exists():
        d = np.load(f, allow_pickle=True)
        return d["P"], d["C"], d["N"], json.loads(str(d["rep"]))
    v = read_ply(DJI / "dense/fused.ply")
    P0 = np.stack([v["x"], v["y"], v["z"]], 1).astype(np.float64)
    C = np.stack([v["red"], v["green"], v["blue"]], 1)
    N0 = np.stack([v["nx"], v["ny"], v["nz"]], 1).astype(np.float64)
    S, R3, t3, seedrep = seed_transform(L)
    P = (S * (R3 @ P0.T)).T + t3
    N = (R3 @ N0.T).T
    # coarse vertical first (the seed assumes ground = median DTM), so the roof mask is meaningful
    sol, c, _ = plane_fit(P, L)
    P[:, 2] -= sol[0]
    fp = json.load(open(SKY / "footprints-lidar.geojson"))
    zone = np.zeros_like(L["roof"], np.uint8)
    for ft in fp["features"]:
        pp = np.array([to_utm.transform(*q) for q in ft["geometry"]["coordinates"][0]])
        pix = np.stack([(pp[:, 0] - L["X0"]) / L["res"], (pp[:, 1] - L["Y0"]) / L["res"]], 1).astype(np.int32)
        cv2.fillPoly(zone, [pix], 1)
    zone = nd.binary_dilation(zone.astype(bool), iterations=30)                # site + 15 m
    iou_seed = refine_horizontal_score(P, L, zone)
    base, (cham, rot, sc, dx, dy), cxy, nwall, tight, tight0 = refine_walls(P, N, L, zone)
    a = math.radians(rot); Rz = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
    P[:, :2] = (sc * (Rz @ (P[:, :2] - cxy).T)).T + cxy + [dx, dy]
    P[:, 2] = sc * (P[:, 2] - np.median(L["dtm"])) + np.median(L["dtm"])       # scale is isotropic
    N[:, :2] = (Rz @ N[:, :2].T).T
    sol, c, fit = plane_fit(P, L)
    a0, b, cc = sol
    P[:, 2] -= a0 + b * (P[:, 0] - c[0]) + cc * (P[:, 1] - c[1])
    rep = {"seed": seedrep, "wall_points": nwall,
           "wall_chamfer_m": {"seed_trunc3": round(base, 3), "refined_trunc3": round(cham, 3), "seed_trunc1": round(tight0, 3), "refined_trunc1": round(tight, 3)},
           "roof_iou_seed": round(float(iou_seed), 3), "roof_iou_refined": round(float(refine_horizontal_score(P, L, zone)), 3),
           "refine_rot_deg": round(float(rot), 2), "refine_scale": round(float(sc), 4), "refine_shift_m": [round(float(dx), 2), round(float(dy), 2)],
           "vertical": {"dz_m": round(float(-a0), 3), "tilt_deg": round(math.degrees(math.atan(math.hypot(b, cc))), 3), **{k: round(v, 3) for k, v in fit.items()}},
           "points": int(len(P))}
    np.savez(f, P=P.astype(np.float32), C=C, N=N.astype(np.float32), rep=json.dumps(rep))
    return P, C, N, rep

def dji_transform():
    """Composite DJI-COLMAP -> twin-local similarity (for the splat and anything else in that frame), recovered by
    fitting original vs aligned points (same order). The vertical plane fit is a tiny shear; residual reported."""
    f = OUT / "dji-to-twin.json"
    if f.exists():
        return json.load(open(f))
    v = read_ply(DJI / "dense/fused.ply")
    d = np.load(CACHE / "dji-twin.npz", allow_pickle=True)
    idx = np.random.default_rng(3).choice(len(v), 50_000, replace=False)
    A = np.stack([v["x"], v["y"], v["z"]], 1)[idx].astype(np.float64)
    B = d["P"][idx].astype(np.float64)
    ma, mb = A.mean(0), B.mean(0)
    U, D, Vt = np.linalg.svd((B - mb).T @ (A - ma))
    E = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    R = U @ E @ Vt; s = np.trace(np.diag(D) @ E) / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
    r = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
    out = {"from": "DJI COLMAP frame (tools3dgs/otb-work sparse/0 = OTB-splat-v1 frame)",
           "to": f"twin local Z-up metres (EPSG:6344 + NAVD88, origin E {ORIGIN[0]:.0f} N {ORIGIN[1]:.0f})",
           "scale": float(s), "R": R.tolist(), "t": t.tolist(),
           "fit_residual_m": {"median": round(float(np.median(r)), 4), "max": round(float(r.max()), 4)}}
    json.dump(out, open(f, "w"), indent=2)
    return out

def check_vs_skydio(P):
    """Horizontal/vertical agreement with the Skydio RTK+LiDAR-locked sparse cloud (independent reference)."""
    s = read_ply(SKY / "sparse-world.ply")
    S = np.stack([s["x"], s["y"], s["z"]], 1).astype(np.float64)
    tree = cKDTree(P[np.random.default_rng(1).choice(len(P), min(len(P), 4_000_000), replace=False)])
    d, j = tree.query(S)
    m = d < 1.5
    return {"skydio_points": int(len(S)), "matched_within_1p5m": round(float(m.mean()), 3),
            "median_3d_distance_m": round(float(np.median(d[m])), 3), "p90_3d_distance_m": round(float(np.percentile(d[m], 90)), 3)}


BLENDER = Path("C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")
AOI_PAD_M = 45.0          # site footprints + 45 m: parking field, Lot 8, Lot 7 across Marie Antoinette, street edges

def aoi_bounds():
    fp = json.load(open(SKY / "footprints-lidar.geojson"))
    pts = np.array([to_utm.transform(*q) for ft in fp["features"] for q in ft["geometry"]["coordinates"][0]]) - ORIGIN[:2]
    return pts.min(0) - AOI_PAD_M, pts.max(0) + AOI_PAD_M

def merge_clouds(P, C, N):
    lo, hi = aoi_bounds()
    parts = [(P, C, N, "dji")]
    sky = SKY_WS / "dense-world/fused.ply"
    if sky.exists():
        v = read_ply(sky)
        parts.append((np.stack([v["x"], v["y"], v["z"]], 1), np.stack([v["red"], v["green"], v["blue"]], 1),
                      np.stack([v["nx"], v["ny"], v["nz"]], 1), "skydio"))
    Ps, Cs, Ns, counts = [], [], [], {}
    for p, c, n, name in parts:
        m = np.all((p[:, :2] >= lo) & (p[:, :2] <= hi), 1) & (p[:, 2] > 5) & (p[:, 2] < 45)   # NAVD88 m: drop stray depths
        Ps.append(p[m]); Cs.append(c[m]); Ns.append(n[m]); counts[name] = int(m.sum())
    return np.vstack(Ps).astype(np.float32), np.vstack(Cs).astype(np.uint8), np.vstack(Ns).astype(np.float32), counts

def write_colmap_ply(path, P, N, C):
    dt = np.dtype([("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("nx", "<f4"), ("ny", "<f4"), ("nz", "<f4"),
                   ("red", "u1"), ("green", "u1"), ("blue", "u1")])
    a = np.empty(len(P), dt)
    for i, k in enumerate("xyz"): a[k] = P[:, i]
    for i, k in enumerate(("nx", "ny", "nz")): a[k] = N[:, i]
    for i, k in enumerate(("red", "green", "blue")): a[k] = C[:, i]
    hdr = ("ply\nformat binary_little_endian 1.0\n"
           f"element vertex {len(P)}\n" + "".join(f"property float {k}\n" for k in ("x", "y", "z", "nx", "ny", "nz")) +
           "property uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n")
    with open(path, "wb") as fh:
        fh.write(hdr.encode()); fh.write(a.tobytes())

def write_laz(path, P, C):
    """Absolute-coordinate LAZ (EPSG:6344 + NAVD88) for Unreal's LiDAR Point Cloud plugin / CloudCompare."""
    import laspy
    with laspy.open(ROOT / "public/elevation/OTB-site.laz") as src:           # identical compound CRS to the 3DEP LAZ
        crs = src.header.parse_crs()
    h = laspy.LasHeader(point_format=7, version="1.4")
    h.offsets = ORIGIN; h.scales = np.array([0.001, 0.001, 0.001])
    h.add_crs(crs, keep_compatibility=False)                                  # WKT (LAS 1.4, point format >= 6)
    las = laspy.LasData(h)
    las.x, las.y, las.z = P[:, 0] + ORIGIN[0], P[:, 1] + ORIGIN[1], P[:, 2]
    las.red, las.green, las.blue = (C[:, 0].astype(np.uint16) << 8), (C[:, 1].astype(np.uint16) << 8), (C[:, 2].astype(np.uint16) << 8)
    las.write(path)

def read_mesh_ply(path):
    """COLMAP Poisson PLY: vertices (x y z [nx ny nz] red green blue) + triangle faces (uchar count, int32 x3)."""
    raw = open(path, "rb").read()
    k = raw.index(b"end_header"); end = k + 10 + (2 if raw[k + 10:k + 12] == b"\r\n" else 1)
    head = raw[:end].decode("ascii", "ignore").splitlines()
    nv = nf = 0; props = []; cur = None
    for l in head:
        p = l.split()
        if p[:2] == ["element", "vertex"]: nv = int(p[2]); cur = "v"
        elif p[:2] == ["element", "face"]: nf = int(p[2]); cur = "f"
        elif p and p[0] == "property" and cur == "v":
            props.append((p[2], {"float": "<f4", "double": "<f8", "uchar": "u1"}[p[1]]))
    vdt = np.dtype(props)
    v = np.frombuffer(raw, vdt, nv, end)
    f = np.frombuffer(raw, np.dtype([("n", "u1"), ("i", "<i4", 3)]), nf, end + nv * vdt.itemsize)
    assert (f["n"] == 3).all()
    return v, f["i"].astype(np.int64)

def finish_mesh_python(poisson, Pm, Cm, dst, target=600_000):
    """Blender-free finish: cull Poisson surface > 1 m from real points, decimate, vertex colours, GLB (COLOR_0)."""
    import fast_simplification
    v, F = read_mesh_ply(poisson)
    V = np.stack([v["x"], v["y"], v["z"]], 1).astype(np.float64)
    tree = cKDTree(Pm)
    d, _ = tree.query(V[F].mean(1))
    F = F[d < 1.0]
    used = np.unique(F); remap = -np.ones(len(V), np.int64); remap[used] = np.arange(len(used))
    V, F = V[used], remap[F]
    Vs, Fs = fast_simplification.simplify(V.astype(np.float32), F.astype(np.int32), target_reduction=max(0.0, 1 - target / len(F)))
    _, j = tree.query(Vs, k=4)
    col = Cm[j].astype(np.float32).mean(1) / 255.0
    G = np.stack([Vs[:, 0], Vs[:, 2], -Vs[:, 1]], 1).astype(np.float32)          # twin local Z-up -> glTF Y-up
    Fs = Fs.astype(np.uint32)
    Nn = np.zeros_like(G); tri = G[Fs]; fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for k in range(3): np.add.at(Nn, Fs[:, k], fn)
    Nn = (Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)).astype(np.float32)
    c8 = np.round(np.clip(col, 0, 1) * 255).astype(np.uint8)
    c8 = np.hstack([c8, np.full((len(c8), 1), 255, np.uint8)])                  # VEC4 keeps 4-byte alignment
    parts = [G.tobytes(), Nn.tobytes(), c8.tobytes(), Fs.tobytes()]
    offs = np.cumsum([0] + [len(p) for p in parts]).tolist()
    binc = b"".join(parts)
    j = {"asset": {"version": "2.0", "generator": "OTB build-twin-mesh (python finish)"},
         "scene": 0, "scenes": [{"nodes": [0]}],
         "nodes": [{"name": "OTB_Site_Mesh", "mesh": 0, "extras": {
             "otb_frame": "EPSG:6344 NAD83(2011)/UTM15N + NAVD88 (GEOID12B) m", "otb_local_origin": "E 591000 N 3341600",
             "source": "DJI orbit 2026-07 (+ Skydio 2025-10-15 where posed), COLMAP dense + Poisson depth 10"}}],
         "meshes": [{"name": "OTB_Site_Mesh", "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2}, "indices": 3, "material": 0}]}],
         "materials": [{"name": "OTB_Site_Mesh_vertexcolour", "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 0.95}}],
         "buffers": [{"byteLength": len(binc)}],
         "bufferViews": [{"buffer": 0, "byteOffset": offs[0], "byteLength": len(parts[0]), "target": 34962},
                         {"buffer": 0, "byteOffset": offs[1], "byteLength": len(parts[1]), "target": 34962},
                         {"buffer": 0, "byteOffset": offs[2], "byteLength": len(parts[2]), "target": 34962},
                         {"buffer": 0, "byteOffset": offs[3], "byteLength": len(parts[3]), "target": 34963}],
         "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(G), "type": "VEC3", "min": G.min(0).tolist(), "max": G.max(0).tolist()},
                       {"bufferView": 1, "componentType": 5126, "count": len(G), "type": "VEC3"},
                       {"bufferView": 2, "componentType": 5121, "normalized": True, "count": len(G), "type": "VEC4"},
                       {"bufferView": 3, "componentType": 5125, "count": int(Fs.size), "type": "SCALAR"}]}
    js = json.dumps(j, separators=(",", ":")).encode(); js += b" " * (-len(js) % 4)
    with open(dst, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(binc)))
        fh.write(struct.pack("<I4s", len(js), b"JSON")); fh.write(js)
        fh.write(struct.pack("<I4s", len(binc), b"BIN\0")); fh.write(binc)
    return {"poisson_faces_kept": int(len(F)), "faces": int(len(Fs)), "vertices": int(len(G)), "texture": "vertex colours (COLOR_0)"}

def mesh(P, C, N, rep, use_blender=False):
    Pm, Cm, Nm, counts = merge_clouds(P, C, N)
    rep["merged_points"] = counts
    write_colmap_ply(CACHE / "merged.ply", Pm, Nm, Cm)
    write_laz(OUT / "OTB-site-photogrammetry.laz", Pm, Cm)
    subprocess.run([str(COLMAP), "poisson_mesher", "--input_path", str(CACHE / "merged.ply"),
                    "--output_path", str(CACHE / "poisson.ply"), "--PoissonMeshing.depth", "10",   # >= 11 segfaults (COLMAP 3.11.1)
                    "--PoissonMeshing.trim", "7"], check=True, capture_output=True, cwd=T3)   # poisson_mesher only runs from its own folder
    dst = OUT / "OTB-site-mesh.glb"
    dst.unlink(missing_ok=True)
    if use_blender:        # 8K baked texture; headless Blender 5.2 hung at start-up on this machine (2026-09-28)
        try:
            r = subprocess.run([str(BLENDER), "-b", "-noaudio", "-P", str(ROOT / "tools/blender/bake_twin_mesh.py"), "--",
                                str(CACHE / "poisson.ply"), str(dst), "600000", "8192"], capture_output=True, text=True, timeout=1800)
            (OUT / "blender-bake.log").write_text(r.stdout + r.stderr)
            rep["finish"] = "blender texture bake" if dst.exists() else "blender failed"
        except subprocess.TimeoutExpired:
            rep["finish"] = "blender timed out"
    if not dst.exists():
        rep["finish_python"] = finish_mesh_python(CACHE / "poisson.ply", Pm, Cm, dst)
    rep["outputs"] = {p.name: p.stat().st_size for p in OUT.iterdir() if p.is_file()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["align", "all"], default="all")
    ap.add_argument("--blender", action="store_true", help="8K texture bake via headless Blender (else vertex colours)")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True); CACHE.mkdir(parents=True, exist_ok=True)
    L = lidar()
    P, C, N, rep = align_dji(L)
    rep["vs_skydio"] = check_vs_skydio(P)
    rep["dji_to_twin"] = dji_transform()
    if a.stage == "all":
        mesh(P, C, N, rep, use_blender=a.blender)
    rep["frame"] = f"EPSG:6344 + NAVD88 (GEOID12B) m, local origin E {ORIGIN[0]:.0f} N {ORIGIN[1]:.0f}; GLB is +Y up (glTF)"
    print(json.dumps(rep, indent=1))
    json.dump(rep, open(OUT / "report.json", "w"), indent=2)


if __name__ == "__main__":
    main()
