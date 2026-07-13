import json
from pathlib import Path
import networkx as nx
from networkx.readwrite import json_graph

data = json.loads(Path('graphify-out/graph.json').read_text())
G = json_graph.node_link_graph(data, edges='links')

# find every esc-named node (AST may have one per file)
esc_nodes = [n for n, d in G.nodes(data=True) if d.get('label', '').lower().startswith('esc')]
print('esc() nodes found:')
for n in esc_nodes:
    d = G.nodes[n]
    print(f"  {n} | {d.get('label')} | {d.get('source_file')} | community={d.get('community')} | degree={G.degree(n)}")

print()
for n in esc_nodes:
    if G.degree(n) == 0:
        continue
    print(f'=== neighbors of {n} ({G.nodes[n].get("source_file")}) ===')
    for nb in G.neighbors(n):
        e = G.edges[n, nb]
        nd = G.nodes[nb]
        print(f"  --{e.get('relation')}--> {nd.get('label')} [{e.get('confidence')}] "
              f"({nd.get('source_file')}, community={nd.get('community')})")
