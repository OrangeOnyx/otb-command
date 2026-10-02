# Tenant logo thumbnails: tools/brand-assets/tenant-logos/* -> public/tenant-logos/<unit>.png
# + src/data/logo-thumbs.json manifest (units that have a thumb).
# Re-run after adding/replacing a vendored logo:  npm run logo-thumbs
import json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "tools" / "brand-assets" / "tenant-logos"
OUT = ROOT / "public" / "tenant-logos"
MANIFEST = ROOT / "src" / "data" / "logo-thumbs.json"
MAX_W, MAX_H = 320, 160  # 2x the largest on-screen render (drawer header)
SIGN = OUT / "sign"
SIGN_W, SIGN_H = 768, 288  # storefront fascia texture (A-8)

OUT.mkdir(parents=True, exist_ok=True)
SIGN.mkdir(parents=True, exist_ok=True)
units = []
for f in sorted(SRC.iterdir()):
    if f.suffix.lower() not in (".png", ".webp", ".jpg", ".jpeg"):
        continue
    unit = f.stem
    im = Image.open(f)
    im = im.convert("RGBA") if im.mode not in ("RGB", "RGBA") else im
    im.thumbnail((MAX_W, MAX_H), Image.LANCZOS)
    dest = OUT / (unit + ".png")
    im.save(dest, "PNG", optimize=True)
    # Sign-size copy for the A-8 Styled Twin storefront fascias (2026-10-01).
    big = Image.open(f)
    big = big.convert("RGBA") if big.mode not in ("RGB", "RGBA") else big
    big.thumbnail((SIGN_W, SIGN_H), Image.LANCZOS)
    big.save(SIGN / (unit + ".webp"), "WEBP", quality=88, method=6)
    units.append(unit)
    print(f"{unit}: {f.name} -> {dest.name} {im.size} {dest.stat().st_size//1024}KB")

MANIFEST.write_text(json.dumps(units, indent=1) + "\n")
print(f"\n{len(units)} thumbs -> {OUT}\nmanifest -> {MANIFEST}")
