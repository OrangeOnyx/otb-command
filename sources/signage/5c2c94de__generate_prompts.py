#!/usr/bin/env python3
"""
Batch Prompt Generator
======================
Reads the tenant database and the modular prompt library, then assembles
fully-stacked prompts for tenant + deliverable combinations.

Usage:
    python generate_prompts.py --tenant "The Pink Paisley" --deliverable-type hero_storefront
    python generate_prompts.py --batch-mode
    python generate_prompts.py --batch-mode --deliverable-type dusk_illuminated
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from utils import (
    DELIVERABLE_TO_SCENE,
    VALID_DELIVERABLES,
    ensure_dir,
    find_tenant,
    load_config,
    load_tenant_db,
    prompt_filename,
    setup_logging,
    slugify,
    stack_prompt,
)


def generate_for_tenant(tenant, deliverables, variants, prompt_library, out_dir, logger):
    written = []
    for d in deliverables:
        variant = variants.get(d) or DELIVERABLE_TO_SCENE[d]
        try:
            text = stack_prompt(tenant, d, prompt_library, variant=variant)
        except Exception as e:
            logger.error(f"Failed prompt for {tenant['tenant_name']} / {d}: {e}")
            continue
        slug = slugify(tenant["tenant_name"])
        fname = prompt_filename(slug, variant, d)
        out_path = Path(out_dir) / fname
        out_path.write_text(text, encoding="utf-8")
        logger.info(f"Wrote {out_path}")
        written.append(out_path)
    return written


def main(argv=None):
    parser = argparse.ArgumentParser(description="Batch prompt generator for signage rendering.")
    parser.add_argument("--tenant", help="Tenant name, slug, or unit number")
    parser.add_argument("--variant", help="Override scene variant (e.g. dusk, daytime)")
    parser.add_argument("--deliverable-type", choices=VALID_DELIVERABLES,
                        help="Deliverable type. Omit to generate all 4.")
    parser.add_argument("--batch-mode", action="store_true",
                        help="Generate for all tenants.")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("generate_prompts",
                           log_file=Path(cfg["paths"]["logs"]) / "generate_prompts.log")

    tenants = load_tenant_db(cfg["paths"]["tenant_database"])
    prompt_library = Path(cfg["paths"]["prompt_library"])
    out_dir = ensure_dir(cfg["paths"]["generated_prompts"])

    deliverables = [args.deliverable_type] if args.deliverable_type else VALID_DELIVERABLES
    variants = {d: args.variant for d in deliverables} if args.variant else {}

    if args.batch_mode:
        targets = tenants
    elif args.tenant:
        t = find_tenant(tenants, args.tenant)
        if not t:
            logger.error(f"Tenant not found: {args.tenant}")
            return 2
        targets = [t]
    else:
        parser.error("Provide --tenant or --batch-mode")
        return 2

    total = 0
    for t in targets:
        written = generate_for_tenant(t, deliverables, variants,
                                      prompt_library, out_dir, logger)
        total += len(written)

    logger.info(f"Done. Wrote {total} prompt file(s) to {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
