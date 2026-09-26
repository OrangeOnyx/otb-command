"""Extract the reel's plan geometry from src/data/geometry.json → site.js."""
import json
from pathlib import Path

here = Path(__file__).parent
g = json.loads((here / '../../src/data/geometry.json').read_text())
paths = lambda layer: [e['d'] for e in g['layers'][layer] if e['t'] == 'path']
units = [[round(u[k], 1) for k in 'xywh'] for u in g['units'].values()]
rows = [{'n': r['n'], 'q': [[round(x, 1), round(y, 1)] for x, y in r['quad']]}
        for z in g['assetGeom']['zones'] if z['id'] != 'johnston-cad' for r in z['rows']]
site = {'boundary': paths('base')[3], 'lot7': paths('remoteLot')[0], 'units': units, 'rows': rows}
(here / 'site.js').write_text('window.SITE=' + json.dumps(site, separators=(',', ':')) + ';\n')
print(len(units), 'suites ·', sum(r['n'] for r in rows), 'stalls')
