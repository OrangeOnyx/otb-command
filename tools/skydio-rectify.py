# Skydio X10 survey (2025-10-15) -> rectified, LiDAR-locked poses in the OTB twin frame.
#
#   python tools/skydio-rectify.py              # all stages (each stage is cached / idempotent)
#   python tools/skydio-rectify.py --stage align
#
# Why the Skydio set "never looked right" (diagnosed 2026-09-28):
#   1. Altitude is WGS84 *ellipsoidal* (XMP VertCS=ellipsoidal; GpsMslHeight - AbsoluteAltitude
#      = 26.28 m on every photo). Tools that read it as MSL sink the model ~26 m.
#   2. The three flights disagree vertically by metres (AbsoluteAltitude - RelativeAltitude
#      spans -18.5..-4.3 m) despite reported 0.2-0.5 m vertical accuracy.
#   3. Two lenses are mixed (module 5 tele, 110 photos; module 7 wide, 55 photos). The July
#      COLMAP runs that registered everything used ONE camera at f~10,864 px (true: ~5,140
#      tele / ~2,312 wide at 3840 px) -> a flattened, near-orthographic solution.
#   4. Per-photo DIGITAL ZOOM (EXIF DigitalZoomRatio 1.01x..18.31x on the tele, 1.56/1.94x on
#      5 wide frames). The XMP calibration is the unzoomed sensor, so every photo has its own
#      effective focal = f_cal * zoom. No shared camera can fit; free BA "fits" by warping.
#
# Method:
#   prep   USGS 3DEP LAZ -> DSM/DTM/roof mask; register the Esri-tuned footprints to the LiDAR roofs.
#   sfm    COLMAP, one FIXED camera per photo (XMP calibration x EXIF zoom, k1/k2/k3 from DewarpData),
#          pose_prior_mapper with full-precision XMP RTK priors in the local twin frame
#          (sigma 0.5 m horizontal, 5 m vertical, robust). Unconnected groups stay separate models,
#          each already in the prior frame.
#   align  per group: (a) robust similarity SfM camera centres -> RTK (seeded by a median shift; cameras
#          > 3 m from RTK horizontally are mis-registered and culled); (b) vertical lock to the LiDAR
#          height field (dz + two tilts, robust plane over flat ground / roof-interior cells). Horizontal
#          stays on RTK: flat surfaces cannot pin it (a 7-DoF ICP slid 6.6 deg). A group is "locked" only
#          with >= 300 flat-cell points, >= 60 % within 0.3 m, |dz| < 3 m, tilt < 4 deg.
#          RTK-minus-solved residuals per flight are the evidence for defect 2.
#
# Twin frame (canonical for the asset pack): EPSG:6344 NAD83(2011) / UTM 15N + NAVD88 (GEOID12B)
# metres, same as the 3DEP LAZ; local origin ORIGIN (E, N, 0).
#
# Outputs -> export/skydio-rectify/ (gitignored):
#   poses-rectified.csv   per photo: world pose (E,N,H + local x,y,z), lat/lon, yaw/pitch/roll, RTK residual
#   flightlog-6344.csv    RealityScan/Metashape flight log: name,E,N,H,yaw,pitch,roll (set CRS EPSG:6344+5703)
#   colmap-world/         COLMAP TXT model in the local twin frame (dense MVS / Postshot / Brush input)
#   sparse-world.ply      aligned sparse cloud (local frame)
#   footprints-lidar.geojson, report.json, report.md
import argparse, csv, json, math, os, re, struct, subprocess, sys
from pathlib import Path
import numpy as np
import cv2
from scipy import ndimage as nd
from scipy.spatial import cKDTree
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely import affinity

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = Path("E:/OTB-CAPTURE/Drone-Footage-RAW-2026-07/OTB-mesh-photos-skydio")
WORK_SRC = Path("C:/Users/adam/tools3dgs/otb-roof/images")       # 3840 px working copies (July)
WS = Path("C:/Users/adam/tools3dgs/otb-skydio-v2")
COLMAP = Path("C:/Users/adam/tools3dgs/bin/colmap.exe")
LAZ = ROOT / "public/elevation/OTB-site.laz"
FOOT = ROOT / "src/data/footprints-geo.json"
OUT = ROOT / "export/skydio-rectify"
CACHE = ROOT / ".cache/skydio-rectify"
GEOID_SKYDIO = 26.28
EPSG_WORLD = 6344
ORIGIN = np.array([591000.0, 3341600.0, 0.0])    # OTB twin local origin (EPSG:6344 E, N; NAVD88 0)

to_utm = Transformer.from_crs(4326, EPSG_WORLD, always_xy=True)
to_ll = Transformer.from_crs(EPSG_WORLD, 4326, always_xy=True)


# ------------------------------------------------------------------ XMP
def xmp_of(path):
    b = open(path, "rb").read(400000)
    i = b.find(b"<x:xmpmeta")
    return b[i:b.find(b"</x:xmpmeta>")].decode("utf8", "ignore") if i >= 0 else ""

def tag(x, name, cast=float):
    m = re.search(rf"<drone-skydio:{name}>([^<]+)<", x)
    return cast(m.group(1)) if m else None

def block(x, name, keys):
    m = re.search(rf"<drone-skydio:{name}[^>]*>(.*?)</drone-skydio:{name}>", x, re.S)
    return {k: float(re.search(rf"<drone-skydio:{k}>([^<]+)<", m.group(1)).group(1)) for k in keys} if m else None

def read_photo(path):
    from PIL import Image
    x = xmp_of(path)
    w, h = Image.open(path).size
    ori = block(x, "CameraOrientationNED", ("Roll", "Pitch", "Yaw"))
    foc = block(x, "CalibratedFocalLength", ("X", "Y"))
    ctr = block(x, "CalibratedOpticalCenter", ("X", "Y"))
    return {
        "name": path.name, "flight": tag(x, "FlightId", str), "lens": tag(x, "CameraSensorModule", str),
        "lat": tag(x, "Latitude"), "lon": tag(x, "Longitude"),
        "h_ell": tag(x, "AbsoluteAltitude"), "h_rel": tag(x, "RelativeAltitude"),
        "hacc": tag(x, "GpsHorizontalAccuracy"), "vacc": tag(x, "GpsVerticalAccuracy"),
        "yaw": ori["Yaw"], "pitch": ori["Pitch"], "roll": ori["Roll"],
        "W": w, "H": h, "fx": foc["X"], "fy": foc["Y"], "cx": ctr["X"], "cy": ctr["Y"],
        "k": [float(v) for v in tag(x, "DewarpData", str).split(",")],
    }


# ------------------------------------------------------------------ prep: LiDAR
def lidar_prep():
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / "lidar.npz"
    if f.exists():
        d = np.load(f)
        return {k: d[k] for k in d.files}
    import laspy
    las = laspy.read(LAZ)
    x, y, z, c = np.asarray(las.x), np.asarray(las.y), np.asarray(las.z), np.asarray(las.classification)
    fp = json.load(open(FOOT))
    U = unary_union([Polygon([to_utm.transform(*p) for p in ft["geometry"]["coordinates"][0]]) for ft in fp["features"]])
    x0, y0, x1, y1 = U.bounds
    pad = 160                                   # the survey also photographed neighbours' roofs
    m = (x > x0 - pad) & (x < x1 + pad) & (y > y0 - pad) & (y < y1 + pad)
    x, y, z, c = x[m], y[m], z[m], c[m]
    res = 0.5
    X0, Y0 = x.min(), y.min()
    W, H = int((x.max() - X0) / res) + 1, int((y.max() - Y0) / res) + 1
    ix, iy = ((x - X0) / res).astype(int), ((y - Y0) / res).astype(int)
    dsm = np.full((H, W), -np.inf); np.maximum.at(dsm, (iy, ix), z)
    g = c == 2
    s = np.zeros((H, W)); n = np.zeros((H, W))
    np.add.at(s, (iy[g], ix[g]), z[g]); np.add.at(n, (iy[g], ix[g]), 1)
    dtm = np.where(n > 0, s / np.maximum(n, 1), np.nan)
    idx = nd.distance_transform_edt(np.isnan(dtm), return_distances=False, return_indices=True)
    dtm = dtm[tuple(idx)]
    dsm = np.where(np.isfinite(dsm), dsm, dtm)
    dsm = nd.median_filter(dsm, 3)
    hag = dsm - dtm
    sd = nd.generic_filter(dsm, np.std, size=5)
    roof = (hag > 2.5) & (hag < 15) & (sd < 0.6)
    roof = nd.binary_opening(roof, iterations=1)
    lab, k = nd.label(roof)
    sizes = nd.sum(roof, lab, range(1, k + 1))
    roof = np.isin(lab, 1 + np.where(sizes >= 400)[0])          # >= 100 m2
    # ICP target: ground + roofs only (trees changed 2017 -> 2025), voxel-thinned to 0.35 m
    keep = (c == 2) | roof[iy, ix]
    P = np.stack([x[keep], y[keep], z[keep]], 1)
    v = np.floor(P / 0.35).astype(np.int64)
    _, first = np.unique(v, axis=0, return_index=True)
    out = dict(dsm=dsm, dtm=dtm, hag=hag, roof=roof, X0=np.float64(X0), Y0=np.float64(Y0), res=np.float64(res), icp=P[first])
    np.savez_compressed(f, **out)
    return out

def register_footprints(L):
    """Rigid (rot + shift) fit of the Esri-tuned footprints to the LiDAR roof mask."""
    fp = json.load(open(FOOT))
    polys = {ft["properties"]["unit"]: Polygon([to_utm.transform(*p) for p in ft["geometry"]["coordinates"][0]]) for ft in fp["features"]}
    U = unary_union(list(polys.values()))
    H, W = L["roof"].shape
    def rast(geom):
        m = np.zeros((H, W), np.uint8)
        for p in ([geom] if geom.geom_type == "Polygon" else geom.geoms):
            pts = np.array([((px - L["X0"]) / L["res"], (py - L["Y0"]) / L["res"]) for px, py in p.exterior.coords], np.int32)
            cv2.fillPoly(m, [pts], 1)
        return m.astype(bool)
    roof = L["roof"] & rast(U.buffer(15))
    C = U.centroid
    def iou(rot, dx, dy):
        m = rast(affinity.translate(affinity.rotate(U, rot, origin=C), dx, dy))
        return (m & roof).sum() / (m | roof).sum()
    base = iou(0, 0, 0)
    _, r0, dx0, dy0 = max(((iou(r, dx, dy), r, dx, dy) for r in np.arange(-3, 3.01, .25)
                           for dx in np.arange(-8, 8.01, .5) for dy in np.arange(-8, 8.01, .5)), key=lambda t: t[0])
    s, r, dx, dy = max(((iou(r, dx, dy), r, dx, dy) for r in np.arange(r0 - .25, r0 + .26, .05)
                        for dx in np.arange(dx0 - .5, dx0 + .51, .1) for dy in np.arange(dy0 - .5, dy0 + .51, .1)), key=lambda t: t[0])
    feats = []
    for u, p in polys.items():
        q = affinity.translate(affinity.rotate(p, r, origin=C), dx, dy)
        ll = [to_ll.transform(*xy) for xy in q.exterior.coords]
        feats.append({"type": "Feature", "properties": {"unit": u},
                      "geometry": {"type": "Polygon", "coordinates": [[[round(a, 8), round(b, 8)] for a, b in ll]]}})
    return ({"iou_before": round(float(base), 3), "iou_after": round(float(s), 3), "rot_deg": round(float(r), 2),
             "shift_E_m": round(float(dx), 2), "shift_N_m": round(float(dy), 2), "pivot_utm": [round(C.x, 2), round(C.y, 2)]},
            {"type": "FeatureCollection", "features": feats})


# ------------------------------------------------------------------ sfm: COLMAP (two lenses)
SEED = {"5": "tele", "7": "wide"}

def run(cmd, log):
    with open(WS / log, "w") as fh:
        subprocess.run([str(COLMAP)] + cmd, cwd=WS, stdout=fh, stderr=subprocess.STDOUT, check=True)

def zoom_of(path):
    from PIL import Image
    z = Image.open(path).getexif().get_ifd(0x8769).get(0xA404)          # DigitalZoomRatio
    return float(z) if z else 1.0

def sfm(photos):
    import sqlite3
    out = WS / "sparse-z"
    if out.exists() and any(out.glob("*/images.bin")):
        return sorted(out.glob("*/"))
    for ph in photos:
        d = WS / "images" / SEED[ph["lens"]]
        d.mkdir(parents=True, exist_ok=True)
        if not (d / ph["name"]).exists():
            os.link(WORK_SRC / ph["name"], d / ph["name"])
    if not (WS / "db3.db").exists():
        run(["feature_extractor", "--database_path", "db3.db", "--image_path", "images",
             "--ImageReader.single_camera_per_image", "1", "--ImageReader.camera_model", "FULL_OPENCV",
             "--SiftExtraction.use_gpu", "1", "--SiftExtraction.max_num_features", "12000"], "extract.log")
        run(["exhaustive_matcher", "--database_path", "db3.db", "--SiftMatching.use_gpu", "1",
             "--SiftMatching.guided_matching", "1"], "match.log")
    byname = {p["name"]: p for p in photos}
    db = sqlite3.connect(WS / "db3.db")
    cov = np.diag([0.5 ** 2, 0.5 ** 2, 5.0 ** 2]).astype(np.float64).ravel().tobytes()
    for iid, cid, name in db.execute("select image_id, camera_id, name from images").fetchall():
        ph = byname[name.split("/")[-1]]
        z = zoom_of(PHOTOS / ph["name"])
        w, h = 3840, 2880
        sx, sy = w / ph["W"], h / ph["H"]
        cx, cy = w / 2 + (ph["cx"] * sx - w / 2) * z, h / 2 + (ph["cy"] * sy - h / 2) * z
        k = ph["k"]
        prm = [ph["fx"] * sx * z, ph["fy"] * sy * z, cx, cy, k[0], k[1], 0, 0, k[2], 0, 0, 0]
        db.execute("update cameras set model=6, width=?, height=?, params=?, prior_focal_length=1 where camera_id=?",
                   (w, h, np.array(prm, np.float64).tobytes(), cid))
        E, N = to_utm.transform(ph["lon"], ph["lat"])
        pos = np.array([E, N, ph["h_ell"] + GEOID_SKYDIO]) - ORIGIN
        db.execute("insert or replace into pose_priors(image_id, position, coordinate_system, position_covariance) values (?,?,1,?)",
                   (iid, pos.astype(np.float64).tobytes(), cov))
    db.commit(); db.close()
    out.mkdir(exist_ok=True)
    run(["pose_prior_mapper", "--database_path", "db3.db", "--image_path", "images", "--output_path", "sparse-z",
         "--Mapper.ba_refine_focal_length", "0", "--Mapper.ba_refine_principal_point", "0",
         "--Mapper.ba_refine_extra_params", "0", "--use_robust_loss_on_prior_position", "1"], "mapper-z.log")
    return sorted(out.glob("*/"))


def read_model(model):
    txt = CACHE / ("model-" + model.parent.name + "-" + model.name)
    txt.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(COLMAP), "model_converter", "--input_path", str(model), "--output_path", str(txt),
                    "--output_type", "TXT"], check=True, capture_output=True)
    cams = {}
    for ln in open(txt / "cameras.txt"):
        if ln.startswith("#") or not ln.strip():
            continue
        p = ln.split()
        cams[int(p[0])] = {"model": p[1], "w": int(p[2]), "h": int(p[3]), "params": [float(v) for v in p[4:]]}
    imgs = {}
    lines = [l for l in open(txt / "images.txt") if not l.startswith("#")]
    for i in range(0, len(lines), 2):
        p = lines[i].split()
        if len(p) < 10:
            continue
        q = np.array([float(v) for v in p[1:5]]); t = np.array([float(v) for v in p[5:8]])
        imgs[p[9]] = {"id": int(p[0]), "q": q, "t": t, "cam": int(p[8]), "pts2d": lines[i + 1].rstrip("\n")}
    pts = []
    for ln in open(txt / "points3D.txt"):
        if ln.startswith("#") or not ln.strip():
            continue
        p = ln.split()
        pts.append((int(p[0]), float(p[1]), float(p[2]), float(p[3]), int(p[4]), int(p[5]), int(p[6]), float(p[7]), (len(p) - 8) // 2, " ".join(p[8:])))
    return cams, imgs, pts

def qmat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])

def matq(R):
    w = math.sqrt(max(0, 1 + R[0, 0] + R[1, 1] + R[2, 2])) / 2
    x = math.copysign(math.sqrt(max(0, 1 + R[0, 0] - R[1, 1] - R[2, 2])) / 2, R[2, 1] - R[1, 2])
    y = math.copysign(math.sqrt(max(0, 1 - R[0, 0] + R[1, 1] - R[2, 2])) / 2, R[0, 2] - R[2, 0])
    z = math.copysign(math.sqrt(max(0, 1 - R[0, 0] - R[1, 1] + R[2, 2])) / 2, R[1, 0] - R[0, 1])
    return np.array([w, x, y, z])


# ------------------------------------------------------------------ align
def umeyama(A, B, w=None):
    """s, R, t minimising sum w |s R A + t - B|^2."""
    w = np.ones(len(A)) if w is None else w
    w = w / w.sum()
    ma, mb = w @ A, w @ B
    A0, B0 = A - ma, B - mb
    S = (B0 * w[:, None]).T @ A0
    U, D, Vt = np.linalg.svd(S)
    E = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    R = U @ E @ Vt
    s = np.trace(np.diag(D) @ E) / (w @ (A0 ** 2).sum(1))
    return s, R, mb - s * R @ ma

def robust_sim(A, B, iters=15):
    w = np.ones(len(A))
    for _ in range(iters):
        s, R, t = umeyama(A, B, w)
        r = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
        c = max(1.4826 * np.median(r), 0.3)
        w = 1 / np.maximum(r / c, 1) ** 2               # Huber-ish
    return s, R, t, r

def normals(P, k=12):
    tree = cKDTree(P)
    _, idx = tree.query(P, k)
    Q = P[idx] - P[idx].mean(1, keepdims=True)
    C = np.einsum("nki,nkj->nij", Q, Q)
    _, V = np.linalg.eigh(C)
    return V[:, :, 0], tree

def dsm_plane_fit(P, L, iters=12):
    """Height-field lock: r = z - DSM(x, y) over flat LiDAR cells (ground, roof interior eroded 1 m).
    Robust plane r = a + b x + c y about the centroid -> (dz, tilts). Returns R, t, c, stats."""
    flat = (L["hag"] < 0.4) | nd.binary_erosion(L["roof"], iterations=2)
    G = P + ORIGIN
    ix = ((G[:, 0] - L["X0"]) / L["res"]).astype(int); iy = ((G[:, 1] - L["Y0"]) / L["res"]).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < flat.shape[1]) & (iy < flat.shape[0])
    ok[ok] &= flat[iy[ok], ix[ok]]
    if ok.sum() < 150:
        return np.eye(3), np.zeros(3), P.mean(0), {"n_flat": int(ok.sum())}
    c = P[ok].mean(0)
    X = P[ok] - c
    r = G[ok, 2] - L["dsm"][iy[ok], ix[ok]]
    A = np.stack([np.ones(len(X)), X[:, 0], X[:, 1]], 1)
    w = np.ones(len(r)); scale = max(1.4826 * np.median(np.abs(r - np.median(r))), 0.3)
    for _ in range(iters):                                   # IRLS, Tukey biweight
        sol = np.linalg.lstsq(A * w[:, None], r * w, rcond=None)[0]
        e = r - A @ sol
        scale = max(1.4826 * np.median(np.abs(e)), 0.05)
        u = e / (4.685 * scale)
        w = np.where(np.abs(u) < 1, (1 - u ** 2) ** 2, 0)
    a, b, cc = sol
    # correction: z' = z - (a + b x + c y)  ~= small rotation (tilts) + dz about centroid
    R = np.array([[1, 0, b], [0, 1, cc], [-b, -cc, 1]]); U_, _, Vt_ = np.linalg.svd(R); R = U_ @ Vt_
    t = np.array([0, 0, -a])
    e = r - A @ sol
    return R, t, c, {"n_flat": int(ok.sum()), "inlier_frac_0p3": float(np.mean(np.abs(e) < 0.3)),
                     "rms_inliers": float(np.sqrt(np.mean(e[np.abs(e) < 0.5] ** 2))) if np.any(np.abs(e) < 0.5) else float("nan"),
                     "median_before": float(np.median(r))}


def align(photos, L, model):
    cams, imgs, pts = read_model(model)
    byname = {p["name"]: p for p in photos}
    names = [n for n in imgs if n.split("/")[-1] in byname]
    C_sfm, C_rtk, meta = [], [], []
    for n in names:
        im = imgs[n]; Rw = qmat(im["q"])
        C_sfm.append(-Rw.T @ im["t"])
        ph = byname[n.split("/")[-1]]
        E, N = to_utm.transform(ph["lon"], ph["lat"])
        C_rtk.append([E, N, ph["h_ell"] + GEOID_SKYDIO]); meta.append(ph)
    C_sfm, C_rtk = np.array(C_sfm), np.array(C_rtk)
    if len(names) < 5:
        return None
    # Robust similarity to RTK (pose_prior_mapper does not fully settle every group), then cull cameras
    # still > 3 m horizontally from their RTK position (mis-registered on look-alike roof tiles), re-fit.
    # Seeded by a median translation so a mis-registered sub-cluster cannot drag the first fit.
    keep = np.linalg.norm((C_sfm + np.median(C_rtk - ORIGIN - C_sfm, 0) - (C_rtk - ORIGIN))[:, :2], axis=1) < 3.0
    for _ in range(3):
        if keep.sum() < 5:
            break
        s1, R1, t1, _ = robust_sim(C_sfm[keep], C_rtk[keep] - ORIGIN)
        keep = np.linalg.norm(((s1 * (R1 @ C_sfm.T)).T + t1 - (C_rtk - ORIGIN))[:, :2], axis=1) < 3.0
    dropped = [n.split("/")[-1] for n, k in zip(names, keep) if not k]
    names = [n for n, k in zip(names, keep) if k]
    C_sfm, C_rtk, meta = C_sfm[keep], C_rtk[keep], [m for m, k in zip(meta, keep) if k]
    kept_ids = {imgs[n]["id"] for n in names}
    imgs = {n: im for n, im in imgs.items() if n in names}
    pts = [p for p in pts if sum(int(v) in kept_ids for v in p[9].split()[0::2]) >= 2]
    if len(names) < 5:
        return None
    s1, R1, t1, r1 = robust_sim(C_sfm, C_rtk - ORIGIN)
    P = np.array([[p[1], p[2], p[3]] for p in pts]); trk = np.array([p[8] for p in pts]); err = np.array([p[7] for p in pts])
    good = (trk >= 3) & (err < 2.0)
    P1 = (s1 * (R1 @ P.T)).T + t1                       # local twin frame, RTK-aligned
    dst = L["icp"] - ORIGIN
    lo, hi = P1[good].min(0) - 30, P1[good].max(0) + 30
    dst = dst[np.all((dst > lo) & (dst < hi), 1)]
    dn, tree = normals(dst)
    # Vertical-only lock (dz + two tilts about the centroid) against the LiDAR height field. Flat
    # ground/roofs cannot pin horizontal position or yaw (a 7-DoF ICP slid 6.6 deg on one group);
    # RTK horizontal agrees with the SfM to well under a metre once mis-registered frames are culled.
    s2 = 1.0
    R2, t2, c2, fit = dsm_plane_fit(P1[good], L)
    hist = [fit]
    rot = math.degrees(math.acos(np.clip((np.trace(R2) - 1) / 2, -1, 1)))
    locked = fit["n_flat"] >= 300 and fit.get("inlier_frac_0p3", 0) >= 0.6 and abs(t2[2]) < 3.0 and rot < 4.0
    if not locked:                                      # too little structure: keep the RTK solution
        s2, R2, t2, c2 = 1.0, np.eye(3), np.zeros(3), np.zeros(3)
    # compose full transform: X_world_local = s2 R2 (s1 R1 X + t1 - c2) + c2 + t2
    S = s2 * s1; Rf = R2 @ R1; tf = s2 * (R2 @ (t1 - c2)) + c2 + t2
    Pw = (S * (Rf @ P.T)).T + tf
    d, _ = tree.query(Pw[good]); onsurf = d < 0.5
    Cw = (S * (Rf @ C_sfm.T)).T + tf + ORIGIN
    res = Cw - C_rtk
    return dict(cams=cams, imgs=imgs, pts=pts, names=names, meta=meta, S=S, R=Rf, t=tf, Pw=Pw, good=good, locked=locked, dropped=dropped,
                Cw=Cw, C_rtk=C_rtk, res=res, sim1=(s1, R1, t1, r1), icp_hist=hist, icp_scale=s2,
                icp_rot_deg=math.degrees(math.acos(np.clip((np.trace(R2) - 1) / 2, -1, 1))), icp_shift=t2,
                surf_rms=float(np.sqrt(np.mean(d[onsurf] ** 2))) if onsurf.any() else float("nan"), surf_frac=float(onsurf.mean()), n_good=int(good.sum()))


# ------------------------------------------------------------------ outputs
def ypr_from_R_world_cam(Rcw):
    """COLMAP world->cam rotation (world = local ENU) -> Skydio-style yaw/pitch/roll (NED, deg)."""
    Rwc = Rcw.T                                                   # columns: cam x(right), y(down), z(fwd) in ENU
    ned = np.array([[0, 1, 0], [1, 0, 0], [0, 0, -1]], float)
    fwd, right, down = ned @ Rwc[:, 2], ned @ Rwc[:, 0], ned @ Rwc[:, 1]
    yaw = math.degrees(math.atan2(fwd[1], fwd[0]))
    pitch = math.degrees(math.asin(-np.clip(fwd[2], -1, 1)))
    # roll: angle of camera right vs horizontal right
    hr = np.array([-math.sin(math.radians(yaw)), math.cos(math.radians(yaw)), 0])
    roll = math.degrees(math.atan2(np.dot(np.cross(hr, right), fwd), np.dot(hr, right)))
    return yaw % 360, pitch, roll

def write_outputs(groups, reg, photos):
    """groups: align() results, one per COLMAP model (all already in the twin frame). Point ids re-numbered to merge."""
    OUT.mkdir(parents=True, exist_ok=True)
    cw = OUT / "colmap-world"; cw.mkdir(exist_ok=True)
    fc = open(cw / "cameras.txt", "w"); fi = open(cw / "images.txt", "w"); fp = open(cw / "points3D.txt", "w")
    fc.write("# OTB Skydio 2025-10-15: one fixed camera per photo = XMP calibration x EXIF digital zoom (3840x2880 working copies)\n")
    fi.write(f"# OTB twin frame: EPSG:6344 + NAVD88, local origin E {ORIGIN[0]:.0f} N {ORIGIN[1]:.0f} (metres)\n")
    # A photo can register in more than one COLMAP model: keep it in the best group only
    # (LiDAR-locked first, then the group with more structure); drop points left with < 2 observers.
    groups = sorted(groups, key=lambda A: (not A["locked"], -A["n_good"]))
    claimed = set()
    for A in groups:
        keep = [i for i, n in enumerate(A["names"]) if n not in claimed]
        A["names"] = [A["names"][i] for i in keep]; A["meta"] = [A["meta"][i] for i in keep]
        A["Cw"], A["C_rtk"] = A["Cw"][keep], A["C_rtk"][keep]
        A["imgs"] = {n: A["imgs"][n] for n in A["names"]}
        claimed |= set(A["names"])
        iids = {im["id"] for im in A["imgs"].values()}
        pk = np.array([sum(int(v) in iids for v in p[9].split()[0::2]) >= 2 for p in A["pts"]], bool)
        A["pts"] = [p for p, k in zip(A["pts"], pk) if k]; A["Pw"] = A["Pw"][pk]; A["good"] = A["good"][pk]
    groups = [A for A in groups if A["names"]]
    rows, allP, allC, off = [], [], [], 0
    for g, A in enumerate(groups):
        S, R, t = A["S"], A["R"], A["t"]
        remap = lambda pid, off=off: pid if pid < 0 else pid + off
        used = {im["cam"] for im in A["imgs"].values()}
        pids = {p[0] for p in A["pts"]}
        iids = {im["id"] for im in A["imgs"].values()}
        for cid, c in A["cams"].items():
            if cid in used:
                fc.write(f"{cid} {c['model']} {c['w']} {c['h']} " + " ".join(f"{v:.10g}" for v in c["params"]) + "\n")
        for n, im in A["imgs"].items():
            Rc = qmat(im["q"]) @ R.T                                   # new world->cam
            tc = S * im["t"] - Rc @ t
            tok = im["pts2d"].split()
            tok = [(str(remap(int(v))) if int(v) in pids else "-1") if k % 3 == 2 else v for k, v in enumerate(tok)]
            fi.write(f"{im['id']} {' '.join(f'{v:.12g}' for v in matq(Rc))} {' '.join(f'{v:.8f}' for v in tc)} {im['cam']} {n}\n{' '.join(tok)}\n")
        for p, X in zip(A["pts"], A["Pw"]):
            tr = p[9].split()
            tr = " ".join(f"{a} {b}" for a, b in zip(tr[0::2], tr[1::2]) if int(a) in iids)
            fp.write(f"{remap(p[0])} {X[0]:.5f} {X[1]:.5f} {X[2]:.5f} {p[4]} {p[5]} {p[6]} {p[7]:.4f} {tr}\n")
        off += max(p[0] for p in A["pts"]) + 1
        cols = np.array([[p[4], p[5], p[6]] for p in A["pts"]], np.uint8)
        allP.append(A["Pw"][A["good"]]); allC.append(cols[A["good"]])
        byname = {n: i for i, n in enumerate(A["names"])}
        for n, im in A["imgs"].items():
            i = byname.get(n)
            if i is None:
                continue
            E, N, Hh = A["Cw"][i]; ph = A["meta"][i]
            lon, lat = to_ll.transform(E, N)
            yaw, pitch, roll = ypr_from_R_world_cam(qmat(im["q"]) @ R.T)
            dE, dN, dH = A["C_rtk"][i] - A["Cw"][i]
            rows.append(dict(name=n.split("/")[-1], group=g, flight=ph["flight"][:8], lens=ph["lens"], E=E, N=N, H=Hh,
                             lat=lat, lon=lon, yaw=yaw, pitch=pitch, roll=roll, dE=dE, dN=dN, dH=dH, lidar=A["locked"]))
    fc.close(); fi.close(); fp.close()
    G = np.vstack(allP).astype(np.float32); C = np.vstack(allC)
    with open(OUT / "sparse-world.ply", "wb") as fh:
        fh.write(f"ply\nformat binary_little_endian 1.0\ncomment OTB twin frame EPSG:6344+NAVD88 origin {ORIGIN[0]:.0f} {ORIGIN[1]:.0f}\n"
                 f"element vertex {len(G)}\nproperty float x\nproperty float y\nproperty float z\n"
                 "property uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n".encode())
        fh.write(b"".join(struct.pack("<fffBBB", *X, *c) for X, c in zip(G, C)))
    rows.sort(key=lambda r: r["name"])
    with open(OUT / "poses-rectified.csv", "w", newline="") as fh, open(OUT / "flightlog-6344.csv", "w", newline="") as fl:
        w = csv.writer(fh); wl = csv.writer(fl)
        w.writerow(["name", "group", "flight", "lens", "E_6344", "N_6344", "H_navd88", "x_local", "y_local", "z_local", "lat", "lon",
                    "yaw", "pitch", "roll", "rtk_minus_solved_E", "rtk_minus_solved_N", "rtk_minus_solved_H", "lidar_locked"])
        wl.writerow(["#name", "E", "N", "H", "yaw", "pitch", "roll"])
        for r in rows:
            w.writerow([r["name"], r["group"], r["flight"], r["lens"], f"{r['E']:.3f}", f"{r['N']:.3f}", f"{r['H']:.3f}",
                        f"{r['E']-ORIGIN[0]:.3f}", f"{r['N']-ORIGIN[1]:.3f}", f"{r['H']:.3f}", f"{r['lat']:.9f}", f"{r['lon']:.9f}",
                        f"{r['yaw']:.3f}", f"{r['pitch']:.3f}", f"{r['roll']:.3f}", f"{r['dE']:.3f}", f"{r['dN']:.3f}", f"{r['dH']:.3f}", int(r["lidar"])])
            wl.writerow([r["name"], f"{r['E']:.3f}", f"{r['N']:.3f}", f"{r['H']:.3f}", f"{r['yaw']:.3f}", f"{r['pitch']:.3f}", f"{r['roll']:.3f}"])

    def stats(rs):
        if not rs:
            return {"n": 0}
        d = np.array([[r["dE"], r["dN"], r["dH"]] for r in rs]); med = np.median(d, 0)
        return {"n": len(rs), "rtk_minus_solved_median_m": dict(zip("ENH", np.round(med, 2).tolist())),
                "sigma_m": dict(zip("ENH", np.round(1.4826 * np.median(np.abs(d - med), 0), 2).tolist()))}
    rep = {
        "frame": f"EPSG:6344 NAD83(2011)/UTM15N + NAVD88(GEOID12B) m; local origin E {ORIGIN[0]:.0f} N {ORIGIN[1]:.0f}",
        "photos": len(photos), "registered": len(rows), "lidar_locked": int(sum(r["lidar"] for r in rows)),
        "footprints_vs_lidar": reg,
        "groups": [{"group": g, "images": len(A["names"]), "sparse_points_used": A["n_good"], "lidar_locked": bool(A["locked"]),
                    "icp_scale": round(float(A["icp_scale"]), 4), "icp_rotation_deg": round(A["icp_rot_deg"], 3),
                    "icp_shift_m": np.round(A["icp_shift"], 2).tolist(),
                    "on_surface_rms_m": None if math.isnan(A["surf_rms"]) else round(A["surf_rms"], 3), "on_surface_fraction": round(A["surf_frac"], 3),
                    **stats([r for r in rows if r["group"] == g])} for g, A in enumerate(groups)],
        "flights_lidar_locked": {f: stats([r for r in rows if r["flight"] == f and r["lidar"]])
                                 for f in sorted({r["flight"] for r in rows})},
        "dropped_misregistered": sorted(n for A in groups for n in A["dropped"]),
        "unregistered": sorted({p["name"] for p in photos} - {r["name"] for r in rows}),
    }
    json.dump(rep, open(OUT / "report.json", "w"), indent=2)
    return rep


def topview_check(L, groups, fc):
    """check-topview.png: LiDAR hillshade, sparse points coloured by |z - DSM|, registered footprints."""
    dsm = L["dsm"]; H = dsm.shape[0]
    gy, gx = np.gradient(dsm)
    img = (np.dstack([np.clip(0.6 + 0.35 * (gx - gy), 0, 1)] * 3) * 255).astype(np.uint8)[::-1].copy()
    P = np.vstack([A["Pw"][A["good"]] for A in groups]) + ORIGIN
    ix = ((P[:, 0] - L["X0"]) / L["res"]).astype(int); iy = ((P[:, 1] - L["Y0"]) / L["res"]).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < dsm.shape[1]) & (iy < H)
    res = P[ok, 2] - dsm[iy[ok], ix[ok]]
    for u, v, r in zip(ix[ok], iy[ok], res):
        cv2.circle(img, (int(u), H - 1 - int(v)), 1, (0, 200, 0) if abs(r) < 0.3 else (0, 160, 255) if abs(r) < 1 else (0, 0, 255), -1)
    for f in fc["features"]:
        pp = np.array([to_utm.transform(*c) for c in f["geometry"]["coordinates"][0]])
        pix = np.stack([(pp[:, 0] - L["X0"]) / L["res"], H - 1 - (pp[:, 1] - L["Y0"]) / L["res"]], 1).astype(np.int32)
        cv2.polylines(img, [pix], True, (200, 60, 160), 1)
    cv2.putText(img, "Skydio sparse vs 3DEP LiDAR: green |dz|<0.3 m, orange <1 m, red >1 m; magenta = LiDAR-registered footprints",
                (8, 20), cv2.FONT_HERSHEY_SIMPLEX, .42, (0, 0, 0), 1)
    cv2.imwrite(str(OUT / "check-topview.png"), img)
    return {"within_0p3_m": round(float(np.mean(np.abs(res) < 0.3)), 3), "within_1_m": round(float(np.mean(np.abs(res) < 1)), 3)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["prep", "sfm", "align", "all"], default="all")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    photos = [read_photo(f) for f in sorted(PHOTOS.glob("*.JPG"))]
    L = lidar_prep()
    reg, fc = register_footprints(L)
    (OUT / "footprints-lidar.geojson").write_text(json.dumps(fc))
    print("footprints vs LiDAR:", reg)
    if a.stage == "prep":
        return
    models = sfm(photos)
    if a.stage == "sfm":
        return
    groups = []
    for m in models:
        A = align(photos, L, m)
        if A is None:
            continue
        groups.append(A)
        print(f"{m.name}: {len(A['names'])} imgs, {A['n_good']} pts, locked={A['locked']}, icp scale {A['icp_scale']:.4f} "
              f"rot {A['icp_rot_deg']:.2f} shift {np.round(A['icp_shift'], 2)} on-surface rms {A['surf_rms']:.3f} ({A['surf_frac']:.0%})")
    rep = write_outputs(groups, reg, photos)
    rep["sparse_vs_lidar_all_points"] = topview_check(L, groups, fc)
    json.dump(rep, open(OUT / "report.json", "w"), indent=2)
    print(json.dumps({k: v for k, v in rep.items() if k != "unregistered"}, indent=2))


if __name__ == "__main__":
    main()
