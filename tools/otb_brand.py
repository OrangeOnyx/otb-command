# -*- coding: utf-8 -*-
"""Shared brand kit for tools/ generators (2026-07-20 horizontal layer).

Single source for palettes, fonts, contact blocks, logo paths, and the
canonical esc() across poster.py / poster-specials.py / pylon.py / plat.py /
vinyl-b1.py / case-study-c1.py. Brand facts come from the operator's brand
system (~/.claude/skills/abdalla-brand-system/references/*.md, Apr 2026) and
the locked plan-room design system (CLAUDE.md) — do NOT restate hexes in
generators; import them from here.
"""
import base64, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "tools", "brand-assets")
BRAND_ASSETS = os.path.join(os.path.expanduser("~"), ".claude", "skills",
                            "abdalla-brand-system", "assets")


def esc(t):
    """Canonical HTML/SVG escaper (mirrors src/lib/format.js esc; null-safe)."""
    return html.escape("" if t is None else str(t))


def b64(path):
    """File -> data URI (PNG)."""
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


# ---- OTB public brand (tenant-facing; STRICT navy/white — no orange/gray) ----
NAVY = "#1C2D4F"   # Boulevard Navy — all text, rules, headers
OFF = "#F5F5F5"    # Off White — subtle backgrounds
WHT = "#FFFFFF"
HELV = "Arial, Helvetica, sans-serif"
OTB_LOGO_NAVY = os.path.join(ASSETS, "otb_logo.png")
OTB_LOGO_WHITE = os.path.join(ASSETS, "otb_logo_white.png")
OTB_LOGO_AR = 800 / 459.0  # width/height
CONTACT = ("Adam Anthony Abdalla, Property Manager",
           "101–149 Arnould Blvd · Lafayette, LA 70506",
           "P 337-769-1554   ·   E info@ontheblvd.com   ·   W ontheblvd.com")
ATTRIB = "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."

# ---- Orange Ocean B2B brand (owner/investor-facing) ----
ONAVY = "#1C2D4F"   # Ocean Navy
ODEEP = "#0D1E38"   # Deep Navy
ORANGE = "#E8820C"  # Sunset Orange (accent/CTA only)
OMID = "#4A6FA5"    # Mid Blue
OLIGHT = "#F0F4F8"  # Light Background
OO_LOGO_LIGHT = os.path.join(BRAND_ASSETS, "oo_logo_horizontal_light.png")  # light bg ONLY
OO_LOGO_DARK = os.path.join(BRAND_ASSETS, "oo_logo_horizontal_dark.png")    # dark bg ONLY
OO_CONTACT = ("Adam Anthony Abdalla, Founder & Operator",
              "101-149 Arnould Blvd., Lafayette, LA 70506",
              "P 337-288-5411 · E adam@orangeocean.com · W orangeocean.com")

# ---- app plan-room palette (locked design system — internal/marketing B) ----
INK = "#1C2B26"; PAPER = "#EDEFE8"; CARD = "#F6F7F1"; BRASS = "#A87E2F"
SAGE = "#5F6E64"; GRN = "#2F6B4F"; ANCH = "#1E4F3C"; BRICK = "#C25E33"
FONT_DISPLAY = "'Big Shoulders Display',sans-serif"
FONT_BODY = "'Public Sans',sans-serif"
FONT_MONO = "'IBM Plex Mono',monospace"
