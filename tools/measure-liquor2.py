# Pass 2 — find heavy-dash blobs (the liquor line) and report centers in page px.
from PIL import Image
from collections import deque

def blobs(path, x0, y0, min_area=140, min_thick=7):
    im = Image.open(path).convert("L")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    out = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y] >= 110:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny] < 110:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(pts) < min_area:
                continue
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            bw, bh = max(xs)-min(xs)+1, max(ys)-min(ys)+1
            # dash: thick stroke, compact; reject long thin walls/text rows
            thick = min(bw, bh)
            if thick < min_thick or thick > 30 or max(bw, bh) > 90:
                continue
            fill = len(pts) / (bw * bh)
            if fill < 0.55:
                continue
            out.append((x0 + sum(xs)/len(xs), y0 + sum(ys)/len(ys), bw, bh, len(pts)))
    return sorted(out)

for name, x0, y0 in [("hunt-diag-west-1.png", 600, 1750), ("hunt-diag-east-1.png", 5400, 1700)]:
    print("---", name)
    for cx, cy, bw, bh, a in blobs(rf"C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command\reference\{name}", x0, y0):
        print(f"  page ({cx:7.1f},{cy:7.1f})  {bw}x{bh} area {a}")

# straight-run band: report dark column runs at the line's rows
im = Image.open(r"C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command\reference\hunt-run-band-1.png").convert("L")
w, h = im.size
px = im.load()
runs = []
prev = False
for x in range(w):
    dark = sum(1 for y in range(h) if px[x, y] < 110)
    on = dark >= 10  # full-thickness dash rows present
    if on and not prev: start = x
    if prev and not on: runs.append((start + 1000, x - 1 + 1000))
    prev = on
print("--- run-band dashes (page x ranges):")
print(" ".join(f"{a}-{b}" for a, b in runs))
