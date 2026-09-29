"""Meaningful fixture checks for the optional helper; no production repository access."""
import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HELPER = Path(__file__).with_name("inventory_repo.py")


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="cre-inventory-test-")
        self.base = Path(self.temp.name)
        self.repo = self.base / "fixture-repo"
        self.repo.mkdir()
        subprocess.run(["git", "init", "--quiet", str(self.repo)], check=True, capture_output=True)
        (self.repo / ".gitignore").write_text("ignored.json\nnode_modules/\n.env\n", encoding="utf-8")
        (self.repo / "tracked.json").write_text('{"fixture":true}\n', encoding="utf-8")
        (self.repo / "duplicate.json").write_text('{"fixture":true}\n', encoding="utf-8")
        (self.repo / "ignored.json").write_text('{"ignored":true}\n', encoding="utf-8")
        (self.repo / ".env").write_text("SYNTHETIC_SECRET=DO_NOT_EMIT\n", encoding="utf-8")
        (self.repo / ".hidden").mkdir()
        (self.repo / ".hidden" / "source.md").write_text("source fixture\n", encoding="utf-8")
        (self.repo / "node_modules").mkdir()
        (self.repo / "node_modules" / "cache.json").write_text("{}", encoding="utf-8")
        (self.repo / "payload.glb").write_text("version https://git-lfs.github.com/spec/v1\noid sha256:" + "0" * 64 + "\nsize 987654321\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.repo), "add", "tracked.json", ".gitignore"], check=True, capture_output=True)

    def tearDown(self):
        # TemporaryDirectory cleanup only touches the fixture created by this test.
        self.temp.cleanup()

    def run_helper(self, out=None, repo=None):
        return subprocess.run([sys.executable, str(HELPER), "--repo", str(repo or self.repo),
                               "--out", str(out or self.base / "reports")], capture_output=True, text=True)

    def test_enumeration_and_boundaries_preserve_repository(self):
        before = {str(p.relative_to(self.repo)): p.read_bytes() for p in self.repo.rglob("*") if p.is_file() and ".git" not in p.parts}
        result = self.run_helper()
        self.assertEqual(result.returncode, 0, result.stderr)
        reports = self.base / "reports"
        with (reports / "enumerated-files.csv").open(encoding="utf-8", newline="") as stream:
            rows = {r["relative_path"]: r for r in csv.DictReader(stream)}
        self.assertEqual(rows["tracked.json"]["git_state"], "tracked")
        self.assertEqual(rows["duplicate.json"]["git_state"], "untracked")
        self.assertEqual(rows["ignored.json"]["git_state"], "ignored_or_git_unclassified")
        self.assertIn(".hidden/source.md", rows)
        self.assertNotIn("node_modules/cache.json", rows)
        self.assertEqual(rows[".env"]["hash_status"], "sensitive_metadata_only")
        self.assertEqual(rows[".env"]["sha256"], "")
        self.assertEqual(rows["payload.glb"]["source_role"], "lfs_pointer_only")
        combined = "\n".join(p.read_text(encoding="utf-8") for p in reports.iterdir())
        self.assertNotIn("DO_NOT_EMIT", combined)
        self.assertIn("candidate_only_review_consumers_before_action", combined)
        summary = json.loads((reports / "enumeration-summary.json").read_text(encoding="utf-8"))
        self.assertEqual(summary["exact_duplicate_groups"], 1)
        self.assertFalse(summary["repository_write_operations_requested"])
        self.assertEqual(summary["repository_mutation_check"], "not_performed")
        self.assertIsNone(summary["working_tree_dirty"])
        after = {str(p.relative_to(self.repo)): p.read_bytes() for p in self.repo.rglob("*") if p.is_file() and ".git" not in p.parts}
        self.assertEqual(before, after)

    def test_refuses_existing_output(self):
        out = self.base / "reports"
        out.mkdir()
        marker = out / "keep.txt"
        marker.write_text("preserve", encoding="utf-8")
        self.assertNotEqual(self.run_helper(out=out).returncode, 0)
        self.assertEqual(marker.read_text(encoding="utf-8"), "preserve")

    def test_refuses_repository_output(self):
        out = self.repo / "new-report"
        self.assertNotEqual(self.run_helper(out=out).returncode, 0)
        self.assertFalse(out.exists())

    def test_refuses_nested_start_as_root(self):
        result = self.run_helper(repo=self.repo / ".hidden")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("verified Git top-level", result.stderr)

    def test_does_not_execute_repository_clean_filter(self):
        # Same-length modification ensures a git status content comparison would
        # invoke the configured clean filter, rather than short-circuit on size.
        tracked = self.repo / "filter-input.txt"
        tracked.write_text("fixture before", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.repo), "add", tracked.name], check=True, capture_output=True)
        marker = self.repo / "filter-was-executed.txt"
        hook = self.repo / "fixture-clean.sh"
        hook.write_text('#!/bin/sh\nprintf "executed" > "' + marker.as_posix() + '"\ncat\n', encoding="utf-8")
        hook.chmod(0o700)
        (self.repo / ".gitattributes").write_text("*.txt filter=fixture\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.repo), "config", "filter.fixture.clean", '"' + hook.as_posix() + '"'], check=True, capture_output=True)
        tracked.write_text("fixture after!", encoding="utf-8")
        result = self.run_helper()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(marker.exists(), "Enumeration executed a repository-configured clean filter")
        self.assertEqual(tracked.read_text(encoding="utf-8"), "fixture after!")


if __name__ == "__main__":
    unittest.main()
