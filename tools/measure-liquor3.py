# Pass 3 — relaxed blob filter; fit the west + east diagonal tails.
from PIL import Image
from collections import deque

def blobs(path, x0, y0):
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
            if len(pts) < 150:
                continue
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            bw, bh = max(xs)-min(xs)+1, max(ys)-min(ys)+1
            if min(bw, bh) < 6 or max(bw, bh) > 110:
                continue
            fill = len(pts) / (bw * bh)
            if fill < 0.22:
                continue
            out.append((x0 + sum(xs)/len(xs), y0 + sum(ys)/len(ys), bw, bh, len(pts), round(fill, 2)))
    return sorted(out)

def fit(pts):
    n = len(pts)
    sx = sum(p[0] for p in pts); sy = sum(p[1] for p in pts)
    sxx = sum(p[0]*p[0] for p in pts); sxy = sum(p[0]*p[1] for p in pts)
    m = (n*sxy - sx*sy) / (n*sxx - sx*sx)
    b = (sy - m*sx) / n
    return m, b

for name, x0, y0 in [("hunt-diag-west-1.png", 600, 1750), ("hunt-diag-east-1.png", 5400, 1700)]:
    print("---", name)
    all_b = blobs(rf"C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command\reference\{name}", x0, y0)
    tail = []
    for cx, cy, bw, bh, a, f in all_b:
        kind = "run " if abs(cy - 1845) < 12 and bh <= 20 else "tail"
        if kind == "tail":
            tail.append((cx, cy))
        print(f"  {kind} page ({cx:7.1f},{cy:7.1f})  {bw}x{bh} area {a} fill {f}")
    if len(tail) >= 3:
        m, b = fit(tail)
        import math
        print(f"  tail fit: y = {m:.4f}x + {b:.1f}  angle {math.degrees(math.atan(m)):.1f} deg below horiz")
        for X in (740, 1085, 1535, 5670, 6160, 6400):
            print(f"    at x={X}: y={m*X+b:.0f}")
