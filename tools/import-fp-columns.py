# Import the Floorplanner walkway columns into plan space.
#   python tools/import-fp-columns.py <On_The_Boulevard.working.json> <column-analysis.json>
# Operator ruling 2026-09-23: the Floorplanner model (project 109978485, design 241952337)
# is the more accurate representation of the walkway columns. Its columns are ~61 cm
# (24") square wall loops, identified by the Codex column-analysis.json pass.
#
# Registration: Floorplanner is a 180° rotation of the plan (FP +x runs toward the 101 /
# Johnston end, FP +y toward the building rear). The plan's unit rectangles carry unequal
# x/y px-per-ft, so fit px = ax - sx*fx, py = ay - sy*fy by least squares from the four
# extents of each building's Floorplanner walls to its plat footprint (8 equations).
# Output: src/data/walkway-columns.json (plan px, same frame as geometry.json units).
import json, pathlib, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DESIGN_ID = 241952337
CM_FT = 30.48


def main(working_path, analysis_path):
    work = json.loads(pathlib.Path(working_path).read_text())
    ana = json.loads(pathlib.Path(analysis_path).read_text())
    units = json.loads((ROOT / "src" / "data" / "geometry.json").read_text())["units"]
    des = next(d for f in work["floors"] for d in f["designs"] if d["id"] == DESIGN_ID)

    cols = []
    for c in ana["columns"]:
        pts = c["centerline_polygon_cm"][:4]
        cols.append({"fp": c["id"], "fx": np.mean([p[0] for p in pts]) / CM_FT,
                     "fy": np.mean([p[1] for p in pts]) / CM_FT})
    fx = np.array([c["fx"] for c in cols]); fy = np.array([c["fy"] for c in cols])
    vals, cnt = np.unique(np.round(fy), return_counts=True)
    longY = vals[np.argmax(cnt)]                          # storefront column line, long building
    onLong = np.abs(fy - longY) < 1.5
    vals, cnt = np.unique(np.round(fx[~onLong]), return_counts=True)
    shortX = vals[np.argmax(cnt)]                         # column line, short building
    endX = fx[onLong].max()                               # 101-end corner column

    # Floorplanner building walls: long = behind the long column line (+y) and past the
    # short line; short = left of the short column line (-x).
    colWalls = {i for c in ana["columns"] for i in c["source_wall_indices"]}
    W = np.array([[w["a"]["x"], w["a"]["y"], w["b"]["x"], w["b"]["y"]] for i, w in enumerate(des["walls"])
                  if i not in colWalls]) / CM_FT
    mid = np.stack([(W[:, 0] + W[:, 2]) / 2, (W[:, 1] + W[:, 3]) / 2], 1)
    longW = W[(mid[:, 1] > longY + 2) & (mid[:, 0] > shortX + 2)]
    shortW = W[(mid[:, 0] < shortX - 2)]
    def ext(ws):
        # Envelope from the long runs only (storefront, rear, end walls). Short stubs,
        # bump-outs and interior partitions would otherwise stretch the extents.
        # Walls are stored as short segments, so sum collinear length per 1-ft line.
        dx = np.abs(ws[:, 2] - ws[:, 0]); dy = np.abs(ws[:, 3] - ws[:, 1])
        def runs(sel, coord, length, span):
            keys = np.round(coord[sel]); tot = {}
            for k, l in zip(keys, length[sel]): tot[k] = tot.get(k, 0) + l
            keep = [k for k, l in tot.items() if l > 0.4 * span]
            return min(keep), max(keep)
        spanX = np.ptp(np.concatenate([ws[:, 0], ws[:, 2]])); spanY = np.ptp(np.concatenate([ws[:, 1], ws[:, 3]]))
        y0, y1 = runs(dy < 0.5, (ws[:, 1] + ws[:, 3]) / 2, dx, spanX)
        x0, x1 = runs(dx < 0.5, (ws[:, 0] + ws[:, 2]) / 2, dy, spanY)
        return x0, x1, y0, y1
    def along(ws, axis, at):
        # extent along the storefront wall line (end walls are broken by doors, so read
        # the building's ends from where the storefront run starts and stops)
        on = ws[(np.abs(ws[:, 1 - axis] - at) < 0.75) & (np.abs(ws[:, 3 - axis] - at) < 0.75)]
        v = np.concatenate([on[:, axis], on[:, axis + 2]])
        return v.min(), v.max()
    L, S = list(ext(longW)), list(ext(shortW))
    L[0], L[1] = along(longW, 0, L[2])     # long storefront faces -y (the walkway)
    S[2], S[3] = along(shortW, 1, S[1])    # short storefront faces +x (the walkway)

    lu = [u for u in units.values() if abs(u["y"] - 131.35) < 1]
    su = [u for u in units.values() if abs(u["y"] - 131.35) >= 1]
    def pext(us):
        return (min(u["x"] for u in us), max(u["x"] + u["w"] for u in us),
                min(u["y"] for u in us), max(u["y"] + u["h"] for u in us))
    PL, PS = pext(lu), pext(su)

    # 180° rotation: FP min x -> plan max x, FP min y -> plan max y.
    Ax, bx, Ay, by = [], [], [], []
    for F, Pp in ((L, PL), (S, PS)):
        Ax += [[1, -F[0]], [1, -F[1]]]; bx += [Pp[1], Pp[0]]
        Ay += [[1, -F[2]], [1, -F[3]]]; by += [Pp[3], Pp[2]]
    # Scales are fixed, not fitted: Floorplanner is drawn in true feet and the plan's
    # px-per-ft is documented (geometry.boundary.transform). Free scales over-fit the
    # envelope extraction by ~1.5% (~8 ft over the long run). Only offsets are solved.
    tr = json.loads((ROOT / "src" / "data" / "geometry.json").read_text())["boundary"]["transform"]
    sx, sy = tr["kxPxPerFt"], tr["kyPxPerFt"]
    ax = float(np.mean(np.array(bx) - sx * np.array(Ax)[:, 1]))   # A[:,1] holds -F
    ay = float(np.mean(np.array(by) - sy * np.array(Ay)[:, 1]))
    resid = lambda A, b, a, s: np.abs(np.array(A) @ np.array([a, s]) - np.array(b))
    rX, rY = resid(Ax, bx, ax, sx), resid(Ay, by, ay, sy)
    to_plan = lambda x, y: (ax - sx * x, ay - sy * y)

    lines = {"long": [], "short": [], "wrap101": []}
    for c in cols:
        if abs(c["fy"] - longY) < 1.5: key = "long"
        elif abs(c["fx"] - shortX) < 1.5: key = "short"
        else: key = "wrap101"
        x, y = to_plan(c["fx"], c["fy"])
        lines[key].append({"fp": c["fp"], "x": round(float(x), 2), "y": round(float(y), 2)})
    lines["long"].sort(key=lambda c: c["x"])              # 101 end first
    lines["short"].sort(key=lambda c: c["y"])             # Patricia / M.A. end first
    lines["wrap101"].sort(key=lambda c: -c["y"])          # storefront corner first
    for pre, k in (("L", "long"), ("S", "short"), ("W", "wrap101")):
        for i, c in enumerate(lines[k]): c["id"] = f"{pre}{i + 1:02d}"

    ppf = (sx + sy) / 2
    out = {
        "source": "Floorplanner project 109978485 design 241952337 — 24-inch column wall loops "
                  "(Codex column-analysis.json 2026-09-23); registered to the plat footprints by "
                  "tools/import-fp-columns.py",
        "status": "ADOPTED — operator 2026-09-23: Floorplanner is the more accurate representation. "
                  "Tile counts / pair locations from the walk still confirm (docs/walkway-digital-twin-2026-09-23.md)",
        "moduleFt": 2.0, "columnSizeFt": 2.0,
        "heightFt": round(ana["method"]["model_wall_height_cm"] / CM_FT, 2),
        "heightNote": "Floorplanner wall height (12'-9\"); canopy underside not field-measured",
        "registration": {"planPxPerFtX": round(float(sx), 4), "planPxPerFtY": round(float(sy), 4),
                         "maxResidualPxX": round(float(rX.max()), 2), "maxResidualPxY": round(float(rY.max()), 2),
                         "maxResidualFt": round(float(max(rX.max(), rY.max()) / ppf), 2)},
        "counts": {k: len(v) for k, v in lines.items()},
        "lines": lines,
    }
    (ROOT / "src" / "data" / "walkway-columns.json").write_text(json.dumps(out, indent=1) + "\n")
    print(json.dumps(out["registration"]), out["counts"])
    print("FP long bldg ft", np.round([L[1] - L[0], L[3] - L[2]], 1), " short", np.round([S[1] - S[0], S[3] - S[2]], 1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
