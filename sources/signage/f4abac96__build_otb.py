#!/usr/bin/env python3
"""Build complete ON_THE_BOULEVARD production system."""
import json, os, shutil, re, csv
from pathlib import Path

ROOT = Path("/home/ubuntu/ON_THE_BOULEVARD")
UPLOADS = Path("/home/ubuntu/Shared/Uploads")
DB = json.load(open("/home/ubuntu/tenant_database.json"))
TENANTS = DB["tenants"]

# Square footage map (approximate, based on unit pattern; only Pink Paisley known = 9928)
SQFT = {"101-103": 9928}

def slug(name):
    s = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")
    return s

# ---- 1. Folder structure
(ROOT / "TENANTS").mkdir(parents=True, exist_ok=True)
for d in ["SITE_PLANS", "LEASING_DECKS", "PORTFOLIO_EXPORTS", "BRAND_SYSTEM"]:
    (ROOT / d).mkdir(exist_ok=True)

# Symlink MASTER_PROMPTS -> prompt_library
mp = ROOT / "MASTER_PROMPTS"
if not mp.exists():
    mp.symlink_to("/home/ubuntu/prompt_library")

# Extra logo variants -> dict of tenant_slug -> list of (src, label)
EXTRA_LOGOS = {
    "Graze_Acadiana": [(UPLOADS / "Graze-Logo-Updates-05-1024x1024.webp", "graze_alt_variant.webp")],
    "Great_American_Cookie": [(UPLOADS / "great_american_cookie.png", "great_american_cookie_legacy.png")],
    "JC_Kate_Boutique": [(UPLOADS / "jc_kate_boutique.jpg", "jc_kate_boutique_alt.jpg")],
}

logo_mapping = {}
for t in TENANTS:
    name = t["tenant_name"]
    unit = t["unit_number"]
    tslug = slug(f"{unit}_{name}")
    tdir = ROOT / "TENANTS" / tslug
    for sub in ["logo_source", "prompts", "renders", "finals", "revisions"]:
        (tdir / sub).mkdir(parents=True, exist_ok=True)

    placed = []
    src = t.get("logo_file", "")
    if src and Path(src).exists():
        dest = tdir / "logo_source" / Path(src).name
        shutil.copy2(src, dest)
        placed.append(str(dest))
    # Extras
    for extra_src, extra_name in EXTRA_LOGOS.get(tslug, []):
        if extra_src.exists():
            dest = tdir / "logo_source" / extra_name
            shutil.copy2(extra_src, dest)
            placed.append(str(dest))

    if not placed:
        (tdir / "logo_source" / "README.md").write_text(
            f"# Logo Needed: {name} (Unit {unit})\n\n"
            f"No logo asset is currently on file for this tenant.\n\n"
            f"**Action items:**\n"
            f"- Request high-resolution logo (PNG with transparency preferred, SVG ideal)\n"
            f"- Confirm brand colors (CMYK + HEX)\n"
            f"- Confirm illumination preference: `{t.get('illumination_type','TBD')}`\n"
            f"- Place file(s) in this directory and update `tenant_database.json`\n"
        )

    logo_mapping[name] = {
        "unit_number": unit,
        "tenant_dir": str(tdir),
        "logos_placed": placed,
        "has_logo": bool(placed),
        "category": t["category"],
    }

# ---- 2. logo_mapping.json
(ROOT / "TENANTS" / "logo_mapping.json").write_text(json.dumps(logo_mapping, indent=2))

# ---- 3. Copy reference materials
# Site plans
for f in ["Clean Plat Simple.jpg", "Clean Plat Simple.pdf", "Plat of Survey Detailed (2).pdf",
          "Site Plan.png", "Tenant Overlaid.jpeg", "Tenant List.png", "LOGO LIST.pdf",
          "LOGO LIST.xlsx", "TENANT LOGO.pdf"]:
    sp = UPLOADS / f
    if sp.exists():
        shutil.copy2(sp, ROOT / "SITE_PLANS" / f)

# Master prompt -> BRAND_SYSTEM
mpf = UPLOADS / "FINAL MASTER PROMPT — ON THE BLVD S.txt"
if mpf.exists():
    shutil.copy2(mpf, ROOT / "BRAND_SYSTEM" / "FINAL_MASTER_PROMPT.txt")

print("Folder structure + logos done.")
print(f"Tenants processed: {len(TENANTS)}")
print(f"Logos placed: {sum(1 for v in logo_mapping.values() if v['has_logo'])}")
