#!/usr/bin/env python3
"""
AI Image Generation Script
==========================
Generates architectural renderings from prompt files using the Abacus.AI
image generation API. Implements retry logic and structured output.

Usage:
    python generate_renders.py --prompt-file /path/to/prompt.txt
    python generate_renders.py --batch-mode --prompt-dir /home/ubuntu/generated_prompts
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional

from utils import (
    ensure_dir,
    load_config,
    render_filename,
    setup_logging,
    timestamp,
)


def parse_prompt_filename(fname: str):
    """
    Expected naming: {tenant_slug}_{variant}_{deliverable_type}.txt
    deliverable_type is one of the four known multi-word keys with underscores,
    so we match it from the end.
    """
    base = Path(fname).stem
    known = ["hero_storefront", "dusk_illuminated",
             "signage_close_up", "context_streetscape"]
    for d in known:
        if base.endswith("_" + d):
            head = base[: -(len(d) + 1)]
            # head = tenant_slug + "_" + variant
            # variant is one of: daytime, dusk, close_up, streetscape, corner_suite, inline
            for v in ["daytime", "dusk", "close_up", "streetscape", "corner_suite", "inline"]:
                if head.endswith("_" + v):
                    return head[: -(len(v) + 1)], v, d
            # fallback: last token is variant
            parts = head.rsplit("_", 1)
            return (parts[0] if len(parts) > 1 else head,
                    parts[-1] if len(parts) > 1 else "scene", d)
    parts = base.split("_")
    return ("_".join(parts[:-2]), parts[-2], parts[-1])


def call_abacus_image_api(prompt: str, size: str, quality: str,
                          logger, max_retries: int = 3,
                          backoff: float = 5.0) -> Optional[bytes]:
    """
    Call the Abacus.AI image generation API with retry logic.
    Returns raw PNG bytes or None on failure.
    """
    try:
        import abacusai
    except ImportError:
        logger.error("abacusai SDK not installed. pip install abacusai")
        return None

    client = abacusai.ApiClient()
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Image gen attempt {attempt}/{max_retries} ...")
            # Use SDK image generation. Different SDK builds expose this differently;
            # try the common surfaces.
            result = None
            for method_name in ("generate_image", "evaluate_image_generation",
                                "create_image", "generate_images"):
                if hasattr(client, method_name):
                    method = getattr(client, method_name)
                    try:
                        result = method(prompt=prompt, size=size, quality=quality)
                    except TypeError:
                        result = method(prompt=prompt)
                    break
            if result is None:
                logger.warning("No image generation method found on abacusai client; "
                               "writing prompt as placeholder.")
                return None

            # Result may be bytes, base64 str, dict, or URL
            if isinstance(result, bytes):
                return result
            if isinstance(result, str):
                if result.startswith("http"):
                    import urllib.request
                    with urllib.request.urlopen(result, timeout=120) as r:
                        return r.read()
                try:
                    return base64.b64decode(result)
                except Exception:
                    pass
            if isinstance(result, dict):
                for k in ("image", "image_base64", "b64", "data"):
                    if k in result:
                        v = result[k]
                        if isinstance(v, bytes):
                            return v
                        if isinstance(v, str):
                            try:
                                return base64.b64decode(v)
                            except Exception:
                                continue
                if "url" in result:
                    import urllib.request
                    with urllib.request.urlopen(result["url"], timeout=120) as r:
                        return r.read()
            logger.error(f"Unrecognized API result type: {type(result)}")
            return None
        except Exception as e:
            last_err = e
            logger.warning(f"Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    logger.error(f"All retries exhausted. Last error: {last_err}")
    return None


def generate_one(prompt_file: Path, output_dir: Path, cfg: dict, logger,
                 quality: Optional[str] = None) -> Optional[Path]:
    text = prompt_file.read_text(encoding="utf-8")
    tenant_slug, variant, deliverable = parse_prompt_filename(prompt_file.name)
    api = cfg["api"]
    q = quality or api["default_quality"]
    size = api["default_size"]

    ts = timestamp()
    out_name = render_filename(tenant_slug, variant, deliverable, ts=ts)
    out_path = output_dir / out_name

    logger.info(f"Generating: {prompt_file.name} -> {out_name}")
    img_bytes = call_abacus_image_api(
        prompt=text, size=size, quality=q, logger=logger,
        max_retries=api["max_retries"],
        backoff=api["retry_backoff_seconds"],
    )

    log_entry = {
        "timestamp": ts,
        "prompt_file": str(prompt_file),
        "tenant_slug": tenant_slug,
        "variant": variant,
        "deliverable_type": deliverable,
        "quality": q,
        "size": size,
        "success": img_bytes is not None,
        "output": str(out_path) if img_bytes else None,
    }
    log_path = Path(cfg["paths"]["logs"]) / "renders.jsonl"
    ensure_dir(log_path.parent)
    with open(log_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(log_entry) + "\n")

    if img_bytes is None:
        logger.error(f"Generation failed for {prompt_file.name}")
        return None

    ensure_dir(out_path.parent)
    out_path.write_bytes(img_bytes)
    logger.info(f"Saved {out_path} ({len(img_bytes)/1024:.1f} KB)")
    return out_path


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate AI renderings from prompt files.")
    parser.add_argument("--prompt-file", help="Path to a single prompt .txt file")
    parser.add_argument("--prompt-dir", help="Directory of prompt files (with --batch-mode)")
    parser.add_argument("--output-dir", help="Output directory for renders")
    parser.add_argument("--quality", help="Override default quality (e.g. standard, high)")
    parser.add_argument("--batch-mode", action="store_true")
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    logger = setup_logging("generate_renders",
                           log_file=Path(cfg["paths"]["logs"]) / "generate_renders.log")

    out_dir = ensure_dir(args.output_dir or (Path(cfg["paths"]["production_root"]) / "_renders"))

    if args.batch_mode:
        prompt_dir = Path(args.prompt_dir or cfg["paths"]["generated_prompts"])
        files = sorted(prompt_dir.glob("*.txt"))
        if not files:
            logger.error(f"No prompt files in {prompt_dir}")
            return 2
        ok = 0
        for f in files:
            if generate_one(f, out_dir, cfg, logger, args.quality):
                ok += 1
        logger.info(f"Batch complete: {ok}/{len(files)} succeeded")
        return 0 if ok == len(files) else 1

    if not args.prompt_file:
        parser.error("Provide --prompt-file or --batch-mode")
    p = Path(args.prompt_file)
    if not p.exists():
        logger.error(f"Prompt file not found: {p}")
        return 2
    return 0 if generate_one(p, out_dir, cfg, logger, args.quality) else 1


if __name__ == "__main__":
    sys.exit(main())
