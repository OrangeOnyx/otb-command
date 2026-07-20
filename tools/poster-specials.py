# -*- coding: utf-8 -*-
"""
OTB special-purpose posters — three one-offs on top of poster.py's plumbing.
  F  OTB-poster-F-twobays.svg    plan-room brand, 131/133 availability-first
  T  OO-twin-showcase.svg        Orange Ocean B2B: digital-twin + camera coverage
  X  OTB-poster-X-boulevard.svg  creative: strict OTB navy/white, plat-as-art
Run: python tools/poster-specials.py   (poster.py import regenerates A–E too;
marketing/ is disposable). Brand sources: ~/.claude/skills/abdalla-brand-system.
"""
import os, sys, json, math, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import poster as P  # reuses DXF parse, units, BAYS, render_plan, save, W/H

W, H = P.W, P.H
g = P.g
ROOT = P.ROOT

# ---- Orange Ocean brand: single source = tools/otb_brand.py ----
import otb_brand as OB
from otb_brand import ONAVY, ODEEP, ORANGE, OMID, OLIGHT, HELV
OO_LOGO_DARK = OB.b64(OB.OO_LOGO_DARK)
from PIL import Image
_oo = Image.open(OB.OO_LOGO_DARK)
OO_AR = _oo.width / _oo.height

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

# ================================================= F — TWO BAYS (plan-room)
def variant_F():
    INK, PAPER, CARD, BRASS, SAGE, GRN, ANCH, BRICK = P.INK, P.PAPER, P.CARD, P.BRASS, P.SAGE, P.GRN, P.ANCH, P.BRICK
    th = dict(ink=INK, accent=BRASS, street=SAGE, tree=GRN,
              boundary=INK, boundary_w=1.0, plan_line=SAGE, plan_faint="#cdd2c2",
              bay_edge=PAPER, bay_edge_w=1.2, bay_r=0, bay_shadow=True,
              bayfont="'Big Shoulders Display',sans-serif",
              show_north=True, show_scale=True, pylon=True,
              bayfill=lambda st: BRICK if st == "vacant" else (ANCH if st == "anchor" else (SAGE if st == "owner" else GRN)),
              baytext=lambda st: "#fff")
    o = P.new_svg(PAPER)
    FR = (40, 210, 1020, 830)
    o.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s" stroke="#CDD2C2"/>' % (FR[0], FR[1], FR[2], FR[3], CARD))
    P.render_plan(o, FR, th)
    s, TX, TY = plan_tx(FR)
    # brass halo around the combinable pair
    b131 = bay_screen("131", TX, TY); b133 = bay_screen("133", TX, TY)
    x0 = min(b131[0], b133[0]) - 8; y0 = min(b131[1], b133[1]) - 8
    x1 = max(b131[0] + b131[2], b133[0] + b133[2]) + 8; y1 = max(b131[1] + b131[3], b133[1] + b133[3]) + 8
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 + 14, (y1 - y0) / 2 + 14
    o.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="%s" stroke-width="3" stroke-dasharray="10 6"/>' % (cx, cy, rx, ry, BRASS))
    o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2"/>' % (cx + rx, cy, 1120, cy, BRASS))
    o.append('<circle cx="1120" cy="%.1f" r="4" fill="%s"/>' % (cy, BRASS))
    # header
    o.append('<rect x="0" y="0" width="%d" height="176" fill="%s"/><rect x="0" y="173" width="%d" height="3" fill="%s"/>' % (W, INK, W, BRASS))
    P.logo(o, 40, 30, 116, white=True)
    o.append('<text x="%d" y="92" text-anchor="end" font-family="\'Big Shoulders Display\',sans-serif" font-size="86" font-weight="900" fill="#C9A55C" letter-spacing="4">TWO BAYS LEFT</text>' % (W - 40))
    o.append('<text x="%d" y="134" text-anchor="end" font-family="\'IBM Plex Mono\',monospace" font-size="15" fill="rgba(237,239,232,.75)">95%% LEASED · 101–149 ARNOULD BLVD AT JOHNSTON ST (US HWY 167) · LAFAYETTE, LA</text>' % (W - 40))
    # right panel — the two suites, huge
    PX, PW = 1100, 540
    y = 262
    for u in P.VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="150" fill="#F4E1D7" stroke="%s" stroke-width="2"/>' % (PX, y, PW, P.BRICK))
        o.append('<text x="%d" y="%d" font-family="\'Big Shoulders Display\',sans-serif" font-size="56" font-weight="800" fill="%s">SUITE %s</text>' % (PX + 24, y + 62, P.BRICK, u["unit"]))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Big Shoulders Display\',sans-serif" font-size="52" font-weight="700" fill="%s">%s SF</text>' % (PX + PW - 24, y + 62, P.INK, format(u["sf"], ",")))
        o.append('<text x="%d" y="%d" font-family="\'Public Sans\',sans-serif" font-size="17" fill="#5F4030">%s</text>' % (PX + 24, y + 100, P.esc(u["use"])))
        o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="13" fill="%s">Storefront on the main field · signage on the bay</text>' % (PX + 24, y + 128, P.SAGE))
        y += 174
    o.append('<rect x="%d" y="%d" width="%d" height="86" fill="%s"/>' % (PX, y, PW, P.INK))
    o.append('<text x="%d" y="%d" font-family="\'Big Shoulders Display\',sans-serif" font-size="34" font-weight="800" fill="#C9A55C">COMBINE THEM: ±3,179 SF</text>' % (PX + 24, y + 40))
    o.append('<text x="%d" y="%d" font-family="\'Public Sans\',sans-serif" font-size="14" fill="#EDEFE8">Contiguous corner presence at the Patricia St end — one wall out.</text>' % (PX + 24, y + 66))
    y += 116
    for k, v in [("Center", "62,883 SF · 27 suites · 95% leased"),
                 ("Anchor", "Jason's Deli (Suite 149)"),
                 ("Traffic", "33,000+ vehicles per day on Johnston"),
                 ("Parking", "324 stalls"),
                 ("Neighbors", "HotWorx · Victoria Nails · The Tux Shoppe · OUPAC")]:
        o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="14" fill="%s">%s</text>' % (PX, y, P.SAGE, k))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Public Sans\',sans-serif" font-size="14" font-weight="600" fill="%s">%s</text>' % (PX + PW, y, P.INK, P.esc(v)))
        o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#DADDD0"/>' % (PX, y + 9, PX + PW, y + 9))
        y += 32
    # footer
    fy = H - 74
    o.append('<rect x="0" y="%d" width="%d" height="74" fill="%s"/>' % (fy, W, P.INK))
    P.logo(o, 40, fy + 15, 44, white=True)
    o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="16" font-weight="600" fill="#fff">P 337-769-1554 · info@ontheblvd.com · ontheblvd.com</text>' % (360, fy + 34))
    o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="11" fill="#9aa694">%s</text>' % (360, fy + 56, P.ATTRIB))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Big Shoulders Display\',sans-serif" font-size="26" font-weight="800" fill="#C9A55C">TOUR THIS WEEK — CALL ADAM</text>' % (W - 40, fy + 44))
    return P.save(o, "OTB-poster-F-twobays.svg")

# ============================================ T — DIGITAL-TWIN SHOWCASE (OO B2B)
def variant_T():
    cams = json.load(open(os.path.join(ROOT, "src", "data", "cameras.json"), encoding="utf-8"))["cameras"]
    o = P.new_svg(ODEEP)
    # header
    ow = 64 * OO_AR
    o.append('<image x="48" y="34" width="%.0f" height="64" href="%s"/>' % (ow, OO_LOGO_DARK))
    o.append('<text x="%d" y="66" text-anchor="end" font-family="%s" font-size="40" font-weight="800" fill="#FFFFFF" letter-spacing="2">THE INSTRUMENTED ASSET</text>' % (W - 48, HELV))
    o.append('<text x="%d" y="96" text-anchor="end" font-family="%s" font-size="15" fill="%s">ON THE BOULEVARD SHOPPING CENTER · LAFAYETTE, LA · OPERATED ON A LIVE DIGITAL TWIN</text>' % (W - 48, HELV, OMID))
    o.append('<rect x="0" y="118" width="%d" height="3" fill="%s"/>' % (W, ORANGE))
    # left: A-1 schematic (geometry.json px space) + camera cones.
    # Base layer carries full-site prims with negative y — clip to the panel.
    FX, FY, FW, FH = 48, 170, 980, 656
    o.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s" rx="6"/>' % (FX, FY, FW, FH, ONAVY))
    o.append('<defs><clipPath id="mapclip"><rect x="%d" y="%d" width="%d" height="%d" rx="6"/></clipPath></defs>' % (FX, FY, FW, FH))
    o.append('<g clip-path="url(#mapclip)">')
    sc = min(FW / 1480.0, FH / 990.0)
    ox = FX + (FW - 1480 * sc) / 2; oy = FY + (FH - 990 * sc) / 2
    X = lambda x: ox + x * sc; Y = lambda y: oy + y * sc
    for prim in g["layers"]["base"]:
        if prim["t"] == "rect":
            o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#24365c" />' % (X(prim["x"]), Y(prim["y"]), prim["w"] * sc, prim["h"] * sc))
        elif prim["t"] == "line":
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#3a5080" stroke-width="0.7"/>' % (X(prim["x1"]), Y(prim["y1"]), X(prim["x2"]), Y(prim["y2"])))
        elif prim["t"] == "path" and "d" not in prim.get("attrs", {}):
            pass
    for prim in g["layers"]["parking"]:
        if prim["t"] == "line":
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#31456f" stroke-width="0.6"/>' % (X(prim["x1"]), Y(prim["y1"]), X(prim["x2"]), Y(prim["y2"])))
    for unit, r in g["units"].items():
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#0D1E38" stroke="%s" stroke-width="0.9"/>' % (X(r["x"]), Y(r["y"]), r["w"] * sc, r["h"] * sc, OMID))
    # camera cones (sunset orange)
    for c in cams:
        if not c.get("pos"): continue
        x, y = X(c["pos"]["x"]), Y(c["pos"]["y"])
        r = (c.get("rangePx") or 150) * sc
        fov = c.get("fovDeg") or 100
        a0 = math.radians(c["aimDeg"] - fov / 2); a1 = math.radians(c["aimDeg"] + fov / 2)
        pts = ["%.1f %.1f" % (x + r * math.cos(a0 + (a1 - a0) * i / 10), y + r * math.sin(a0 + (a1 - a0) * i / 10)) for i in range(11)]
        o.append('<path d="M%.1f %.1f L%s Z" fill="%s" fill-opacity="0.14" stroke="%s" stroke-opacity="0.55" stroke-width="0.7"/>' % (x, y, " L".join(pts), ORANGE, ORANGE))
        o.append('<circle cx="%.1f" cy="%.1f" r="3.4" fill="%s"/>' % (x, y, ORANGE))
    o.append('</g>')
    o.append('<text x="%d" y="%d" font-family="%s" font-size="13" font-weight="700" fill="%s" letter-spacing="2">SITE COMMAND · 17 REGISTERED CAMERAS · LIVE VIEW CONES</text>' % (FX + 18, FY + FH + 34, HELV, ORANGE))
    o.append('<text x="%d" y="%d" font-family="%s" font-size="12" fill="%s">Plan-registered coverage from the property\'s own NVR — the same geometry that drives the leasing plan, the 3D twin, and the AI desk.</text>' % (FX + 18, FY + FH + 58, HELV, OMID))
    # right: capability stack
    PX, PW = 1068, 564
    y = 176
    o.append('<text x="%d" y="%d" font-family="%s" font-size="20" font-weight="800" fill="#FFFFFF" letter-spacing="1">ONE COMMAND SURFACE</text>' % (PX, y, HELV))
    o.append('<rect x="%d" y="%d" width="%d" height="2" fill="%s"/>' % (PX, y + 10, PW, ORANGE)); y += 40
    caps = [
        ("DIGITAL TWIN", "Photoreal 3D Gaussian-splat + photogrammetry mesh, click-through to every suite"),
        ("SITE INTELLIGENCE", "17 IP cameras registered to the plan; 3 cm/px RTK roof orthomosaic"),
        ("AI AGENT DESK", "Grounded concierge, leasing agent + lease assembler, property manager — voice-enabled"),
        ("GOVERNED ACCESS", "Role-gated owner safe, vendor portal, audit-logged documents (Supabase RLS)"),
        ("AUDIT-GRADE DATA", "GLA 62,883 SF · 27 suites · 4.84 AC · every figure plat- or lease-sourced"),
        ("LIVE OPERATIONS", "Rent roll, compliance, critical dates, kanban — one deploy, magic-link secure"),
    ]
    for t, d in caps:
        o.append('<rect x="%d" y="%d" width="%d" height="86" fill="%s" rx="4"/>' % (PX, y, PW, ONAVY))
        o.append('<rect x="%d" y="%d" width="4" height="86" fill="%s"/>' % (PX, y, ORANGE))
        o.append('<text x="%d" y="%d" font-family="%s" font-size="17" font-weight="800" fill="#FFFFFF" letter-spacing="1">%s</text>' % (PX + 20, y + 32, HELV, t))
        o.append('<text x="%d" y="%d" font-family="%s" font-size="12.5" fill="%s">%s</text>' % (PX + 20, y + 58, HELV, "#c9d4e6", P.esc(d)))
        y += 98
    # footer
    fy = H - 96
    o.append('<rect x="0" y="%d" width="%d" height="96" fill="%s"/>' % (fy, W, ONAVY))
    o.append('<rect x="0" y="%d" width="%d" height="3" fill="%s"/>' % (fy, W, ORANGE))
    ow2 = 40 * OO_AR
    o.append('<image x="48" y="%d" width="%.0f" height="40" href="%s"/>' % (fy + 28, ow2, OO_LOGO_DARK))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="%s" font-size="17" font-weight="700" fill="#FFFFFF">Orange Ocean, LLC · orangeocean.com · adam@adamabdalla.com</text>' % (W - 48, fy + 42, HELV))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="%s" font-size="12" fill="%s">Asset of Belle Realty of Lafayette, LLC · Managed and instrumented by Orange Ocean, LLC</text>' % (W - 48, fy + 66, HELV, OMID))
    return P.save(o, "OO-twin-showcase.svg")

# ================================================= X — CREATIVE (navy/white)
def variant_X():
    NAVY = OB.NAVY; OFFW = OB.OFF
    th = dict(ink=OFFW, accent=OFFW, street="rgba(245,245,245,.45)", tree="rgba(245,245,245,.25)",
              boundary="rgba(245,245,245,.85)", boundary_w=1.0,
              plan_line="rgba(245,245,245,.30)", plan_faint="rgba(245,245,245,.16)",
              bay_edge=OFFW, bay_edge_w=1.1, bay_r=0, bay_shadow=False, bayfont=HELV,
              show_north=False, show_scale=False, pylon=False, trees=True,
              bayfill=lambda st: OFFW if st == "vacant" else "rgba(245,245,245,.07)",
              baytext=lambda st: NAVY if st == "vacant" else "rgba(245,245,245,.65)")
    o = P.new_svg(NAVY)
    # the plat as the hero — big, centered right
    FR = (430, 60, 1210, 900)
    P.render_plan(o, FR, th)
    s, TX, TY = plan_tx(FR)
    # halo the two white (vacant) bays
    for unit in ("131", "133"):
        bx, by, bw, bh = bay_screen(unit, TX, TY)
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="1.2" opacity="0.9"><animate attributeName="opacity" values="0.25;0.9;0.25" dur="3s" repeatCount="indefinite"/></rect>' % (bx - 5, by - 5, bw + 10, bh + 10, OFFW))
    # left column — message
    P.logo(o, 72, 96, 130, white=True)
    o.append('<text x="72" y="420" font-family="%s" font-size="58" font-weight="900" fill="%s" letter-spacing="-1">27 doors on</text>' % (HELV, OFFW))
    o.append('<text x="72" y="482" font-family="%s" font-size="58" font-weight="900" fill="%s" letter-spacing="-1">the Boulevard.</text>' % (HELV, OFFW))
    o.append('<text x="72" y="544" font-family="%s" font-size="58" font-weight="900" fill="%s" letter-spacing="-1">25 are taken.</text>' % (HELV, OFFW))
    o.append('<rect x="72" y="576" width="150" height="4" fill="%s"/>' % OFFW)
    o.append('<text x="72" y="630" font-family="%s" font-size="19" fill="rgba(245,245,245,.85)">The two lit up on this plan are yours —</text>' % HELV)
    o.append('<text x="72" y="656" font-family="%s" font-size="19" fill="rgba(245,245,245,.85)">1,272 and 1,907 square feet, side by side,</text>' % HELV)
    o.append('<text x="72" y="682" font-family="%s" font-size="19" fill="rgba(245,245,245,.85)">with 33,000 cars a day passing the center.</text>' % HELV)
    o.append('<text x="72" y="750" font-family="%s" font-size="24" font-weight="700" fill="%s">Suites 131 &amp; 133 · from 1,272 SF</text>' % (HELV, OFFW))
    o.append('<text x="72" y="782" font-family="%s" font-size="16" fill="rgba(245,245,245,.7)">Combinable to ±3,179 SF · right beside HotWorx at the Patricia St end</text>' % HELV)
    # footer line
    o.append('<line x1="72" y1="%d" x2="%d" y2="%d" stroke="rgba(245,245,245,.35)"/>' % (H - 120, W - 72, H - 120))
    o.append('<text x="72" y="%d" font-family="%s" font-size="17" font-weight="700" fill="%s">P 337-769-1554 · E info@ontheblvd.com · W ontheblvd.com</text>' % (H - 78, HELV, OFFW))
    o.append('<text x="72" y="%d" font-family="%s" font-size="12" fill="rgba(245,245,245,.55)">%s</text>' % (H - 52, HELV, P.ATTRIB))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="%s" font-size="13" fill="rgba(245,245,245,.55)">101–149 Arnould Blvd at Johnston St (US Hwy 167) · Lafayette, Louisiana</text>' % (W - 72, H - 78, HELV))
    return P.save(o, "OTB-poster-X-boulevard.svg")

names = [variant_F(), variant_T(), variant_X()]
print("OK ->", " | ".join(names))
