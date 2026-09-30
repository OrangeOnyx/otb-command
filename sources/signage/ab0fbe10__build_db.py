import json, os
U = "/home/ubuntu/Shared/Uploads"

tenants = [
    ("101-103","The Pink Paisley","boutique","A","101 the_pink_paisley.png","halo-lit channel letters","Anchor boutique; large frontage 9,928 sqft"),
    ("105","Painted Bayou","boutique","A","painted_bayou.png","halo-lit channel letters",""),
    ("107","Great American Cookie","restaurant","B","great_american_cookie_newer.png","face-lit channel letters","Bakery / dessert"),
    ("109","JC Kate Boutique","boutique","A","jc_kate_boutique.png","halo-lit channel letters",""),
    ("111","Lola Pink","boutique","A","lola_pink.png","halo-lit channel letters",""),
    ("113","Graze Acadiana","restaurant","B","graze_oil_logo.png","face-lit channel letters","Restaurant"),
    ("115-117","The Clothing Loft","boutique","A","the_clothing_loft.png","halo-lit channel letters",""),
    ("117 1/2","Victoria Nails","salon","C","victoria_nails.png","face-lit channel letters","Nail salon"),
    ("119","Oupac","financial","C","oupac.png","face-lit channel letters","Consumer lending"),
    ("119 1/2","Cat Clinic of Lafayette","medical","C","","face-lit channel letters","Veterinary - no logo file available"),
    ("121","Magnolia Salon","salon","A","magnolia_salon.jpg","halo-lit channel letters",""),
    ("123","The Tux Shoppe","retail","A","the_tux_shoppe.png","halo-lit channel letters","Formalwear"),
    ("125-127","Jordan Amanda","boutique","A","jordan_amanda.png","halo-lit channel letters","Jewelry/boutique"),
    ("129","HotWorx","fitness","B","hotworx.png","face-lit channel letters","Infrared fitness studio"),
    ("131","Vacant","vacant","B","","","Available for lease"),
    ("133","Vacant","vacant","B","","","Available for lease"),
    ("135A","C Wolf Barber Shop","salon","C","c_wolf_barber_shop.png","face-lit channel letters","Barber"),
    ("135B","Belle Realty","services","C","","face-lit channel letters","On-site management office"),
    ("137","Greek Expressions","retail","A","greek_expressions.png","halo-lit channel letters","Sorority/greek apparel"),
    ("139/141","Fast Pass Tag & Title","services","C","fastpass_tag_title.png","face-lit channel letters","Auto title services"),
    ("143","1st Franklin Financial","financial","C","1st_franklin_financial.png","face-lit channel letters","Consumer lending"),
    ("145","Blvd Nutrition","restaurant","B","","face-lit channel letters","Nutrition/smoothie bar"),
    ("149","Jason's Deli","restaurant","B","","face-lit channel letters","Anchor restaurant - national brand"),
    ("Historic","Mary Ellen's","retail","A","Mary Ellens.png","halo-lit channel letters","Logo on file from prior tenant roster"),
    ("Historic","Rehabilitation Services","medical","C","Rehabilitation Services.png","face-lit channel letters","Logo on file from prior tenant roster"),
]

data = {"tenants": []}
for unit, name, cat, fam, logo, illum, notes in tenants:
    logo_path = f"/home/ubuntu/Shared/Uploads/{logo}" if logo else ""
    if logo and not os.path.exists(logo_path):
        logo_path = ""
    data["tenants"].append({
        "tenant_name": name,
        "unit_number": str(unit),
        "category": cat,
        "facade_family": fam,
        "logo_file": logo_path,
        "illumination_type": illum,
        "notes": notes,
    })

with open("/home/ubuntu/tenant_database.json","w") as f:
    json.dump(data, f, indent=2)

# Report
from collections import Counter
total = len(data["tenants"])
active = [t for t in data["tenants"] if t["category"] != "vacant"]
with_logo = [t for t in data["tenants"] if t["logo_file"]]
without_logo = [t for t in active if not t["logo_file"]]
cats = Counter(t["category"] for t in data["tenants"])
fams = Counter(t["facade_family"] for t in data["tenants"] if t["facade_family"])

lines = [
    "# Tenant Extraction Report — On The Boulevard Shopping Center",
    "_Lafayette, Louisiana · Belle Realty of Lafayette, LLC_","",
    "## Summary",
    f"- **Total records:** {total}",
    f"- **Active tenants:** {len(active)}",
    f"- **Vacant units:** {sum(1 for t in data['tenants'] if t['category']=='vacant')}",
    f"- **Tenants with logo files:** {len(with_logo)}",
    f"- **Active tenants missing logos:** {len(without_logo)}","",
    "## Tenants Missing Logos",
] + [f"- Unit {t['unit_number']}: {t['tenant_name']}" for t in without_logo] + [
    "","## Category Breakdown",
] + [f"- {k}: {v}" for k,v in cats.most_common()] + [
    "","## Facade Family Distribution",
    "- A: Luxury Lifestyle  |  B: Modern Retail  |  C: Mixed-Use Urban","",
] + [f"- Family {k}: {v} tenants" for k,v in sorted(fams.items())] + [
    "","## Full Roster",
    "| Unit | Tenant | Category | Family | Logo |",
    "|---|---|---|---|---|",
] + [f"| {t['unit_number']} | {t['tenant_name']} | {t['category']} | {t['facade_family']} | {'✓' if t['logo_file'] else '—'} |" for t in data["tenants"]]

open("/home/ubuntu/tenant_extraction_report.md","w").write("\n".join(lines))
print("OK", total, "tenants;", len(with_logo), "with logos")
