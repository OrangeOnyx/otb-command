# OTB twin pack -> Blender scene (Blender 4.2+ / 5.x).
#
# Headless (what build-twin-pack.py runs):
#   blender -b -P blender/import_otb_twin.py -- <pack_dir> <out.blend>
# Interactive: open Blender > Scripting > Open this file > Run (pack_dir = the folder above this script).
#
# Every GLB in models/ is already registered to the twin frame (EPSG:6344 + NAVD88, local origin
# E 591000 N 3341600). Blender's glTF importer turns glTF Y-up into Z-up, so in Blender:
# X = East, Y = North, Z = Up (NAVD88 metres). Nothing is moved here: files line up as imported.
import bpy, csv, json, os, sys
from pathlib import Path

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PACK = Path(argv[0]) if argv else Path(__file__).resolve().parent.parent
OUT = Path(argv[1]) if len(argv) > 1 else PACK / "blender/OTB_Twin.blend"
frame = json.load(open(PACK / "frame.json"))

if argv:
    bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.unit_settings.system = "METRIC"; scn.unit_settings.length_unit = "METERS"
scn["otb_crs"] = frame["crs"]; scn["otb_vertical"] = frame["vertical"]
scn["otb_local_origin_E"] = frame["local_origin"]["E"]; scn["otb_local_origin_N"] = frame["local_origin"]["N"]
scn["otb_axes"] = "Blender X = East, Y = North, Z = Up (NAVD88 m)"

def collection(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in (parent or scn.collection).children:
        (parent or scn.collection).children.link(c)
    return c

def import_glb(path, coll, hide=False):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll.objects.link(o)
    if hide:
        lc = bpy.context.view_layer.layer_collection
        stack = [lc]
        while stack:
            l = stack.pop()
            if l.collection == coll:
                l.hide_viewport = True
            stack.extend(l.children)
    print("imported", path.name, len(new), "objects")
    return new

root = collection("OTB Twin")
models = PACK / "models"
site = import_glb(models / "OTB-site-twin.glb", collection("Site twin (A-1 register)", root))
import_glb(models / "OTB-interior-complete-model.glb", collection("Interior twin (Floorplanner)", root))
for extra in ("site-context", "upper-floors", "fixtures"):
    f = models / f"OTB-interior-{extra}.glb"
    if f.exists():
        import_glb(f, collection(f"Interior {extra} (hidden)", root), hide=True)
import_glb(models / "OTB-site-mesh.glb", collection("Photogrammetry mesh (DJI 2026-07)", root))
import_glb(models / "OTB-terrain-3dep.glb", collection("Terrain (USGS 3DEP 2017)", root))
for f in sorted(models.glob("OTB-polycam-*-twin.glb")):
    import_glb(f, collection("Polycam iPhone LiDAR scans", root))

# register rows onto objects that carry an assetId (glTF node extras -> custom properties)
reg = {}
with open(PACK / "data/assets-twin-frame.csv", encoding="utf8") as fh:
    for r in csv.DictReader(fh):
        reg[r["assetId"]] = r
tagged = 0
for o in bpy.data.objects:
    aid = o.get("assetId")
    if aid and aid in reg:
        r = reg[aid]
        for k in ("category", "label", "status", "E_6344", "N_6344", "H_navd88", "source"):
            o[f"otb_{k}"] = r[k]
        tagged += 1
scn["otb_register_objects_tagged"] = tagged
print("register rows attached to", tagged, "objects")

# light + overview camera over the site centre
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); sun.data.energy = 3.0
sun.rotation_euler = (0.7, 0.2, 2.3); root.objects.link(sun)
lo, hi = frame["aoi_local_m"]["min"], frame["aoi_local_m"]["max"]
cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
cam = bpy.data.objects.new("Overview", bpy.data.cameras.new("Overview")); cam.data.clip_end = 5000
cam.location = (cx - 160, cy - 220, 190); root.objects.link(cam)
tgt = bpy.data.objects.new("Overview target", None); tgt.location = (cx, cy, 12); root.objects.link(tgt)
tc = cam.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
scn.camera = cam
for area in getattr(bpy.context.screen, "areas", []) if bpy.context.screen else []:
    if area.type == "VIEW_3D":
        area.spaces[0].clip_end = 5000

if argv:
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT), compress=True)
    print("saved", OUT)
