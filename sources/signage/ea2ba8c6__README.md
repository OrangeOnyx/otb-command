# On The Boulevard — Signage Rendering Toolkit

Production automation suite for tenant signage rendering. Generates stacked AI
prompts, runs image generation via the Abacus.AI API, performs QC, organizes
deliverables, and builds export packages.

## Installation

```bash
cd /home/ubuntu/scripts
bash setup.sh
```

This installs Python dependencies and creates the runtime folders:

- `/home/ubuntu/generated_prompts/`
- `/home/ubuntu/production/`
- `/home/ubuntu/exports/`
- `/home/ubuntu/scripts/logs/`

## Components

| Script | Purpose |
|---|---|
| `signage_cli.py` | Unified CLI / entry point |
| `generate_prompts.py` | Build stacked prompts from the prompt library |
| `generate_renders.py` | Call the Abacus.AI image generation API |
| `qc_check.py` | Automated QC validation + reports |
| `organize_files.py` | Tenant folder layout + asset placement |
| `production_manager.py` | End-to-end pipeline with resume + tracker |
| `export_package.py` | ZIP export packages (leasing, investor, etc.) |
| `utils.py` | Shared helpers (slugs, naming, prompt stacking, logging) |
| `config.yaml` | Paths, naming, QC thresholds, export definitions |

## Quick start

```bash
# 1) Generate prompts for everyone
python3 signage_cli.py generate-prompts --batch-mode

# 2) Generate renders
python3 signage_cli.py generate-renders --batch-mode

# 3) Run QC across everything
python3 signage_cli.py qc-check --all

# 4) Organize into per-tenant folders
python3 signage_cli.py organize --auto

# 5) Build a leasing deck ZIP
python3 signage_cli.py export --package leasing_deck
```

### Full pipeline for one tenant

```bash
python3 signage_cli.py workflow --tenant "The Pink Paisley"
```

### Resume an interrupted batch

```bash
python3 signage_cli.py workflow --all-tenants --resume
```

### Interactive guided mode

```bash
python3 signage_cli.py interactive
```

## Naming conventions

- Prompt files: `{tenant_slug}_{variant}_{deliverable_type}.txt`
- Render files: `{tenant_slug}_{variant}_{deliverable_type}_{timestamp}.png`
- Deliverable types: `hero_storefront`, `dusk_illuminated`, `signage_close_up`, `context_streetscape`

## Per-tenant folder structure

```
production/<tenant_slug>/
    logo_source/
    prompts/
    renders/
    finals/
    revisions/   # QC reports land here
```

## Configuration

Edit `config.yaml` to change paths, QC thresholds, naming, or export package
definitions. Every script reads it via `utils.load_config()`.

## Logs & tracker

- Logs: `scripts/logs/*.log`
- Render log (JSONL): `scripts/logs/renders.jsonl`
- Workflow state (resume): `scripts/logs/workflow_state.json`
- Production tracker: `production/production_tracker.json`
