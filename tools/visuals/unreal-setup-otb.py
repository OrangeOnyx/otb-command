# OTB Unreal setup (2026-10-06, operator: "the absolute best looking version").
# Headless:  UnrealEditor-Cmd.exe OTB_Twin.uproject -run=pythonscript -script="<this file>"
# 1. New level /Game/OTB/OTB_Main.  2. Twin-pack import (registered, EPSG:6344 frame).  2b. A-8 export.
# 3. Golden-hour lighting rig for Lafayette, LA.  4. Saved camera angles.  5. Save.
import os, runpy
from pathlib import Path
import unreal

PACK = Path(os.environ.get("OTB_PACK", r"C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command\export\twin-pack\OTB_Twin_Pack"))
LEVEL = "/Game/OTB/OTB_Main"
log = unreal.log
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)

# 1. Level
if unreal.EditorAssetLibrary.does_asset_exist(LEVEL):
    levels.load_level(LEVEL)
else:
    levels.new_level(LEVEL)
log(f"OTB: level {LEVEL}")

# 2. Twin pack import (its own script handles scenes, point clouds, georeferencing, register tags)
os.environ["OTB_PACK"] = str(PACK)
if not unreal.EditorAssetLibrary.does_directory_exist("/Game/OTB_Twin/SiteTwin"):
    runpy.run_path(str(PACK / "unreal" / "import_otb_twin.py"), run_name="__main__")
else:
    log("OTB: twin pack already imported - skipping")

# 2b. A-8 Styled Twin export (plan-true buildings, mansard, signs) — already in the twin frame.
A8 = Path(__file__).resolve().parent.parent / "Import" / "OTB-A8-twin-frame.glb"
if A8.exists() and not unreal.EditorAssetLibrary.does_directory_exist("/Game/OTB_Twin/A8"):
    try:
        src = unreal.InterchangeManager.create_source_data(str(A8))
        params = unreal.ImportAssetParameters(); params.is_automated = True
        unreal.InterchangeManager.get_interchange_manager_scripted().import_scene("/Game/OTB_Twin/A8", src, params)
        log("OTB: imported A-8 styled twin")
    except Exception as e:
        unreal.log_warning(f"OTB: A-8 import failed ({e})")

# 3. Golden-hour lighting rig (idempotent: remove our old rig first)
for a in actors.get_all_level_actors():
    if "OTB_Light" in [str(t) for t in a.tags]:
        actors.destroy_actor(a)

def spawn(cls, loc=(0, 0, 0), rot=(0, 0, 0), label=None):
    a = actors.spawn_actor_from_class(cls, unreal.Vector(*loc), unreal.Rotator(*rot))
    a.tags = [unreal.Name("OTB_Light")]
    if label: a.set_actor_label(label)
    a.set_folder_path(unreal.Name("OTB/Lighting"))
    return a

# Late-afternoon sun from the WSW (storefronts of the long building face east, so golden light rakes the
# parking field and the short building's west-facing fronts). Pitch -8 deg = low golden sun.
sun = spawn(unreal.DirectionalLight, (0, 0, 5000), (0, -8, 245), "OTB Sun (golden hour)")
sc = sun.light_component
for k, v in (("intensity", 9.0), ("light_color", unreal.Color(255, 214, 170, 255)), ("atmosphere_sun_light", True), ("cast_shadows", True)):
    try: sc.set_editor_property(k, v)
    except Exception as e: unreal.log_warning(f"OTB: sun {k} skipped ({e})")
spawn(unreal.SkyAtmosphere, label="OTB Sky Atmosphere")
sky = spawn(unreal.SkyLight, (0, 0, 2000), label="OTB Sky Light")
try: sky.light_component.set_editor_property("real_time_capture", True)
except Exception as e: unreal.log_warning(f"OTB: skylight realtime skipped ({e})")
spawn(unreal.VolumetricCloud, label="OTB Clouds")
fog = spawn(unreal.ExponentialHeightFog, (0, 0, 0), label="OTB Haze")
def try_set(obj, k, v):
    try: obj.set_editor_property(k, v)
    except Exception as e: unreal.log_warning(f"OTB: {obj.get_class().get_name()}.{k} skipped ({e})")
try_set(fog.component, "fog_density", 0.012)
try_set(fog.component, "enable_volumetric_fog", True)
ppv = spawn(unreal.PostProcessVolume, label="OTB Grade")
ppv.set_editor_property("unbound", True)
s = ppv.settings
for k, v in (("override_auto_exposure_method", True), ("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL),
             ("override_auto_exposure_bias", True), ("auto_exposure_bias", 11.5),
             ("override_bloom_intensity", True), ("bloom_intensity", 0.35),
             ("override_vignette_intensity", True), ("vignette_intensity", 0.25),
             ("override_white_temp", True), ("white_temp", 6200.0)):
    try: s.set_editor_property(k, v)
    except Exception as e: unreal.log_warning(f"OTB: post setting {k} skipped ({e})")
ppv.set_editor_property("settings", s)

# 4. Camera angles (UE: X = East, Y = South, Z = Up, cm; twin local origin E 591000 N 3341600)
CAMS = {
    "OTB Cam Overview (golden hour)": ((-9000, 16000, 9000), (0, -32, -60)),
    "OTB Cam Storefronts": ((2000, 6500, 600), (0, -6, -100)),
    "OTB Cam Jasons corner": ((-1500, 9000, 900), (0, -10, -40)),
}
for label, (loc, rot) in CAMS.items():
    c = spawn(unreal.CineCameraActor, loc, rot, label)
    try: c.get_cine_camera_component().set_editor_property("current_focal_length", 28.0)
    except Exception as e: unreal.log_warning(f"OTB: focal length skipped ({e})")

# Headless imports stay in memory until saved: write every new asset package, then the level.
unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
levels.save_current_level()
n = len(unreal.EditorAssetLibrary.list_assets("/Game/OTB_Twin", recursive=True))
log(f"OTB: saved {n} assets under /Game/OTB_Twin")
log("OTB: setup complete - open OTB_Twin.uproject, level /Game/OTB/OTB_Main")
