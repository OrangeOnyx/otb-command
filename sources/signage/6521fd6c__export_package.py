#!/usr/bin/env python3
"""
Batch Export Script
===================
Builds curated ZIP packages from finalized renderings.

Package types (defined in config.yaml -> export_packages):
    leasing_deck, investor_package, site_plan, broker_marketing

Usage:
    python export_package.py --package leasing_deck
    python export_package.py --package investor_package --tenants "The Pink Paisley" "HOTWORX"
    python export_package.py --custom hero_storefront,dusk_illuminated --name my_export
"""
from __future__ import annotations

import argparse
import json
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from utils import (
    VALID_DELIVERABLES,
    ensure_dir,
    find_tenant,
    load_config,
    load_tenant_db,
    setup_logging,
    slugify,
)


def collect_files(tenant_slug: str, deliverables: List[str], cfg) -> List[Path]:
    base = Path(cfg["paths"]["production_root"]) / tenant_slug
    candidates = []
    for sub in ("finals", "renders"):
        d = base / sub
        if not d.exists():
            continue
        for p in d.glob("*"):
            if p.suffix.lower() not in cfg["qc"]["allowed_formats"]:
                continue
            if any(dl in p.stem.lower() for dl in deliverables):
                candidates.append(p)
    # Prefer "finals" over "renders" by deduping on (tenant_slug, deliverable)
    return candidates


def build_manifest(package_name: str, definition: Dict, included: Dict[str, List[Path]]) -> str:
    lines = [
        f"# Export Package — {package_name}",
        "",
        f"- **Description:** {definition.get('description','')}",
        f"- **Generated:** {datetime.now().isoformat()}",
        f"- **Deliverables:** {', '.join(definition['deliverables'])}",
        "",
        "## Contents",
        "",
    ]
    for tenant_slug, files in sorted(included.items()):
        lines.append(f"### {tenant_slug}")
        for f in files:
            lines.append(f"- {f.name}")
        lines.append("")
    return "\n".join(lines)


def make_zip(out_zip: Path, package_name: str, definition: Dict,
             included: Dict[str, List[Path]], cfg, logger):
    ensure_dir(out_zip.parent)
    manifest = build_manifest(package_name, definition, included)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{package_name}/MANIFEST.md", manifest)
        zf.writestr(f"{package_name}/manifest.json", json.dumps(
            {"package": package_name, "definition": definition,
             "tenants": {k: [p.name for p in v] for k, v in included.items()}},
            indent=2))
        for slug, files in included.items():
            for f in files:
                zf.write(f, arcname=f"{package_name}/{slug}/renderings/{f.name}")
            if definition.get("include_logos"):
                logo_dir = Path(cfg["paths"]["production_root"]) / slug / "logo_source"
                if logo_dir.exists():
                    for logo in logo_dir.glob("*"):
                        zf.write(logo, arcname=f"{package_name}/{slug}/logo/{logo.name}")
    logger.info(f"📦 Wrote {out_zip}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build export packages.")
    parser.add_argument("--package", help="Predefined package name from config.yaml")
    parser.add_argument("--custom", help="Comma-separated deliverable types for custom package")
    parser.add_argument("--name", help="Custom package name (with --custom)")
    parser.add_argument("--tenants", nargs="*", help="Limit to these tenants")
    parser.add_argument("--output", help="Output ZIP path")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("export_package",
                           log_file=Path(cfg["paths"]["logs"]) / "export.log")
    tenants_db = load_tenant_db(cfg["paths"]["tenant_database"])

    if args.custom:
        deliverables = [d.strip() for d in args.custom.split(",")]
        invalid = [d for d in deliverables if d not in VALID_DELIVERABLES]
        if invalid:
            logger.error(f"Invalid deliverables: {invalid}")
            return 2
        package_name = args.name or "custom_export"
        definition = {
            "description": "Custom export",
            "deliverables": deliverables,
            "include_logos": True,
        }
    elif args.package:
        packages = cfg.get("export_packages", {})
        if args.package not in packages:
            logger.error(f"Unknown package {args.package}. Available: {list(packages)}")
            return 2
        package_name = args.package
        definition = packages[args.package]
    else:
        parser.error("Provide --package or --custom")

    selected_tenants = tenants_db
    if args.tenants:
        selected_tenants = [t for t in (find_tenant(tenants_db, n) for n in args.tenants) if t]

    included = {}
    for t in selected_tenants:
        slug = slugify(t["tenant_name"])
        files = collect_files(slug, definition["deliverables"], cfg)
        if files:
            included[slug] = files
        else:
            logger.warning(f"No assets for {t['tenant_name']}")

    if not included:
        logger.error("No files to package.")
        return 1

    out_zip = Path(args.output) if args.output else (
        ensure_dir(cfg["paths"]["exports"]) /
        f"{package_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    )
    make_zip(out_zip, package_name, definition, included, cfg, logger)
    print(f"Package ready: {out_zip}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
