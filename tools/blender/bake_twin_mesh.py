# Blender (5.x) headless: vertex-coloured Poisson mesh -> decimated, UV-mapped, texture-baked GLB.
#
#   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P tools/blender/bake_twin_mesh.py -- \
#       <in.ply> <out.glb> [target_faces=600000] [tex=8192]
#
# Frame: the input is in the OTB twin frame (EPSG:6344 + NAVD88, local origin E 591000 N 3341600, Z up,
# metres). glTF is Y-up; Blender's glTF exporter converts, so the GLB is metres, +Y up, local origin.
import sys, bpy

argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
target = int(argv[2]) if len(argv) > 2 else 600_000
tex = int(argv[3]) if len(argv) > 3 else 8192

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.ply_import(filepath=src)
hi = bpy.context.selected_objects[0]
hi.name = "OTB_mesh_hi"
col = hi.data.color_attributes[0].name if hi.data.color_attributes else None
print("hi faces", len(hi.data.polygons), "color attr", col)

# emission material on the high mesh reads its vertex colours
mh = bpy.data.materials.new("hi_vcol"); mh.use_nodes = True
nt = mh.node_tree; nt.nodes.clear()
ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = col or ""
em = nt.nodes.new("ShaderNodeEmission"); out = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(ca.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
hi.data.materials.append(mh)

# low mesh: decimated copy with UVs
lo = hi.copy(); lo.data = hi.data.copy(); lo.name = "OTB_Site_Mesh"
bpy.context.collection.objects.link(lo)
ratio = min(1.0, target / max(len(hi.data.polygons), 1))
d = lo.modifiers.new("dec", "DECIMATE"); d.ratio = ratio
bpy.context.view_layer.objects.active = lo
bpy.ops.object.select_all(action="DESELECT"); lo.select_set(True)
bpy.ops.object.modifier_apply(modifier="dec")
print("lo faces", len(lo.data.polygons))
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.001)
bpy.ops.object.mode_set(mode="OBJECT")

img = bpy.data.images.new("OTB_Site_Mesh_albedo", tex, tex)
ml = bpy.data.materials.new("OTB_Site_Mesh"); ml.use_nodes = True
lnt = ml.node_tree
bsdf = lnt.nodes.get("Principled BSDF"); bsdf.inputs["Roughness"].default_value = 0.9
it = lnt.nodes.new("ShaderNodeTexImage"); it.image = img
lnt.links.new(it.outputs["Color"], bsdf.inputs["Base Color"])
lnt.nodes.active = it
lo.data.materials.clear(); lo.data.materials.append(ml)

scn = bpy.context.scene
scn.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "CUDA"; prefs.get_devices()
    for dv in prefs.devices: dv.use = True
    scn.cycles.device = "GPU"
except Exception as e:
    print("GPU setup skipped:", e)
scn.cycles.samples = 1
bk = scn.render.bake
bk.use_selected_to_active = True; bk.cage_extrusion = 0.25; bk.max_ray_distance = 0.6; bk.margin = 4
bpy.ops.object.select_all(action="DESELECT")
hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
bpy.ops.object.bake(type="EMIT")
img.filepath_raw = dst.rsplit(".", 1)[0] + "_albedo.png"; img.file_format = "PNG"; img.save()

bpy.data.objects.remove(hi, do_unlink=True)
lo["otb_frame"] = "EPSG:6344 NAD83(2011)/UTM15N + NAVD88 (GEOID12B) m"
lo["otb_local_origin_E_N"] = "591000 3341600"
bpy.ops.object.select_all(action="DESELECT"); lo.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=True, export_extras=True,
                          export_image_format="JPEG", export_jpeg_quality=88)
print("wrote", dst)
