# OTB twin pack -> Unreal Engine 5.4+ (written against 5.8).
#
# Enable plugins first (Edit > Plugins, restart): Python Editor Script Plugin, Interchange (default on),
# glTF Importer (default on), LiDAR Point Cloud, Georeferencing.
# Run: Tools > Execute Python Script... > this file.  Or headless:
#   UnrealEditor-Cmd.exe <Project>.uproject -run=pythonscript -script="<pack>/unreal/import_otb_twin.py"
# Set OTB_PACK (env var) if the script is not inside the pack's unreal/ folder.
#
# Frame: every GLB is pre-registered (EPSG:6344 + NAVD88, local origin E 591000 N 3341600). The glTF import
# maps to UE as X = East, Y = South, Z = Up, centimetres, so actors are spawned at the world origin untouched.
# Check after import: frame.json "unreal_checks" lists where known assets must land.
import json, os, csv
from pathlib import Path
import unreal

PACK = Path(os.environ.get("OTB_PACK") or Path(__file__).resolve().parent.parent)
DEST = "/Game/OTB_Twin"
frame = json.load(open(PACK / "frame.json"))
log = unreal.log
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def import_scene(glb, folder):
    """Interchange scene import keeps the node hierarchy + transforms and places actors in the open level."""
    src = unreal.InterchangeManager.create_source_data(str(glb))
    params = unreal.ImportAssetParameters()
    params.is_automated = True
    mgr = unreal.InterchangeManager.get_interchange_manager_scripted()
    try:
        mgr.import_scene(f"{DEST}/{folder}", src, params)
        log(f"OTB: scene-imported {glb.name}")
        return True
    except Exception as e:                                   # fall back to plain asset import + one actor per mesh
        unreal.log_warning(f"OTB: import_scene failed for {glb.name} ({e}); falling back to asset import")
    task = unreal.AssetImportTask()
    task.filename = str(glb); task.destination_path = f"{DEST}/{folder}"
    task.automated = True; task.save = True; task.replace_existing = True
    asset_tools.import_asset_tasks([task])
    for path in task.imported_object_paths:
        obj = unreal.load_asset(path)
        if isinstance(obj, unreal.StaticMesh):
            actors.spawn_actor_from_object(obj, unreal.Vector(0, 0, 0))
    return False


def import_point_cloud(laz, folder, label):
    task = unreal.AssetImportTask()
    task.filename = str(laz); task.destination_path = f"{DEST}/{folder}"
    task.automated = True; task.save = True; task.replace_existing = True
    asset_tools.import_asset_tasks([task])
    for path in task.imported_object_paths:
        pc = unreal.load_asset(path)
        if pc and pc.get_class().get_name() == "LidarPointCloud":
            a = actors.spawn_actor_from_class(unreal.LidarPointCloudActor, unreal.Vector(0, 0, 0))
            a.set_actor_label(label)
            a.get_editor_property("point_cloud_component").set_editor_property("point_cloud", pc)
            # The plugin re-centres clouds on import; put the centre back where the twin frame says it is.
            c = frame["pointclouds"][laz.name]["center_local_m"]
            a.set_actor_location(unreal.Vector(c[0] * 100, -c[1] * 100, c[2] * 100), False, False)
            log(f"OTB: point cloud {laz.name} placed at local {c}")


def georeference():
    try:
        g = actors.spawn_actor_from_class(unreal.GeoReferencingSystem, unreal.Vector(0, 0, 0))
        g.set_actor_label("OTB GeoReferencing (EPSG:6344)")
        for k, v in (("planet_shape", unreal.PlanetShape.FLAT_PLANET), ("projected_crs", "EPSG:6344"),
                     ("geographic_crs", "EPSG:6318"), ("origin_at_planet_center", False),
                     ("origin_location_in_projected_crs", True),
                     ("origin_projected_coordinates_easting", frame["local_origin"]["E"]),
                     ("origin_projected_coordinates_northing", frame["local_origin"]["N"]),
                     ("origin_projected_coordinates_up", 0.0)):
            try:
                g.set_editor_property(k, v)
            except Exception as e:
                unreal.log_warning(f"OTB: GeoReferencing property {k} not set ({e})")
    except Exception as e:
        unreal.log_warning(f"OTB: Georeferencing plugin not available ({e})")


def tag_register():
    """Label + tag actors whose name is a register assetId (site twin nodes are named by assetId)."""
    reg = {r["assetId"]: r for r in csv.DictReader(open(PACK / "data/assets-twin-frame.csv", encoding="utf8"))}
    n = 0
    for a in actors.get_all_level_actors():
        name = a.get_actor_label()
        if name in reg:
            r = reg[name]
            a.tags = [unreal.Name("OTB"), unreal.Name(r["category"]), unreal.Name(name)]
            a.set_folder_path(unreal.Name(f"OTB/Register/{r['category']}"))
            n += 1
    log(f"OTB: tagged {n} register actors")


models = PACK / "models"
import_scene(models / "OTB-site-twin.glb", "SiteTwin")
import_scene(models / "OTB-interior-complete-model.glb", "Interior")
import_scene(models / "OTB-site-mesh.glb", "Photogrammetry")
import_scene(models / "OTB-terrain-3dep.glb", "Terrain")
for f in sorted(models.glob("OTB-polycam-*-twin.glb")):
    import_scene(f, "Polycam")
for laz, label in (("OTB-site-photogrammetry.laz", "OTB Photogrammetry cloud"), ("OTB-lidar-3dep-2017.laz", "OTB 3DEP LiDAR 2017")):
    try:
        import_point_cloud(PACK / "pointclouds" / laz, "PointClouds", label)
    except Exception as e:
        unreal.log_warning(f"OTB: point cloud {laz} skipped - enable the LiDAR Point Cloud plugin ({e})")
georeference()
tag_register()
unreal.EditorLevelLibrary.save_current_level()
log("OTB: import complete. Landscape: see terrain/OTB-heightmap-1009.json (manual Landscape import).")
