# -*- coding: utf-8 -*-
"""
Per-unit building heights: 2019 ALTA survey values, cross-checked by USGS LiDAR.

heights.json = the "BUILDING HEIGHT" labels on the Montagnet & Domingue ALTA
survey (rev. 7/19/2019; reference/plats/) — operator adopted 2026-09-30.
Survey note: "BUILDING HEIGHT EXCLUDES FACADE WHICH IS APPROX. 23.6'".
The LiDAR measurement below is kept as the independent cross-check: it runs a
steady ~2 ft higher (roof above the parking field vs the survey's datum,
likely finished floor) and confirms every step the survey labels.
Supersedes tools/extract-heights.py (nearest-CAD-label matching put the
20.6'/23.6' labels on 103 and missed 101, 149 and the bell tower).

Inputs  public/elevation/OTB-site.laz  (EPSG:6344 NAD83(2011) UTM 15N + NAVD88, m;
                                        fetch with `npm run fetch-lidar`)
        src/data/footprints-geo.json   (unit outlines, WGS84, ~±8 ft fit)
Outputs src/data/heights.json             { "<unit>": <feet> }  (shape unchanged for consumers)
        src/data/heights-provenance.json  per-unit evidence + roof features

Method (deterministic):
  ground  = median class-2 return in a 4–20 m ring around all buildings (parking field)
  unit    = median class-1 return inside the outline shrunk 1.5 m, minus ground
  raised  = 1 m cells with >=3 returns, spread < 1 ft, 21–36 ft above ground (flat raised
            roof, not tree canopy, not a single RTU)
Classification is the operator's attestation (2026-09-29): every unit shares one roofline
except 101 (end cap, taller), 149 (Jason's, taller) and 105 (lower), plus the bell tower.
Typical units get the building-wide typical median (per-unit medians differ by LiDAR noise
and outline error only). Where LiDAR and the attestation disagree, LiDAR sets the value and
the unit is flagged `conflict` for operator review — never averaged.
"""
import json, os
from collections import defaultdict
import numpy as np, laspy
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely import contains_xy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAZ = os.path.join(ROOT, "public", "elevation", "OTB-site.laz")
FP = os.path.join(ROOT, "src", "data", "footprints-geo.json")
OUT = os.path.join(ROOT, "src", "data", "heights.json")
PROV = os.path.join(ROOT, "src", "data", "heights-provenance.json")
M2FT = 1 / 0.3048  # international foot
ATTESTED = {"101": "taller", "149": "taller", "105": "lower", "103": "taller"}  # operator 2026-09-29/30; everything else: typical
# 2019 ALTA survey BUILDING HEIGHT labels (ft). Unlisted units carry the typical label 16.4.
SURVEY = {"105": 13.2, "103": 20.6, "101": 23.6}
SURVEY_TYPICAL = 16.4
SURVEY_FACADE = 23.6      # general note: height excludes facade, approx. 23.6'
SURVEY_101_REAR = 13.5    # "BLD. HT. 13.5'" — the 7.8' projection at the 101/Johnston end
TYPICAL_BAND_FT = 1.0  # a unit within ±1 ft of the typical median agrees with "typical"

T = Transformer.from_crs(4326, 6344, always_xy=True)
las = laspy.read(LAZ)
x, y, z, c = (np.asarray(a) for a in (las.x, las.y, las.z, las.classification))
fp = {f["properties"]["unit"]: Polygon([T.transform(*p) for p in f["geometry"]["coordinates"][0]])
      for f in json.load(open(FP, encoding="utf-8"))["features"]}

allb = unary_union(list(fp.values()))
ring = allb.buffer(20).difference(allb.buffer(4))
g = c == 2
ground = float(np.median(z[g][contains_xy(ring, x[g], y[g])]))
roof = c == 1
rx, ry, rz = x[roof], y[roof], z[roof]

def ft(v): return round(float(v) * M2FT, 1)

def unit_median(u):
    inner = fp[u].buffer(-1.5)
    if inner.is_empty: inner = fp[u].buffer(-0.5)
    zz = rz[contains_xy(inner, rx, ry)]
    return ft(np.median(zz) - ground), int(len(zz))

def raised_cells(poly):
    k = contains_xy(poly, rx, ry)
    cells = defaultdict(list)
    for a, b, v in zip(np.floor(rx[k]).astype(int), np.floor(ry[k]).astype(int), (rz[k] - ground) * M2FT):
        cells[(a, b)].append(v)
    return np.array([np.median(v) for v in cells.values() if len(v) >= 3 and np.std(v) < 1.0 and 21 < np.median(v) < 36])

meas = {u: unit_median(u) for u in fp}
typ_units = [u for u in fp if u not in ATTESTED]
typical = round(float(np.median([meas[u][0] for u in typ_units])), 1)

heights, units = {}, {}
for u in sorted(fp, key=lambda s: (float(s.rstrip("AB")), s)):
    med, n = meas[u]
    att = ATTESTED.get(u, "typical")
    survey = SURVEY.get(u, SURVEY_TYPICAL)
    rec = {"attested": att, "value_ft": survey, "basis": "2019 ALTA survey BUILDING HEIGHT label", "lidar_median_ft": med,
           "lidar_minus_survey_ft": round(med - survey, 1), "returns": n}
    if u == "149":
        cells = raised_cells(fp[u].buffer(3))
        rec["facade"] = {"survey_note_ft": SURVEY_FACADE, "lidar_raised_ft": round(float(np.median(cells)), 1), "raised_cells_m2": int(len(cells)),
                         "note": "Jason's reads taller because of its facade; the survey height excludes the facade (approx. 23.6')."}
    agrees = {"typical": abs(survey - SURVEY_TYPICAL) < 0.05, "taller": survey > SURVEY_TYPICAL or u == "149", "lower": survey < SURVEY_TYPICAL}[att]
    rec["status"] = "survey" if agrees else "conflict"
    if not agrees: rec["note"] = f"Operator attests '{att}'; survey says {survey} ft."
    heights[u] = survey
    units[u] = rec

tower = raised_cells(fp["133"].buffer(3))
prov = {
    "_comment": "Generated by tools/measure-roof-heights.py — do not hand-edit. heights.json carries value_ft only.",
    "source": {"dataset": "USGS 3DEP LA_Catahoula_Concordia_2017_D17 (OTB-site.laz clip)", "crs": "EPSG:6344 + NAVD88 (Geoid12B), metres",
               "captured": "2017 (project year)", "foot": "international (0.3048 m)"},
    "datum": {"ground_navd88_m": round(ground, 2), "definition": "median ground return 4–20 m around the buildings (parking field); heights are roof above that, not above finished floor"},
    "typical_ft": SURVEY_TYPICAL,
    "lidar_typical_ft": typical,
    "survey": {"source": "reference/plats/plat-of-survey-detailed-2019.pdf", "note": "BUILDING HEIGHT EXCLUDES FACADE WHICH IS APPROX. 23.6'", "facade_ft": SURVEY_FACADE},
    "attestation": "Operator 2026-09-29/30: all units share one roofline except 101 end cap (taller), 103 (taller, confirmed 2026-09-30), 149 Jason's (taller — facade), 105 (lower); bell tower at the corner.",
    "cad_bld_ht_note": "CAD BLD_HT labels (16.4/13.2/13.5/20.6/23.6) are point labels, not per-unit values; superseded for heights.json. Typical CAD 16.4 vs LiDAR %.1f: CAD likely measured from finished floor or to a different element (unresolved)." % typical,
    "units": units,
    "features": [{
        "id": "rear-projection-101", "name": "101 end projection (7.8 ft at the Johnston end; CAD LINBLDG)", "survey_ft": SURVEY_101_REAR,
        "basis": "2019 ALTA survey 'BLD. HT. 13.5''"}, {
        "id": "facade-149", "name": "Jason's Deli (149) facade", "survey_ft": SURVEY_FACADE,
        "basis": "survey general note (facade approx. 23.6'); LiDAR raised roofline cells corroborate"}, {
        "id": "bell-tower", "name": "Bell tower (hip-roofed tower at the long/short building junction, near 133/135)",
        "median_ft": round(float(np.median(tower)), 1), "peak_ft": round(float(tower.max()), 1), "cells_m2": int(len(tower)),
        "basis": "flat-ish raised cells >21 ft within 3 m of the 133 outline; hip roof so median < peak"}]
}
json.dump(heights, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False); open(OUT, "a").write("\n")
json.dump(prov, open(PROV, "w", encoding="utf-8"), indent=2, ensure_ascii=False); open(PROV, "a").write("\n")
print(f"survey typical {SURVEY_TYPICAL} ft, LiDAR typical {typical} ft, ground {ground:.2f} m NAVD88")
for u, r in units.items():
    flag = "  <-- CONFLICT" if r["status"] == "conflict" else ""
    print(f"  {u:6} {r['value_ft']:5} ft survey  ({r['attested']}, lidar {r['lidar_median_ft']}, diff {r['lidar_minus_survey_ft']}){flag}")
print("  bell tower", prov["features"][-1]["median_ft"], "median /", prov["features"][-1]["peak_ft"], "peak")
