#!/usr/bin/env python3
"""Generate PROJECT_SUMMARY, DIRECTORY_TREE, and per-folder READMEs."""
import json, os
from pathlib import Path

ROOT = Path("/home/ubuntu/ON_THE_BOULEVARD")
DB = json.load(open("/home/ubuntu/tenant_database.json"))
TENANTS = DB["tenants"]
LOGO_MAP = json.load(open(ROOT / "TENANTS" / "logo_mapping.json"))

# ---- TENANTS/README.md
(ROOT / "TENANTS" / "README.md").write_text(f"""# Tenants Directory

One subfolder per tenant, named `{{UNIT}}_{{Tenant_Name}}` (non-alphanumeric chars → `_`).

## Subfolder layout (per tenant)

| Folder | Contents |
|--------|----------|
| `logo_source/` | Original logo files supplied by tenant/brand owner |
| `prompts/`     | Generated layered prompts for each scene |
| `renders/`     | Raw AI-generated renders (timestamped, never overwritten) |
| `finals/`      | Approved, QC-passed renders ready for deliverables |
| `revisions/`   | Rejected renders + revision notes, kept for audit |

## Tenant count: **{len(TENANTS)}**

- Logos on file: **{sum(1 for v in LOGO_MAP.values() if v['has_logo'])}**
- Logos needed: **{sum(1 for v in LOGO_MAP.values() if not v['has_logo'])}**

See `logo_mapping.json` for the complete logo placement map.

## Editing rules

- **Do not** rename tenant folders by hand. Re-run `/home/ubuntu/build_otb.py`
  after editing `tenant_database.json`.
- **Do** keep `logo_source/` clean — only original brand assets.
""")

# ---- SITE_PLANS/README.md
(ROOT / "SITE_PLANS" / "README.md").write_text("""# Site Plans

Source plats, site plans, and tenant overlays for On The Boulevard.

| File | Purpose |
|------|---------|
| `Clean Plat Simple.{jpg,pdf}` | Clean plat for overlays |
| `Plat of Survey Detailed (2).pdf` | Detailed survey |
| `Site Plan.png` | Marketing site plan |
| `Tenant Overlaid.jpeg` | Tenant-overlaid version |
| `Tenant List.png` | Current tenant roster image |
| `LOGO LIST.{pdf,xlsx}` | Reference logo list |
| `TENANT LOGO.pdf` | Tenant logo packet |

Use these as base layers when producing leasing decks or investor packages.
Never edit originals — copy first, then annotate.
""")

# ---- DIRECTORY_TREE.txt
def tree(p, prefix=""):
    lines = []
    entries = sorted([e for e in p.iterdir()], key=lambda e: (e.is_file(), e.name.lower()))
    for i, e in enumerate(entries):
        last = i == len(entries) - 1
        conn = "└── " if last else "├── "
        if e.is_dir() and not e.is_symlink():
            cnt = sum(1 for _ in e.rglob("*") if _.is_file())
            lines.append(f"{prefix}{conn}{e.name}/  ({cnt} files)")
            ext = "    " if last else "│   "
            # Limit depth a bit for tenant subdirs
            if "TENANTS" in str(e) and e.parent.name == "TENANTS":
                # show only one level inside each tenant
                sub_entries = sorted([s for s in e.iterdir()])
                for j, s in enumerate(sub_entries):
                    slast = j == len(sub_entries) - 1
                    sconn = "└── " if slast else "├── "
                    if s.is_dir():
                        scnt = sum(1 for _ in s.rglob("*") if _.is_file())
                        lines.append(f"{prefix}{ext}{sconn}{s.name}/  ({scnt} files)")
                    else:
                        lines.append(f"{prefix}{ext}{sconn}{s.name}")
            else:
                lines.extend(tree(e, prefix + ext))
        elif e.is_symlink():
            target = os.readlink(e)
            lines.append(f"{prefix}{conn}{e.name} -> {target}  (symlink)")
        else:
            lines.append(f"{prefix}{conn}{e.name}")
    return lines

annotations = {
    "TENANTS": "  ← one folder per tenant",
    "MASTER_PROMPTS": "  ← layered prompt library",
    "SITE_PLANS": "  ← plats & overlays",
    "LEASING_DECKS": "  ← leasing deliverables",
    "PORTFOLIO_EXPORTS": "  ← investor/broker packages",
    "BRAND_SYSTEM": "  ← master prompt & brand standards",
}

header = f"""ON_THE_BOULEVARD — Directory Tree
Generated automatically.

ON_THE_BOULEVARD/
"""
lines = tree(ROOT, "")
# annotate top-level
annotated = []
for line in lines:
    matched = False
    for k, v in annotations.items():
        if line.strip().startswith("├── " + k) or line.strip().startswith("└── " + k):
            annotated.append(line + v)
            matched = True
            break
    if not matched:
        annotated.append(line)

(ROOT / "DIRECTORY_TREE.txt").write_text(header + "\n".join(annotated) + "\n")

# ---- PROJECT_SUMMARY.md
active = [t for t in TENANTS if t["category"] != "vacant"]
vacant = [t for t in TENANTS if t["category"] == "vacant"]
needed = [n for n, v in LOGO_MAP.items() if not v["has_logo"] and v["category"] != "vacant"]
by_cat = {}
for t in TENANTS:
    by_cat.setdefault(t["category"], []).append(t["tenant_name"])

roster_table = "\n".join(
    f"| {t['tenant_name']} | {t['unit_number']} | {t['category'].title()} | "
    f"{t['facade_family']} | {'✅' if LOGO_MAP[t['tenant_name']]['has_logo'] else ('—' if t['category']=='vacant' else '❌')} |"
    for t in TENANTS
)

cat_summary = "\n".join(f"- **{c.title()}** ({len(v)}): {', '.join(v)}" for c, v in sorted(by_cat.items()))

(ROOT / "PROJECT_SUMMARY.md").write_text(f"""# Project Summary — On The Boulevard Signage Rendering System

## What Has Been Built

A complete, turnkey production pipeline for generating photoreal AI signage
renderings for every tenant at On The Boulevard:

- **Source-of-truth tenant database** with 25 records.
- **Modular prompt library** (3 layers + tenant overrides, 14+ prompt fragments).
- **Automation suite** (8 Python scripts behind one `signage_cli.py` entry point).
- **Production folder structure** at `/home/ubuntu/ON_THE_BOULEVARD/` with
  per-tenant directories, site plans, brand system, and export targets.
- **Production tracker workbook** (5 sheets, data validation, conditional
  formatting) plus CSV mirror.
- **Full operator documentation**: README, Operator Guide, Quick-Start,
  System Architecture, Directory Tree, this summary.

## Current Capabilities

- Generate layered prompts per tenant/scene from one command.
- Batch-render any subset (single tenant, single scene, all tenants, all scenes).
- Automated QC checks for resolution, aspect, integrity.
- One-command export to leasing, investor, or broker deliverable packs.
- Live production status via the tracker workbook.
- Versioned, audit-friendly file structure (timestamped renders, separate
  `revisions/` and `finals/`).

## Tenant Roster ({len(TENANTS)} units — {len(active)} active, {len(vacant)} vacant)

| Tenant | Unit | Category | Facade | Logo |
|--------|------|----------|--------|------|
{roster_table}

## Roster by Category

{cat_summary}

## Logo Asset Inventory

- **On file**: {sum(1 for v in LOGO_MAP.values() if v['has_logo'])} tenants
- **Needed**: {len(needed)} tenants → {', '.join(needed) if needed else 'none'}
- **N/A (vacant)**: {len(vacant)}
- **Multi-variant logos**: Graze Acadiana, Great American Cookie, JC Kate Boutique

See `TENANTS/logo_mapping.json` for the full placement record.

## Next Steps for Production Use

1. **Acquire missing logos** for: {', '.join(needed) if needed else 'none'}.
2. **Generate prompts** for all active tenants: `signage_cli.py prompts --all`.
3. **Run the first hero batch**: `signage_cli.py render --all --scene hero_storefront`.
4. **QC pass** and log results in `PRODUCTION_TRACKER.xlsx → QC Log`.
5. **Promote approved renders** from `renders/ → finals/`.
6. **Build the first investor export**: `signage_cli.py export --all --target investor`.

## Maintenance Recommendations

- **Weekly**: snapshot `/home/ubuntu/ON_THE_BOULEVARD/` and `tenant_database.json`.
- **Per tenant change**: edit DB → re-run `build_otb.py` → update tracker row.
- **Per prompt-library edit**: regenerate prompts only for affected tenants.
- **Quarterly**: archive old `revisions/` contents to cold storage.
- **Audit**: keep the QC Log current — it's your evidence trail for investor decks.
""")

print("All finalization docs written.")
