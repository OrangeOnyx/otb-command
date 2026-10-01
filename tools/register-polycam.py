# Register the Polycam iPhone LiDAR scans to the OTB twin frame (EPSG:6344 + NAVD88, origin 591000/3341600).
#
#   python tools/register-polycam.py          # -> export/polycam-twin/ (+ copies into the twin pack build)
#   python tools/register-polycam.py 2026-09-29   # one scan only (merges into report.json; keeps memory flat)
#
# Scans = the three below + every key in E:/OTB-CAPTURE/polycam-inbox-ledger.json (tools/polycam-inbox.py).
# Per scan (E:/OTB-CAPTURE/OTB_Capture_<date>/04_model_exports/<stem>.*):
#   1. local PLY <-> geo LAZ: same points, same order -> exact similarity (index-matched Umeyama);
#   2. geo (phone GPS, unknown vertical datum) -> twin local: vertical seeded from the LiDAR ground;
#   3. 4-DoF point-to-plane ICP (heading + shift) onto the DJI dense cloud already in the twin frame
#      (build-twin-mesh.py). Phone LiDAR is metric (no scale) and its gravity is better than the reference, so
#      tilt is not solved; a free 6-DoF fit put 1.2-1.4 deg into heading (compass error) and only 0.2-0.3 deg
#      into tilt. Accepted when >= 50 % of the points the DJI cloud covers (NN < 1 m) sit within 0.3 m;
#      the DJI dense cloud's own noise (~0.15-0.3 m) bounds what this can prove.
#   Interior scans (< 5 % of points within 1 m of the DJI cloud - roof and walls hide them from the drone) skip ICP:
#   GPS + LiDAR-ground placement only (heading = phone compass, ~1-2 deg), written to export/polycam-twin/gps-only/,
#   which build-twin-pack.py does not pick up - promote by hand after checking against the footprint.
#   Fallback (2026-10-01): an exterior scan the DJI cloud cannot hold (thin drone coverage, e.g. the parking strip
#   behind 135-149) is re-fit against the DJI cloud PLUS the already-accepted Polycam scans that overlap it, with a
#   coarse-to-fine trim; accepted when >= 50 % of the points within 1 m of an accepted scan sit within 0.15 m of it
#   (phone-to-phone agreement) and that overlap covers >= 10 % of the scan.
#   Seeds (tools/polycam-seeds.json): a scan ICP cannot pin down (long featureless wall -> slides along it) gets a
#   hand-solved local->twin transform with its evidence (door numbers vs suite faces, roof edge); used as-is, the
#   DJI agreement is still measured and reported.
# Outputs: <date>-twin.laz (absolute coords, CRS embedded), <date>-twin.glb (textured mesh, registered), report.json
import json, math, struct, sys, gc
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from pyproj import Transformer
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
CAP = Path("E:/OTB-CAPTURE")
OUT = ROOT / "export/polycam-twin"
ORIGIN = np.array([591000.0, 3341600.0, 0.0])
SCANS = {"2026-08-18": "OTB_Capture_2026-08-18/04_model_exports/8_18_2026",
         "2026-09-28": "OTB_Capture_2026-09-28/04_model_exports/9_28_2026",
         "2026-09-29": "OTB_Capture_2026-09-29/04_model_exports/9_29_2026"}
_ledger = CAP / "polycam-inbox-ledger.json"
SEEDS = json.load(open(ROOT / "tools/polycam-seeds.json")) if (ROOT / "tools/polycam-seeds.json").exists() else {}
if _ledger.exists():
    SCANS.update({k: v["stem"] for k, v in json.load(open(_ledger))["keys"].items() if k not in SCANS})
to_utm = Transformer.from_crs(4326, 6344, always_xy=True)

def _mod(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
mesh = _mod("btm", ROOT / "tools/build-twin-mesh.py")
pack = _mod("btp", ROOT / "tools/build-twin-pack.py")

def umeyama(A, B, scale=True):
    ma, mb = A.mean(0), B.mean(0)
    U, D, Vt = np.linalg.svd((B - mb).T @ (A - ma))
    E = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))]); R = U @ E @ Vt
    s = np.trace(np.diag(D) @ E) / ((A - ma) ** 2).sum() if scale else 1.0
    return s, R, mb - s * R @ ma

def icp_rigid(src, dst, dn, tree, iters=45, trims=(1.5, 0.6, 0.3, 0.15)):
    R, t = np.eye(3), np.zeros(3); c = src.mean(0); hist = []
    for it in range(iters):
        trim = trims[min(it // 12, len(trims) - 1)]
        X = (R @ (src - c).T).T + c + t
        d, j = tree.query(X); m = d < trim
        if m.sum() < 500:
            break
        n, q, x = dn[j[m]], dst[j[m]], X[m]
        r = np.einsum("ij,ij->i", x - q, n)
        A = np.hstack([np.cross(x - c, n)[:, 2:3], n])                      # yaw about z + 3-D shift
        sol = np.linalg.lstsq(A, -r, rcond=None)[0]
        wz, dt = sol[0], sol[1:]
        dR = np.array([[math.cos(wz), -math.sin(wz), 0], [math.sin(wz), math.cos(wz), 0], [0, 0, 1.0]])
        R = dR @ R; t = dR @ t + dt
        hist.append((trim, int(m.sum()), float(np.sqrt(np.mean(r ** 2)))))
    return R, t, c, hist

def neighbour_reference(key, lo, hi):
    """Accepted Polycam twin clouds (other than `key`) inside [lo, hi]: 0.1 m voxel points + PCA normals."""
    import laspy
    pts, names = [], []
    for f in sorted(OUT.glob("OTB-polycam-*-twin.laz")):
        k = f.name[len("OTB-polycam-"):-len("-twin.laz")]
        if k == key:
            continue
        las = laspy.read(f)
        Q = np.stack([np.asarray(las.x) - ORIGIN[0], np.asarray(las.y) - ORIGIN[1], np.asarray(las.z)], 1)
        Q = Q[np.all((Q > lo) & (Q < hi), 1)]
        if len(Q) < 5000:
            continue
        _, first = np.unique(np.floor(Q / 0.1).astype(np.int64), axis=0, return_index=True)
        pts.append(Q[first]); names.append(k)
    if not pts:
        return None, None, []
    Q = np.concatenate(pts)
    _, nb = cKDTree(Q).query(Q, k=16)
    X = Q[nb] - Q[nb].mean(1, keepdims=True)
    _, _, Vt = np.linalg.svd(np.einsum("nki,nkj->nij", X, X))
    return Q, Vt[:, 2, :], names

def main():
    import laspy
    OUT.mkdir(parents=True, exist_ok=True)
    L = mesh.lidar()
    d = np.load(ROOT / ".cache/twin-mesh/dji-twin.npz", allow_pickle=True)
    D, DN = d["P"].astype(np.float64), d["N"].astype(np.float64)
    only = set(sys.argv[1:])
    rp = OUT / "report.json"
    rep = json.load(open(rp)) if only and rp.exists() else {}
    for date, stem in SCANS.items():
        if only and date not in only:
            continue
        gc.collect()
        las = laspy.read(CAP / f"{stem}.laz"); ply = mesh.read_ply(CAP / f"{stem}.ply")
        Ploc = np.stack([ply["x"], ply["y"], ply["z"]], 1).astype(np.float64)
        C = np.stack([ply["red"], ply["green"], ply["blue"]], 1).astype(np.uint8)
        E, N = to_utm.transform(np.asarray(las.x), np.asarray(las.y))
        G = np.stack([E - ORIGIN[0], N - ORIGIN[1], np.asarray(las.z)], 1)
        idx = np.random.default_rng(0).choice(len(G), 50_000, replace=False)
        s0, R0, t0 = umeyama(Ploc[idx], G[idx])                           # local -> geo (exact pairing)
        P = (s0 * (R0 @ Ploc.T)).T + t0
        # vertical seed: scan's low percentile vs LiDAR ground under it
        ix = ((P[:, 0] + ORIGIN[0] - L["X0"]) / L["res"]).astype(int); iy = ((P[:, 1] + ORIGIN[1] - L["Y0"]) / L["res"]).astype(int)
        dz = float(np.median(L["dtm"][iy, ix]) - np.percentile(P[:, 2], 5)); P[:, 2] += dz
        lo, hi = P.min(0) - 15, P.max(0) + 15
        mk = np.all((D > lo) & (D < hi), 1)
        dst, dn = D[mk], DN[mk]
        probe = P[np.random.default_rng(2).choice(len(P), min(len(P), 100_000), replace=False)]
        tree = cKDTree(dst) if len(dst) >= 1000 else None
        interior = tree is None or float(np.mean(tree.query(probe)[0] < 1.0)) < 0.05
        if interior:                                                       # no drone overlap -> GPS placement only
            R1, t1, c1, hist = np.eye(3), np.zeros(3), np.zeros(3), []
            Pf = P; dd = tree.query(probe)[0] if tree is not None else np.full(len(probe), np.inf)
        else:
            sub = P[np.random.default_rng(1).choice(len(P), min(len(P), 200_000), replace=False)]
            R1, t1, c1, hist = icp_rigid(sub, dst, dn, tree)
            Pf = (R1 @ (P - c1).T).T + c1 + t1
            dd, _ = tree.query(Pf[np.random.default_rng(2).choice(len(Pf), 100_000, replace=False)])
        near = dd < 1.0
        inl = float(np.mean(dd[near] < 0.3)) if near.any() else 0.0
        ok = inl >= 0.5 and not interior
        how, anchors, inl_pc = ("gps-only (interior, no drone overlap)" if interior else "icp-to-dji"), [], None
        if not ok and not interior:                                        # fallback: anchor on accepted neighbours
            Q, QN, anchors = neighbour_reference(date, lo, hi)
            if anchors:
                ref, refn = np.vstack([dst, Q]), np.vstack([dn, QN])
                sub = P[np.random.default_rng(1).choice(len(P), min(len(P), 200_000), replace=False)]
                R1, t1, c1, hist = icp_rigid(sub, ref, refn, cKDTree(ref), iters=72, trims=(4.0, 2.0, 1.0, 0.5, 0.3, 0.15))
                Pf = (R1 @ (P - c1).T).T + c1 + t1
                pr = Pf[np.random.default_rng(2).choice(len(Pf), 100_000, replace=False)]
                dd, _ = tree.query(pr); near = dd < 1.0
                inl = float(np.mean(dd[near] < 0.3)) if near.any() else 0.0
                dq, _ = cKDTree(Q).query(pr); nq = dq < 1.0
                inl_pc = float(np.mean(dq[nq] < 0.15)) if nq.any() else 0.0
                ok = bool(inl_pc >= 0.5 and nq.mean() >= 0.10)
                how = "icp-to-dji+polycam"
        # full local -> twin-local (Z-up) similarity
        S = s0; Rf = R1 @ R0; tf = R1 @ (t0 + np.array([0, 0, dz]) - c1) + c1 + t1
        if date in SEEDS:                                                  # hand-solved, evidence in the seed file
            sd = SEEDS[date]["local_to_twin"]; S, Rf, tf = sd["scale"], np.array(sd["R"]), np.array(sd["t"])
            Pf = (S * (Rf @ Ploc.T)).T + tf
            dd, _ = tree.query(Pf[np.random.default_rng(2).choice(len(Pf), 100_000, replace=False)]); near = dd < 1.0
            inl = float(np.mean(dd[near] < 0.3)) if near.any() else 0.0
            ok, how, anchors, inl_pc, hist = True, "seed: " + SEEDS[date]["method"], [], None, []
            R1, t1, c1 = np.eye(3), np.zeros(3), np.zeros(3)
        rep[date] = {"points": int(len(P)), "local_to_geo_scale": round(float(s0), 5), "vertical_seed_m": round(dz, 2),
                     "icp_shift_m": np.round(t1 + (R1 @ -c1) + c1, 2).tolist(),
                     "icp_rotation_deg": round(math.degrees(math.acos(np.clip((np.trace(R1) - 1) / 2, -1, 1))), 3),
                     "icp_final": hist[-1] if hist else None, "overlap_fraction": round(float(near.mean()), 3),
                     "overlap_within_0p3m_of_dji": round(inl, 3),
                     "median_distance_m": round(float(np.median(dd)), 3) if np.isfinite(dd).any() else None,
                     "registration": how, "anchors": anchors,
                     "overlap_within_0p15m_of_polycam": round(inl_pc, 3) if inl_pc is not None else None, "accepted": ok,
                     "local_to_twin": {"scale": float(S), "R": Rf.tolist(), "t": tf.tolist()}}
        print(date, json.dumps({k: v for k, v in rep[date].items() if k != "local_to_twin"}))
        if not ok and not interior:
            continue
        dest = OUT / "gps-only" if interior else OUT
        dest.mkdir(exist_ok=True)
        mesh.write_laz(dest / f"OTB-polycam-{date}-twin.laz", Pf.astype(np.float32), C)
        # textured mesh: Polycam GLB is the PLY frame in glTF Y-up (x, z, -y); wrap with local->twin (glTF)
        Mz = np.eye(4); Mz[:3, :3] = S * Rf; Mz[:3, 3] = tf                       # local Z-up -> twin Z-up
        Y2Z = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1.0]])   # glTF (x,y,z) -> Z-up (x,-z,y)
        Z2Y = np.linalg.inv(Y2Z)
        pack.wrap_glb(CAP / f"{stem}.glb", dest / f"OTB-polycam-{date}-twin.glb", Z2Y @ Mz @ Y2Z,
                      f"OTB_Polycam_{date}_TwinFrame", {"otb_frame": "EPSG:6344 + NAVD88", "otb_local_origin": "E 591000 N 3341600",
                                                         "overlap_within_0p3m_of_dji": inl})
    json.dump(rep, open(OUT / "report.json", "w"), indent=2)

if __name__ == "__main__":
    main()
