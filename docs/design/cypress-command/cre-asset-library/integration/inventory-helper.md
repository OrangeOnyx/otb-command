# Optional read-only inventory helper

Requires Python 3.10+ and Git CLI. No Python packages, environment variables, network access or installation scripts are required. Run at the verified repository root. The explicit output directory must be new and **outside** the repository; choose an access-controlled sibling or scratch location.

PowerShell example (change the output directory name if it already exists):

```powershell
$repoRoot = (git rev-parse --show-toplevel).Trim()
python docs/design/cypress-command/cre-asset-library/integration/inventory_repo.py --repo "$repoRoot" --out "../otb-cre-audit-01"
```

The helper checks that `--repo` is the actual Git root, enumerates visible and hidden files including ignored files except documented boundaries, records metadata, hashes recognized file types up to 64 MiB, and reports exact duplicate candidates. It writes only four reports to the new output directory. It never edits repository files, follows symlinks/junctions, executes repository code, downloads LFS payloads, initializes submodules, reads known credential-file contents, or contacts external storage.

Git commands disable optional locks/index refresh writes, filesystem-monitor hooks and interactive credential prompts. The helper does not run `git status` or compare working-tree content through Git: even status can execute repository-configured clean/process filters. Working-tree dirty state is recorded as unknown (`null` / `not_checked`). Inspect the relevant repository configuration and perform any status check separately in a trusted context. The summary records that no repository writes were requested; it does not attest that the entire repository remained unchanged during the run. Fixture validation can be run with `python docs/design/cypress-command/cre-asset-library/integration/test_inventory_repo.py`; it creates temporary local repositories only.

`--hash-max-mib 0` avoids hashing nonempty files. `--include-generated` includes `dist`, `build` and `coverage` contents; dependencies, Git internals, known secret directories and caches remain bounded. Do not use the option as a substitute for deciding whether generated files carry unique evidence. Files can still be sensitive under arbitrary names: keep all reports private and review locators before sharing.

## Outputs and limits

- `enumerated-files.csv`: metadata and bounded hashes; category hints are extension-based, not classifications of authority or meaning.
- `enumeration-boundaries.csv`: directories visited, exclusions, inaccessible files, submodules/nested repositories, links/reparse points, large files, archives, LFS pointers and tracked paths not visited.
- `exact-duplicate-candidates.csv`: groups of equal hash bytes. Semantic duplicates and usage differences require human/agent review.
- `enumeration-summary.json`: root, HEAD, branch, unknown dirty state, run settings, counts and explicit limitations.

Copy/merge these findings into the richer templates; do not rename the helper's output and represent it as a finished audit. File modification times are metadata, not source revisions or evidence of current accuracy. `ignored_or_git_unclassified` is intentionally provisional; confirm with a targeted `git check-ignore` when classification matters. Archives are recorded as containers; their members are not inspected. Git LFS pointer hashes never validate missing payloads. Unlisted hash formats, files above the size cap and excluded directory contents need targeted follow-up. Every repository functional area still requires the semantic procedure in [README.md](README.md).

CSV cells beginning with spreadsheet formula characters are prefixed with an apostrophe for safe review. Remove that prefix deliberately when resolving such rare filenames; never execute CSV cells as commands. Keep the source repository stable during enumeration; changed files are flagged where detected.
