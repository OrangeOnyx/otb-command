# -*- coding: utf-8 -*-
"""
OTB leasing-poster STYLE EXPLORER — generates 5 variants from one geometry core.
A brand  | B plan-room | C standard | D editorial | E heritage
Shared layout fixes baked in: thin dashes, tenant DBAs off the unit boxes,
corrected OTB contact block + logo, pylon moved to the Unit-101 ingress,
Johnston St label brought down & centered.
"""
import ezdxf, math, json, html, base64, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "tools", "brand-assets")
OUT = os.path.join(ROOT, "marketing"); os.makedirs(OUT, exist_ok=True)
DXF = os.path.join(ROOT, "cad", "Boulev_CLEAN.dxf")

units = {u["unit"]: u for u in json.load(open(os.path.join(ROOT,"src","data","units.json"), encoding="utf-8"))}
g = json.load(open(os.path.join(ROOT,"src","data","geometry.json"), encoding="utf-8"))
LB = [(b[0], b[1]) for b in g["demising"]["longBuilding"]["bays"]]
SB = [(b[0], b[1]) for b in g["demising"]["shortBuilding"]["bays"]]

# ---- logos as base64 (navy art + white knockout, vendored in tools/brand-assets) ----
def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()
LOGO_NAVY = "data:image/png;base64," + b64(os.path.join(ASSETS, "otb_logo.png"))
LOGO_WHITE = "data:image/png;base64," + b64(os.path.join(ASSETS, "otb_logo_white.png"))
LOGO_AR = 800 / 459.0  # width/height

# ---- DXF parse (once) ----
doc = ezdxf.readfile(DXF); msp = doc.modelspace()
LB_X0, LB_X1, LB_Y0, LB_Y1 = 522.5, 1051.4, 172.5, 258.6
SB_X0, SB_X1, SB_Y0, SB_Y1 = 425.7, 510.2, 227.6, 436.3
NORTH_DEG = -51.5

PLAN_LAYERS = {"LINLEGAL","LINLEG2","LINLEG3","PARKING","LINCONC","LINCON2","LINEDGRD","TRAVLAN"}
def arc_pts(cx,cy,r,a0,a1,n=48):
    if a1<a0: a1+=360
    return [(cx+r*math.cos(math.radians(a0+(a1-a0)*i/n)), cy+r*math.sin(math.radians(a0+(a1-a0)*i/n))) for i in range(n+1)]
geo=[]; trees=[]
for e in msp:
    L=e.dxf.layer; t=e.dxftype()
    if L=="TREES" and t=="INSERT": trees.append((e.dxf.insert[0],e.dxf.insert[1])); continue
    if L not in PLAN_LAYERS: continue
    try:
        if t=="LINE": geo.append((L,[(e.dxf.start[0],e.dxf.start[1]),(e.dxf.end[0],e.dxf.end[1])]))
        elif t=="ARC": geo.append((L,arc_pts(e.dxf.center[0],e.dxf.center[1],e.dxf.radius,e.dxf.start_angle,e.dxf.end_angle)))
        elif t=="CIRCLE": geo.append((L,arc_pts(e.dxf.center[0],e.dxf.center[1],e.dxf.radius,0,360)))
        elif t=="LWPOLYLINE": geo.append((L,[(p[0],p[1]) for p in e.flattening(0.5)]))
    except Exception: pass
streets=[(e.dxf.text,e.dxf.insert[0],e.dxf.insert[1],e.dxf.rotation) for e in msp if e.dxf.layer=="TXTSTRNAME" and e.dxftype()=="TEXT"]

# dashed boundary layers (these are the "too bold" ones)
DASH_LAYERS={"LINLEGAL","LINLEG2","LINLEG3"}
TRAVEL_LAYERS={"TRAVLAN"}

xs=[p[0] for _,ps in geo for p in ps]+[LB_X0,LB_X1,SB_X0,SB_X1]
ys=[p[1] for _,ps in geo for p in ps]+[LB_Y0,LB_Y1,SB_Y0,SB_Y1]
minx,maxx,miny,maxy=min(xs),max(xs),min(ys),max(ys)

# bay rectangles in plat space (unit, x0,x1,y0,y1, vertical)
def bay_rects():
    out=[]
    lbscale=(LB_X1-LB_X0)/sum(w for _,w in LB); cur=LB_X0
    for unit,w in LB:
        out.append((unit,cur,cur+w*lbscale,LB_Y0,LB_Y1,True)); cur+=w*lbscale
    sbscale=(SB_Y1-SB_Y0)/sum(w for _,w in SB); cur=SB_Y0; xmid=(SB_X0+SB_X1)/2
    for unit,w in SB:
        y0,y1=cur,cur+w*sbscale
        if unit=="135":
            out.append(("135B",SB_X0,xmid,y0,y1,False)); out.append(("135A",xmid,SB_X1,y0,y1,False))
        else: out.append((unit,SB_X0,SB_X1,y0,y1,False))
        cur+=w*sbscale
    return out
BAYS=bay_rects()

CAT_TAG={"retail":"RETAIL","services":"SERVICE","financial":"FINANCE","food":"FOOD",
         "medical":"MEDICAL","office":"OFFICE","vacant":"AVAILABLE"}
VAC=sorted([u for u in units.values() if u["status"]=="vacant"], key=lambda u:u["unit"])

def esc(t): return html.escape(str(t))

# ---------------------------------------------------------------- site plan core
def render_plan(o, frame, th):
    """frame=(fx,fy,fw,fh); th=theme dict. Draws plat geometry + bays + chrome."""
    fx,fy,fw,fh=frame
    s=min(fw/(maxx-minx),fh/(maxy-miny))*th.get("plan_zoom",1.0)
    ox=fx+(fw-(maxx-minx)*s)/2; oy=fy+(fh-(maxy-miny)*s)/2
    TX=lambda x: ox+(x-minx)*s
    TY=lambda y: oy+(maxy-y)*s
    # geometry
    for L,ps in geo:
        if L in DASH_LAYERS:
            col,wd,dash=th["boundary"], th["boundary_w"], "7 5"
        elif L in TRAVEL_LAYERS:
            col,wd,dash=th["plan_faint"],0.5,"4 4"
        elif L=="PARKING":
            col,wd,dash=th["plan_line"],0.55,None
        else:
            col,wd,dash=th["plan_faint"],0.5,None
        d="M "+" L ".join("%.1f %.1f"%(TX(x),TY(y)) for x,y in ps)
        da=' stroke-dasharray="%s"'%dash if dash else ""
        o.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s"%s/>'%(d,col,wd,da))
    if th.get("trees",True):
        for x,y in trees:
            o.append('<circle cx="%.1f" cy="%.1f" r="3.6" fill="%s" opacity="0.5"/>'%(TX(x),TY(y),th["tree"]))
    # bays
    p101=None
    o.append('<g%s>'%(' filter="url(#sh)"' if th.get("bay_shadow") else ''))
    for unit,x0,x1,y0,y1,vert in BAYS:
        u=units.get(unit)
        st=u["status"] if u else "active"
        sx0,sx1=TX(x0),TX(x1); sy0,sy1=TY(y1),TY(y0)
        if unit=="101": p101=(sx0,sy0,sx1-sx0,sy1-sy0)
        fill=th["bayfill"](st); txtc=th["baytext"](st)
        extra=""
        if st=="vacant" and th.get("vac_hatch"): extra=' stroke-dasharray="2 2"'
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="%s" stroke-width="%s"%s rx="%s"/>'%(
            sx0,sy0,sx1-sx0,sy1-sy0,fill,th["bay_edge"],th["bay_edge_w"],extra,th.get("bay_r",0)))
        cx,cy=(sx0+sx1)/2,(sy0+sy1)/2; wpx=sx1-sx0; hpx=sy1-sy0
        if vert:
            # long building: numbers turned 90deg CCW, centered in BOTH axes (dominant-baseline)
            fsz=16 if wpx>=26 else 13
            o.append('<text x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central" font-family="%s" font-size="%d" font-weight="700" fill="%s" transform="rotate(-90 %.1f %.1f)">%s</text>'%(
                cx,cy,th["bayfont"],fsz,txtc,cx,cy,unit))
        else:
            fsz=14 if (wpx>22 and hpx>22) else 11
            o.append('<text x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central" font-family="%s" font-size="%d" font-weight="700" fill="%s">%s</text>'%(
                cx,cy,th["bayfont"],fsz,txtc,unit))
    o.append('</g>')
    # Johnston label curves WITH the road: ride a central travel-lane stripe via textPath
    jcand=[]
    for L,ps in geo:
        if L!="TRAVLAN": continue
        sp=[(TX(ax),TY(ay)) for ax,ay in ps]
        sxs=[p[0] for p in sp]; sys=[p[1] for p in sp]
        if min(sxs)>1000 and (max(sys)-min(sys))>300:
            jcand.append((sum(sxs)/len(sxs),sp))
    jpath=None
    if jcand:
        jcand.sort(key=lambda c:c[0]); pts=jcand[len(jcand)//2][1]
        if pts[0][1]<pts[-1][1]: pts=pts[::-1]   # order bottom->top so label reads upward
        jpath="M "+" L ".join("%.1f %.1f"%(a,b) for a,b in pts)
    for txt,x,y,rot in streets:
        t=txt.replace("%%p","±")
        if "JOHNSTON" in t.upper() and jpath:
            o.append('<defs><path id="jrd" d="%s"/></defs>'%jpath)
            o.append('<text font-family="%s" font-size="12" font-weight="600" fill="%s" letter-spacing="2"><textPath href="#jrd" startOffset="20%%">%s</textPath></text>'%(th["bayfont"],th["street"],esc(t)))
            continue
        px,py=TX(x),TY(y)
        o.append('<text x="%.1f" y="%.1f" font-family="%s" font-size="12" font-weight="600" fill="%s" letter-spacing="2" transform="rotate(%.0f %.1f %.1f)">%s</text>'%(px,py,th["bayfont"],th["street"],-rot,px,py,esc(t)))
    # pylon sign — true CAD location (surveyor 'SIGN' @ 1075.8,321.1: the Hwy-167 ingress by Unit 101)
    if th.get("pylon",True):
        sx,sy=TX(1075.8),TY(321.1); ac=th["accent"]
        o.append('<rect x="%.1f" y="%.1f" width="16" height="20" rx="2" fill="%s"/><rect x="%.1f" y="%.1f" width="3" height="14" fill="%s"/>'%(sx-8,sy-10,ac,sx-1.5,sy+10,ac))
        o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="%s" font-size="9" font-weight="700" fill="%s">PYLON SIGN</text>'%(sx,sy-16,th["bayfont"],ac))
    # north + scale
    if th.get("show_north"):
        ncx,ncy=fx+fw-46,fy+44
        o.append('<g transform="translate(%.1f,%.1f) rotate(%.1f)"><path d="M0 -22 L6 6 L0 0 L-6 6 Z" fill="%s"/><circle r="2.2" fill="%s"/>'
                 '<text x="0" y="-27" text-anchor="middle" font-family="%s" font-size="11" font-weight="700" fill="%s" transform="rotate(%.1f 0 -27)">N</text></g>'%(
                 ncx,ncy,NORTH_DEG,th["ink"],th["ink"],th["bayfont"],th["ink"],-NORTH_DEG))
    if th.get("show_scale"):
        barpx=100*s
        o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2"/>'%(fx+18,fy+fh-26,fx+18+barpx,fy+fh-26,th["ink"]))
        o.append('<text x="%.1f" y="%.1f" font-family="%s" font-size="9" fill="%s">0 — 100 FT</text>'%(fx+18,fy+fh-31,th["bayfont"],th["street"]))
    return s

# ---------------------------------------------------------------- svg helpers
W,H=1680,1120
def new_svg(bg):
    o=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'%(W,H)]
    o.append("<style>@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Public+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&family=Archivo:wght@600;800;900&family=Archivo+Black&family=DM+Serif+Display&family=Fraunces:opsz,wght@9..144,600;9..144,900&display=swap');</style>")
    o.append('<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.18"/></filter>'
             '<filter id="sh2" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.30"/></filter></defs>')
    o.append('<rect width="%d" height="%d" fill="%s"/>'%(W,H,bg))
    return o
def save(o,name):
    o.append("</svg>")
    open(os.path.join(OUT,name),"w",encoding="utf-8").write("\n".join(o))
    return name
def logo(o,x,y,h,white=True):
    w=h*LOGO_AR
    o.append('<image x="%.1f" y="%.1f" width="%.1f" height="%.1f" href="%s"/>'%(x,y,w,h,LOGO_WHITE if white else LOGO_NAVY))
    return w

# palette constants
NAVY="#1C2D4F"; OFF="#F5F5F5"; WHT="#FFFFFF"
INK="#1C2B26"; PAPER="#EDEFE8"; CARD="#F6F7F1"; BRASS="#A87E2F"; SAGE="#5F6E64"
GRN="#2F6B4F"; ANCH="#1E4F3C"; BRICK="#C25E33"

CONTACT = ("Adam Anthony Abdalla, Property Manager", "101–149 Arnould Blvd · Lafayette, LA 70506",
           "P 337-769-1554   ·   E info@ontheblvd.com   ·   W ontheblvd.com")
ATTRIB = "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."

# ================================================================ A — BRAND
def variant_A():
    th=dict(ink=NAVY, accent=NAVY, street="#9aa4b5", tree="#8aa0a8",
            boundary="#7e8aa3", boundary_w=0.9, plan_line="#aab2c4", plan_faint="#cfd5e1",
            bay_edge=WHT, bay_edge_w=1.3, bay_r=2, bay_shadow=True, bayfont="Arial, Helvetica, sans-serif",
            show_north=False, show_scale=True, cat_tags=False, pylon=True,
            bayfill=lambda st: "#FFFFFF" if st=="vacant" else (NAVY if st=="anchor" else "#2c4068" if st!="owner" else "#5a6a8a"),
            baytext=lambda st: NAVY if st=="vacant" else "#FFFFFF")
    o=new_svg(WHT)
    # header
    o.append('<rect x="0" y="0" width="%d" height="150" fill="%s"/>'%(W,OFF))
    o.append('<rect x="0" y="150" width="%d" height="2" fill="%s"/>'%(W,NAVY))
    logo(o,46,30,92,white=False)
    o.append('<text x="%d" y="64" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="%s" letter-spacing="1">SPACES AVAILABLE</text>'%(W-48,NAVY))
    o.append('<text x="%d" y="96" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="15" fill="#5b6680">Retail &amp; dining in the heart of Lafayette · Hwy 167 (Johnston St)</text>'%(W-48))
    # plan
    render_plan(o,(40,182,1090,860),th)
    o.append('<rect x="40" y="182" width="1090" height="860" fill="none" stroke="#e3e6ee"/>')
    # legend
    lx=64
    for lab,col,tc in [("Available","#FFFFFF",NAVY),("Leased","#2c4068","#fff"),("Anchor",NAVY,"#fff")]:
        o.append('<rect x="%d" y="200" width="15" height="15" fill="%s" stroke="%s"/>'%(lx,col,NAVY))
        o.append('<text x="%d" y="212" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="%s">%s</text>'%(lx+20,NAVY,lab)); lx+=120
    # right column
    PX,PW=1158,476
    o.append('<text x="%d" y="206" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="%s" letter-spacing="1">NOW LEASING</text>'%(PX,NAVY))
    o.append('<line x1="%d" y1="216" x2="%d" y2="216" stroke="%s" stroke-width="2"/>'%(PX,PX+PW,NAVY))
    y=250
    for u in VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="58" fill="%s" stroke="%s" stroke-width="1.5"/>'%(PX,y-20,PW,OFF,NAVY))
        o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="800" fill="%s">SUITE %s</text>'%(PX+16,y+8,NAVY,u["unit"]))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="%s">%s SF</text>'%(PX+PW-16,y+2,NAVY,format(u["sf"],",")))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#5b6680">%s</text>'%(PX+PW-16,y+22,esc(u["use"])))
        y+=70
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="%s">Combine 131 + 133 for ±3,179 SF contiguous.</text>'%(PX,y+4,NAVY)); y+=42
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="%s" letter-spacing="1">THE CENTER</text>'%(PX,y,NAVY))
    o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="2"/>'%(PX,y+10,PX+PW,y+10,NAVY)); y+=40
    for k,v in [("Total area","62,883 SF"),("Suites","27"),("Anchored by","Jason's Deli"),
                ("Parking","324 spaces"),("Frontage","Arnould Blvd · Hwy 167")]:
        o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#5b6680">%s</text>'%(PX,y,k))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="%s">%s</text>'%(PX+PW,y,NAVY,esc(v)))
        o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#e0e3ec"/>'%(PX,y+9,PX+PW,y+9)); y+=30
    # footer
    fy=H-78
    o.append('<rect x="0" y="%d" width="%d" height="78" fill="%s"/>'%(fy,W,NAVY))
    logo(o,46,fy+16,46,white=True)
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#fff">%s</text>'%(360,fy+30,CONTACT[0]))
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="#c3ccdd">%s</text>'%(360,fy+50,CONTACT[1]))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#fff">%s</text>'%(W-46,fy+30,CONTACT[2]))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="10.5" fill="#9aa6c0">%s</text>'%(W-46,fy+52,ATTRIB))
    return save(o,"OTB-poster-A-brand.svg")

# ================================================================ B — PLAN ROOM
def variant_B():
    th=dict(ink=INK, accent=BRASS, street=SAGE, tree=GRN,
            boundary=INK, boundary_w=1.0, plan_line=SAGE, plan_faint="#cdd2c2",
            bay_edge=PAPER, bay_edge_w=1.2, bay_r=0, bay_shadow=True, bayfont="'Big Shoulders Display',sans-serif",
            show_north=True, show_scale=True, cat_tags=False, pylon=True,
            bayfill=lambda st: BRICK if st=="vacant" else (ANCH if st=="anchor" else (SAGE if st=="owner" else GRN)),
            baytext=lambda st: "#fff")
    o=new_svg(PAPER)
    o.append('<rect x="40" y="150" width="1130" height="910" fill="%s" stroke="#CDD2C2"/>'%CARD)
    render_plan(o,(40,150,1130,910),th)
    # header (plan-room navy bar + brass rule + white logo)
    o.append('<rect x="0" y="0" width="%d" height="116" fill="%s"/><rect x="0" y="113" width="%d" height="3" fill="%s"/>'%(W,INK,W,BRASS))
    logo(o,40,14,88,white=True)
    o.append('<text x="%d" y="48" text-anchor="end" font-family="\'Big Shoulders Display\',sans-serif" font-size="30" font-weight="700" fill="#C9A55C" letter-spacing="3">RETAIL FOR LEASE</text>'%(W-40))
    o.append('<text x="%d" y="78" text-anchor="end" font-family="\'IBM Plex Mono\',monospace" font-size="12" fill="rgba(237,239,232,.7)">101–149 ARNOULD BLVD · JOHNSTON ST (US HWY 167) · LAFAYETTE LA</text>'%(W-40))
    # legend
    lx=64
    for lab,col in [("Available",BRICK),("Occupied",GRN),("Anchor",ANCH)]:
        o.append('<rect x="%d" y="168" width="14" height="14" fill="%s"/><text x="%d" y="179" font-family="\'IBM Plex Mono\',monospace" font-size="11" fill="%s">%s</text>'%(lx,col,lx+20,INK,lab)); lx+=118
    # right panel
    PX,PY,PW=1196,150,448
    def head(y,t): o.append('<text x="%d" y="%d" font-family="\'Big Shoulders Display\',sans-serif" font-size="19" font-weight="700" fill="%s" letter-spacing="1">%s</text><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>'%(PX,y,INK,t,PX,y+8,PX+PW,y+8,INK))
    y=190; head(y,"AVAILABILITY"); y+=30
    for u in VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="42" fill="#F4E1D7" stroke="%s"/>'%(PX,y-16,PW,BRICK))
        o.append('<text x="%d" y="%d" font-family="\'Big Shoulders Display\',sans-serif" font-size="20" font-weight="700" fill="%s">SUITE %s</text>'%(PX+12,y+2,BRICK,u["unit"]))
        o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="10.5" fill="#5F4030">%s SF · %s</text>'%(PX+12,y+18,format(u["sf"],","),esc(u["use"])))
        y+=52
    o.append('<text x="%d" y="%d" font-family="\'Public Sans\',sans-serif" font-size="12.5" font-weight="600" fill="%s">Combinable — ±3,179 SF contiguous at the Patricia St end.</text>'%(PX,y,INK))
    y+=34; head(y,"THE PROPERTY"); y+=26
    for k,v in [("GLA","62,883 SF"),("Demised units","27"),("Anchor","Jason's Deli"),("Parking","324 stalls"),("Frontage","Arnould 80' · US-167 ±100'")]:
        o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="12" fill="%s">%s</text><text x="%d" y="%d" text-anchor="end" font-family="\'IBM Plex Mono\',monospace" font-size="12" font-weight="600" fill="%s">%s</text>'%(PX,y,SAGE,k,PX+PW,y,INK,esc(v)))
        o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#DADDD0"/>'%(PX,y+7,PX+PW,y+7)); y+=25
    y+=22; head(y,"TENANT DIRECTORY"); y+=24
    roster=sorted(units.values(),key=lambda u:float(u["unit"]) if u["unit"][-1].isdigit() else float(u["unit"][:-1])+0.5)
    half=(len(roster)+1)//2; colw=PW/2; y0=y
    for i,u in enumerate(roster):
        col=i//half; row=i%half; rx=PX+col*colw; ry=y0+row*20.5
        vac=u["status"]=="vacant"; nm="AVAILABLE" if vac else u["dba"]; nc=BRICK if vac else INK
        o.append('<text x="%.0f" y="%.0f" font-family="\'IBM Plex Mono\',monospace" font-size="10" font-weight="600" fill="%s">%s</text>'%(rx,ry,nc,u["unit"]))
        o.append('<text x="%.0f" y="%.0f" font-family="\'Public Sans\',sans-serif" font-size="10.5" fill="%s">%s</text>'%(rx+38,ry,nc,esc(nm[:22])))
    y=y0+half*20.5+16
    o.append('<rect x="%d" y="%d" width="%d" height="64" fill="%s"/>'%(PX,y,PW,INK))
    logo(o,PX+14,y+12,30,white=True)
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'IBM Plex Mono\',monospace" font-size="11" font-weight="600" fill="#fff">P 337-769-1554 · info@ontheblvd.com</text>'%(PX+PW-14,y+26))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'IBM Plex Mono\',monospace" font-size="9.5" fill="#9aa694">ontheblvd.com</text>'%(PX+PW-14,y+44))
    o.append('<text x="%d" y="%d" font-family="\'IBM Plex Mono\',monospace" font-size="8.5" fill="%s">%s</text>'%(64,H-16,SAGE,ATTRIB))
    return save(o,"OTB-poster-B-planroom.svg")

# ================================================================ C — STANDARD
def variant_C():
    th=dict(ink=NAVY, accent="#9b6a2f", street="#9aa4b5", tree="#9bb0a8",
            boundary="#8893a8", boundary_w=0.9, plan_line="#b3bccb", plan_faint="#d6dbe4",
            bay_edge=WHT, bay_edge_w=1.2, bay_r=1, bay_shadow=False, bayfont="Arial, Helvetica, sans-serif",
            show_north=True, show_scale=True, cat_tags=False, pylon=True,
            bayfill=lambda st: "#FFE9B8" if st=="vacant" else (NAVY if st=="anchor" else "#5a6a8a" if st!="owner" else "#7e8aa3"),
            baytext=lambda st: "#7a5a13" if st=="vacant" else "#fff")
    o=new_svg(WHT)
    # top navy bar
    o.append('<rect x="0" y="0" width="%d" height="120" fill="%s"/>'%(W,NAVY))
    o.append('<rect x="0" y="120" width="%d" height="6" fill="#C9A55C"/>'%W)
    logo(o,44,28,64,white=True)
    o.append('<text x="%d" y="56" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="800" fill="#fff" letter-spacing="2">FOR LEASE</text>'%(W-46))
    o.append('<text x="%d" y="88" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="15" fill="#c3ccdd">Anchored Neighborhood Retail · 101–149 Arnould Blvd, Lafayette LA 70506</text>'%(W-46))
    # plan in a bordered card
    o.append('<rect x="40" y="152" width="1080" height="828" fill="%s" stroke="#dfe3ea"/>'%OFF)
    render_plan(o,(48,160,1064,812),th)
    lx=70
    for lab,col,tc in [("Available","#FFE9B8","#7a5a13"),("Leased","#5a6a8a","#fff"),("Anchor",NAVY,"#fff")]:
        o.append('<rect x="%d" y="172" width="15" height="15" fill="%s" stroke="#cfd5e1"/>'%(lx,col))
        o.append('<text x="%d" y="184" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="%s">%s</text>'%(lx+20,NAVY,lab)); lx+=118
    # right column
    PX,PW=1150,486
    o.append('<text x="%d" y="172" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="800" fill="%s">AVAILABLE SUITES</text>'%(PX,NAVY))
    o.append('<rect x="%d" y="182" width="%d" height="3" fill="#C9A55C"/>'%(PX,PW))
    y=216
    for u in VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="62" fill="%s" stroke="#e2e6ee"/>'%(PX,y-22,PW,OFF))
        o.append('<rect x="%d" y="%d" width="6" height="62" fill="#C9A55C"/>'%(PX,y-22))
        o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="800" fill="%s">Suite %s</text>'%(PX+18,y+6,NAVY,u["unit"]))
        o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#6b7488">%s</text>'%(PX+18,y+26,esc(u["use"])))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" fill="%s">%s</text>'%(PX+PW-16,y+2,NAVY,format(u["sf"],",")))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#6b7488">SF</text>'%(PX+PW-16,y+22))
        y+=74
    o.append('<rect x="%d" y="%d" width="%d" height="40" fill="%s"/>'%(PX,y-18,PW,NAVY))
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#fff">DIVISIBLE / COMBINABLE TO ±3,179 SF</text>'%(PX+16,y+7)); y+=46
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="800" fill="%s">PROPERTY HIGHLIGHTS</text>'%(PX,y,NAVY))
    o.append('<rect x="%d" y="%d" width="%d" height="3" fill="#C9A55C"/>'%(PX,y+10,PW)); y+=36
    for b in ["62,883 SF anchored neighborhood center","Anchored by Jason's Deli","324 parking spaces on site",
              "Frontage on Hwy 167 (Johnston St) & Arnould Blvd","27 suites · retail, dining & service mix","Renovated 2019"]:
        o.append('<circle cx="%d" cy="%d" r="3" fill="#C9A55C"/>'%(PX+4,y-4))
        o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="13.5" fill="#2a3550">%s</text>'%(PX+18,y,esc(b))); y+=27
    # footer
    fy=H-86
    o.append('<rect x="0" y="%d" width="%d" height="86" fill="%s"/><rect x="0" y="%d" width="%d" height="5" fill="#C9A55C"/>'%(fy,W,NAVY,fy,W))
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="800" fill="#fff">CONTACT LEASING</text>'%(46,fy+34))
    o.append('<text x="%d" y="%d" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#c3ccdd">%s</text>'%(46,fy+58,CONTACT[0]))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#fff">P 337-769-1554 · info@ontheblvd.com · ontheblvd.com</text>'%(W-46,fy+34))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="10.5" fill="#9aa6c0">%s</text>'%(W-46,fy+58,ATTRIB))
    return save(o,"OTB-poster-C-standard.svg")

# ================================================================ D — EDITORIAL (very creative)
def variant_D():
    ACC="#FF6A3D"  # warm coral — DELIBERATE break from 2-color brand (creative)
    BG="#10182B"
    th=dict(ink="#fff", accent=ACC, street="#5d6a86", tree="#3a4a63",
            boundary="#46557a", boundary_w=0.9, plan_line="#33415e", plan_faint="#262f45",
            bay_edge=BG, bay_edge_w=1.4, bay_r=2, bay_shadow=False, bayfont="'Archivo',sans-serif",
            show_north=False, show_scale=False, cat_tags=False, pylon=True, trees=True,
            bayfill=lambda st: ACC if st=="vacant" else ("#2b3a5c" if st!="anchor" else "#46557a"),
            baytext=lambda st: BG if st=="vacant" else "#aeb9d0")
    o=new_svg(BG)
    o.append('<defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16213c"/><stop offset="1" stop-color="#0c1322"/></linearGradient></defs>')
    o.append('<rect width="%d" height="%d" fill="url(#gd)"/>'%(W,H))
    # giant hero type, left
    o.append('<text x="64" y="180" font-family="\'Archivo Black\',\'Archivo\',sans-serif" font-size="150" font-weight="900" fill="#fff" letter-spacing="-4">SPACE</text>')
    o.append('<text x="64" y="320" font-family="\'Archivo Black\',\'Archivo\',sans-serif" font-size="150" font-weight="900" fill="%s" letter-spacing="-4">TO GROW.</text>'%ACC)
    o.append('<text x="70" y="370" font-family="\'Archivo\',sans-serif" font-size="20" font-weight="600" fill="#aeb9d0" letter-spacing="6">ON THE BOULEVARD · LAFAYETTE, LA</text>')
    o.append('<rect x="70" y="392" width="300" height="2" fill="%s"/>'%ACC)
    # plan lower-left
    render_plan(o,(50,430,860,600),th)
    # right rail
    PX,PW=960,660
    o.append('<text x="%d" y="150" font-family="\'Archivo\',sans-serif" font-size="22" font-weight="800" fill="%s" letter-spacing="2">AVAILABLE NOW</text>'%(PX,ACC))
    y=200
    for u in VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="118" fill="none" stroke="#2c3a5a"/>'%(PX,y-40,PW))
        o.append('<text x="%d" y="%d" font-family="\'Archivo Black\',sans-serif" font-size="92" font-weight="900" fill="#fff">%s</text>'%(PX+8,y+44,u["unit"]))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Archivo\',sans-serif" font-size="40" font-weight="900" fill="%s">%s SF</text>'%(PX+PW-12,y+10,ACC,format(u["sf"],",")))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Archivo\',sans-serif" font-size="14" fill="#8492ad">%s</text>'%(PX+PW-12,y+40,esc(u["use"])))
        y+=140
    o.append('<text x="%d" y="%d" font-family="\'Archivo\',sans-serif" font-size="16" font-weight="700" fill="#aeb9d0">Combine 131 + 133 → ±3,179 SF contiguous.</text>'%(PX,y+6)); y+=64
    facts=[("62,883","SQ FT"),("27","SUITES"),("324","PARKING"),("167","HWY FRONT")]
    fxw=PW/4
    for i,(a,b) in enumerate(facts):
        fxc=PX+i*fxw
        o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#2c3a5a"/>'%(fxc,y+4,fxc,y+58) if i else '')
        o.append('<text x="%.0f" y="%d" font-family="\'Archivo Black\',sans-serif" font-size="34" font-weight="900" fill="#fff">%s</text>'%(fxc+14,y+34,a))
        o.append('<text x="%.0f" y="%d" font-family="\'Archivo\',sans-serif" font-size="11" font-weight="700" fill="%s" letter-spacing="1">%s</text>'%(fxc+14,y+54,ACC,b))
    # footer
    fy=H-70
    o.append('<rect x="0" y="%d" width="%d" height="70" fill="%s"/>'%(fy,W,ACC))
    logo_dark=LOGO_NAVY
    o.append('<text x="46" y="%d" font-family="\'Archivo Black\',sans-serif" font-size="20" font-weight="900" fill="%s">ON THE BOULEVARD</text>'%(fy+34,BG))
    o.append('<text x="46" y="%d" font-family="\'Archivo\',sans-serif" font-size="11" font-weight="700" fill="#3a1c10">%s</text>'%(fy+54,ATTRIB))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Archivo\',sans-serif" font-size="18" font-weight="900" fill="%s">337-769-1554 · ONTHEBLVD.COM</text>'%(W-46,fy+34,BG))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Archivo\',sans-serif" font-size="12" font-weight="700" fill="#3a1c10">info@ontheblvd.com</text>'%(W-46,fy+54))
    return save(o,"OTB-poster-D-editorial.svg")

# ================================================================ E — HERITAGE (very creative)
def variant_E():
    CREAM="#F3E9D2"; INKB="#23314e"; SUN="#E08A3C"; TEAL="#2E6E6A"; RUST="#B5462E"
    th=dict(ink=INKB, accent=RUST, street="#9a8a66", tree=TEAL,
            boundary="#9a8a66", boundary_w=0.9, plan_line="#c4b690", plan_faint="#d8cdac",
            bay_edge=CREAM, bay_edge_w=1.6, bay_r=3, bay_shadow=False, bayfont="'Fraunces',serif",
            show_north=True, show_scale=False, cat_tags=False, pylon=True,
            bayfill=lambda st: SUN if st=="vacant" else (RUST if st=="anchor" else TEAL if st!="owner" else "#7a8a6a"),
            baytext=lambda st: INKB if st=="vacant" else "#f5ecd6")
    o=new_svg(CREAM)
    # banner ribbon
    o.append('<rect x="0" y="0" width="%d" height="168" fill="%s"/>'%(W,INKB))
    o.append('<rect x="0" y="168" width="%d" height="8" fill="%s"/><rect x="0" y="176" width="%d" height="4" fill="%s"/>'%(W,SUN,W,RUST))
    # retro starburst
    o.append('<g transform="translate(120,84)">')
    for i in range(16):
        a=math.radians(i*22.5)
        o.append('<line x1="0" y1="0" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2" opacity="0.5"/>'%(58*math.cos(a),58*math.sin(a),SUN))
    o.append('<circle r="46" fill="%s"/><text x="0" y="-4" text-anchor="middle" font-family="\'Fraunces\',serif" font-size="16" font-weight="900" fill="#fff">EST.</text>'
             '<text x="0" y="22" text-anchor="middle" font-family="\'Fraunces\',serif" font-size="30" font-weight="900" fill="#fff">1976</text></g>'%RUST)
    o.append('<text x="210" y="78" font-family="\'Fraunces\',serif" font-size="54" font-weight="900" fill="%s">On The Boulevard</text>'%CREAM)
    o.append('<text x="214" y="116" font-family="\'Fraunces\',serif" font-size="20" font-style="italic" fill="%s">A Lafayette shopping tradition · now leasing on Hwy 167</text>'%SUN)
    o.append('<text x="%d" y="100" text-anchor="end" font-family="\'Fraunces\',serif" font-size="44" font-weight="900" fill="%s">SHOPS<tspan fill="%s"> FOR LEASE</tspan></text>'%(W-44,CREAM,SUN))
    # plan card with rounded retro frame
    o.append('<rect x="44" y="200" width="1086" height="788" rx="18" fill="#FBF4E2" stroke="%s" stroke-width="2"/>'%SUN)
    render_plan(o,(60,214,1054,760),th)
    # right column
    PX,PW=1160,476
    o.append('<text x="%d" y="232" font-family="\'Fraunces\',serif" font-size="30" font-weight="900" fill="%s">Open Suites</text>'%(PX,INKB))
    o.append('<rect x="%d" y="244" width="%d" height="4" fill="%s"/>'%(PX,PW,RUST))
    y=290
    for u in VAC:
        o.append('<rect x="%d" y="%d" width="%d" height="74" rx="10" fill="%s" stroke="%s" stroke-width="2"/>'%(PX,y-30,PW,"#FBF4E2",SUN))
        o.append('<circle cx="%d" cy="%d" r="26" fill="%s"/>'%(PX+38,y+6,SUN))
        o.append('<text x="%d" y="%d" text-anchor="middle" font-family="\'Fraunces\',serif" font-size="20" font-weight="900" fill="%s">%s</text>'%(PX+38,y+13,INKB,u["unit"]))
        o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="26" font-weight="900" fill="%s">%s SF</text>'%(PX+82,y+2,INKB,format(u["sf"],",")))
        o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="13" font-style="italic" fill="#7a6a48">%s</text>'%(PX+82,y+24,esc(u["use"])))
        y+=88
    o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="15" font-style="italic" fill="%s">Combine 131 &amp; 133 for ±3,179 sq ft.</text>'%(PX,y,INKB)); y+=46
    o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="30" font-weight="900" fill="%s">The Center</text>'%(PX,y,INKB))
    o.append('<rect x="%d" y="%d" width="%d" height="4" fill="%s"/>'%(PX,y+12,PW,RUST)); y+=48
    for k,v in [("Since","1976 · renovated 2019"),("Size","62,883 sq ft"),("Shops","27 suites"),
                ("Anchor","Jason's Deli"),("Parking","324 spaces")]:
        o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="15" font-style="italic" fill="#7a6a48">%s</text>'%(PX,y,k))
        o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Fraunces\',serif" font-size="15" font-weight="900" fill="%s">%s</text>'%(PX+PW,y,INKB,esc(v)))
        o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#d8cdac"/>'%(PX,y+9,PX+PW,y+9)); y+=30
    # footer ribbon
    fy=H-72
    o.append('<rect x="0" y="%d" width="%d" height="72" fill="%s"/><rect x="0" y="%d" width="%d" height="5" fill="%s"/>'%(fy,W,INKB,fy,W,SUN))
    logo(o,44,fy+16,40,white=True)
    o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="16" font-weight="900" fill="%s">Come see what is open.</text>'%(360,fy+32,CREAM))
    o.append('<text x="%d" y="%d" font-family="\'Fraunces\',serif" font-size="12" font-style="italic" fill="#c9bda0">%s</text>'%(360,fy+52,ATTRIB))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Fraunces\',serif" font-size="18" font-weight="900" fill="%s">337-769-1554 · ontheblvd.com</text>'%(W-44,fy+32,SUN))
    o.append('<text x="%d" y="%d" text-anchor="end" font-family="\'Fraunces\',serif" font-size="12" fill="#c9bda0">info@ontheblvd.com</text>'%(W-44,fy+52))
    return save(o,"OTB-poster-E-heritage.svg")

names=[variant_A(),variant_B(),variant_C(),variant_D(),variant_E()]
print("OK ->", " | ".join(names))
