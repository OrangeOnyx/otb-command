"""Post-commit graph refresh (AST-only, no LLM).

Re-runs the filtered detect + AST pipeline, preserves all semantic (doc/image)
nodes and edges from the existing graph, re-clusters, maps community labels
from labels.json by member overlap, and rewrites graph.json / graph.html /
GRAPH_REPORT.md in graphify-out/. Run from docs/graph/.

Doc/image changes are NOT picked up here - run /graphify <repo> --update for those.
"""
import json
import subprocess
import sys
from pathlib import Path


def main():
    here = Path(__file__).parent
    out = here / 'graphify-out'

    # 1. filtered detect + AST (both write dotfiles into cwd)
    for script in ('_detect.py', '_ast.py'):
        r = subprocess.run([sys.executable, str(here / script)], cwd=here,
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f'{script} failed:\n{r.stderr}')
            return 1
        print(r.stdout.strip())

    ast = json.loads((here / '.graphify_ast.json').read_text())
    old = json.loads((out / 'graph.json').read_text(encoding='utf-8'))

    # 2. preserve everything the new AST pass didn't re-extract (semantic layer)
    new_ids = {n['id'] for n in ast['nodes']}
    old_nodes = old.get('nodes', [])
    old_links = old.get('links', old.get('edges', []))
    # build output / vendored code is never semantic; drop it even if an older
    # run extracted it (keep in step with EXCLUDE_DIRS in _detect.py)
    stale_dirs = {'dist', 'dist-twin', 'vendor', 'node_modules'}

    def stale(n):
        parts = (n.get('source_file') or '').replace('\\', '/').split('/')
        return any(p in stale_dirs for p in parts)

    preserved_nodes = [n for n in old_nodes if n['id'] not in new_ids and not stale(n)]
    kept_ids = new_ids | {n['id'] for n in preserved_nodes}

    def endpoint(e, k):
        v = e.get(k)
        return v if isinstance(v, str) else v.get('id', v)

    ast_pairs = {(e['source'], e['target']) for e in ast['edges']}
    preserved_edges = []
    for e in old_links:
        u, v = endpoint(e, 'source'), endpoint(e, 'target')
        if u in kept_ids and v in kept_ids and (u, v) not in ast_pairs:
            # keep only edges with at least one preserved (non-AST) endpoint;
            # AST-to-AST edges are fully re-derived each run
            if u not in new_ids or v not in new_ids:
                preserved_edges.append({**e, 'source': u, 'target': v})

    extraction = {
        'nodes': ast['nodes'] + preserved_nodes,
        'edges': ast['edges'] + preserved_edges,
        'hyperedges': old.get('hyperedges', []),
        'input_tokens': 0, 'output_tokens': 0,
    }

    # 3. rebuild + recluster
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate
    from graphify.export import to_json, to_html

    G = build_from_json(extraction)
    communities = cluster(G)
    cohesion = score_all(G, communities)

    # 4. map labels from labels.json via member overlap with the old communities
    old_comm = {}
    for n in old_nodes:
        cid = n.get('community')
        if cid is not None:
            old_comm.setdefault(int(cid), set()).add(n['id'])
    saved = json.loads((here / 'labels.json').read_text()) if (here / 'labels.json').exists() else {}
    labels = {}
    for cid, members in communities.items():
        mset = set(members)
        best, best_ov = None, 0
        for ocid, omembers in old_comm.items():
            ov = len(mset & omembers)
            if ov > best_ov:
                best, best_ov = ocid, ov
        labels[cid] = saved.get(str(best), f'Community {cid}') if best is not None else f'Community {cid}'

    detection = json.loads((here / '.graphify_detect.json').read_text())
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    questions = suggest_questions(G, communities, labels)
    repo = str(here.parent.parent)
    report = generate(G, communities, cohesion, labels, gods, surprises, detection,
                      {'input': 0, 'output': 0}, repo, suggested_questions=questions)
    # write graph.json first: if graphify refuses (node-count drop), leave the
    # report / html / labels untouched so they stay keyed to the old graph.
    # Pass --force when the drop is an intended exclusion.
    if to_json(G, communities, str(out / 'graph.json'), force='--force' in sys.argv) is False:
        print('graph.json not written; report, html and labels left unchanged')
        return 1
    (out / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    to_html(G, communities, str(out / 'graph.html'), community_labels=labels)
    # snapshot current labels keyed by NEW community ids for the next refresh
    (here / 'labels.json').write_text(json.dumps(
        {str(k): v for k, v in labels.items()}, indent=2))
    print(f'Refreshed: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, '
          f'{len(communities)} communities')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
