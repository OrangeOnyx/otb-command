import shutil
from pathlib import Path
ROOT = Path("/home/ubuntu/ON_THE_BOULEVARD/TENANTS")
UP = Path("/home/ubuntu/Shared/Uploads")
extras = [
    ("113_Graze_Acadiana", "Graze-Logo-Updates-05-1024x1024.webp", "graze_alt_variant.webp"),
    ("107_Great_American_Cookie", "great_american_cookie.png", "great_american_cookie_legacy.png"),
    ("109_JC_Kate_Boutique", "jc_kate_boutique.jpg", "jc_kate_boutique_alt.jpg"),
]
for tdir, src, dst in extras:
    s = UP / src
    d = ROOT / tdir / "logo_source" / dst
    if s.exists():
        shutil.copy2(s, d)
        print("copied", d)

# Update logo_mapping.json
import json
mp = ROOT / "logo_mapping.json"
m = json.load(open(mp))
m["Graze Acadiana"]["logos_placed"].append(str(ROOT/"113_Graze_Acadiana/logo_source/graze_alt_variant.webp"))
m["Great American Cookie"]["logos_placed"].append(str(ROOT/"107_Great_American_Cookie/logo_source/great_american_cookie_legacy.png"))
m["JC Kate Boutique"]["logos_placed"].append(str(ROOT/"109_JC_Kate_Boutique/logo_source/jc_kate_boutique_alt.jpg"))
json.dump(m, open(mp,"w"), indent=2)
print("mapping updated")
