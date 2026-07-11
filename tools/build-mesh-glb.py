# P6d photogrammetry mesh: COLMAP fused point cloud -> site-cropped Poisson mesh
# -> decimated vertex-colored GLB in Lens-B world space (bakes src/data/splat-align.json —
# the dense workspace shares the COLMAP/splat frame, verified 2026-07-11).
#   python tools/build-mesh-glb.py [fused.ply]
# Default input: C:/Users/adam/tools3dgs/otb-work/dense/fused.ply
# Output: public/OTB-mesh.glb  (re-run after any dense re-reconstruction / re-fit)
#
# Meshing the CROPPED cloud (not COLMAP's poisson_mesher output) matters: Poisson on
# the full cloud closes a giant balloon around the far-field background; cropping
# first focuses the octree on the site.
import json, pathlib, sys
import numpy as np
import open3d as o3d
import trimesh

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else \
    pathlib.Path("C:/Users/adam/tools3dgs/otb-work/dense/fused.ply")
OUT = ROOT / "public" / "OTB-mesh.glb"
ALIGN = json.loads((ROOT / "src" / "data" / "splat-align.json").read_text())
TARGET_TRIS = 150_000
# world-frame site crop (layout3d centers the two-building bbox on the origin;
# plan 1480x990 px * WORLD 0.06 => ~89x59 world units total; 1 ft = 0.112)
CROP = o3d.geometry.AxisAlignedBoundingBox(np.array([-60.0, -1.5, -45.0]),
                                           np.array([60.0, 5.0, 45.0]))
VOXEL = 0.045           # ~5 in — keeps facade detail, tames the 3.8M-pt cloud
POISSON_DEPTH = 11
DENSITY_TRIM_Q = 0.06   # drop the lowest-support 6% of Poisson vertices
MIN_COMPONENT_TRIS = 400

def quat_to_R(q):  # [x,y,z,w] -> 3x3
    x, y, z, w = q
    return np.array([
        [1 - 2*(y*y + z*z), 2*(x*y - z*w),     2*(x*z + y*w)],
        [2*(x*y + z*w),     1 - 2*(x*x + z*z), 2*(y*z - x*w)],
        [2*(x*z - y*w),     2*(y*z + x*w),     1 - 2*(x*x + y*y)],
    ])

print(f"reading {SRC} ...")
pc = o3d.io.read_point_cloud(str(SRC))
print(f"  {len(pc.points):,} pts (normals={pc.has_normals()}, colors={pc.has_colors()})")

# bake COLMAP/splat frame -> Lens-B world (v' = R q v * s + p; rotate normals too)
Rq = quat_to_R(ALIGN["quaternion"])
pc.points = o3d.utility.Vector3dVector(
    np.asarray(pc.points) @ (Rq * ALIGN["scale"]).T + np.array(ALIGN["position"]))
pc.normals = o3d.utility.Vector3dVector(np.asarray(pc.normals) @ Rq.T)

pc = pc.crop(CROP)
print(f"  site crop: {len(pc.points):,} pts")
pc = pc.voxel_down_sample(VOXEL)
print(f"  voxel {VOXEL}: {len(pc.points):,} pts")

mesh, dens = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pc, depth=POISSON_DEPTH)
dens = np.asarray(dens)
mesh.remove_vertices_by_mask(dens < np.quantile(dens, DENSITY_TRIM_Q))
mesh = mesh.crop(CROP)  # Poisson still balloons a little past the data
print(f"  poisson d{POISSON_DEPTH}: {len(mesh.vertices):,} verts / {len(mesh.triangles):,} tris")

# drop small floating components (reconstruction debris)
labels, counts, _ = mesh.cluster_connected_triangles()
labels = np.asarray(labels); counts = np.asarray(counts)
mesh.remove_triangles_by_mask(counts[labels] < MIN_COMPONENT_TRIS)
mesh.remove_unreferenced_vertices()
print(f"  component filter: {len(mesh.vertices):,} verts / {len(mesh.triangles):,} tris")

# decimate; recolor from the pre-decimation vertices (quadric collapse drops colors)
srcV = np.asarray(mesh.vertices).copy()
srcC = np.asarray(mesh.vertex_colors).copy()
dec = mesh.simplify_quadric_decimation(target_number_of_triangles=TARGET_TRIS)
dec.remove_unreferenced_vertices()
if not dec.has_vertex_colors() or len(dec.vertex_colors) != len(dec.vertices):
    print("  recoloring decimated mesh from source vertices (KDTree)...")
    ref = o3d.geometry.PointCloud()
    ref.points = o3d.utility.Vector3dVector(srcV)
    kd = o3d.geometry.KDTreeFlann(ref)
    dv = np.asarray(dec.vertices)
    cols = np.empty((len(dv), 3))
    for i, v in enumerate(dv):
        _, idx, _ = kd.search_knn_vector_3d(v, 1)
        cols[i] = srcC[idx[0]]
    dec.vertex_colors = o3d.utility.Vector3dVector(cols)
print(f"  decimated: {len(dec.vertices):,} verts / {len(dec.triangles):,} tris")

tm = trimesh.Trimesh(
    vertices=np.asarray(dec.vertices),
    faces=np.asarray(dec.triangles),
    vertex_colors=(np.clip(np.asarray(dec.vertex_colors), 0, 1) * 255).astype(np.uint8),
    process=False)
tm.export(str(OUT))
print(f"wrote {OUT} ({OUT.stat().st_size/1e6:.1f} MB)")
