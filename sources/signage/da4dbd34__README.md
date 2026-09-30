# On The Boulevard — Tenant Signage Rendering System

A turnkey production system for generating photoreal AI-rendered storefront signage
visualizations for every tenant at **On The Boulevard** (Lafayette, LA).

---

## What This System Does

1. **Stores** every tenant's brand assets, prompts, and renders in a consistent folder layout.
2. **Generates** AI-image prompts by stacking modular prompt layers (global → category → scene → tenant).
3. **Renders** photoreal signage visualizations through the scripted CLI pipeline.
4. **Tracks** production status, QC, and deliverables in a master spreadsheet.
5. **Exports** packaged deliverables for leasing decks, investor packages, and broker marketing.

---

## Top-Level Map

| Folder / File              | Purpose |
|----------------------------|---------|
| `TENANTS/`                 | One subfolder per tenant — logos, prompts, renders, finals, revisions |
| `MASTER_PROMPTS/`          | Symlink → `/home/ubuntu/prompt_library/` (modular prompt layers) |
| `SITE_PLANS/`              | Plats, site plans, tenant overlays, logo lists |
| `LEASING_DECKS/`           | Leasing & marketing deliverables (PDF/PPT exports) |
| `PORTFOLIO_EXPORTS/`       | Investor-ready and broker-ready packaged exports |
| `BRAND_SYSTEM/`            | Master prompt reference & global brand standards |
| `PRODUCTION_TRACKER.xlsx`  | Master 5-sheet production tracker (tenants, renders, deliverables, QC, metrics) |
| `PRODUCTION_TRACKER.csv`   | CSV mirror of the Master Tenant List sheet |
| `OPERATOR_GUIDE.md`        | Full operator workflow & CLI reference |
| `QUICKSTART.md`            | 5-minute setup + "Your First Rendering" tutorial |
| `SYSTEM_ARCHITECTURE.md`   | Architecture, data flow, and scalability docs |
| `PROJECT_SUMMARY.md`       | Build summary, capabilities, roster, and next steps |
| `DIRECTORY_TREE.txt`       | Annotated visual tree of the entire folder structure |

---

## Where to Start

- **Brand new operator?** → Read `QUICKSTART.md` first, then `OPERATOR_GUIDE.md`.
- **Tracking production?** → Open `PRODUCTION_TRACKER.xlsx`.
- **Adding a tenant or fixing a prompt?** → See `OPERATOR_GUIDE.md` → "Workflow Step-by-Step".
- **Architecture / scaling questions?** → `SYSTEM_ARCHITECTURE.md`.

---

## Supporting Components (outside this folder)

| Path | Role |
|------|------|
| `/home/ubuntu/tenant_database.json` | Single source of truth for tenant data |
| `/home/ubuntu/prompt_library/`      | Modular prompt layers (linked here as `MASTER_PROMPTS/`) |
| `/home/ubuntu/scripts/`             | Automation suite (`signage_cli.py` and helpers) |

---

*Last updated automatically by the build pipeline.*
