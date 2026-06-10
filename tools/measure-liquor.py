# One-off raster measurement for the liquor-line trace (REV 8 prep).
# Scans 200-dpi strips of the recorded plat for heavy horizontal features
# and reports row positions (page px, 6.6667 px/ft at 1"=30' scale).
from PIL import Image
import sys

def rows(path, x0_page, y0_page, xa, xb, label):
    im = Image.open(path).convert("L")
    w, h = im.size
    px = im.load()
    print(f"--- {label} ({path.split(chr(92))[-1]}, {w}x{h}, page x{x0_page}+ y{y0_page}+) cols {xa}-{xb}")
    runs = []
    prev = False
    for y in range(h):
        dark = sum(1 for x in range(xa, min(xb, w)) if px[x, y] < 110)
        on = dark > (xb - xa) * 0.30
        if on and not prev:
            start = y
        if prev and not on:
            runs.append((start, y - 1))
        prev = on
    for s, e in runs:
        thick = e - s + 1
        print(f"  rows {s}-{e} (page y {y0_page+s}-{y0_page+e}) thick {thick}px")

# strip x2300: heavy vertical tract line at strip x~185-200; scan horizontal features
# across the open field portion left of it (x 20-160) AND right portion
rows(r"C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command\reference\hunt-strip-x2300-1.png", 2300, 600, 20, 160, "x2300 cols 20-160")
rows(r"C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command\reference\hunt-strip-x4900-1.png", 4900, 600, 20, 160, "x4900 cols 20-160")
