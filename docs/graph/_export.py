import json
from pathlib import Path

from graphify.build import build_from_json
from graphify.export import to_obsidian, to_canvas, to_html
from graphify.wiki import to_wiki

extraction = json.loads(Path('.graphify_extract.json').read_text())
analysis = json.loads(Path('.graphify_analysis.json').read_text())
labels_raw = json.loads(Path('.graphify_labels.json').read_text())

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
labels = {int(k): v for k, v in labels_raw.items()}

obsidian_dir = 'graphify-out/obsidian'
n = to_obsidian(G, communities, obsidian_dir, community_labels=labels, cohesion=cohesion)
print(f'Obsidian vault: {n} notes in {obsidian_dir}/')

to_canvas(G, communities, f'{obsidian_dir}/graph.canvas', community_labels=labels)
print(f'Canvas: {obsidian_dir}/graph.canvas')

to_html(G, communities, 'graphify-out/graph.html', community_labels=labels)
print('graph.html written')

w = to_wiki(G, communities, 'graphify-out/wiki', community_labels=labels,
            cohesion=cohesion, god_nodes_data=analysis['gods'])
print(f'Wiki: {w} articles in graphify-out/wiki/')
