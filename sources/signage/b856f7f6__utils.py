"""
Utility functions for the On The Boulevard signage rendering workflow.

Provides:
- Slug generation
- File naming helpers
- Prompt stacking
- Config loading
- Logging setup
- Tenant database access
- Validation helpers
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPTS_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = SCRIPTS_DIR / "config.yaml"


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the YAML config file."""
    path = Path(config_path) if config_path else DEFAULT_CONFIG_PATH
    if yaml is None:
        raise RuntimeError("PyYAML is required. Install with: pip install pyyaml")
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
def setup_logging(name: str = "signage", log_file: Optional[Path] = None,
                  level: int = logging.INFO) -> logging.Logger:
    """Configure and return a logger writing to console and (optionally) a file."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(level)
    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(name)s | %(message)s")

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    if log_file:
        log_file = Path(log_file)
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger


# ---------------------------------------------------------------------------
# Slugs / Naming
# ---------------------------------------------------------------------------
def slugify(name: str) -> str:
    """Convert a tenant name to a filesystem-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def timestamp(fmt: str = "%Y%m%d_%H%M%S") -> str:
    return datetime.now().strftime(fmt)


def render_filename(tenant_slug: str, variant: str, deliverable_type: str,
                    ts: Optional[str] = None, ext: str = "png") -> str:
    ts = ts or timestamp()
    return f"{tenant_slug}_{variant}_{deliverable_type}_{ts}.{ext}"


def prompt_filename(tenant_slug: str, variant: str, deliverable_type: str) -> str:
    return f"{tenant_slug}_{variant}_{deliverable_type}.txt"


# ---------------------------------------------------------------------------
# Tenant DB
# ---------------------------------------------------------------------------
def load_tenant_db(path: str | Path) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    return data.get("tenants", data) if isinstance(data, dict) else data


def find_tenant(tenants: List[Dict[str, Any]], query: str) -> Optional[Dict[str, Any]]:
    """Find a tenant by name or slug (case-insensitive)."""
    q = slugify(query)
    for t in tenants:
        if slugify(t.get("tenant_name", "")) == q:
            return t
        if str(t.get("unit_number", "")).lower() == query.lower():
            return t
    # partial match fallback
    for t in tenants:
        if q in slugify(t.get("tenant_name", "")):
            return t
    return None


# ---------------------------------------------------------------------------
# Prompt stacking
# ---------------------------------------------------------------------------
DELIVERABLE_TO_SCENE = {
    "hero_storefront": "daytime",
    "dusk_illuminated": "dusk",
    "signage_close_up": "close_up",
    "context_streetscape": "streetscape",
}

VALID_DELIVERABLES = list(DELIVERABLE_TO_SCENE.keys())


def _read(p: Path) -> str:
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8").strip()


def stack_prompt(tenant: Dict[str, Any], deliverable_type: str,
                 prompt_library: Path, variant: Optional[str] = None) -> str:
    """
    Build a complete stacked prompt by combining:
      - Layer 1 (global style)
      - Layer 2 (category specific)
      - Layer 3 (scene variant)
      - Tenant-specific block
      - Deliverable template
    """
    if deliverable_type not in VALID_DELIVERABLES:
        raise ValueError(f"Unknown deliverable_type: {deliverable_type}. "
                         f"Valid: {VALID_DELIVERABLES}")

    prompt_library = Path(prompt_library)
    scene = variant or DELIVERABLE_TO_SCENE[deliverable_type]
    category = tenant.get("category", "retail").lower()
    tenant_slug = slugify(tenant["tenant_name"])

    layer1 = _read(prompt_library / "layer_1_global_style.txt")
    layer2 = _read(prompt_library / f"layer_2_category_{category}.txt")
    if not layer2:
        layer2 = _read(prompt_library / "layer_2_category_retail.txt")
    layer3 = _read(prompt_library / f"layer_3_scene_{scene}.txt")
    tenant_block = _read(prompt_library / "tenant_specific" / f"{tenant_slug}.txt")
    template = _read(prompt_library / "deliverable_templates" / f"{deliverable_type}.txt")

    parts = [
        f"# {tenant['tenant_name']} — {deliverable_type.replace('_',' ').title()} ({scene})",
        f"# Unit: {tenant.get('unit_number','')} | Category: {category} | "
        f"Facade: {tenant.get('facade_family','')} | Illumination: {tenant.get('illumination_type','')}",
        "",
        "## LAYER 1 — GLOBAL STYLE",
        layer1,
        "",
        f"## LAYER 2 — CATEGORY ({category})",
        layer2,
        "",
        f"## LAYER 3 — SCENE ({scene})",
        layer3,
        "",
        "## TENANT-SPECIFIC",
        tenant_block or f"Tenant: {tenant['tenant_name']}. Logo: {tenant.get('logo_file','N/A')}.",
        "",
        f"## DELIVERABLE TEMPLATE — {deliverable_type}",
        template,
    ]
    return "\n".join(p for p in parts if p is not None)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def ensure_dir(path: str | Path) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def file_size_kb(path: str | Path) -> float:
    return os.path.getsize(path) / 1024.0


def validate_naming(filename: str, expected_slug: str,
                    expected_deliverable: str) -> bool:
    base = Path(filename).stem.lower()
    return expected_slug in base and expected_deliverable in base
