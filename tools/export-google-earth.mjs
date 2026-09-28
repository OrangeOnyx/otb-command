/* Google Earth export: every georeferencable layer in the repo -> one KMZ (+ CSV of point assets).
   Coordinates: plan px (A-1 viewBox) -> CAD ft -> WGS84 through src/lib/geoproject.js and the georef
   shipped in footprints-geo.json — the same seam the A-2 satellite lens uses (icon-grade, ~2 m; NOT survey).
   Rent/economics are deliberately left out of every balloon: the project lives in Google's cloud and
   can be shared. Output -> export/google-earth/ (git-ignored). Run: npm run export-google-earth */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { planToLL, ringCentroid, planBearing } from '../src/lib/geoproject.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', f), 'utf8'));
const geo = J('geometry.json'), fp = J('footprints-geo.json'), units = J('units.json');
const heights = J('heights.json'), register = J('site-register.json'), cams = J('cameras.json');
const G = fp.georef, FT_M = 0.3048;
const OUT = path.join(ROOT, 'export', 'google-earth');
const TITLE = 'Cypress Command Platform — On The Boulevard (OTB)';

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ll = ([x, y]) => planToLL(G, x, y);
const coords = (pts, alt = 0) => pts.map(([lng, lat]) => `${lng.toFixed(7)},${lat.toFixed(7)},${alt}`).join(' ');
const closeRing = r => (r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1]) ? r : [...r, r[0]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// KML colour = aabbggrr
const kc = (hex, a = 'ff') => a + hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3);
const table = rows => '<table>' + rows.filter(([, v]) => v !== '' && v != null)
  .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('') + '</table>';

/* SVG path (absolute M/L/A/Z only — what geometry.json emits) -> plan-px polyline, arcs sampled */
function pathPoints(d) {
  const tok = d.match(/[MLAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const out = []; let i = 0, cmd, cur = [0, 0];
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLAZ]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'Z') continue;
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; out.push(cur); }
    else if (cmd === 'A') {
      const rx0 = num(), ry0 = num(), rot = num(), large = num(), sweep = num(), end = [num(), num()];
      out.push(...arcPoints(cur, end, rx0, ry0, rot, large, sweep)); cur = end;
    }
  }
  return out;
}
function arcPoints([x1, y1], [x2, y2], rx, ry, rotDeg, fa, fs, n = 24) {
  const phi = rotDeg * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = c * dx + s * dy, yp = -s * dx + c * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / (rx * rx * yp * yp + ry * ry * xp * xp)));
  const cxp = k * rx * yp / ry, cyp = -k * ry * xp / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const pts = [];
  for (let j = 1; j <= n; j++) {
    const t = t1 + dt * j / n;
    pts.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
  }
  return pts;
}

/* ---------- KML builders ---------- */
const styles = new Map();
function style(id, { line = '#1C2B26', lineA = 'ff', width = 2, fill = null, fillA = '80', icon = null, iconColor = null, scale = 0.8, label = 0 }) {
  if (!styles.has(id)) styles.set(id, `<Style id="${id}">` +
    (icon ? `<IconStyle>${iconColor ? `<color>${kc(iconColor)}</color>` : ''}<scale>${scale}</scale><Icon><href>${icon}</href></Icon></IconStyle>` : '') +
    `<LabelStyle><scale>${label}</scale></LabelStyle>` +
    `<LineStyle><color>${kc(line, lineA)}</color><width>${width}</width></LineStyle>` +
    `<PolyStyle>${fill ? `<color>${kc(fill, fillA)}</color>` : '<fill>0</fill>'}</PolyStyle></Style>`);
  return `#${id}`;
}
const DOT = 'https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png';
const pm = (name, st, geom, desc = '', extra = '') =>
  `<Placemark><name>${esc(name)}</name>${desc ? `<description><![CDATA[${desc}]]></description>` : ''}${extra}<styleUrl>${st}</styleUrl>${geom}</Placemark>`;
const point = ([lng, lat]) => `<Point><coordinates>${lng.toFixed(7)},${lat.toFixed(7)},0</coordinates></Point>`;
const lineStr = pts => `<LineString><tessellate>1</tessellate><coordinates>${coords(pts)}</coordinates></LineString>`;
const poly = (ring, altM = 0) => altM
  ? `<Polygon><extrude>1</extrude><altitudeMode>relativeToGround</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${coords(closeRing(ring), altM.toFixed(2))}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
  : `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${coords(closeRing(ring))}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
const folder = (name, items, desc = '') => items.filter(Boolean).length
  ? `<Folder><name>${esc(name)}</name>${desc ? `<description>${esc(desc)}</description>` : ''}${items.join('')}</Folder>` : '';
const lookAt = ([lng, lat], range, tilt = 50, heading = planBearing(G)) =>
  `<LookAt><longitude>${lng}</longitude><latitude>${lat}</latitude><altitude>0</altitude><heading>${heading}</heading><tilt>${tilt}</tilt><range>${range}</range><altitudeMode>relativeToGround</altitudeMode></LookAt>`;

/* ---------- palette (plan-room + 04C brand) ---------- */
const CAT = { retail: '#2F6B4F', food: '#D97706', services: '#5F6E64', office: '#1E4D3A', vacant: '#FFFFFF' };
const STATUS_ANCHOR = '#1E4F3C';
const csv = [['layer', 'id', 'name', 'category', 'latitude', 'longitude', 'notes']];
const addCsv = (layer, id, name, cat, [lng, lat], notes = '') => csv.push([layer, id, name, cat, lat.toFixed(7), lng.toFixed(7), notes]);

/* 1 — Tenants: 2D footprints + pins with lease facts (no rent) */
const unitById = Object.fromEntries(units.map(u => [u.unit, u]));
const tenantPolys = [], tenantPins = [], massing = [];
for (const f of fp.features) {
  const id = f.properties.unit, u = unitById[id] || {}, ring = f.geometry.coordinates[0];
  const color = u.status === 'anchor' ? STATUS_ANCHOR : (CAT[u.cat] || '#5F6E64');
  const desc = table([['Suite', id], ['Tenant', u.dba], ['Legal entity', u.legal], ['Use', u.use],
    ['Status', u.status], ['Area', u.sf ? `${u.sf.toLocaleString('en-US')} SF` : ''],
    ['Lease start', u.start], ['Lease end', u.end || (u.status === 'active' ? 'Term unresolved' : '')], ['Notes', u.notes]]);
  const label = `${id} · ${u.dba || ''}`;
  tenantPolys.push(pm(label, style(`u-${u.cat || 'x'}${u.status === 'anchor' ? '-a' : ''}`, { line: '#1C2B26', width: 1.5, fill: color, fillA: u.cat === 'vacant' ? '99' : 'b3' }), poly(ring), desc));
  const c = ringCentroid(ring);
  tenantPins.push(pm(label, style('pin-tenant', { icon: DOT, iconColor: '#A87E2F', scale: 0.7, label: 0.8 }), point(c), desc));
  addCsv('Tenants', id, u.dba || id, u.cat || '', c, u.use || '');
  const hFt = heights[id] || 16.4;
  massing.push(pm(`${id} — ${hFt}′ roof`, style(`m-${u.cat || 'x'}${u.status === 'anchor' ? '-a' : ''}`, { line: '#F3EDE0', width: 1, fill: color, fillA: 'e6' }), poly(ring, hFt * FT_M), desc));
}

/* 2 — Parcels, easements, liquor line */
const legal = [];
for (const p of geo.assetGeom.parcels)
  legal.push(pm(p.name, style('parcel', { line: '#A87E2F', width: 3 }), poly(pathPoints(p.d).map(ll)), table([['Parcel', p.name]])));
for (const e of geo.assetGeom.easements) {
  const isLiquor = e.id === 'liquor-line';
  const st = style(isLiquor ? 'liquor' : 'easement', isLiquor ? { line: '#C25E33', width: 3 } : { line: '#5F6E64', width: 2, fill: '#5F6E64', fillA: '55' });
  const desc = table([['Easement', e.name], isLiquor ? ['Rule', 'Restaurants OK within 175 ft; §3a waiver survives termination of the church easement'] : ['', '']]);
  if (e.line) legal.push(pm(e.name, st, lineStr(e.line.map(ll)), desc));
  else if (e.quad) legal.push(pm(e.name, st, poly(e.quad.map(ll)), desc));
  else if (e.d) legal.push(pm(e.name, st, lineStr(pathPoints(e.d).map(ll)), desc));
}

/* 3 — Parking: zone rows + every striped stall */
const ZC = ['#2F6B4E', '#1E4D3A', '#A87E2F', '#D97706', '#5F6E64', '#2F6B4F', '#C25E33', '#1C2B26', '#8A9A5B', '#6B4E2F'];
const zoneFolders = [];
geo.assetGeom.zones.forEach((z, zi) => {
  const col = ZC[zi % ZC.length], items = [];
  const zst = style(`zone-${z.id}`, { line: col, width: 2, fill: col, fillA: '40' });
  const sst = style(`stall-${z.id}`, { line: '#F3EDE0', width: 1, fill: col, fillA: '99' });
  const zDesc = table([['Zone', z.name], ['Code', z.code], ['Stalls', z.count],
    ['Scope', z.id === 'jdbank' ? 'JD Bank parcel (NOT A PART) — reciprocal easement spaces, expires 12/30/2034' : z.id === 'johnston-cad' ? 'CAD-striped, unlabeled on plat — pending ground confirmation (314 → 324 reconciliation)' : '']]);
  for (const r of z.rows) {
    const [p0, p1, p2, p3] = r.quad;
    items.push(pm(`${z.code} ${r.id} — ${r.n} stalls`, zst, poly(r.quad.map(ll)), zDesc));
    for (let s = 0; s < r.n; s++) {
      const a = lerp(p0, p1, s / r.n), b = lerp(p0, p1, (s + 1) / r.n), c = lerp(p3, p2, (s + 1) / r.n), d = lerp(p3, p2, s / r.n);
      items.push(pm(`${z.code}-${r.id}-${s + 1}`, sst, poly([a, b, c, d].map(ll))));
    }
  }
  zoneFolders.push(folder(`${z.name} (${z.count})`, items));
});
const parkingNote = 'Plat striping 314 (+10 CAD-only Johnston row = 324 = variance Entry 99-11797 "provided"; 344 required). Cite 324 legally, plan ops on 314.';

/* 4 — Circulation: driveways, aisles, islands */
const circ = [];
for (const d of geo.assetGeom.drives)
  circ.push(pm(d.name, style('drive', { line: '#D97706', width: 2, fill: '#D97706', fillA: '66' }), poly(d.quad.map(ll)),
    table([['Driveway', d.name], ['Street', d.street], ['Movement', d.movement]])));
for (const a of geo.assetGeom.aisles)
  circ.push(pm(a.name, style('aisle', { line: '#EDEFE8', width: 1, fill: '#1C2B26', fillA: '33' }), poly(a.quad.map(ll)),
    table([['Aisle', a.name], ['Flow', a.flow]])));
const islands = geo.assetGeom.islands.filter(i => i.quad || i.d).map(i =>
  pm(i.name, style('island', { line: '#2F6B4F', width: 1, fill: '#2F6B4F', fillA: 'b3' }), poly((i.quad || pathPoints(i.d)).map(ll))));

/* 5 — Site register: fixtures, utilities, lighting, trees (digitized from drawings, not surveyed) */
const REG = {
  column: ['Walkway columns', '#1C2B26'], bench: ['Benches', '#A87E2F'], can: ['Waste cans', '#5F6E64'],
  bollard: ['Bollards', '#5F6E64'], ada: ['ADA stalls & ramps', '#1976D2'], tree: ['Trees', '#2F6B4F'],
  sign: ['Signage', '#D97706'], fence: ['Fences', '#6B4E2F'], walk: ['Walks', '#9A9A8A'], firewall: ['Firewalls', '#C25E33'],
  'meter-cluster': ['Water meter clusters', '#0288D1'], shutoff: ['Water shutoffs', '#03A9F4'],
  'lus-point': ['LUS electric service points', '#FBC02D'], 'lus-main': ['LUS electric mains', '#F9A825'],
  transformer: ['Transformers', '#F57F17'], pole: ['Utility poles', '#795548'], 'ground-hp': ['Ground heat pumps', '#00897B'],
  rtu: ['Rooftop HVAC units', '#00838F'], panel: ['Electrical panels', '#EF6C00'], timeclock: ['Lighting timeclocks', '#8E24AA'],
  lighting: ['Exterior lighting', '#FFD600']
};
const regBy = {}, skipped = [],fpBy = Object.fromEntries(fp.features.map(f => [f.properties.unit, f.geometry.coordinates[0]]));
for (const it of register.items) {
  const [label, col] = REG[it.cat] || [it.cat, '#5F6E64'];
  const desc = table([['Item', it.label], ['Category', label], ['Detail', it.sub], ['Status', it.status], ['Source', it.source], ['Codex id', it.codexLabel]]);
  const pst = style(`rp-${it.cat}`, { icon: DOT, iconColor: col, scale: 0.6 });
  let g;
  if (it.line) g = pm(it.label, style(`rl-${it.cat}`, { line: col, width: 3 }), lineStr(it.line.map(ll)), desc);
  else if (it.polys) g = it.polys.map(r => pm(it.label, style(`ra-${it.cat}`, { line: col, width: 1, fill: col, fillA: '80' }), poly(r.map(ll)), desc)).join('');
  else if (it.point) {
    const p = ll(it.point); addCsv(label, it.id, it.label, it.cat, p, it.sub || '');
    g = pm(it.label, pst, point(p), desc);
  } else if (it.unit && (geo.units[it.unit] || fpBy[it.unit])) {
    // suite-keyed records (no digitized position): pin inside the suite — RTUs on the roof, panels/clocks staggered
    const u = geo.units[it.unit], f = { rtu: 0.5, panel: 0.3, timeclock: 0.7 }[it.cat] ?? 0.5;
    const p = u ? ll([u.x + u.w / 2, u.y + u.h * f]) : ringCentroid(fpBy[it.unit]); addCsv(label, it.id, it.label, it.cat, p, `suite ${it.unit} (position = suite, not surveyed)`);
    const altM = it.cat === 'rtu' ? (heights[it.unit] || 16.4) * FT_M + 1 : 0;
    g = pm(it.label, pst, altM ? `<Point><altitudeMode>relativeToGround</altitudeMode><coordinates>${p[0].toFixed(7)},${p[1].toFixed(7)},${altM.toFixed(2)}</coordinates></Point>` : point(p), desc);
  } else { skipped.push(it.id); continue; } // no geometry on record (e.g. unlocated lighting/signs)
  (regBy[it.cat] ||= []).push(g);
}
const regFolder = cats => cats.filter(c => regBy[c]).map(c => folder(REG[c][0], regBy[c]));
const unknownCats = Object.keys(regBy).filter(c => !REG[c]);

/* 6 — Security cameras: mount + field-of-view wedge (network details withheld) */
const camItems = [];
for (const c of cams.cameras) {
  const o = [c.pos.x, c.pos.y], wedge = [o];
  for (let k = 0; k <= 12; k++) {
    const t = (c.aimDeg - c.fovDeg / 2 + c.fovDeg * k / 12) * Math.PI / 180;
    wedge.push([o[0] + Math.cos(t) * c.rangePx, o[1] + Math.sin(t) * c.rangePx]);
  }
  const desc = table([['Camera', c.name], ['Suite', c.suite], ['Coverage', c.zone], ['FOV', `${c.fovDeg}°`], ['Position', c.posConfidence]]);
  camItems.push(pm(`${c.name} — coverage`, style('cam-fov', { line: '#C25E33', width: 1, fill: '#C25E33', fillA: '33' }), poly(wedge.map(ll)), desc));
  camItems.push(pm(c.name, style('cam', { icon: 'https://maps.google.com/mapfiles/kml/shapes/camera.png', scale: 0.7 }), point(ll(o)), desc));
  addCsv('Security cameras', c.id, c.name, 'camera', ll(o), c.zone);
}

/* 7 — Presentation viewpoints (heading matches the A-1 plan orientation) */
const mainRing = pathPoints(geo.assetGeom.parcels[0].d).map(ll), center = ringCentroid(mainRing);
const VIEWS = [
  ['Property overview (A-1 orientation)', center, 420, 0], ['Property oblique', center, 380, 55],
  ['Long building 101–133 storefronts', ll([640, 300]), 220, 60], ['Short building 135–149', ll([1250, 380]), 170, 60],
  ["Jason's Deli anchor (149)", ll([1200, 560]), 110, 55], ['Main field & Driveway A', ll([940, 560]), 200, 50],
  ['Lot 8 pocket', ll([1230, 190]), 110, 50], ['Lot 7 remote lot', ll([1265, -120]), 140, 45],
  ['Johnston frontage & pylon', ll([100, 400]), 140, 55]
];
const views = VIEWS.map(([n, p, r, t]) => pm(n, style('view', { icon: 'https://maps.google.com/mapfiles/kml/shapes/flag.png', scale: 0.7 }), point(p), '', lookAt(p, r, t)));

/* ---------- assemble ---------- */
const readme = `Generated ${new Date().toISOString().slice(0, 10)} by tools/export-google-earth.mjs from geometry ${geo.rev}. ` +
  `Georef: CAD-feet local-tangent affine fitted to Esri imagery (anchor ${G.anchorLL.join(', ')}, azY ${G.azY}°) — icon-grade (~2 m), not survey. ` +
  'Rent and lease economics are intentionally excluded.';
const body = [
  folder('Tenant Zoning & POI Directory', [folder('Suite footprints', tenantPolys), folder('Tenant pins', tenantPins)]),
  folder('3D Massing & Solar Glare Exposure', massing, 'Suites extruded to measured roof heights (src/data/heights.json).'),
  folder('Parcels, Easements & Liquor Line', legal),
  folder('Parking Utilization & Logistics Zones', zoneFolders, parkingNote),
  folder('Ingress, Aisles & Islands', [folder('Driveways & aisles', circ), folder('Planting islands', islands)]),
  folder('Belle Property Digital Twin Micro-Facilities & Utilities', regFolder(['rtu', 'panel', 'meter-cluster', 'shutoff', 'lus-point', 'lus-main', 'transformer', 'pole', 'ground-hp', 'timeclock', 'firewall'])),
  folder('Exterior Lighting & Photometric Coverage', regFolder(['lighting'])),
  folder('Digital Twin Master Asset Inventory & POI Directory', regFolder(['column', 'bench', 'can', 'bollard', 'ada', 'sign', 'fence', 'walk', 'tree', ...unknownCats])),
  folder('Security Cameras', camItems),
  folder('3D Presentation Keyframes & Fly-Through Viewpoints', views)
].join('');
const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>
<name>${esc(TITLE)}</name><description>${esc(readme)}</description>${lookAt(center, 420, 0)}<open>1</open>
${[...styles.values()].join('\n')}
${body}
</Document></kml>`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'OTB-Google-Earth.kml'), kml);
fs.writeFileSync(path.join(OUT, 'OTB-Google-Earth.kmz'), zipSync({ 'doc.kml': strToU8(kml) }, { level: 9 }));
fs.writeFileSync(path.join(OUT, 'OTB-assets.csv'),
  csv.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n'));
const n = (kml.match(/<Placemark>/g) || []).length;
const lls = [...kml.matchAll(/(-9\d\.\d+),(3\d\.\d+),/g)].map(m => [+m[1], +m[2]]);
console.log(`OK -> export/google-earth | ${n} placemarks | ${csv.length - 1} CSV points | kml ${(kml.length / 1024).toFixed(0)} KB`);
console.log(`register items without geometry (not exported): ${skipped.join(', ') || 'none'}`);
console.log(`bbox lng ${Math.min(...lls.map(p => p[0])).toFixed(5)}..${Math.max(...lls.map(p => p[0])).toFixed(5)} lat ${Math.min(...lls.map(p => p[1])).toFixed(5)}..${Math.max(...lls.map(p => p[1])).toFixed(5)}`);
