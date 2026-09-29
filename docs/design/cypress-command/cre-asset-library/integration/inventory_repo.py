#!/usr/bin/env python3
"""Read-only inventory aid. Writes only to a new explicit directory outside the repo.

This is enumeration and bounded hashing, not a semantic or geometry audit.
Python 3.10+, Git CLI, standard library only. No network or package installation.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
from datetime import datetime, timezone

ALWAYS_SKIP = {".git", "node_modules", ".venv", "venv", "__pycache__", ".cache",
               ".next", ".nuxt", ".turbo", ".pytest_cache", ".mypy_cache",
               ".ssh", ".aws", ".azure", "secrets", ".secrets"}
GENERATED = {"dist", "build", "coverage"}
SECRET_NAMES = {".npmrc", ".pypirc", ".netrc", "credentials", "credentials.json",
                "secrets.json", "auth.json", "id_rsa", "id_ed25519"}
SECRET_EXT = {".pem", ".key", ".p12", ".pfx", ".keystore"}
GROUPS = {
    "cad_bim": {".dwg", ".dxf", ".dgn", ".rvt", ".rfa", ".ifc", ".skp"},
    "model_scan": {".glb", ".gltf", ".obj", ".fbx", ".stl", ".ply", ".las", ".laz", ".e57", ".pts", ".ptx", ".rcp", ".rcs"},
    "map_gis": {".geojson", ".shp", ".shx", ".prj", ".kml", ".kmz", ".gpkg", ".mbtiles"},
    "image_vector": {".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff", ".svg", ".ai", ".eps", ".psd"},
    "document": {".md", ".txt", ".pdf", ".docx", ".xlsx", ".csv"},
    "code_data_ui": {".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".css", ".scss", ".html", ".json", ".yaml", ".yml", ".toml", ".xml", ".sql", ".prisma", ".graphql", ".py", ".ps1", ".sh"},
    "archive": {".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz"},
}
HASH_EXT = set().union(*GROUPS.values())


def git(repo: Path, *args: str) -> bytes:
    environment = dict(os.environ, GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0")
    result = subprocess.run(["git", "-c", "core.fsmonitor=false", "-C", str(repo), *args], capture_output=True, check=False, env=environment)
    if result.returncode:
        raise RuntimeError("Git command failed: " + " ".join(args[:2]))
    return result.stdout


def decode(value: bytes) -> str:
    return value.decode("utf-8", errors="replace")


def names(raw: bytes) -> set[str]:
    return {decode(item) for item in raw.split(b"\0") if item}


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            # Avoid spreadsheet formula execution when an untrusted filename starts
            # with =,+,-,@. JSON metadata remains unmodified; CSV is review output.
            writer.writerow({k: "'" + str(v) if str(v).startswith(("=", "+", "-", "@")) else v
                             for k, v in row.items()})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="Actual Git top-level directory")
    parser.add_argument("--out", required=True, type=Path, help="New report directory outside repository")
    parser.add_argument("--hash-max-mib", type=int, default=64, help="Maximum per-file hash size (default 64)")
    parser.add_argument("--include-generated", action="store_true", help="Inspect dist/build/coverage contents too")
    args = parser.parse_args()
    repo, out = args.repo.resolve(), args.out.resolve()
    if args.hash_max_mib < 0:
        parser.error("--hash-max-mib must be nonnegative")
    try:
        actual = Path(decode(git(repo, "rev-parse", "--show-toplevel")).strip()).resolve()
        if actual != repo:
            parser.error("--repo must equal the verified Git top-level directory: " + str(actual))
        if out == repo or repo in out.parents:
            parser.error("--out must be outside the repository to keep this run read-only")
        if out.exists():
            parser.error("--out must not exist; choose a new report directory")
        tracked = names(git(repo, "ls-files", "--cached", "-z"))
        untracked = names(git(repo, "ls-files", "--others", "--exclude-standard", "-z"))
        submodules = set()
        for entry in git(repo, "ls-files", "--stage", "-z").split(b"\0"):
            if entry.startswith(b"160000 ") and b"\t" in entry:
                submodules.add(decode(entry.split(b"\t", 1)[1]))
        # No current commit is a legitimate state for an initialized, empty repository.
        try:
            head = decode(git(repo, "rev-parse", "--verify", "HEAD")).strip()
        except RuntimeError:
            head = "unborn_or_unavailable"
        branch = decode(git(repo, "branch", "--show-current")).strip() or "detached"
        # Even git status may execute repository-configured clean/process filters.
        # Do not compute working-tree differences in this untrusted enumeration aid.
        dirty = None
    except (OSError, RuntimeError) as error:
        print("Inventory not started: " + str(error), file=sys.stderr)
        return 2

    inventory, ledger = [], []
    skipped = ALWAYS_SKIP | (set() if args.include_generated else GENERATED)
    limit = args.hash_max_mib * 1024 * 1024
    seen = set()

    def boundary(path: str, kind: str, status: str, reason: str) -> None:
        ledger.append({"relative_boundary": path, "boundary_type": kind,
                       "review_status": status, "reason": reason,
                       "required_follow_up": "Review impact; perform targeted authorized inspection or explicitly accept exclusion" if status != "enumerated" else "Semantic review required"})

    def walk(folder: Path) -> None:
        rel_folder = folder.relative_to(repo).as_posix()
        boundary(rel_folder, "directory", "enumerated", "Names enumerated; no semantic content review")
        try:
            with os.scandir(folder) as iterator:
                entries = sorted(iterator, key=lambda item: item.name.casefold())
        except OSError as error:
            boundary(rel_folder, "directory", "inaccessible", type(error).__name__)
            return
        for entry in entries:
            path = Path(entry.path)
            rel = path.relative_to(repo).as_posix()
            seen.add(rel)
            try:
                if entry.name.lower() == ".git":
                    boundary(rel, "git_internals", "excluded", "Git metadata or worktree pointer not opened")
                    continue
                info = entry.stat(follow_symlinks=False)
                is_reparse = bool(getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))
                if entry.is_symlink() or is_reparse:
                    boundary(rel, "link_or_reparse", "excluded", "Not followed; target access must be reviewed")
                    continue
                if entry.is_dir(follow_symlinks=False):
                    if entry.name.lower() in skipped:
                        boundary(rel, "directory", "excluded", "Git internals, secret boundary, dependency/cache, or generated output")
                    elif rel in submodules or (path / ".git").exists():
                        boundary(rel, "submodule_or_nested_repo", "excluded", "Separate repository boundary; audit independently without automatic initialization")
                    else:
                        walk(path)
                    continue
                if not stat.S_ISREG(info.st_mode):
                    boundary(rel, "special_file", "excluded", "Non-regular file not opened")
                    continue
                extension = path.suffix.lower()
                category = next((group for group, extensions in GROUPS.items() if extension in extensions), "other")
                secret = entry.name.lower().startswith(".env") or entry.name.lower() in SECRET_NAMES or extension in SECRET_EXT
                digest, hash_status, role = "", "extension_not_selected", "unreviewed"
                if secret:
                    hash_status = "sensitive_metadata_only"
                    boundary(rel, "sensitive_file", "excluded", "Contents never read or hashed")
                elif info.st_size > limit:
                    hash_status = "over_size_limit"
                    boundary(rel, "large_file", "excluded", "Metadata only; content/hash requires targeted inspection")
                elif extension in HASH_EXT:
                    with path.open("rb") as stream:
                        first = stream.read(4096)
                        h = hashlib.sha256(first)
                        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                            h.update(chunk)
                    digest, hash_status = h.hexdigest(), "hashed"
                    if first.startswith(b"version https://git-lfs.github.com/spec/v1\n") or first.startswith(b"version https://git-lfs.github.com/spec/v1\r\n"):
                        role, hash_status = "lfs_pointer_only", "pointer_hash_not_payload"
                        boundary(rel, "lfs_pointer", "inaccessible", "Payload absent; hash identifies pointer only")
                    after = path.stat()
                    if after.st_size != info.st_size or after.st_mtime_ns != info.st_mtime_ns:
                        digest, hash_status = "", "changed_during_read"
                        boundary(rel, "file", "unresolved", "File changed during hashing; rerun after stabilizing source")
                state = "tracked" if rel in tracked else "untracked" if rel in untracked else "ignored_or_git_unclassified"
                inventory.append({"relative_path": rel, "git_state": state, "extension": extension,
                                  "category_hint": category, "size_bytes": info.st_size,
                                  "mtime_utc": datetime.fromtimestamp(info.st_mtime, timezone.utc).isoformat(),
                                  "sha256": digest, "hash_status": hash_status, "source_role": role,
                                  "semantic_review": "not_performed"})
                if category == "archive":
                    boundary(rel, "archive", "enumerated", "Container recorded; member listing/content inspection not performed")
            except OSError as error:
                boundary(rel, "file_or_directory", "inaccessible", type(error).__name__)

    walk(repo)
    # Explicitly identify tracked source paths hidden behind traversal boundaries,
    # or absent from checkout, without treating them as inspected files.
    for rel in sorted(tracked - seen):
        boundary(rel, "tracked_path_not_visited", "excluded", "Inside recorded boundary or absent from working tree; reconcile against Git index")
    hashes = {}
    for row in inventory:
        if row["sha256"]:
            hashes.setdefault(row["sha256"], []).append(row["relative_path"])
    duplicates = [{"sha256": digest, "member_count": len(paths), "paths_json": json.dumps(paths),
                   "decision": "candidate_only_review_consumers_before_action"}
                  for digest, paths in hashes.items() if len(paths) > 1]
    try:
        out.mkdir(parents=True, exist_ok=False)
        write_csv(out / "enumerated-files.csv", inventory,
                  ["relative_path", "git_state", "extension", "category_hint", "size_bytes", "mtime_utc", "sha256", "hash_status", "source_role", "semantic_review"])
        write_csv(out / "enumeration-boundaries.csv", ledger,
                  ["relative_boundary", "boundary_type", "review_status", "reason", "required_follow_up"])
        write_csv(out / "exact-duplicate-candidates.csv", duplicates,
                  ["sha256", "member_count", "paths_json", "decision"])
        metadata = {"audit_status": "enumeration_only_semantic_review_not_performed", "repo_root": str(repo),
                    "head": head, "branch": branch, "working_tree_dirty": dirty,
                    "working_tree_status": "not_checked_repository_filters_may_execute_during_status",
                    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                    "file_rows": len(inventory), "boundary_rows": len(ledger), "exact_duplicate_groups": len(duplicates),
                    "hash_max_mib": args.hash_max_mib, "include_generated": args.include_generated,
                    "no_network_requested": True, "repository_write_operations_requested": False,
                    "repository_mutation_check": "not_performed",
                    "limitations": ["No content/brand/dependency/geometry interpretation", "No archive member inspection",
                                    "No linked or external storage traversal", "No submodule/LFS download",
                                    "Ignored-or-unclassified entries require targeted git check-ignore verification",
                                    "Working-tree dirty state requires a separate reviewed check in a trusted repository",
                                    "Paths may disclose project structure; keep reports access-controlled"]}
        (out / "enumeration-summary.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    except OSError as error:
        print("Report write failed; inspect any partial output: " + type(error).__name__, file=sys.stderr)
        return 2
    print(f"Enumeration complete: {len(inventory)} file rows; {len(ledger)} boundaries. Semantic audit remains required.")
    print(str(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
