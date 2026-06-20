# -*- coding: utf-8 -*-
"""OTB monument / pylon sign — scaled front elevation.
Outputs: OTB-pylon-blank.svg (panel template w/ dims) and OTB-pylon-tenants.svg (populated).
Panel schedule per operator's sign: P1 2x8, P2 4x8 (anchor), P3-14 2x4 pairs."""
import base64, os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS=os.path.join(ROOT,"tools","brand-assets")
OUT=os.path.join(ROOT,"marketing"); os.makedirs(OUT,exist_ok=True)
def b64(p): return "data:image/png;base64,"+base64.b64encode(open(p,"rb").read()).decode()
LOGO_NAVY=b64(os.path.join(ASSETS,"otb_logo.png")); LOGO_AR=800/459.0

# palette
ROOF="#A2876E"; ROOFDK="#8A7059"; ROOFLT="#B79A80"
TAN="#D8C5A0"; TANDK="#C2AC80"; TANLT="#E8DCBE"; TANED="#B59C6E"
POST="#F4F0E6"; POSTSH="#DAD3C2"; POSTED="#C9C2AE"
PANEL="#F8F5EE"; PANELBD="#C7B488"; INK="#1C2D4F"; SUB="#6b6450"

# ---- geometry (px) ----
CX=512.0
ftpx=42.5
PW=8*ftpx                 # panel block width (8 ft)
PX0=CX-PW/2
GAP=7.0
COLW=(PW-GAP)/2
h1=2*ftpx; h2=4*ftpx; hr=2*ftpx
Y0=276.0                  # top of panel stack
# row y positions
rows=[]
y=Y0
rows.append(("P1",PX0,PW,h1)); y+=h1+GAP
P2_y=y; y+=0
rows.append(("P2",PX0,PW,h2));
# recompute with running y properly
def build_layout():
    out=[]; y=Y0
    out.append(("full","P1",PX0,y,PW,h1)); y+=h1+GAP
    out.append(("full","P2",PX0,y,PW,h2)); y+=h2+GAP
    for r in range(6):
        out.append(("L","P%d"%(3+r*2),PX0,y,COLW,hr))
        out.append(("R","P%d"%(4+r*2),PX0+COLW+GAP,y,COLW,hr))
        y+=hr+GAP
    return out,y
LAYOUT,STACK_BOT=build_layout()

CAP_Y=70.0; CAP_H=186.0; CAP_W=PW+150
CAP_X=CX-CAP_W/2
ROOF_Y=40.0
POSTW=46.0
LpX=PX0-6; RpX=PX0+PW-POSTW+6
POST_TOP=CAP_Y+CAP_H-8; POST_BOT=STACK_BOT+360

W,H=1024,int(POST_BOT+60)

def esc(t):
    import html; return html.escape(t)

def frame(o):
    # posts (legs) behind everything
    for px in (LpX,RpX):
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="%s" stroke-width="1.5"/>'%(px,POST_TOP,POSTW,POST_BOT-POST_TOP,POST,POSTSH))
        o.append('<rect x="%.1f" y="%.1f" width="6" height="%.1f" fill="%s" opacity="0.5"/>'%(px+POSTW-7,POST_TOP,POST_BOT-POST_TOP,POSTSH))
    # panel backing frame
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="5" fill="%s" stroke="%s" stroke-width="2"/>'%(PX0-14,Y0-14,PW+28,STACK_BOT-Y0+18,TAN,TANED))
    # roof slab
    o.append('<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s"/>'%(
        CAP_X+18,ROOF_Y, CAP_X+CAP_W-18,ROOF_Y, CAP_X+CAP_W+8,CAP_Y+6, CAP_X-8,CAP_Y+6, ROOF))
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="10" fill="%s"/>'%(CAP_X-8,CAP_Y+4,CAP_W+16,ROOFDK))
    # cap cabinet
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="%s" stroke="%s" stroke-width="2"/>'%(CAP_X,CAP_Y+12,CAP_W,CAP_H,TAN,TANED))
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="8" fill="%s"/>'%(CAP_X,CAP_Y+12,CAP_W,TANLT))
    # decorative corbels under cap
    for cxk in (CAP_X+60, CAP_X+CAP_W-60-44):
        o.append('<rect x="%.1f" y="%.1f" width="44" height="42" fill="%s" stroke="%s"/>'%(cxk,CAP_Y+CAP_H+8,TANDK,TANED))
    # logo in cap
    lw=CAP_W*0.62; lh=lw/LOGO_AR
    o.append('<image x="%.1f" y="%.1f" width="%.1f" height="%.1f" href="%s"/>'%(CX-lw/2,CAP_Y+12+(CAP_H-lh)/2,lw,lh,LOGO_NAVY))

def panel_box(o,x,y,w,h,bg=PANEL):
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="3" fill="%s" stroke="%s" stroke-width="2"/>'%(x,y,w,h,bg,PANELBD))

def fit(s,w,base):  # crude font fit
    import math
    return max(11,min(base,int(w/ (0.60*len(s)+0.5))))

def lines_text(o,x,y,w,h,lines,fg,font="Arial,Helvetica,sans-serif",bold=True,italic=False,base=30,track=0):
    n=len(lines); lh=min(h/(n+0.6), base*1.25)
    fs=min(base, fit(max(lines,key=len),w-16,base))
    cy=y+h/2-(n-1)*lh/2+fs*0.34
    for ln in lines:
        o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="%s" font-size="%d" font-weight="%s"%s fill="%s" letter-spacing="%s">%s</text>'%(
            x+w/2,cy,font,fs,"800" if bold else "400"," font-style=\"italic\"" if italic else "",fg,track,esc(ln)))
        cy+=lh

def header_svg(bg="#FFFFFF"):
    o=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'%(W,H)]
    o.append("<style>@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fraunces:opsz,wght@9..144,600;9..144,900&display=swap');</style>")
    o.append('<rect width="%d" height="%d" fill="%s"/>'%(W,H,bg))
    return o

# ----------------------------------------------------------------- BLANK
def blank():
    o=header_svg("#FFFFFF"); frame(o)
    dim={"P1":"2x8","P2":"4x8"}
    for kind,name,x,y,w,h in LAYOUT:
        panel_box(o,x,y,w,h)
        d=dim.get(name,"2x4")
        o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="%d" font-weight="800" fill="%s">Panel %s</text>'%(
            x+w/2,y+h/2-2,22 if kind=="full" else 17,INK,name[1:]))
        o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="%d" fill="%s">(%s)</text>'%(
            x+w/2,y+h/2+20,14,SUB,d))
    o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="%s">ON THE BOULEVARD · MONUMENT SIGN — PANEL SCHEDULE · 14 TENANT PANELS</text>'%(CX,H-24,SUB))
    open(os.path.join(OUT,"OTB-pylon-blank.svg"),"w",encoding="utf-8").write("\n".join(o)+"\n</svg>")

# ----------------------------------------------------------------- TENANTS
# (lines, bg, fg, font, italic, base)
SER="'DM Serif Display',Georgia,serif"; SANS="Arial,Helvetica,sans-serif"; FRA="'Fraunces',Georgia,serif"
TEN={
 "P1":(["Great American Cookies","& Hershey's Ice Cream"],"#FFFFFF","#13294B",SANS,False,22),
 "P2":(["Jason's Deli"],"#E2231A","#FFFFFF",FRA,True,68),
 "P3":(["Mary Ellen's","THE TUX SHOPPE"],"#1F5132","#FFFFFF",SER,False,22),
 "P4":(["FastPass","Tag & Title"],"#FFFFFF","#1B75BB",SANS,False,24),
 "P5":(["J.C. Kate","Boutique"],"#FFFFFF","#2F6B4F",FRA,True,24),
 "P6":(["JORDAN AMANDA","by Shoptiques"],"#FFFFFF","#1a1a1a",SER,False,22),
 "P7":(["CLOTHING","Loft"],"#FFFFFF","#1a1a1a",SER,False,24),
 "P8":(["HOTWORX"],"#111111","#FF7A00",SANS,True,40),
 "P9":(["Cat Clinic","of Lafayette"],"#FFFFFF","#2E6E6A",SANS,False,24),
 "P10":(["BERNINA Lafayette","Sewing Center"],"#FFFFFF","#C8102E",SANS,False,21),
 "P11":(["1st Franklin","Financial"],"#143A7B","#FFFFFF",SANS,True,26),
 "P12":(["Victoria Nails"],"#FFFFFF","#B5462E",FRA,True,30),
 "P13":(["Upstream","Rehabilitation"],"#FFFFFF","#1F5132",SANS,False,22),
 "P14":(["OUPAC","LOANS"],"#1a1a1a","#E8C457",SANS,True,30),
}
# panel -> unit (the operator's physical sign order; P13 = Upstream Rehab, replaced Blvd Nutrition)
PANEL_UNIT={"P1":"107","P2":"149","P3":"123","P4":"139","P5":"109","P6":"125","P7":"115",
            "P8":"129","P9":"119.5","P10":"111","P11":"143","P12":"117.5","P13":"145","P14":"119"}
LOGO_DIR=os.path.join(ASSETS,"tenant-logos")
LOGO_IDX=json.load(open(os.path.join(LOGO_DIR,"_index.json"),encoding="utf-8")) if os.path.exists(os.path.join(LOGO_DIR,"_index.json")) else {}
MIME={".png":"png",".jpg":"jpeg",".jpeg":"jpeg",".webp":"webp",".gif":"gif"}
def logo_data(unit):
    fn=LOGO_IDX.get(unit)
    if not fn: return None
    p=os.path.join(LOGO_DIR,fn); ext=os.path.splitext(fn)[1].lower()
    return "data:image/%s;base64,%s"%(MIME.get(ext,"png"), base64.b64encode(open(p,"rb").read()).decode())

def tenants():
    o=header_svg("#FFFFFF"); frame(o)
    for kind,name,x,y,w,h in LAYOUT:
        panel_box(o,x,y,w,h,"#FFFFFF")
        unit=PANEL_UNIT.get(name); data=logo_data(unit) if unit else None
        if data:
            pad=10 if kind=="full" else 7
            o.append('<image x="%.1f" y="%.1f" width="%.1f" height="%.1f" href="%s" preserveAspectRatio="xMidYMid meet"/>'%(
                x+pad,y+pad,w-2*pad,h-2*pad,data))
        else:  # fallback: styled type
            lines,bg,fg,font,ital,base=TEN[name]
            if bg!="#FFFFFF": panel_box(o,x,y,w,h,bg)
            lines_text(o,x,y,w,h,lines,fg,font=font,italic=ital,base=base)
    o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="%s">Tenant logos per current SOT · layout to scale (P1 2x8 · P2 4x8 · P3-14 2x4).</text>'%(CX,H-24,SUB))
    open(os.path.join(OUT,"OTB-pylon-tenants.svg"),"w",encoding="utf-8").write("\n".join(o)+"\n</svg>")

blank(); tenants()
print("OK pylon -> OTB-pylon-blank.svg | OTB-pylon-tenants.svg  (canvas %dx%d)"%(W,H))
