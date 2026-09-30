#!/usr/bin/env python3
"""
File Organization Script
========================
Creates the per-tenant folder structure and moves assets into place.

Folder layout (per tenant):
    production/<tenant_slug>/
        logo_source/
        prompts/
        renders/
        finals/
        revisions/

Usage:
    python organize_files.py --auto
    python organize_files.py --tenant "The Pink Paisley"
    python organize_files.py --tree
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from utils import (
    ensure_dir,
    find_tenant,
    load_config,
    load_tenant_db,
    setup_logging,
    slugify,
)


def init_tenant_folders(production_root: Path, slug: str, subfolders) -> Path:
    base = ensure_dir(production_root / slug)
    for sub in subfolders:
        ensure_dir(base / sub)
    return base


def copy_logo(tenant, base: Path, logger):
    logo = tenant.get("logo_file")
    if not logo:
        return
    src = Path(logo)
    if not src.exists():
        logger.warning(f"Logo missing for {tenant['tenant_name']}: {src}")
        return
    dst = base / "logo_source" / src.name
    if not dst.exists():
        shutil.copy2(src, dst)
        logger.info(f"Copied logo -> {dst}")


def move_matching(source_dir: Path, slug: str, dest: Path, logger,
                  patterns=("*.txt", "*.png", "*.jpg", "*.jpeg")) -> int:
    if not source_dir.exists():
        return 0
    moved = 0
    for pat in patterns:
        for f in source_dir.glob(pat):
            if slug in f.stem.lower():
                target = dest / f.name
                if target.exists():
                    continue
                shutil.move(str(f), str(target))
                logger.info(f"Moved {f.name} -> {dest}")
                moved += 1
    return moved


def organize_tenant(tenant, cfg, logger):
    slug = slugify(tenant["tenant_name"])
    production_root = Path(cfg["paths"]["production_root"])
    base = init_tenant_folders(production_root, slug, cfg["tenant_folders"])
    copy_logo(tenant, base, logger)

    # Move prompts
    prompts_src = Path(cfg["paths"]["generated_prompts"])
    move_matching(prompts_src, slug, base / "prompts", logger, patterns=("*.txt",))

    # Move renders
    renders_src = production_root / "_renders"
    move_matching(renders_src, slug, base / "renders", logger,
                  patterns=("*.png", "*.jpg", "*.jpeg"))
    return base


def render_tree(root: Path, max_depth: int = 3) -> str:
    lines = [str(root)]

    def walk(d: Path, prefix: str, depth: int):
        if depth > max_depth:
            return
        entries = sorted([e for e in d.iterdir() if not e.name.startswith(".")])
        for i, e in enumerate(entries):
            connector = "└── " if i == len(entries) - 1 else "├── "
            lines.append(prefix + connector + e.name)
            if e.is_dir():
                extension = "    " if i == len(entries) - 1 else "│   "
                walk(e, prefix + extension, depth + 1)

    if root.exists():
        walk(root, "", 1)
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Organize signage production files.")
    parser.add_argument("--tenant", help="Single tenant to organize")
    parser.add_argument("--auto", action="store_true", help="Organize all tenants")
    parser.add_argument("--tree", action="store_true", help="Print directory tree")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("organize_files",
                           log_file=Path(cfg["paths"]["logs"]) / "organize.log")
    tenants = load_tenant_db(cfg["paths"]["tenant_database"])
    ensure_dir(cfg["paths"]["production_root"])

    if args.tree:
        print(render_tree(Path(cfg["paths"]["production_root"])))
        return 0

    if args.auto:
        for t in tenants:
            organize_tenant(t, cfg, logger)
    elif args.tenant:
        t = find_tenant(tenants, args.tenant)
        if not t:
            logger.error(f"Tenant not found: {args.tenant}")
            return 2
        organize_tenant(t, cfg, logger)
    else:
        parser.error("Provide --auto, --tenant, or --tree")

    logger.info("Organization complete.")
    print(render_tree(Path(cfg["paths"]["production_root"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
