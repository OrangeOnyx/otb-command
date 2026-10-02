# A-8 pylon face (2026-10-02, operator: "the actual signs on the pylon sign, lit from dusk to dawn").
# Composites the approved blank master (reference/pylon/otb-pylon-final-v2, 1023x1537, 45.1 px/ft:
# Panel 2 = 361 px = 8 ft) with each panel's tenant logo per src/data/pylon.json — the panel that
# physically reads something else (P13 "Boulevard Nutrition") shows what is installed.
# Writes public/pylon/otb-pylon-face.webp (the sign) and otb-pylon-glow.webp (lit areas: the 14
# panels + the "On The Boulevard" letters) for the night emissive map.   python tools/build-pylon-face.py
import json, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
REF = ROOT / "reference/pylon/otb-pylon-final-v2"
LOGOS = ROOT / "tools/brand-assets/tenant-logos"
OUT = ROOT / "public/pylon"; OUT.mkdir(parents=True, exist_ok=True)
K = 2  # work at 2x for crisp logos

layout = json.loads((REF / "OTB_Pylon_Final_v2_panel_layout.json").read_text())["panel_coordinates_px"]
panels = {p["panel"]: p for p in json.loads((ROOT / "src/data/pylon.json").read_text())["panels"]}
base = Image.open(REF / "OTB_Pylon_Final_v2_transparent_2x.png").convert("RGBA")
face = base.copy(); d = ImageDraw.Draw(face)
glow = Image.new("L", base.size, 0); gd = ImageDraw.Draw(glow)

def font(size, serif=True, italic=False):
    name = ("LiberationSerif-Italic.ttf" if italic else "DejaVuSerif-Bold.ttf") if serif else "DejaVuSans-Bold.ttf"
    for p in pathlib.Path("/usr/share/fonts").rglob(name):
        return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

def logo_for(unit):
    for ext in (".png", ".webp", ".jpg"):
        f = LOGOS / (unit + ext)
        if f.exists():
            src = Image.open(f); flat = src.mode not in ("RGBA", "LA", "P")
            im = src.convert("RGBA")
            if flat:  # opaque files (some carry a baked checkerboard): light, unsaturated pixels -> transparent
                px = im.load()
                for yy in range(im.height):
                    for xx in range(im.width):
                        r, g, b, a = px[xx, yy]
                        if min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 14: px[xx, yy] = (r, g, b, 0)
            # trim empty margins: transparent or near-white border
            mask = Image.eval(im.split()[3], lambda v: 255 if v > 24 else 0)
            light = Image.eval(im.convert("L"), lambda v: 0 if v > 246 else 255)
            box = Image.composite(light, Image.new("L", im.size, 0), mask).getbbox()
            return im.crop(box) if box else im
    return None

def fit(im, w, h, pad):
    im = im.copy(); im.thumbnail((int(w * (1 - pad)), int(h * (1 - pad))), Image.LANCZOS)
    if im.width < w * (1 - pad) * 0.6 and im.height < h * (1 - pad) * 0.6:  # upscale small logos
        s = min(w * (1 - pad) / im.width, h * (1 - pad) / im.height)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im

for slot in layout:
    pid = "P" + str(slot["id"]); p = panels.get(pid, {})
    x, y, w, h = (slot[k] * K for k in ("x", "y", "w", "h"))
    d.rectangle([x, y, x + w, y + h], fill=(252, 251, 247, 255))
    gd.rectangle([x, y, x + w, y + h], fill=255)
    reads = p.get("physicalReads") or p.get("physicalRead")
    if reads:  # what the installed panel actually says (e.g. P13)
        name = reads if isinstance(reads, str) else str(reads)
        f1 = font(int(h * 0.36), italic=True); tw = d.textlength(name.split()[0], font=f1)
        d.text((x + w / 2, y + h * 0.42), name.split()[0], font=f1, fill=(31, 77, 52), anchor="mm")
        if len(name.split()) > 1:
            d.text((x + w / 2, y + h * 0.78), " ".join(name.split()[1:]).upper(), font=font(int(h * 0.16), serif=False), fill=(31, 77, 52), anchor="mm")
        continue
    lg = logo_for(str(p.get("unit", "")))
    if lg is None: continue
    if pid == "P1":  # Great American Cookies & Hershey's Ice Cream
        im = fit(lg, w * 0.6, h, 0.12); face.alpha_composite(im, (int(x + w * 0.03 + (w * 0.6 - im.width) / 2), int(y + (h - im.height) / 2)))
        d.text((x + w * 0.685, y + h / 2), "&", font=font(int(h * 0.42)), fill=(196, 30, 36), anchor="mm")
        d.ellipse([x + w * 0.76, y + h * 0.2, x + w * 0.97, y + h * 0.8], outline=(120, 70, 50), width=4)
        d.text((x + w * 0.865, y + h * 0.42), "HERSHEY'S", font=font(int(h * 0.12), serif=False), fill=(70, 40, 30), anchor="mm")
        d.text((x + w * 0.865, y + h * 0.6), "Ice Cream", font=font(int(h * 0.13), italic=True), fill=(70, 40, 30), anchor="mm")
        continue
    im = fit(lg, w, h, 0.14)
    face.alpha_composite(im, (int(x + (w - im.width) / 2), int(y + (h - im.height) / 2)))

# Lit header letters: the near-white extruded "ON THE BOULEVARD" letters in the cap band.
hx0, hy0, hx1, hy1 = 200 * K, 185 * K, 830 * K, 340 * K
px = base.load(); gp = glow.load()
for yy in range(hy0, hy1):
    for xx in range(hx0, hx1):
        r, g, b, a = px[xx, yy]
        if a > 200 and r > 238 and g > 236 and b > 230: gp[xx, yy] = 255

face.save(OUT / "otb-pylon-face.webp", "WEBP", quality=88, method=6)
# Emissive map = the sign's own colors where it is lit (internally lit panels keep their logo colors).
lit = Image.composite(face.convert("RGB"), Image.new("RGB", face.size, (0, 0, 0)), glow)
lit.save(OUT / "otb-pylon-glow.webp", "WEBP", quality=82, method=6)
print("face", face.size, (OUT / "otb-pylon-face.webp").stat().st_size // 1024, "KB; glow", (OUT / "otb-pylon-glow.webp").stat().st_size // 1024, "KB")
