import json
from pathlib import Path
from graphify.cache import check_semantic_cache

detect = json.loads(Path('.graphify_detect.json').read_text())
# semantic extraction covers non-code files only (AST handles code)
non_code = [f for cat, files in detect['files'].items() if cat != 'code' for f in files]

# root must match the root used by save_semantic_cache in _merge_update.py
# (repo root â€” source_file keys are repo-relative)
REPO = Path(r'C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command')
cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(non_code, root=REPO)

if cached_nodes or cached_edges or cached_hyperedges:
    Path('.graphify_cached.json').write_text(json.dumps({
        'nodes': cached_nodes, 'edges': cached_edges, 'hyperedges': cached_hyperedges}))
Path('.graphify_uncached.txt').write_text('\n'.join(uncached))
print(f'Cache: {len(non_code)-len(uncached)} files hit, {len(uncached)} files need extraction')
