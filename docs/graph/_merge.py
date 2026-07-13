import glob
import json
from pathlib import Path

# real token usage from the Agent tool results (total subagent tokens per chunk)
USAGE = {
    '01': 180192, '02': 76327, '03': 76267, '04': 77420,
    '05': 74047, '06': 76384, '07': 76493, '08': 99084,
}

chunks = sorted(glob.glob('graphify-out/.graphify_chunk_*.json'))
expected = {f'graphify-out\\.graphify_chunk_{n}.json' for n in USAGE}
found = {c for c in chunks}
missing = expected - found
if missing:
    print('MISSING CHUNKS:', sorted(missing))

all_nodes, all_edges, all_hyperedges = [], [], []
total_in, total_out = 0, 0
ok = 0
for c in chunks:
    num = Path(c).stem.split('_')[-1]
    try:
        d = json.loads(Path(c).read_text(encoding='utf-8'))
    except Exception as e:
        print(f'chunk {num}: INVALID JSON ({e}) - skipped')
        continue
    # patch real token counts (chunk JSON has placeholder zeros)
    if not d.get('input_tokens') and num in USAGE:
        d['input_tokens'] = USAGE[num]
        Path(c).write_text(json.dumps(d, indent=2), encoding='utf-8')
    all_nodes += d.get('nodes', [])
    all_edges += d.get('edges', [])
    all_hyperedges += d.get('hyperedges', [])
    total_in += d.get('input_tokens', 0)
    total_out += d.get('output_tokens', 0)
    ok += 1

Path('.graphify_semantic_new.json').write_text(json.dumps({
    'nodes': all_nodes, 'edges': all_edges, 'hyperedges': all_hyperedges,
    'input_tokens': total_in, 'output_tokens': total_out,
}, indent=2))
print(f'Merged {ok} chunks: {len(all_nodes)} nodes, {len(all_edges)} edges, '
      f'{len(all_hyperedges)} hyperedges, {total_in:,} in / {total_out:,} out tokens')

# save to cache
from graphify.cache import save_semantic_cache
saved = save_semantic_cache(all_nodes, all_edges, all_hyperedges)
print(f'Cached {saved} files')

# merge cached (none this run) + new, dedupe nodes
cached = json.loads(Path('.graphify_cached.json').read_text()) if Path('.graphify_cached.json').exists() else {'nodes': [], 'edges': [], 'hyperedges': []}
nodes = cached['nodes'] + all_nodes
edges = cached['edges'] + all_edges
hyper = cached.get('hyperedges', []) + all_hyperedges
seen, deduped = set(), []
for n in nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)
Path('.graphify_semantic.json').write_text(json.dumps({
    'nodes': deduped, 'edges': edges, 'hyperedges': hyper,
    'input_tokens': total_in, 'output_tokens': total_out}, indent=2))
print(f'Semantic total: {len(deduped)} nodes, {len(edges)} edges')

# Part C - merge AST + semantic
ast = json.loads(Path('.graphify_ast.json').read_text())
seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in deduped:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])
merged = {
    'nodes': merged_nodes,
    'edges': ast['edges'] + edges,
    'hyperedges': hyper,
    'input_tokens': total_in,
    'output_tokens': total_out,
}
Path('.graphify_extract.json').write_text(json.dumps(merged, indent=2))
print(f"Final extraction: {len(merged_nodes)} nodes, {len(merged['edges'])} edges "
      f"({len(ast['nodes'])} AST + {len(deduped)} semantic)")
