"""Merge for the 2026-07-29 incremental update.

Combines:
  1. Fresh AST extraction (.graphify_ast.json — all code files)
  2. New semantic chunks 11-14 (this run's subagents)
  3. Preserved semantic nodes/edges from the OLD graph for unchanged,
     already-covered doc/image files NOT re-extracted this run

Old fragments for re-extracted files (CLAUDE.md, HANDOFF.md, index.html)
are dropped in favor of the fresh extraction. Seeds the semantic cache
(missing after the 07-26 run) so the next update gets real cache hits.

Token usage per chunk (from Agent tool results) is patched in via USAGE.
"""
import glob
import json
from pathlib import Path

# real token usage from the Agent tool results — fill in after agents return
USAGE = {
    '11': 176832, '12': 152449, '13': 150878, '14': 147809,
}

RE_EXTRACTED = {'CLAUDE.md', 'HANDOFF.md', 'index.html'}  # old fragments dropped

# --- 1. new chunks ---
chunks = sorted(glob.glob('graphify-out/.graphify_chunk_1[1-4].json'))
new_nodes, new_edges, new_hyper = [], [], []
total_in = total_out = 0
for c in chunks:
    num = Path(c).stem.split('_')[-1]
    d = json.loads(Path(c).read_text(encoding='utf-8'))
    if not d.get('input_tokens') and USAGE.get(num):
        d['input_tokens'] = USAGE[num]
        Path(c).write_text(json.dumps(d, indent=2), encoding='utf-8')
    new_nodes += d.get('nodes', [])
    new_edges += d.get('edges', [])
    new_hyper += d.get('hyperedges', [])
    total_in += d.get('input_tokens', 0)
    total_out += d.get('output_tokens', 0)
print(f'New chunks: {len(chunks)} files, {len(new_nodes)} nodes, {len(new_edges)} edges')

new_files = {n.get('source_file', '').replace('\\', '/') for n in new_nodes}

# --- 2. preserved semantic layer from the old graph ---
old = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
old_nodes = old.get('nodes', [])
old_links = old.get('links', old.get('edges', []))

def endpoint(e, k):
    v = e.get(k)
    return v if isinstance(v, str) else v.get('id', v)

sem_types = {'document', 'paper', 'image', 'rationale'}
preserved_nodes = []
for n in old_nodes:
    if n.get('file_type') not in sem_types:
        continue
    src = (n.get('source_file') or '').replace('\\', '/')
    if src in RE_EXTRACTED or src in new_files:
        continue  # superseded by fresh extraction
    # strip stale clustering attrs; keep the semantic payload
    keep = {k: v for k, v in n.items() if k not in ('community',)}
    preserved_nodes.append(keep)
print(f'Preserved old semantic nodes: {len(preserved_nodes)}')

# --- 3. fresh AST ---
ast = json.loads(Path('.graphify_ast.json').read_text())

# --- assemble: AST first, then new semantic, then preserved (dedupe by id) ---
seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in new_nodes + preserved_nodes:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

# preserved edges: old edges where both endpoints survive and at least one
# endpoint is a preserved semantic node (AST-AST edges fully re-derived;
# new-chunk edges come from the chunks themselves)
preserved_ids = {n['id'] for n in preserved_nodes}
ast_pairs = {(e['source'], e['target']) for e in ast['edges']}
preserved_edges = []
for e in old_links:
    u, v = endpoint(e, 'source'), endpoint(e, 'target')
    if u in seen and v in seen and (u, v) not in ast_pairs:
        if u in preserved_ids or v in preserved_ids:
            preserved_edges.append({**e, 'source': u, 'target': v})
print(f'Preserved old semantic edges: {len(preserved_edges)}')

# drop new-chunk edges whose endpoints don't exist anywhere
valid_new_edges = [e for e in new_edges if e['source'] in seen and e['target'] in seen]
dropped = len(new_edges) - len(valid_new_edges)
if dropped:
    print(f'Dropped {dropped} new edges with unknown endpoints')

merged = {
    'nodes': merged_nodes,
    'edges': ast['edges'] + valid_new_edges + preserved_edges,
    'hyperedges': new_hyper + old.get('hyperedges', []),
    'input_tokens': total_in,
    'output_tokens': total_out,
}
Path('.graphify_extract.json').write_text(json.dumps(merged, indent=2))
print(f"Final extraction: {len(merged_nodes)} nodes, {len(merged['edges'])} edges "
      f"({len(ast['nodes'])} AST + {len(new_nodes)} new semantic + {len(preserved_nodes)} preserved)")

# --- seed the semantic cache so the next update hits ---
# root MUST be the repo (source_file paths are repo-relative); with the
# default root='.', every path misses and 0 files cache — the silent
# failure that left the 07-26 run uncached.
from graphify.cache import save_semantic_cache
REPO = Path(r'C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command')
saved = save_semantic_cache(new_nodes, valid_new_edges, new_hyper, root=REPO)
print(f'Semantic cache seeded: {saved} files')
