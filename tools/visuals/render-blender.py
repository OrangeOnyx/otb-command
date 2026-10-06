# OTB photoreal stills in Blender Cycles (2026-10-06, operator: "the absolute best looking version").
# Input: the A-8 Styled Twin exported in the twin frame (A-8 > Download 3D, or exportGLB({twinFrame:true})),
# CC0 Poly Haven materials, and Blender's physically based sky with the sun placed for Lafayette, LA.
# Usage (headless, GPU):
#   blender -b -P tools/visuals/render-blender.py -- --glb <A8-twin-frame.glb> --assets <polyhaven dir>
#           --out <dir> [--light golden|day] [--samples 256] [--res 2560x1440] [--cams overview,storefronts,corner]
# Twin frame in Blender: X = East, Y = North, Z = Up (NAVD88 m). Long building storefronts face east.
import argparse, math, sys
from pathlib import Path
import bpy
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--glb", required=True); ap.add_argument("--assets", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--light", default="golden"); ap.add_argument("--samples", type=int, default=256)
ap.add_argument("--res", default="2560x1440"); ap.add_argument("--cams", default="overview,storefronts,corner")
ap.add_argument("--save-blend", default="")
ap.add_argument("--frame-csv", default="C:/Users/adam/Projects/otb-command-claude-code-kit/otb-command/export/twin-pack/OTB_Twin_Pack/data/assets-twin-frame.csv")
ap.add_argument("--trees", default="")   # Poly Haven model dir (island_tree_01, tree_small_02); empty = keep A-8 trees
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
A, OUT = Path(a.assets), Path(a.out); OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=a.glb)

# ---------- materials: real CC0 surfaces by A-8 role name ----------
def img(name, color=True):
    p = A / name
    if not p.exists(): return None
    im = bpy.data.images.load(str(p), check_existing=True)
    im.colorspace_settings.name = "sRGB" if color else "Non-Color"
    return im

def pbr(key, tex, size_m, tint=(1, 1, 1), rough_mul=1.0):
    m = bpy.data.materials.new("OTB_" + key); m.use_nodes = True
    nt, L = m.node_tree, m.node_tree.links
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size_m,) * 3
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    def tx(fname, color):
        im = img(fname, color)
        if not im: return None
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = im; n.projection = "BOX"; n.projection_blend = 0.25
        L.new(mp.outputs[0], n.inputs[0]); return n
    d, r, nrm = tx(f"{tex}_diffuse_2k.jpg", True), tx(f"{tex}_rough_2k.jpg", False), tx(f"{tex}_nor_gl_2k.jpg", False)
    if d:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0; mix.inputs[7].default_value = (*tint, 1)
        L.new(d.outputs[0], mix.inputs[6]); L.new(mix.outputs[2], bsdf.inputs["Base Color"])
    if r:
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = rough_mul
        L.new(r.outputs[0], mul.inputs[0]); L.new(mul.outputs[0], bsdf.inputs["Roughness"])
    if nrm:
        nm = nt.nodes.new("ShaderNodeNormalMap"); L.new(nrm.outputs[0], nm.inputs["Color"]); L.new(nm.outputs[0], bsdf.inputs["Normal"])
    return m

def lawn():
    m = bpy.data.materials.new("OTB_lawn"); m.use_nodes = True
    nt, L = m.node_tree, m.node_tree.links; b = nt.nodes["Principled BSDF"]
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 3.0; noise.inputs["Detail"].default_value = 8
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.13, 0.21, 0.06, 1); ramp.color_ramp.elements[1].color = (0.26, 0.36, 0.12, 1)
    L.new(noise.outputs["Fac"], ramp.inputs[0]); L.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4
    fine = nt.nodes.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 180
    L.new(fine.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], b.inputs["Normal"])
    return m

CREAM = (1.0, 0.93, 0.80)
MAT = {
    "stucco": pbr("brick", "brick_wall_08", 1.6, CREAM), "column": pbr("brick_col", "brick_wall_08", 1.6, CREAM),
    "pier": pbr("pier", "brick_wall_08", 1.6, CREAM),
    "rearWall": pbr("rear", "plastered_wall", 3.0, (0.95, 0.88, 0.76)), "fascia": pbr("fascia", "plastered_wall", 3.0, CREAM),
    "endBlock": pbr("endblock", "plastered_wall", 3.0, CREAM), "trim": pbr("trim", "plastered_wall", 3.0, (1, 0.97, 0.9)),
    "cap": pbr("cap", "plastered_wall", 3.0, (1, 0.97, 0.9)), "sill": pbr("sill", "plastered_wall", 3.0, (1, 0.97, 0.9)),
    "mansard": pbr("shingle", "roof_09", 2.5, (0.62, 0.64, 0.66)),
    "zone-parking": pbr("paving", "concrete_floor_02", 4.0, (0.92, 0.91, 0.88)),
    "zone-service": pbr("paving_svc", "concrete_floor_02", 4.0, (0.9, 0.89, 0.86)),
    "zone-sidewalk": pbr("walk", "concrete_floor_02", 2.0, (1.0, 0.99, 0.96)), "curb": pbr("curb", "concrete_floor_02", 1.5, (1, 1, 0.97)),
    "zone-roads": pbr("road", "concrete_floor_02", 5.0, (0.78, 0.78, 0.76)), "pad": pbr("pad", "concrete_floor_02", 2.0),
    "zone-landscape": lawn(),
}
def foliage():
    m = bpy.data.materials.new("OTB_shrub"); m.use_nodes = True
    nt, L = m.node_tree, m.node_tree.links; bsdf = nt.nodes["Principled BSDF"]
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 22
    tc = nt.nodes.new("ShaderNodeTexCoord"); L.new(tc.outputs["Object"], vor.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.035, 0.09, 0.025, 1); ramp.color_ramp.elements[1].color = (0.16, 0.30, 0.07, 1)
    L.new(vor.outputs["Distance"], ramp.inputs[0]); L.new(ramp.outputs[0], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.7
    try: bsdf.inputs["Subsurface Weight"].default_value = 0.15
    except Exception: pass
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.9
    L.new(vor.outputs["Distance"], bump.inputs["Height"]); L.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m
MAT["shrub"] = foliage()
swapped = {}
for ob in bpy.data.objects:
    if ob.type != "MESH": continue
    for slot in ob.material_slots:
        if not slot.material: continue
        key = slot.material.name.split(".")[0]
        if key in MAT:
            slot.material = MAT[key]; swapped[key] = swapped.get(key, 0) + 1
print("OTB: material swaps", swapped)

import bmesh
# Shrubs: faceted A-8 blobs -> rounded, lumpy bushes (subdivision + noise displacement).
for ob in bpy.data.objects:
    if ob.type == "MESH" and any(s.material and s.material.name == "OTB_shrub" for s in ob.material_slots):
        me = ob.data
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002); bm.to_mesh(me); bm.free()
        if "custom_normal" in me.attributes: me.attributes.remove(me.attributes["custom_normal"])
        for poly in me.polygons: poly.use_smooth = True
        sub = ob.modifiers.new("round", "SUBSURF"); sub.levels = sub.render_levels = 2
        tex = bpy.data.textures.new("shrub_noise", "CLOUDS"); tex.noise_scale = 0.35
        dis = ob.modifiers.new("lumps", "DISPLACE"); dis.texture = tex; dis.strength = 0.22; dis.mid_level = 0.5
# Base ground slab (unnamed, hundreds of metres): a field, not beige paving.
field = lawn(); field.name = "OTB_field"
for ob in bpy.data.objects:
    if ob.type == "MESH" and max(ob.dimensions.x, ob.dimensions.y) > 300:
        for slot in ob.material_slots: slot.material = field

# ---------- real trees: replace each A-8 tree (trunk + leaf balls) with a CC0 model at its spot and size ----------
import bmesh, random
if a.trees:
    random.seed(7)
    src = bpy.data.collections.new("OTB_TreeSources"); scn.collection.children.link(src)
    models = {}
    for name in ("island_tree_01", "tree_small_02"):
        f = next((Path(a.trees) / name).glob("*.gltf"), None)
        if not f: continue
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=str(f))
        new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new("OTB_" + name)
        for o in new:
            for c in o.users_collection: c.objects.unlink(o)
            col.objects.link(o)
        src.children.link(col)
        zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == "MESH" for c in o.bound_box]
        models[name] = (col, max(zs) - min(zs))
    bpy.context.view_layer.layer_collection.children["OTB_TreeSources"].exclude = True
    # Collect tree parts: every loose piece of a mesh using the trunk / leaf materials.
    parts = []
    for ob in [o for o in bpy.data.objects if o.type == "MESH" and any(s.material and s.material.name.split(".")[0].rstrip("0123456789") in ("leaf", "trunk") for s in o.material_slots)]:
        bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
        seen = set()
        for v in bm.verts:
            if v.index in seen: continue
            stack, isl = [v], []
            while stack:
                x = stack.pop()
                if x.index in seen: continue
                seen.add(x.index); isl.append(ob.matrix_world @ x.co)
                stack.extend(e.other_vert(x) for e in x.link_edges)
            parts.append(isl)
        bm.free(); bpy.data.objects.remove(ob)
    # Cluster pieces into trees by plan distance.
    trees = []
    for isl in parts:
        cx, cy = sum(p.x for p in isl) / len(isl), sum(p.y for p in isl) / len(isl)
        for t in trees:
            if (t["x"] - cx) ** 2 + (t["y"] - cy) ** 2 < 4.0 ** 2: t["pts"].extend(isl); break
        else: trees.append({"x": cx, "y": cy, "pts": list(isl)})
    placed = 0
    for t in trees:
        pts = t["pts"]; zlo, zhi = min(p.z for p in pts), max(p.z for p in pts)
        width = max(max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts))
        name = "island_tree_01" if width > 6 and "island_tree_01" in models else "tree_small_02"
        if name not in models: continue
        col, hsrc = models[name]
        e = bpy.data.objects.new("tree", None); e.instance_type = "COLLECTION"; e.instance_collection = col
        e.location = (t["x"], t["y"], zlo); k = (zhi - zlo) * random.uniform(1.05, 1.25) / max(hsrc, 0.1)
        e.scale = (k, k, k); e.rotation_euler = (0, 0, random.uniform(0, 6.283)); scn.collection.objects.link(e); placed += 1
    print("OTB: trees replaced", placed)

# ---------- sky + sun (Lafayette, LA: golden = low ESE morning sun on the east-facing storefronts) ----------
world = bpy.data.worlds.new("OTB_World"); scn.world = world; world.use_nodes = True
wn = world.node_tree; bg = wn.nodes["Background"]
sky = wn.nodes.new("ShaderNodeTexSky")
for t in ("MULTIPLE_SCATTERING", "NISHITA"):
    try: sky.sky_type = t; break
    except Exception: pass
SUN = {"golden": (7.0, 103.0), "day": (52.0, 160.0)}[a.light]   # (elevation deg, azimuth deg from north, clockwise)
elev, az = SUN
sky.sun_elevation = math.radians(elev)
sky.sun_rotation = math.radians(90 - az)   # Blender: 0 = sun toward +X (east), counter-clockwise; azimuth is clockwise from north
try: sky.air_density = 1.0; sky.dust_density = 2.5 if a.light == "golden" else 1.0
except Exception: pass
wn.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.22 if a.light == "golden" else 0.3

# ---------- framing from the buildings ----------
pts = [ob.matrix_world @ Vector(c) for ob in bpy.data.objects if ob.type == "MESH" and any(
    s.material and s.material.name.startswith(("OTB_brick", "OTB_rear", "OTB_shingle")) for s in ob.material_slots) for c in ob.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
ctr, ground = (lo + hi) / 2, lo.z
print("OTB: building bbox", tuple(round(v, 1) for v in lo), tuple(round(v, 1) for v in hi))

def camera(name, loc, target, lens=28):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.clip_end = 3000
    ob = bpy.data.objects.new(name, cam); scn.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob

span = max(hi.x - lo.x, hi.y - lo.y)
# Framing from the register (the site is rotated against true north in the twin frame): suite centroids
# give each building's line; the storefronts face the parking-island centroid.
import csv
U, isl = {}, []
for r in csv.DictReader(open(a.frame_csv, encoding="utf8")):
    v = Vector((float(r["x_east_local"]), float(r["y_north_local"]), 0))
    if r["category"] == "unit": U[r["assetId"].replace("unit-", "").upper()] = v
    elif r["category"] == "island": isl.append(v)
C = sum(isl, Vector()) / len(isl)
def front(u0, u1, depth=13.0):
    A0, B0 = U[u0], U[u1]; ax = (B0 - A0).normalized(); n = Vector((-ax.y, ax.x, 0))
    if (C - (A0 + B0) / 2).dot(n) < 0: n = -n
    return A0, B0, ax, n, depth
A0, B0, ax, n, d = front("101", "133"); mid = (A0 + B0) / 2 + n * d
A2, B2, ax2, n2, _ = front("137", "149"); jas = B2 + n2 * d
G = Vector((0, 0, ground))
def camera(name, loc, target, lens=28):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.clip_end = 3000
    ob = bpy.data.objects.new(name, cam); scn.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob

span = max(hi.x - lo.x, hi.y - lo.y)
# Framing from the canopy columns: the long building's columns (x < 0) line its east-facing storefronts;
# the short building's columns (y > 60) line its south-facing storefronts, Jason's (149) at their east end.
cols = [ob.matrix_world.translation for ob in bpy.data.objects if ob.type == "MESH" and any(
    s.material and s.material.name.split(".")[0] in ("column", "OTB_brick_col") for s in ob.material_slots)]
cols = [ob.matrix_world @ ((Vector(ob.bound_box[0]) + Vector(ob.bound_box[6])) / 2) for ob in bpy.data.objects if ob.type == "MESH" and any(
    s.material and s.material.name.split(".")[0] in ("column", "OTB_brick_col") for s in ob.material_slots)] or cols
lc = [c for c in cols if c.x < 0] or cols; sc_ = [c for c in cols if c.y > 60] or cols
face_x, ly0, ly1 = max(c.x for c in lc), min(c.y for c in lc), max(c.y for c in lc)
face_y, sx1 = min(c.y for c in sc_), max(c.x for c in sc_)
lmid = (ly0 + ly1) / 2
print("OTB: long face x", round(face_x, 1), "y", round(ly0, 1), round(ly1, 1), "| short face y", round(face_y, 1), "east end x", round(sx1, 1))
CAMS = {
    "overview": camera("overview", ctr + Vector((0.62 * span, -0.55 * span, 0.36 * span)), ctr + Vector((-6, 4, -6)), 32),
    "storefronts": camera("storefronts", mid + n * 40 - ax * 32 + G + Vector((0, 0, 1.7)), mid + ax * 14 + G + Vector((0, 0, 4.0)), 26),
    "corner": camera("corner", jas + n2 * 30 - ax2 * 22 + G + Vector((0, 0, 5.0)), jas + ax2 * 3 + G + Vector((0, 0, 4.0)), 28),
}

# ---------- render ----------
scn.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
for dev in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = dev; prefs.get_devices()
        if any(d.type == dev for d in prefs.devices):
            for d in prefs.devices: d.use = d.type == dev
            scn.cycles.device = "GPU"; print("OTB: GPU", dev); break
    except Exception: pass
scn.cycles.samples = a.samples; scn.cycles.use_denoising = True
w, h = (int(v) for v in a.res.split("x")); scn.render.resolution_x, scn.render.resolution_y = w, h
try: scn.view_settings.view_transform = "AgX"; scn.view_settings.look = "AgX - Base Contrast"
except Exception: pass
scn.view_settings.exposure = 0.0 if a.light == "golden" else -0.3
scn.render.image_settings.file_format = "PNG"
if a.save_blend: bpy.ops.wm.save_as_mainfile(filepath=a.save_blend)
for name in a.cams.split(","):
    scn.camera = CAMS[name]
    scn.render.filepath = str(OUT / f"otb-{name}-{a.light}.png")
    bpy.ops.render.render(write_still=True)
    print("OTB: rendered", scn.render.filepath)
