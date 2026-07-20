# -*- coding: utf-8 -*-
"""B1 — QR window vinyls for the vacant bays (131 / 133).

Blessed aesthetic: the NAVY/WHITE creative poster X (plat-as-art). Strict OTB
public brand via tools/otb_brand.py: Boulevard Navy + white ONLY, Helvetica,
otb_logo file, required Orange Ocean/Belle attribution line.

Print target: 24"W x 36"H window vinyl (viewBox 960x1440 @ 40 px/in). Static
art only (no SVG animation — this prints).

QR: encodes tel:+13377691554 by default ("scan to call") so the vinyl works
the day it's printed — the tour-page URL depends on the B2 microsite (deferred)
and the canonical-domain decision (operator punch-list). Re-run with
  python tools/vinyl-b1.py --url https://ontheblvd.com/tour
once those land; the caption switches automatically.

Emits marketing/OTB-vinyl-131.svg + OTB-vinyl-133.svg.
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import segno
import otb_brand as OB
from otb_brand import esc, NAVY, OFF, WHT, HELV, ATTRIB
import poster as P  # DXF plan plumbing (importing regenerates A-E; marketing/ is disposable)

W, H = 960, 1440  # 24x36 in @ 40 px/in
OUT = P.OUT

ap = argparse.ArgumentParser()
ap.add_argument("--url", default=None,
                help="QR target URL (tour page). Default: tel: leasing line.")
args = ap.parse_args()
QR_DATA = args.url or "tel:+13377691554"
QR_CAPTION = "SCAN FOR A TOUR" if args.url else "SCAN TO CALL ADAM"

LOGO_WHITE = OB.b64(OB.OTB_LOGO_WHITE)
LOGO_AR = OB.OTB_LOGO_AR

UNITS = {
    "131": dict(sf="1,907", other="133",
                line1="1,907 square feet of storefront, ready for",
                line2="your business — combinable with Suite 133"),
    "133": dict(sf="1,272", other="131",
                line1="1,272 square feet — our coziest storefront,",
                line2="combinable with Suite 131"),
}
COMBINE = "Together: ±3,179 SF, side by side at the Patricia St end."


def plan_tx(frame, zoom=1.0):
    fx, fy, fw, fh = frame
    s = min(fw / (P.maxx - P.minx), fh / (P.maxy - P.miny)) * zoom
    ox = fx + (fw - (P.maxx - P.minx) * s) / 2
    oy = fy + (fh - (P.maxy - P.miny) * s) / 2
    return s, (lambda x: ox + (x - P.minx) * s), (lambda y: oy + (P.maxy - y) * s)


def bay_screen(unit, TX, TY):
    for u, x0, x1, y0, y1, vert in P.BAYS:
        if u == unit:
            return TX(x0), TY(y1), TX(x1) - TX(x0), TY(y0) - TY(y1)
    return None


def qr_svg(o, data, x, y, size):
    """White card, navy modules (dark-on-light keeps it scannable)."""
    qr = segno.make_qr(data, error="m")
    rows = [[bool(b) for b in row] for row in qr.matrix]
    n = len(rows)
    pad = size * 0.09  # quiet zone
    m = (size - 2 * pad) / n
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="14" fill="%s"/>'
             % (x, y, size, size, WHT))
    cells = []
    for r, row in enumerate(rows):
        for c, v in enumerate(row):
            if v:
                cells.append('M%.2f %.2fh%.2fv%.2fh-%.2fz'
                             % (x + pad + c * m, y + pad + r * m, m + 0.05, m + 0.05, m + 0.05))
    o.append('<path d="%s" fill="%s"/>' % ("".join(cells), NAVY))


def vinyl(unit):
    u = UNITS[unit]
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" font-family="%s">' % (W, H, HELV)]
    o.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, NAVY))

    # logo, centered
    lh = 120; lw = lh * LOGO_AR
    o.append('<image x="%.1f" y="72" width="%.1f" height="%.1f" href="%s"/>'
             % ((W - lw) / 2, lw, lh, LOGO_WHITE))

    # headline
    o.append('<text x="72" y="330" font-size="66" font-weight="900" fill="%s" letter-spacing="-1">Your storefront</text>' % OFF)
    o.append('<text x="72" y="402" font-size="66" font-weight="900" fill="%s" letter-spacing="-1">on the Boulevard.</text>' % OFF)
    o.append('<rect x="72" y="432" width="150" height="5" fill="%s"/>' % OFF)

    # suite + facts
    o.append('<text x="72" y="512" font-size="42" font-weight="800" fill="%s">SUITE %s · %s SF</text>'
             % (WHT, esc(unit), u["sf"]))
    o.append('<text x="72" y="560" font-size="21" fill="rgba(245,245,245,.85)">%s</text>' % esc(u["line1"]))
    o.append('<text x="72" y="588" font-size="21" fill="rgba(245,245,245,.85)">%s next door.</text>' % esc(u["line2"]))
    o.append('<text x="72" y="628" font-size="18" fill="rgba(245,245,245,.65)">%s</text>' % esc(COMBINE))
    o.append('<text x="72" y="656" font-size="18" fill="rgba(245,245,245,.65)">33,000 cars a day pass the center on Johnston St.</text>')

    # plat as art — this suite lit
    FR = (52, 700, 856, 430)
    th = dict(ink=OFF, accent=OFF, street="rgba(245,245,245,.45)", tree="rgba(245,245,245,.25)",
              boundary="rgba(245,245,245,.85)", boundary_w=1.0,
              plan_line="rgba(245,245,245,.30)", plan_faint="rgba(245,245,245,.16)",
              bay_edge=OFF, bay_edge_w=1.1, bay_r=0, bay_shadow=False, bayfont=HELV,
              show_north=False, show_scale=False, pylon=False, trees=True,
              bayfill=lambda st, _u=unit: OFF if st == "vacant" else "rgba(245,245,245,.07)",
              baytext=lambda st: NAVY if st == "vacant" else "rgba(245,245,245,.65)")
    P.render_plan(o, FR, th)
    s, TX, TY = plan_tx(FR)
    # dim the OTHER vacant bay so only this suite reads lit
    ox_, oy_, ow_, oh_ = bay_screen(u["other"], TX, TY)
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" opacity="0.78"/>'
             % (ox_, oy_, ow_, oh_, NAVY))
    bx, by, bw, bh = bay_screen(unit, TX, TY)
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="2.4"/>'
             % (bx - 6, by - 6, bw + 12, bh + 12, WHT))
    # "you are here" leader from the lit bay
    lx = bx + bw / 2
    o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1.6"/>'
             % (lx, by - 6, lx, FR[1] - 8, OFF))
    o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-size="17" font-weight="700" fill="%s" letter-spacing="2">THIS ONE IS YOURS</text>'
             % (lx, FR[1] - 16, WHT))

    # QR + call block
    QS = 200
    qx, qy = W - 72 - QS, 1112
    qr_svg(o, QR_DATA, qx, qy, QS)
    o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-size="16" font-weight="800" fill="%s" letter-spacing="2">%s</text>'
             % (qx + QS / 2, qy + QS + 34, WHT, QR_CAPTION))
    o.append('<text x="72" y="1218" font-size="30" font-weight="800" fill="%s">Let’s talk about this space.</text>' % WHT)
    o.append('<text x="72" y="1266" font-size="26" font-weight="700" fill="%s">337-769-1554</text>' % OFF)
    o.append('<text x="72" y="1302" font-size="19" fill="rgba(245,245,245,.85)">info@ontheblvd.com · ontheblvd.com</text>')
    o.append('<text x="72" y="1330" font-size="19" fill="rgba(245,245,245,.85)">Adam Abdalla, Property Manager</text>')

    # footer
    o.append('<line x1="72" y1="1372" x2="%d" y2="1372" stroke="rgba(245,245,245,.35)"/>' % (W - 72))
    o.append('<text x="%.1f" y="1402" text-anchor="middle" font-size="13" fill="rgba(245,245,245,.6)">101–149 Arnould Blvd at Johnston St (US Hwy 167) · Lafayette, Louisiana</text>' % (W / 2))
    o.append('<text x="%.1f" y="1424" text-anchor="middle" font-size="11.5" fill="rgba(245,245,245,.5)">%s</text>' % (W / 2, esc(ATTRIB)))

    o.append("</svg>")
    name = "OTB-vinyl-%s.svg" % unit
    open(os.path.join(OUT, name), "w", encoding="utf-8").write("\n".join(o))
    return name


names = [vinyl("131"), vinyl("133")]
print("OK ->", " | ".join(names), "· QR:", QR_DATA)
