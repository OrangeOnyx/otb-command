#!/usr/bin/env python3
"""
Master CLI Interface
====================
Unified entry point for the signage rendering workflow.

Subcommands:
    generate-prompts    Build stacked prompts
    generate-renders    Generate AI renderings
    qc-check            Run QC validation
    organize            Organize files into tenant folders
    workflow            Run the full production workflow
    export              Build export packages
    interactive         Guided interactive mode

Examples:
    signage_cli.py generate-prompts --batch-mode
    signage_cli.py workflow --tenant "HOTWORX"
    signage_cli.py export --package leasing_deck
"""
from __future__ import annotations

import argparse
import sys

import generate_prompts
import generate_renders
import qc_check
import organize_files
import production_manager
import export_package
from utils import VALID_DELIVERABLES, load_config, load_tenant_db


def interactive_mode():
    cfg = load_config()
    tenants = load_tenant_db(cfg["paths"]["tenant_database"])
    print("\n=== On The Boulevard — Signage CLI ===\n")
    print("1) Generate prompts")
    print("2) Generate renders")
    print("3) QC check")
    print("4) Organize files")
    print("5) Run full workflow")
    print("6) Build export package")
    print("0) Exit")
    choice = input("\nChoose an option: ").strip()

    if choice == "1":
        scope = input("All tenants? (y/n) ").strip().lower()
        if scope == "y":
            return generate_prompts.main(["--batch-mode"])
        name = input("Tenant name: ").strip()
        return generate_prompts.main(["--tenant", name])

    if choice == "2":
        return generate_renders.main(["--batch-mode"])

    if choice == "3":
        name = input("Tenant name (blank = all): ").strip()
        return qc_check.main(["--tenant", name] if name else ["--all"])

    if choice == "4":
        return organize_files.main(["--auto"])

    if choice == "5":
        name = input("Tenant name (blank = all): ").strip()
        skip = input("Skip QC? (y/n) ").strip().lower() == "y"
        argv = ["--all-tenants"] if not name else ["--tenant", name]
        if skip:
            argv.append("--skip-qc")
        return production_manager.main(argv)

    if choice == "6":
        print("Packages:", list(cfg.get("export_packages", {}).keys()))
        pkg = input("Package name: ").strip()
        return export_package.main(["--package", pkg])

    print("Exiting.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="signage_cli",
        description="On The Boulevard — Signage rendering CLI",
    )
    subs = parser.add_subparsers(dest="command")

    subs.add_parser("generate-prompts", help="Generate stacked prompts")
    subs.add_parser("generate-renders", help="Generate renderings")
    subs.add_parser("qc-check", help="Run QC validation")
    subs.add_parser("organize", help="Organize files")
    subs.add_parser("workflow", help="Full production workflow")
    subs.add_parser("export", help="Build export packages")
    subs.add_parser("interactive", help="Interactive guided mode")

    args, rest = parser.parse_known_args(argv)
    dispatch = {
        "generate-prompts": generate_prompts.main,
        "generate-renders": generate_renders.main,
        "qc-check": qc_check.main,
        "organize": organize_files.main,
        "workflow": production_manager.main,
        "export": export_package.main,
    }
    if args.command in dispatch:
        return dispatch[args.command](rest)
    if args.command == "interactive":
        return interactive_mode()
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
