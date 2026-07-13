import json
from pathlib import Path

from graphify.build import build_from_json
from graphify.analyze import suggest_questions
from graphify.report import generate

extraction = json.loads(Path('.graphify_extract.json').read_text())
detection = json.loads(Path('.graphify_detect.json').read_text())
analysis = json.loads(Path('.graphify_analysis.json').read_text())

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

labels = {
    0: 'Property Knowledge Core',
    1: 'Dashboard & Financial Views',
    2: 'Site Plan & Asset Store',
    3: 'AI Concierge & Lease Tools',
    4: 'Splat Alignment & Reality Lens',
    5: 'CAD Poster & Georef Tooling',
    6: 'Directory & Global Search',
    7: 'Auth, Remote Sync & Boot',
    8: 'State Store',
    9: 'Vendor Portal',
    10: 'Spatial Sheet & Isometric',
    11: 'Owner Safe',
    12: 'Geometry Extraction Tool',
    13: 'Document Repository',
    14: 'Pylon Sign Generator',
    15: 'LLM Export Package',
    16: 'Proforma Generator',
    17: 'Roof Membrane Close-up',
    18: 'Membrane Failure RTU Context',
    19: 'Roof Baseline Unit 101',
    20: 'Plat Renderer',
    21: 'Thermal Anomaly (Retracted)',
    22: 'Thermal RGB Companion',
    23: 'Vendor Roster Extractor',
    24: 'Data Integrity Tests',
    25: 'Seed Round-trip Tests',
    26: 'Mesh GLB Builder',
    27: 'HVAC Extractor',
    28: 'Recoveries Extractor',
    29: 'Seed Split Tool',
    30: 'Nav Pages Table',
    31: 'Nav Pages Tests',
    32: 'Concierge Context Builder',
    33: 'Splat Converter',
    34: 'Logo Thumbnails Tool',
}

questions = suggest_questions(G, communities, labels)

INPUT_PATH = r'C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command'
report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'],
                  detection, tokens, INPUT_PATH, suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}))
analysis['questions'] = questions
Path('.graphify_analysis.json').write_text(json.dumps(analysis, indent=2))
print('Report updated with community labels')
