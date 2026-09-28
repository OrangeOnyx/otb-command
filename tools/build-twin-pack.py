# OTB digital-twin asset pack for Blender and Unreal: every asset pre-registered to ONE frame.
#
#   python tools/build-twin-pack.py            # -> export/twin-pack/OTB_Twin_Pack/  (+ G:\My Drive\00 OTB\twin-pack\)
#   python tools/build-twin-pack.py --blend     # also build blender/OTB_Twin.blend headlessly (hung on this machine
#                                               # 2026-09-28; otherwise run blender/import_otb_twin.py in the Blender UI)
#
# Twin frame: EPSG:6344 NAD83(2011) / UTM 15N + NAVD88 (GEOID12B), metres; local origin E 591000 N 3341600 H 0
# (the USGS 3DEP LiDAR frame). GLBs are glTF Y-up: x = East, y = Up, z = -North (local metres). Z-up files
# (PLY/LAZ/CSV) are x = East, y = North, z = Up.
#
# Requires: tools/skydio-rectify.py and tools/build-twin-mesh.py outputs; npm run site-twin (dist-twin/).
# Frame ties (no GPS in these sources; all fitted to the LiDAR-registered footprints):
#   site twin (plat feet -> metres)  -> twin: 27 unit centres, 2-D similarity (+ grade datum from LiDAR)
#   interior twin (Floorplanner)     -> site twin: 37 columns (C k = col k+2), 2-D similarity
#   photogrammetry mesh / DJI splat  -> twin: tools/build-twin-mesh.py (roof-edge + LiDAR height-field fit)
import argparse, json, math, shutil, struct, subprocess, zlib, csv
from pathlib import Path
import numpy as np
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "export/twin-pack/OTB_Twin_Pack"
DRIVE = Path("G:/My Drive/00 OTB/twin-pack")
SKY = ROOT / "export/skydio-rectify"
MESH = ROOT / "export/twin-mesh"
SITE = ROOT / ".cache/twin-pack/site-twin"
INTERIOR = ROOT / "public/twin"
SPLAT = Path("E:/OTB-CAPTURE/Drone-Footage-RAW-2026-07/OTB-splat-v1.ply")
LAZ_3DEP = ROOT / "public/elevation/OTB-site.laz"
BLENDER = Path("C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")
ORIGIN = np.array([591000.0, 3341600.0, 0.0])
PAD_M = 60.0
to_utm = Transformer.from_crs(4326, 6344, always_xy=True)


# ------------------------------------------------------------------ frame ties
def sim2(A, B):
    ma, mb = A.mean(0), B.mean(0)
    U, D, Vt = np.linalg.svd((B - mb).T @ (A - ma))
    R = U @ Vt; s = D.sum() / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
    r = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
    return s, R, t, r

def footprints():
    fp = json.load(open(SKY / "footprints-lidar.geojson"))
    return {f["properties"]["unit"]: Polygon([to_utm.transform(*c) for c in f["geometry"]["coordinates"][0]]) for f in fp["features"]}

def grade_datum(L, polys):
    """Median LiDAR ground (NAVD88) in a 0.5-4 m ring around the buildings = the models' y = 0."""
    import cv2
    from scipy import ndimage as nd
    m = np.zeros_like(L["roof"], np.uint8)
    for p in polys.values():
        pts = np.array([((x - L["X0"]) / L["res"], (y - L["Y0"]) / L["res"]) for x, y in p.exterior.coords], np.int32)
        cv2.fillPoly(m, [pts], 1)
    m = m.astype(bool)
    ring = nd.binary_dilation(m, iterations=8) & ~nd.binary_dilation(m, iterations=1)
    return float(np.median(L["dtm"][ring]))

def site_to_twin(twin_data, polys, G):
    """4x4 in glTF coords: site-twin model (X, Y-up, Z) -> twin local glTF (E, U, -N)."""
    u = [a for a in twin_data["assets"] if a["category"] == "unit" and a.get("unit") in polys]
    A = np.array([[a["positionM"][0], a["positionM"][2]] for a in u])
    B = np.array([[polys[a["unit"]].centroid.x, polys[a["unit"]].centroid.y] for a in u]) - ORIGIN[:2]
    s, R, t, r = sim2(A, B)
    M = np.array([[s * R[0, 0], 0, s * R[0, 1], t[0]],
                  [0, s, 0, G],
                  [-s * R[1, 0], 0, -s * R[1, 1], -t[1]],
                  [0, 0, 0, 1.0]])
    assert np.linalg.det(M[:3, :3]) > 0, "site->twin would mirror"
    return M, {"pairs": len(u), "scale": round(float(s), 5), "rms_m": round(float(np.sqrt((r ** 2).mean())), 3),
               "max_m": round(float(r.max()), 3), "grade_datum_navd88_m": round(G, 3)}

def interior_to_site(twin_data, model_data):
    ic = {c["label"]: c["position"] for c in model_data["columns"]}
    sc = {a["id"]: a["positionM"] for a in twin_data["assets"] if a["category"] == "column"}
    pairs = [(f"C{k:02d}", f"col-{k + 2:02d}") for k in range(1, 38) if f"C{k:02d}" in ic and f"col-{k + 2:02d}" in sc]
    A = np.array([[ic[a][0], ic[a][2]] for a, _ in pairs]); B = np.array([[sc[b][0], sc[b][2]] for _, b in pairs])
    s, R, t, r = sim2(A, B)
    assert np.linalg.det(R) > 0
    M = np.array([[s * R[0, 0], 0, s * R[0, 1], t[0]], [0, s, 0, 0], [s * R[1, 0], 0, s * R[1, 1], t[1]], [0, 0, 0, 1.0]])
    return M, {"pairs": len(pairs), "mapping": "interior C{k} = site col-{k+2}", "scale": round(float(s), 5),
               "rms_m": round(float(np.sqrt((r ** 2).mean())), 3), "max_m": round(float(r.max()), 3)}


# ------------------------------------------------------------------ GLB helpers
def read_glb(path):
    b = open(path, "rb").read()
    assert b[:4] == b"glTF"
    jl = struct.unpack_from("<I", b, 12)[0]
    j = json.loads(b[20:20 + jl])
    rest = b[20 + jl:]
    binc = rest[8:8 + struct.unpack_from("<I", rest, 0)[0]] if rest else b""
    return j, binc

def write_glb(path, j, binc):
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binc = binc + b"\0" * (-len(binc) % 4)
    total = 12 + 8 + len(js) + (8 + len(binc) if binc else 0)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, total))
        fh.write(struct.pack("<I4s", len(js), b"JSON")); fh.write(js)
        if binc:
            fh.write(struct.pack("<I4s", len(binc), b"BIN\0")); fh.write(binc)

def wrap_glb(src, dst, M, name, extras):
    """Parent the scene under one node carrying the registration matrix (glTF column-major)."""
    j, binc = read_glb(src)
    sc = j["scenes"][j.get("scene", 0)]
    j["nodes"].append({"name": name, "matrix": [float(v) for v in M.T.flatten()], "children": sc["nodes"], "extras": extras})
    sc["nodes"] = [len(j["nodes"]) - 1]
    write_glb(dst, j, binc)

def mesh_glb(path, V, F, name, color=(0.62, 0.62, 0.58), extras=None):
    """Minimal single-mesh GLB. V: (n,3) glTF coords float32, F: (m,3) uint32."""
    V = V.astype(np.float32); F = F.astype(np.uint32)
    # smooth normals
    Nn = np.zeros_like(V); tri = V[F]; fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for k in range(3): np.add.at(Nn, F[:, k], fn)
    Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)
    Nn = Nn.astype(np.float32)
    binc = V.tobytes() + Nn.tobytes() + F.tobytes()
    j = {"asset": {"version": "2.0", "generator": "OTB build-twin-pack"},
         "scene": 0, "scenes": [{"nodes": [0]}],
         "nodes": [{"name": name, "mesh": 0, **({"extras": extras} if extras else {})}],
         "meshes": [{"name": name, "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 0}]}],
         "materials": [{"name": name, "pbrMetallicRoughness": {"baseColorFactor": [*color, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.95}}],
         "buffers": [{"byteLength": len(binc)}],
         "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": V.nbytes, "target": 34962},
                         {"buffer": 0, "byteOffset": V.nbytes, "byteLength": Nn.nbytes, "target": 34962},
                         {"buffer": 0, "byteOffset": V.nbytes + Nn.nbytes, "byteLength": F.nbytes, "target": 34963}],
         "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(V), "type": "VEC3", "min": V.min(0).tolist(), "max": V.max(0).tolist()},
                       {"bufferView": 1, "componentType": 5126, "count": len(V), "type": "VEC3"},
                       {"bufferView": 2, "componentType": 5125, "count": F.size, "type": "SCALAR"}]}
    write_glb(path, j, binc)


# ------------------------------------------------------------------ terrain
def png16(path, a):
    """Greyscale 16-bit PNG without extra deps."""
    h, w = a.shape
    raw = b"".join(b"\0" + a[i].astype(">u2").tobytes() for i in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 16, 0, 0, 0, 0)) +
                 chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

def terrain(L, lo, hi, out):
    from scipy.ndimage import map_coordinates
    # 1 m terrain mesh over the AOI
    xs = np.arange(lo[0], hi[0] + 0.01, 1.0); ys = np.arange(lo[1], hi[1] + 0.01, 1.0)
    X, Y = np.meshgrid(xs, ys)
    col = (X + ORIGIN[0] - L["X0"]) / L["res"]; row = (Y + ORIGIN[1] - L["Y0"]) / L["res"]
    Z = map_coordinates(L["dtm"], [row, col], order=1, mode="nearest")
    ny, nx = Z.shape
    V = np.stack([X.ravel(), Z.ravel(), -Y.ravel()], 1)                      # glTF: (E, U, -N)
    idx = np.arange(nx * ny).reshape(ny, nx)
    a, b, c, d = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel(), idx[1:, :-1].ravel(), idx[1:, 1:].ravel()
    F = np.concatenate([np.stack([a, c, b], 1), np.stack([b, c, d], 1)])      # CCW seen from +U
    mesh_glb(out / "models/OTB-terrain-3dep.glb", V, F, "OTB_Terrain_3DEP",
             extras={"source": "USGS 3DEP 2017 class-2 ground, 1 m grid", "frame": "twin local glTF"})
    # Unreal landscape heightmap: 1009 x 1009 (a UE-recommended size), north-up
    n = 1009
    span = float(max(hi - lo))
    px = span / (n - 1)
    gx = lo[0] + np.arange(n) * px; gy = hi[1] - np.arange(n) * px            # row 0 = north
    GX, GY = np.meshgrid(gx, gy)
    Zh = map_coordinates(L["dtm"], [(GY + ORIGIN[1] - L["Y0"]) / L["res"], (GX + ORIGIN[0] - L["X0"]) / L["res"]], order=1, mode="nearest")
    zmin, zmax = float(Zh.min()) - 0.5, float(Zh.max()) + 0.5
    png16(out / "terrain/OTB-heightmap-1009.png", np.round((Zh - zmin) / (zmax - zmin) * 65535).astype(np.uint16))
    meta = {"size_px": n, "pixel_m": round(px, 6), "north_up": True,
            "west_local_m": float(lo[0]), "north_local_m": float(hi[1]),
            "height_min_navd88_m": round(zmin, 4), "height_max_navd88_m": round(zmax, 4),
            "unreal_landscape": {"scale_x_cm": round(px * 100, 4), "scale_y_cm": round(px * 100, 4),
                                 "scale_z": round((zmax - zmin) * 100 / 512, 4),
                                 "note": "UE: 16-bit full range = 512 m at Z scale 100. Place the Landscape so its NW corner "
                                         "sits at (west_local_m, north_local_m) and its base at height_min (cm, UE axes: X=E, Y=S, Z=U)."}}
    json.dump(meta, open(out / "terrain/OTB-heightmap-1009.json", "w"), indent=2)
    return meta


# ------------------------------------------------------------------ point clouds & splat
def clip_3dep(lo, hi, out):
    import laspy
    las = laspy.read(LAZ_3DEP)
    x, y = np.asarray(las.x) - ORIGIN[0], np.asarray(las.y) - ORIGIN[1]
    m = (x >= lo[0]) & (x <= hi[0]) & (y >= lo[1]) & (y <= hi[1])
    sub = laspy.LasData(las.header); sub.points = las.points[m]
    sub.write(out / "pointclouds/OTB-lidar-3dep-2017.laz")
    return int(m.sum())

def transform_splat(T, out):
    """Brush/3DGS PLY (DJI COLMAP frame) -> twin local Z-up. Positions + rotations + log-scales; SH band 1 rotated,
    bands 2-3 zeroed (not rotated -> would be wrong). Returns the check vs the DJI dense cloud."""
    raw = open(SPLAT, "rb").read()
    k = raw.index(b"end_header"); end = k + 10 + (2 if raw[k + 10:k + 12] == b"\r\n" else 1)
    head = raw[:end].decode("ascii", "ignore")
    props = [l.split()[2] for l in head.splitlines() if l.startswith("property")]
    n = int(head.split("element vertex ")[1].split()[0])
    a = np.frombuffer(raw[end:end + n * 4 * len(props)], dtype=np.dtype([(p, "<f4") for p in props])).copy()
    s, R, t = T["scale"], np.array(T["R"]), np.array(T["t"])
    P = np.stack([a["x"], a["y"], a["z"]], 1).astype(np.float64)
    P2 = (s * (R @ P.T)).T + t
    a["x"], a["y"], a["z"] = P2[:, 0], P2[:, 1], P2[:, 2]
    for i in range(3):
        a[f"scale_{i}"] += np.float32(math.log(s))
    # quaternion (w, x, y, z) = rot_0..3 ; q' = qR * q
    from scipy.spatial.transform import Rotation
    qR = Rotation.from_matrix(R)
    q = np.stack([a["rot_1"], a["rot_2"], a["rot_3"], a["rot_0"]], 1)
    q /= np.maximum(np.linalg.norm(q, axis=1, keepdims=True), 1e-12)
    q2 = (qR * Rotation.from_quat(q)).as_quat()
    a["rot_0"], a["rot_1"], a["rot_2"], a["rot_3"] = q2[:, 3], q2[:, 0], q2[:, 1], q2[:, 2]
    nrest = sum(p.startswith("f_rest_") for p in props) // 3
    for ch in range(3):
        base = ch * nrest
        c = np.stack([a[f"f_rest_{base + i}"] for i in range(3)], 1)          # band 1 ~ (y, z, x)
        v = np.stack([c[:, 2], c[:, 0], c[:, 1]], 1) @ R.T
        a[f"f_rest_{base}"], a[f"f_rest_{base + 1}"], a[f"f_rest_{base + 2}"] = v[:, 1], v[:, 2], v[:, 0]
        for i in range(3, nrest):
            a[f"f_rest_{base + i}"] = 0
    hdr = head.replace("comment Vertical axis: y", "comment Vertical axis: z (twin local Z-up: x=E y=N z=U, metres, EPSG:6344+NAVD88 origin 591000 3341600)")
    (out / "splat").mkdir(exist_ok=True)
    with open(out / "splat/OTB-splat-dji-twin.ply", "wb") as fh:
        fh.write(hdr.encode()); fh.write(a.tobytes())
    # check: splat centres vs the aligned DJI dense cloud (validates splat frame == COLMAP frame)
    from scipy.spatial import cKDTree
    d = np.load(ROOT / ".cache/twin-mesh/dji-twin.npz", allow_pickle=True)["P"]
    tree = cKDTree(d[np.random.default_rng(4).choice(len(d), 2_000_000, replace=False)])
    op = 1 / (1 + np.exp(-a["opacity"]))
    sel = np.where(op > 0.5)[0]; sel = sel[np.random.default_rng(5).choice(len(sel), min(len(sel), 50_000), replace=False)]
    dd, _ = tree.query(P2[sel])
    return {"gaussians": n, "sh_band1_rotated": True, "sh_bands_2_3": "zeroed",
            "opaque_centres_vs_dji_dense_median_m": round(float(np.median(dd)), 3), "within_0p5m": round(float(np.mean(dd < 0.5)), 3)}


# ------------------------------------------------------------------ register data
def register_csv(twin_data, M, out):
    rows = []
    for a in twin_data["assets"]:
        p = a.get("positionM")
        if not p:
            continue
        g = M @ np.array([p[0], p[1], p[2], 1.0])                          # glTF twin local (E, U, -N)
        E, U, N = g[0], g[1], -g[2]
        rows.append([a["id"], a["category"], a.get("label", ""), a.get("status", ""), f"{E:.3f}", f"{N:.3f}", f"{U:.3f}",
                     f"{E + ORIGIN[0]:.3f}", f"{N + ORIGIN[1]:.3f}", f"{U:.3f}", a.get("source", "")])
    with open(out / "data/assets-twin-frame.csv", "w", newline="", encoding="utf8") as fh:
        w = csv.writer(fh)
        w.writerow(["assetId", "category", "label", "status", "x_east_local", "y_north_local", "z_up_navd88",
                    "E_6344", "N_6344", "H_navd88", "source"])
        w.writerows(rows)
    return len(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blend", action="store_true")
    ap.add_argument("--no-drive", action="store_true")
    a = ap.parse_args()
    if OUT.exists():
        shutil.rmtree(OUT)
    for d in ("models", "pointclouds", "terrain", "data", "blender", "unreal", "splat"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    # fresh site twin straight from the generator (dist-twin/ may be held open by the 8770 standalone viewer)
    SITE.mkdir(parents=True, exist_ok=True)
    subprocess.run(["node", "--input-type=module", "-e",
                    "import {buildTwin} from './tools/build-site-twin.mjs'; import {writeFileSync} from 'node:fs';"
                    "const t = buildTwin(); if (!t.report.validation.ok) process.exit(1);"
                    f"const o = '{SITE.as_posix()}';"
                    "writeFileSync(o + '/model.glb', t.glb); writeFileSync(o + '/twin-data.json', JSON.stringify(t.data, null, 1));"
                    "writeFileSync(o + '/site-register.csv', t.csv);"], cwd=ROOT, check=True)
    L = {k: v for k, v in np.load(ROOT / ".cache/skydio-rectify/lidar.npz").items()}
    polys = footprints()
    G = grade_datum(L, polys)
    td = json.load(open(SITE / "twin-data.json", encoding="utf8"))
    md = json.load(open(INTERIOR / "model-data.json", encoding="utf8"))
    Ms, rs = site_to_twin(td, polys, G)
    Mi_s, ri = interior_to_site(td, md)
    Mi = Ms @ Mi_s
    frame = {"crs": "EPSG:6344 NAD83(2011) / UTM zone 15N", "vertical": "NAVD88 (GEOID12B), metres (EPSG:5703)",
             "local_origin": {"E": ORIGIN[0], "N": ORIGIN[1], "H": 0.0},
             "gltf_axes": "x = East, y = Up, z = -North (local metres)", "zup_axes": "x = East, y = North, z = Up (local metres)",
             "unreal_axes": "glTF import: UE X = East, Y = South, Z = Up (cm)", "ties": {"site_twin": rs, "interior_twin": ri}}
    ext = {"otb_frame": frame["crs"] + " + " + frame["vertical"], "otb_local_origin": "E 591000 N 3341600"}
    wrap_glb(SITE / "model.glb", OUT / "models/OTB-site-twin.glb", Ms, "OTB_SiteTwin_TwinFrame", {**ext, "tie": rs})
    for name in ("complete-model", "site-context", "upper-floors", "fixtures"):
        if (INTERIOR / f"{name}.glb").exists():
            wrap_glb(INTERIOR / f"{name}.glb", OUT / f"models/OTB-interior-{name}.glb", Mi, f"OTB_Interior_{name}_TwinFrame", {**ext, "tie": ri})
    for f in ("OTB-site-mesh.glb",):
        shutil.copy2(MESH / f, OUT / "models" / f)
    shutil.copy2(MESH / "OTB-site-photogrammetry.laz", OUT / "pointclouds/OTB-site-photogrammetry.laz")
    poly = ROOT / "export/polycam-twin"                                    # tools/register-polycam.py (accepted scans only)
    if (poly / "report.json").exists():
        for f in poly.glob("OTB-polycam-*-twin.glb"):
            shutil.copy2(f, OUT / "models" / f.name)
        for f in poly.glob("OTB-polycam-*-twin.laz"):
            shutil.copy2(f, OUT / "pointclouds" / f.name)
        shutil.copy2(poly / "report.json", OUT / "data/polycam-report.json")
    pts = np.array([c for p in polys.values() for c in p.exterior.coords]) - ORIGIN[:2]
    lo, hi = pts.min(0) - PAD_M, pts.max(0) + PAD_M
    frame["aoi_local_m"] = {"min": lo.round(2).tolist(), "max": hi.round(2).tolist()}
    frame["terrain"] = terrain(L, lo, hi, OUT)
    frame["lidar_3dep_points"] = clip_3dep(lo, hi, OUT)
    T = json.load(open(MESH / "dji-to-twin.json"))
    frame["splat"] = transform_splat(T, OUT)
    frame["register_rows"] = register_csv(td, Ms, OUT)
    import laspy
    frame["pointclouds"] = {}
    for f in sorted((OUT / "pointclouds").glob("*.laz")):
        with laspy.open(f) as r:
            h = r.header
            frame["pointclouds"][f.name] = {"points": int(h.point_count),
                                            "center_local_m": [round((h.mins[i] + h.maxs[i]) / 2 - ORIGIN[i], 3) for i in range(3)]}
    checks = {}
    with open(OUT / "data/assets-twin-frame.csv", encoding="utf8") as fh:
        for r in csv.DictReader(fh):
            if r["assetId"] in ("unit-101", "unit-149", "col-01", "stall-lot8-003"):
                x, y, z = float(r["x_east_local"]), float(r["y_north_local"]), float(r["z_up_navd88"])
                checks[r["assetId"]] = {"blender_m": [x, y, z], "unreal_cm": [round(x * 100), round(-y * 100), round(z * 100)]}
    frame["unreal_checks"] = frame["blender_checks"] = checks
    for f in ("site-register.csv", "twin-data.json"):
        shutil.copy2(SITE / f, OUT / "data" / f)
    shutil.copy2(SKY / "footprints-lidar.geojson", OUT / "data/footprints-lidar.geojson")
    for f in ("poses-rectified.csv", "flightlog-6344.csv", "report.json"):
        shutil.copy2(SKY / f, OUT / "data" / f"skydio-{f}")
    shutil.copy2(MESH / "report.json", OUT / "data/photogrammetry-report.json")
    json.dump(frame, open(OUT / "frame.json", "w"), indent=2)
    for f in ("import_otb_twin.py",):
        shutil.copy2(ROOT / "tools/blender" / f, OUT / "blender" / f)
    shutil.copy2(ROOT / "tools/unreal/import_otb_twin.py", OUT / "unreal/import_otb_twin.py")
    shutil.copy2(ROOT / "docs/twin-pack-README.md", OUT / "README.md")
    if a.blend:
        r = subprocess.run([str(BLENDER), "-b", "-noaudio", "-P", str(OUT / "blender/import_otb_twin.py"), "--", str(OUT), str(OUT / "blender/OTB_Twin.blend")],
                           capture_output=True, text=True, timeout=1800)
        (OUT / "blender/build.log").write_text(r.stdout[-20000:] + r.stderr[-20000:])
        frame["blend"] = (OUT / "blender/OTB_Twin.blend").exists()
        json.dump(frame, open(OUT / "frame.json", "w"), indent=2)
    print(json.dumps(frame, indent=1))
    if not a.no_drive:
        dst = DRIVE / OUT.name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(OUT, dst)
        print("copied ->", dst)


if __name__ == "__main__":
    main()
