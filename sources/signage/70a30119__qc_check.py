#!/usr/bin/env python3
"""
QC Validation Script
====================
Runs automated QC checks against rendered images:
  - Naming convention compliance
  - File format & size
  - Image resolution
  - Image clarity (Laplacian variance, if OpenCV available)
  - Tenant-name spelling reference

Produces per-render markdown reports.

Usage:
    python qc_check.py --image /path/to/render.png
    python qc_check.py --tenant "The Pink Paisley"
    python qc_check.py --all
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
    file_size_kb,
    find_tenant,
    load_config,
    load_tenant_db,
    setup_logging,
    slugify,
)


def check_image(image_path: Path, tenant, cfg) -> Dict:
    qc = cfg["qc"]
    result = {
        "image": str(image_path),
        "tenant": tenant["tenant_name"],
        "timestamp": datetime.now().isoformat(),
        "checks": {},
        "warnings": [],
        "errors": [],
        "manual_review": [],
    }

    # 1. Format
    ext = image_path.suffix.lower()
    fmt_ok = ext in qc["allowed_formats"]
    result["checks"]["format"] = {"value": ext, "pass": fmt_ok}
    if not fmt_ok:
        result["errors"].append(f"Disallowed format {ext}")

    # 2. Size
    size_kb = file_size_kb(image_path)
    size_ok = qc["min_file_size_kb"] <= size_kb <= qc["max_file_size_mb"] * 1024
    result["checks"]["file_size_kb"] = {"value": round(size_kb, 1), "pass": size_ok}
    if not size_ok:
        result["warnings"].append(f"File size {size_kb:.1f} KB outside allowed range")

    # 3. Naming
    slug = slugify(tenant["tenant_name"])
    stem = image_path.stem.lower()
    name_ok = slug in stem and any(d in stem for d in VALID_DELIVERABLES)
    result["checks"]["naming_convention"] = {"value": image_path.name, "pass": name_ok}
    if not name_ok:
        result["errors"].append("Filename does not follow naming convention")

    # 4. Resolution + clarity
    res_ok = True
    clarity_ok = True
    try:
        from PIL import Image
        with Image.open(image_path) as im:
            w, h = im.size
        min_w, min_h = qc["min_resolution"]
        res_ok = w >= min_w and h >= min_h
        result["checks"]["resolution"] = {"value": f"{w}x{h}", "pass": res_ok}
        if not res_ok:
            result["warnings"].append(f"Resolution {w}x{h} below minimum {min_w}x{min_h}")
    except ImportError:
        result["manual_review"].append("Pillow not available — verify resolution manually")
        result["checks"]["resolution"] = {"value": "unknown", "pass": None}

    try:
        import cv2  # type: ignore
        import numpy as np  # noqa: F401
        img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
        if img is not None:
            lap = cv2.Laplacian(img, cv2.CV_64F).var()
            clarity_ok = lap >= cfg["qc"]["blur_threshold"]
            result["checks"]["clarity_laplacian_var"] = {
                "value": round(float(lap), 2), "pass": clarity_ok
            }
            if not clarity_ok:
                result["warnings"].append(f"Possible blur (laplacian var {lap:.1f})")
    except ImportError:
        result["manual_review"].append("OpenCV not available — verify clarity manually")

    # 5. Spelling reference (we cannot OCR by default — flag manual)
    result["manual_review"].append(
        f"Verify tenant signage text spells: '{tenant['tenant_name']}'"
    )

    result["pass"] = not result["errors"]
    return result


def report_md(result: Dict) -> str:
    lines = [
        f"# QC Report — {Path(result['image']).name}",
        "",
        f"- **Tenant:** {result['tenant']}",
        f"- **Timestamp:** {result['timestamp']}",
        f"- **Overall:** {'✅ PASS' if result['pass'] else '❌ FAIL'}",
        "",
        "## Automated Checks",
        "",
        "| Check | Value | Result |",
        "|---|---|---|",
    ]
    for name, data in result["checks"].items():
        p = data.get("pass")
        mark = "✅" if p else ("⚠️" if p is None else "❌")
        lines.append(f"| {name} | {data.get('value')} | {mark} |")
    if result["errors"]:
        lines += ["", "## Errors"] + [f"- ❌ {e}" for e in result["errors"]]
    if result["warnings"]:
        lines += ["", "## Warnings"] + [f"- ⚠️ {w}" for w in result["warnings"]]
    if result["manual_review"]:
        lines += ["", "## Manual Review Required"] + [f"- 👁️ {m}" for m in result["manual_review"]]
    return "\n".join(lines)


def save_report(result: Dict, cfg, logger) -> Path:
    slug = slugify(result["tenant"])
    revisions = Path(cfg["paths"]["production_root"]) / slug / "revisions"
    ensure_dir(revisions)
    base = Path(result["image"]).stem
    md = revisions / f"QC_{base}.md"
    js = revisions / f"QC_{base}.json"
    md.write_text(report_md(result), encoding="utf-8")
    js.write_text(json.dumps(result, indent=2), encoding="utf-8")
    logger.info(f"QC report -> {md}")
    return md


def find_images_for_tenant(tenant, cfg) -> List[Path]:
    slug = slugify(tenant["tenant_name"])
    base = Path(cfg["paths"]["production_root"]) / slug / "renders"
    extra = Path(cfg["paths"]["production_root"]) / "_renders"
    results = []
    for d in (base, extra):
        if d.exists():
            for p in d.glob("*"):
                if p.suffix.lower() in cfg["qc"]["allowed_formats"] and slug in p.stem.lower():
                    results.append(p)
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description="QC checks for rendered signage images.")
    parser.add_argument("--image", help="Single image to check")
    parser.add_argument("--tenant", help="Run on all images for a tenant")
    parser.add_argument("--all", action="store_true", help="Run on every tenant")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("qc_check",
                           log_file=Path(cfg["paths"]["logs"]) / "qc.log")
    tenants = load_tenant_db(cfg["paths"]["tenant_database"])

    targets = []  # list of (tenant, image_path)
    if args.image:
        img = Path(args.image)
        if not img.exists():
            logger.error(f"Image not found: {img}")
            return 2
        slug = img.stem.split("_")[0]
        # naive match by slug prefix
        tenant = next((t for t in tenants if slugify(t["tenant_name"]).startswith(slug)), None)
        if not tenant and args.tenant:
            tenant = find_tenant(tenants, args.tenant)
        if not tenant:
            tenant = {"tenant_name": "Unknown"}
        targets.append((tenant, img))
    elif args.tenant:
        t = find_tenant(tenants, args.tenant)
        if not t:
            logger.error(f"Tenant not found: {args.tenant}")
            return 2
        targets = [(t, p) for p in find_images_for_tenant(t, cfg)]
    elif args.all:
        for t in tenants:
            for p in find_images_for_tenant(t, cfg):
                targets.append((t, p))
    else:
        parser.error("Provide --image, --tenant, or --all")

    if not targets:
        logger.warning("No images found to check.")
        return 0

    fails = 0
    for tenant, img in targets:
        r = check_image(img, tenant, cfg)
        save_report(r, cfg, logger)
        if not r["pass"]:
            fails += 1
        # console visual
        print(report_md(r))
        print()
    logger.info(f"QC complete: {len(targets) - fails}/{len(targets)} passed")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
