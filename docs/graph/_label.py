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
    0: 'Bucket-Store Factory',
    1: 'Contacts, Docs & Asset Views',
    2: 'API Auth & Capped Endpoints',
    3: 'IndexedDB Asset Store',
    4: 'Integration Inventory',
    5: 'Transfer Package Spec',
    6: 'Roof Membrane Failure Evidence',
    7: 'Auto-Trigger Cron & UniFi',
    8: 'Document Repository',
    9: 'LLM Export Package',
    10: 'Deterministic Calc Engines',
    11: 'Auth, Roles & Boot',
    12: '3D Twin & Splat Scenes',
    13: 'Card Registry & Briefs',
    14: 'Georef Projection Seam',
    15: 'Ledger-Lite Engine',
    16: 'Occupancy Surface',
    17: 'CAD Poster Internals',
    18: 'C3 Camera Pipeline & Site Plan',
    19: 'A-3 Voice & Operator Runbooks',
    20: 'E-Sign Flow',
    21: 'Voice-Agent Brain (API)',
    22: 'Commercial & Claims Register',
    23: 'Feature-Value Brief & Doctrine',
    24: 'Voice Build Queue & Booking Failure',
    25: 'Poster Layout Engine',
    26: 'COI Parse Seam',
    27: 'Concierge Context & Seed Tools',
    28: 'C3 Stall Classifier',
    29: 'Cube Archive Backfill',
    30: 'Cube Frame Sampler',
    31: 'CSP & Deploy Quality Gates',
    32: 'Proforma Generator',
    33: 'Parking Layer Seam',
    34: 'Poster Specials Variants',
    35: 'B1 QR Vinyls',
    36: 'Voice Telephony Stack (Twilio + Fly)',
    37: 'Roof Close-Up Evidence',
    38: 'Roof RTU Context Evidence',
    39: 'Roof Unit-101 Baseline',
    40: 'Global Search',
    41: 'Brand Kit (otb_brand)',
    42: 'Thermal Anomaly (Retracted)',
    43: 'Fly Bridge Server',
    44: 'Plat Renderer',
    45: 'Commercial VO Renderer',
    46: 'Thermal RGB Companion',
    47: 'Frozen Sat Base Builder',
    48: 'Vendor Roster Extractor',
    49: 'Geometry & Twin Contracts',
    50: 'Data Integrity Tests',
    51: 'Seed Round-trip Tests',
    52: 'Audience Brief Variants',
    53: 'Mesh GLB Builder',
    54: 'C3 Nightly Cron',
    55: 'C3 Zone Authoring',
    56: 'HVAC Extractor',
    57: 'UniFi Probe',
    58: 'Compliance Event Log',
    59: 'Eviction & Holdover Rules',
    60: 'Confidentiality Patterns',
    61: 'Facts Single-Source',
    62: 'Nav Pages Table',
    63: 'Facts Tests',
    64: 'Nav Pages Tests',
    65: 'C3 Upload Tool',
    66: 'C1 Case Study Tool',
    67: 'Splat Converter',
    68: 'Logo Thumbnails Tool',
    69: 'Sampler Watchdog',
    70: 'A-2 Spatial Sheet',
    71: 'R-1 Rent Roll',
    72: 'T-1 Critical Dates',
    73: 'K-1 Directory',
    74: 'S-1 Owner Safe',
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
