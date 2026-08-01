# -*- coding: utf-8 -*-
"""c3-overlay.py â€” render candidate stall quads over a camera frame for visual
zone authoring (companion to c3-stalls.py; same quad convention TL,TR,BR,BL in
NATIVE px). Reads quads from a scratch JSON (or docs/c3-stall-zones.json with
--zones) and writes export/_c3_overlay_<cam>.jpg.

  python tools/c3-overlay.py <camera> <candidates.json>
  python tools/c3-overlay.py <camera> --zones     # render the committed zones
"""
import json, os, sys, glob
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURE = r"E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\OTB-cube-capture"

def latest_frame(cam):
    days = sorted(glob.glob(os.path.join(CAPTURE, "20??-??-??")))
    for day in reversed(days):
        fs = sorted(glob.glob(os.path.join(day, f"{cam}-*.jpg")))
        if fs:
            return fs[-1]
    sys.exit(f"no frames for {cam}")

cam = sys.argv[1]
src = sys.argv[2]
if src == "--zones":
    stalls = json.load(open(os.path.join(ROOT, "docs", "c3-stall-zones.json"), encoding="utf-8"))["cameras"][cam]
else:
    stalls = json.load(open(src, encoding="utf-8"))
    if isinstance(stalls, dict):
        stalls = stalls.get(cam, stalls.get("stalls", []))

im = Image.open(latest_frame(cam)).convert("RGB")
d = ImageDraw.Draw(im)
COLORS = [(255, 80, 80), (80, 255, 120), (90, 160, 255), (255, 200, 60), (255, 110, 255), (110, 255, 255)]
for i, s in enumerate(stalls):
    q = s["quad"]
    c = COLORS[i % len(COLORS)]
    d.polygon([tuple(p) for p in q], outline=c, width=6)
    cx = sum(p[0] for p in q) // 4
    cy = sum(p[1] for p in q) // 4
    d.text((cx - 30, cy - 10), s["id"], fill=c)
out = os.path.join(ROOT, "export", f"_c3_overlay_{cam}.jpg")
im.save(out, quality=85)
print("wrote", out)
