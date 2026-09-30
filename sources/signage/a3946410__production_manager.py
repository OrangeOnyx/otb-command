#!/usr/bin/env python3
"""
Production Workflow Manager
===========================
Orchestrates the full pipeline:
    1. Generate prompts
    2. Generate renders
    3. QC checks
    4. Organize files
    5. Update production tracker

Supports resuming via a JSON state file.

Usage:
    python production_manager.py --tenant "The Pink Paisley"
    python production_manager.py --all-tenants --deliverable-types hero_storefront dusk_illuminated
    python production_manager.py --resume
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from utils import (
    VALID_DELIVERABLES,
    ensure_dir,
    find_tenant,
    load_config,
    load_tenant_db,
    prompt_filename,
    setup_logging,
    slugify,
)

import generate_prompts
import generate_renders
import qc_check
import organize_files


STATE_FILE_NAME = "workflow_state.json"
TRACKER_FILE_NAME = "production_tracker.json"


def load_state(state_path: Path) -> Dict:
    if state_path.exists():
        return json.loads(state_path.read_text())
    return {"completed": [], "started": datetime.now().isoformat()}


def save_state(state_path: Path, state: Dict):
    state_path.write_text(json.dumps(state, indent=2))


def update_tracker(tracker_path: Path, tenant_slug: str, deliverable: str, status: str, extra: Dict = None):
    tracker = {}
    if tracker_path.exists():
        tracker = json.loads(tracker_path.read_text())
    tracker.setdefault(tenant_slug, {})
    tracker[tenant_slug][deliverable] = {
        "status": status,
        "updated_at": datetime.now().isoformat(),
        **(extra or {}),
    }
    tracker_path.write_text(json.dumps(tracker, indent=2))


def process_tenant(tenant, deliverables, cfg, logger, state, state_path,
                   tracker_path, skip_qc: bool = False):
    slug = slugify(tenant["tenant_name"])
    production_root = Path(cfg["paths"]["production_root"])
    tenant_base = ensure_dir(production_root / slug)
    for sub in cfg["tenant_folders"]:
        ensure_dir(tenant_base / sub)

    for d in deliverables:
        key = f"{slug}|{d}"
        if key in state["completed"]:
            logger.info(f"⏭  Skipping completed {key}")
            continue

        # 1. Prompt
        from utils import DELIVERABLE_TO_SCENE, stack_prompt
        variant = DELIVERABLE_TO_SCENE[d]
        prompt_text = stack_prompt(tenant, d, Path(cfg["paths"]["prompt_library"]))
        prompts_dir = ensure_dir(Path(cfg["paths"]["generated_prompts"]))
        pfile = prompts_dir / prompt_filename(slug, variant, d)
        pfile.write_text(prompt_text, encoding="utf-8")
        update_tracker(tracker_path, slug, d, "prompt_ready")
        logger.info(f"📝 Prompt: {pfile.name}")

        # 2. Render
        renders_dir = ensure_dir(production_root / "_renders")
        rendered = generate_renders.generate_one(pfile, renders_dir, cfg, logger)
        if not rendered:
            update_tracker(tracker_path, slug, d, "render_failed")
            logger.error(f"❌ Render failed: {key}")
            continue
        update_tracker(tracker_path, slug, d, "rendered", {"file": str(rendered)})

        # 3. QC
        if not skip_qc:
            result = qc_check.check_image(rendered, tenant, cfg)
            qc_check.save_report(result, cfg, logger)
            update_tracker(tracker_path, slug, d,
                           "qc_pass" if result["pass"] else "qc_fail",
                           {"file": str(rendered)})

        # 4. Organize
        organize_files.organize_tenant(tenant, cfg, logger)

        state["completed"].append(key)
        save_state(state_path, state)
        logger.info(f"✅ Completed {key}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Production workflow manager")
    parser.add_argument("--tenant", help="Single tenant to process")
    parser.add_argument("--all-tenants", action="store_true")
    parser.add_argument("--deliverable-types", nargs="+", choices=VALID_DELIVERABLES,
                        default=VALID_DELIVERABLES)
    parser.add_argument("--skip-qc", action="store_true")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from previous state file")
    parser.add_argument("--reset", action="store_true",
                        help="Reset workflow state before running")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("production_manager",
                           log_file=Path(cfg["paths"]["logs"]) / "production.log")

    tenants = load_tenant_db(cfg["paths"]["tenant_database"])
    state_path = Path(cfg["paths"]["logs"]) / STATE_FILE_NAME
    tracker_path = Path(cfg["paths"]["production_root"]) / TRACKER_FILE_NAME
    ensure_dir(state_path.parent)
    ensure_dir(tracker_path.parent)

    if args.reset and state_path.exists():
        state_path.unlink()
    state = load_state(state_path)

    if args.all_tenants:
        targets = tenants
    elif args.tenant:
        t = find_tenant(tenants, args.tenant)
        if not t:
            logger.error(f"Tenant not found: {args.tenant}")
            return 2
        targets = [t]
    else:
        parser.error("Provide --tenant or --all-tenants")

    total = len(targets) * len(args.deliverable_types)
    logger.info(f"Starting workflow: {len(targets)} tenant(s) × "
                f"{len(args.deliverable_types)} deliverable(s) = {total} jobs")

    for i, t in enumerate(targets, 1):
        logger.info(f"[{i}/{len(targets)}] Tenant: {t['tenant_name']}")
        try:
            process_tenant(t, args.deliverable_types, cfg, logger,
                           state, state_path, tracker_path,
                           skip_qc=args.skip_qc)
        except Exception as e:
            logger.exception(f"Error processing {t['tenant_name']}: {e}")
            continue

    logger.info("Workflow finished.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
