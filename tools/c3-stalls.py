# -*- coding: utf-8 -*-
"""
C3-A parking occupancy — stall crops + VLM classification (operator picks: 1 + A).

Pipeline: the C3 sampler banks frames (300s x 17 cams) in the capture dir
OUTSIDE the repo. This tool reads docs/c3-stall-zones.json (per-camera stall
quadrilaterals over the storefront head-on row), perspective-crops each stall,
and classifies crops occupied/empty with Claude Haiku (operator's classifier
pick; one request per FRAME with all stalls labeled — not per stall).

Usage:
  python tools/c3-stalls.py --grid suite-105-parking     # gridded frame for zone authoring
  python tools/c3-stalls.py --montage                    # crop latest frames -> export/c3-montage.jpg (visual check)
  python tools/c3-stalls.py --classify --date 2026-07-21 [--every 12] [--limit 5]
                                                         # classify banked frames -> occupancy JSONL

Classification needs ANTHROPIC_API_KEY in the environment (the app's key lives
ONLY in Vercel env — export a key locally to run; never commit or paste keys).
Results append to <capture>/occupancy/<date>.jsonl (outside the repo, like the
frames). Idempotent: a (frame, stall) already in the JSONL is skipped.
"""
import argparse, base64, io, json, os, re, sys, glob

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURE = r"C:\Users\adam\Downloads\Drone Footage RAW\OTB-cube-capture"
ZONES_PATH = os.path.join(ROOT, "docs", "c3-stall-zones.json")
CROP_W, CROP_H = 320, 320

def load_zones():
    return json.load(open(ZONES_PATH, encoding="utf-8"))["cameras"]

def frames_for(cam, date=None):
    d = os.path.join(CAPTURE, date) if date else CAPTURE
    if date:
        return sorted(glob.glob(os.path.join(d, f"{cam}-*.jpg")))
    # latest frame across day dirs
    days = sorted(glob.glob(os.path.join(CAPTURE, "20??-??-??")))
    for day in reversed(days):
        fs = sorted(glob.glob(os.path.join(day, f"{cam}-*.jpg")))
        if fs:
            return [fs[-1]]
    return []

def crop_stall(im, quad):
    # PIL QUAD transform maps the source quadrilateral onto the output rect.
    # PIL's quad order is NW, SW, SE, NE (counter-clockwise from top-left);
    # config stores TL, TR, BR, BL — reorder here.
    tl, tr, br, bl = quad
    return im.transform((CROP_W, CROP_H), Image.QUAD,
                        (tl[0], tl[1], bl[0], bl[1], br[0], br[1], tr[0], tr[1]),
                        resample=Image.BILINEAR)

def cmd_grid(cam):
    fs = frames_for(cam)
    if not fs:
        sys.exit(f"no frames for {cam}")
    im = Image.open(fs[0]).convert("RGB")
    d = ImageDraw.Draw(im)
    w, h = im.size
    for x in range(0, w, 100):
        d.line([(x, 0), (x, h)], fill=(255, 255, 0), width=1); d.text((x + 2, 2), str(x), fill=(255, 255, 0))
    for y in range(0, h, 100):
        d.line([(0, y), (w, y)], fill=(255, 255, 0), width=1); d.text((2, y + 2), str(y), fill=(255, 255, 0))
    out = os.path.join(ROOT, "export", f"_c3_grid_{cam}.jpg")
    im.save(out, quality=85)
    print("wrote", out, "from", os.path.basename(fs[0]))

def cmd_montage():
    zones = load_zones()
    tiles = []
    for cam, stalls in zones.items():
        fs = frames_for(cam)
        if not fs:
            print(f"skip {cam}: no frames"); continue
        im = Image.open(fs[0]).convert("RGB")
        for s in stalls:
            tiles.append((s["id"], crop_stall(im, s["quad"])))
    if not tiles:
        sys.exit("no zones configured")
    cols = min(6, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    M = Image.new("RGB", (cols * CROP_W, rows * (CROP_H + 20)), (12, 12, 12))
    d = ImageDraw.Draw(M)
    for i, (sid, t) in enumerate(tiles):
        x, y = (i % cols) * CROP_W, (i // cols) * (CROP_H + 20)
        M.paste(t, (x, y + 20)); d.text((x + 4, y + 4), sid, fill=(255, 255, 120))
    out = os.path.join(ROOT, "export", "c3-montage.jpg")
    M.save(out, quality=85)
    print("wrote", out, f"({len(tiles)} stall crops)")

def classify_frame(client, cam, path, stalls):
    """One Haiku request per frame: all stall crops labeled, JSON verdict back."""
    im = Image.open(path).convert("RGB")
    content = []
    for s in stalls:
        buf = io.BytesIO()
        crop_stall(im, s["quad"]).save(buf, format="JPEG", quality=80)
        content.append({"type": "text", "text": f"Stall {s['id']}:"})
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                        "data": base64.standard_b64encode(buf.getvalue()).decode()}})
    content.append({"type": "text", "text":
        "Each image above is one parking stall viewed from a storefront camera. "
        "Classify each stall as occupied (a vehicle is parked in it), empty, or "
        "unclear (too dark/blocked to tell). A vehicle merely passing or partly "
        "entering an adjacent stall does not count."})
    schema = {
        "type": "object",
        "properties": {"stalls": {"type": "array", "items": {
            "type": "object",
            "properties": {"id": {"type": "string"},
                           "state": {"type": "string", "enum": ["occupied", "empty", "unclear"]}},
            "required": ["id", "state"], "additionalProperties": False}}},
        "required": ["stalls"], "additionalProperties": False}
    resp = client.messages.create(
        model="claude-haiku-4-5",  # operator's classifier pick (1): Haiku spot-checks
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    text = next(b.text for b in resp.content if b.type == "text")
    return {s["id"]: s["state"] for s in json.loads(text)["stalls"]}

def cmd_classify(date, every, limit):
    import anthropic
    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY from env
    zones = load_zones()
    outdir = os.path.join(CAPTURE, "occupancy")
    os.makedirs(outdir, exist_ok=True)
    outpath = os.path.join(outdir, f"{date}.jsonl")
    done = set()
    if os.path.exists(outpath):
        for line in open(outpath, encoding="utf-8"):
            try:
                r = json.loads(line); done.add((r["frame"], r["stall"]))
            except Exception:
                pass
    n_req = 0
    with open(outpath, "a", encoding="utf-8") as out:
        for cam, stalls in zones.items():
            fs = frames_for(cam, date)[::max(1, every)]
            if limit:
                fs = fs[:limit]
            for path in fs:
                frame = os.path.basename(path)
                todo = [s for s in stalls if (frame, s["id"]) not in done]
                if not todo:
                    continue
                m = re.search(r"(\d{8})-(\d{6})", frame)
                ts = f"{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:]}T{m.group(2)[:2]}:{m.group(2)[2:4]}:{m.group(2)[4:]}" if m else ""
                try:
                    verdicts = classify_frame(client, cam, path, todo)
                except Exception as e:
                    print(f"FAIL {frame}: {e}"); continue
                n_req += 1
                for s in todo:
                    rec = {"frame": frame, "camera": cam, "stall": s["id"],
                           "ts": ts, "state": verdicts.get(s["id"], "unclear")}
                    out.write(json.dumps(rec) + "\n")
                print(frame, "→", {s["id"]: verdicts.get(s["id"]) for s in todo})
    print(f"done: {n_req} Haiku requests → {outpath}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", metavar="CAMERA")
    ap.add_argument("--montage", action="store_true")
    ap.add_argument("--classify", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--every", type=int, default=12, help="use every Nth frame (12 ≈ hourly at 300s cadence)")
    ap.add_argument("--limit", type=int, default=0, help="max frames per camera (0 = all)")
    a = ap.parse_args()
    if a.grid: cmd_grid(a.grid)
    elif a.montage: cmd_montage()
    elif a.classify:
        if not a.date: sys.exit("--classify needs --date YYYY-MM-DD")
        cmd_classify(a.date, a.every, a.limit)
    else:
        ap.print_help()
