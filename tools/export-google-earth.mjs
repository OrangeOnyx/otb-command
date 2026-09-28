/* Google Earth export: every georeferencable layer in the repo -> three KMZs (+ CSV of point assets):
     OTB-Google-Earth.kmz          vectors, A-1 plan ground overlays, narrated viewpoints (web + Pro)
     OTB-Drone-Photos-<date>.kmz   Skydio photos at their RTK capture pose (web + Pro)
     OTB-Google-Earth-Pro.kmz      COLLADA site twin, 3D PhotoOverlays, narrated gx:Tour (Earth Pro only)
   Raster + LiDAR inputs come from tools/ge-media.py (npm run export-google-earth runs both); Google Maps
   Platform layers come from the dated snapshot tools/ge-google.mjs writes (npm run ge-google, ≤30-day cache). */
/* Layers:
   Coordinates: plan px (A-1 viewBox) -> CAD ft -> WGS84 through src/lib/geoproject.js and the georef
   shipped in footprints-geo.json — the same seam the A-2 satellite lens uses (icon-grade, ~2 m; NOT survey).
   Rent/economics are deliberately left out of every balloon: the project lives in Google's cloud and
   can be shared. Output -> export/google-earth/ (git-ignored). Run: npm run export-google-earth */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { planToLL, ringCentroid, planBearing } from '../src/lib/geoproject.js';
import { buildTwin } from './build-site-twin.mjs';
import { glbToCollada } from './site-twin/collada.mjs';

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
const CAT = { retail: '#2F6B4F', food: '#C25E33', services: '#3A5570', medical: '#2F6B6B', financial: '#6B4E71', office: '#5F6E64', vacant: '#FFFFFF' }; // = src/lib/colors.js CAT_META
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

/* 7 — Presentation viewpoints (heading matches the A-1 plan orientation). The captions double as the
   Google Earth web "Present" script and the Earth Pro tour narration. Facts only — no rent. */
const mainRing = pathPoints(geo.assetGeom.parcels[0].d).map(ll), center = ringCentroid(mainRing);
const lot7Ring = pathPoints(geo.assetGeom.parcels[1].d).map(ll);
const VIEWS = [
  ['Property overview', center, 420, 0,
    'On The Boulevard Shopping Center · 101–149 Arnould Blvd, Lafayette, LA 70506. 62,883 SF GLA · 27 demised suites · 2 buildings · 4.84 ac · zoned CH. Owned by Belle Realty of Lafayette, LLC.'],
  ['Property oblique', center, 380, 55,
    'Plan orientation: Marie Antoinette St at the top, Arnould Blvd at the bottom, Johnston St / US 167 at left, Patricia St at right.'],
  ['Long building 101–133 storefronts', ll([640, 300]), 220, 60,
    'Long building 101–133 backs Marie Antoinette; storefronts face the main field. Suite 101 sits at the Johnston end. Vacant: 131 (LOI pending) and 133.'],
  ['Short building 135–149', ll([1250, 380]), 170, 60,
    "Short building along Patricia: 135A C. Wolf Barber, 135B Belle management office, 137–145 inline, anchored by Jason's Deli at the Patricia × Arnould corner."],
  ["Jason's Deli anchor (149)", ll([1200, 560]), 110, 55,
    "Anchor tenant Jason's Deli, Suite 149 — 4,613 SF. Lease §9.01: monthly HVAC PM contract with Butcher Air Conditioning; tenant maintains 100% of the Unit 149 HVAC."],
  ['Liquor line', ll([700, 350]), 230, 45,
    "Our Savior's Church easement §3a: restaurants are permitted within 175 ft on the permitted side of this line, and the waiver survives termination of the easement."],
  ['Main field & Driveway A', ll([940, 560]), 200, 50,
    "The main field fills first. Driveway A on Arnould is the only full-movement cut (55′ median opening). Parking variance Entry 99-11797: 324 provided / 344 required."],
  ['Lot 8 pocket', ll([1230, 190]), 110, 50,
    'Lot 8 pocket at Patricia × Marie Antoinette — 19 spaces, second in the fill order.'],
  ['Lot 7 remote lot', ll([1265, -120]), 140, 45,
    'Lot 7, Block M — 110 Marie Antoinette St, parcel 6009649. 32 spaces under mature oaks (invisible in aerials); third in the fill order.'],
  ['Johnston frontage & pylon', ll([100, 400]), 140, 55,
    'Johnston St / US 167 frontage: 14-panel pylon sign and the 10-space strip. The JD Bank corner parcel is NOT A PART — 13 reciprocal-easement spaces, expiring 12/30/2034.']
];
const vst = style('view', { icon: 'https://maps.google.com/mapfiles/kml/shapes/flag.png', scale: 0.7 });
const views = VIEWS.map(([n, p, r, t, cap]) => pm(n, vst, point(p), `<p>${esc(cap)}</p>`, lookAt(p, r, t)));

/* 8 — Media from tools/ge-media.py (optional: skipped if the raster stage has not run) */
const MEDIA = path.join(OUT, 'media'), manPath = path.join(MEDIA, 'manifest.json');
const media = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : null;
const LAT_M = 111320;

/* Rotated LatLonBox for a plan-viewBox raster. Plan screen-up maps to azimuth planBearing (a rotation,
   not a mirror — geoproject.js), so the image stays a rectangle on the ground; self-checked to 0.5 m. */
function planBox([x0, y0, w, h]) {
  const C = [ll([x0, y0]), ll([x0 + w, y0]), ll([x0 + w, y0 + h]), ll([x0, y0 + h])];
  const lng0 = C.reduce((s, p) => s + p[0], 0) / 4, lat0 = C.reduce((s, p) => s + p[1], 0) / 4;
  const k = LAT_M * Math.cos(lat0 * Math.PI / 180), enu = p => [(p[0] - lng0) * k, (p[1] - lat0) * LAT_M];
  const [tl, tr, br, bl] = C.map(enu);
  const up = [(tl[0] + tr[0] - bl[0] - br[0]) / 2, (tl[1] + tr[1] - bl[1] - br[1]) / 2];
  const rt = [(tr[0] + br[0] - tl[0] - bl[0]) / 2, (tr[1] + br[1] - tl[1] - bl[1]) / 2];
  const H = Math.hypot(...up), W = Math.hypot(...rt);
  let rot = -Math.atan2(up[0], up[1]) * 180 / Math.PI; // KML rotation is counter-clockwise
  if (rot <= -180) rot += 360; if (rot > 180) rot -= 360;
  const r = rot * Math.PI / 180, x = -W / 2, y = H / 2;
  const err = Math.hypot(x * Math.cos(r) - y * Math.sin(r) - tl[0], x * Math.sin(r) + y * Math.cos(r) - tl[1]);
  if (err > 0.5) throw new Error(`plan overlay box misfit ${err.toFixed(2)} m`);
  return `<LatLonBox><north>${(lat0 + H / 2 / LAT_M).toFixed(8)}</north><south>${(lat0 - H / 2 / LAT_M).toFixed(8)}</south>` +
    `<east>${(lng0 + W / 2 / k).toFixed(8)}</east><west>${(lng0 - W / 2 / k).toFixed(8)}</west><rotation>${rot.toFixed(4)}</rotation></LatLonBox>`;
}
const mainFiles = {}, planOverlays = [];
if (media?.plan) {
  const box = planBox(media.plan.viewBox);
  for (const [name, file, vis, desc] of [
    [`A-1 site plan — full sheet (${media.plan.rev})`, media.plan.sheet, 0, 'Opaque A-1 sheet draped on the terrain. Toggle on to compare the plan against the imagery.'],
    [`A-1 site plan — linework (${media.plan.rev})`, media.plan.lines, 1, 'Transparent A-1 linework and suites over the imagery.']]) {
    mainFiles[`media/${file}`] = fs.readFileSync(path.join(MEDIA, file));
    planOverlays.push(`<GroundOverlay><name>${esc(name)}</name><visibility>${vis}</visibility><description>${esc(desc)}</description>` +
      `<color>${vis ? 'ccffffff' : 'ffffffff'}</color><drawOrder>${vis ? 2 : 1}</drawOrder><Icon><href>media/${file}</href></Icon>${box}</GroundOverlay>`);
  }
}

/* 9 — Drone photos (Skydio X10, RTK): pins at the capture position with the drone's own camera view */
const inRing = ([x, y], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    if ((ring[i][1] > y) !== (ring[j][1] > y) && x < (ring[j][0] - ring[i][0]) * (y - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
  return c;
};
const photos = (media?.photos || []).map(p => ({ ...p, onSite: inRing([p.lng, p.lat], mainRing) || inRing([p.lng, p.lat], lot7Ring) }));
const photoFiles = {};
const camView = p => `<Camera><longitude>${p.lng.toFixed(8)}</longitude><latitude>${p.lat.toFixed(8)}</latitude><altitude>${p.relAltM.toFixed(2)}</altitude>` +
  `<heading>${(p.yaw ?? 0).toFixed(2)}</heading><tilt>${Math.max(0, 90 + (p.pitch ?? -90)).toFixed(2)}</tilt><roll>0</roll><altitudeMode>relativeToGround</altitudeMode></Camera>`;
const airPoint = p => `<Point><extrude>1</extrude><altitudeMode>relativeToGround</altitudeMode><coordinates>${p.lng.toFixed(8)},${p.lat.toFixed(8)},${p.relAltM.toFixed(2)}</coordinates></Point>`;
const photoDesc = p => `<img src="${p.file}" width="640"/><br/>` + table([['Photo', p.source], ['Taken (UTC)', p.taken], ['Height above takeoff', `${p.relAltM.toFixed(1)} m`],
  ['Camera heading / pitch', `${(p.yaw ?? 0).toFixed(1)}° / ${(p.pitch ?? 0).toFixed(1)}°`], ['GPS accuracy', p.hAccM != null ? `±${p.hAccM.toFixed(2)} m` : ''],
  ['Where', p.onSite ? 'Over OTB (Belle parcels)' : 'Adjacent property']]);
const pst = style('photo', { icon: 'https://maps.google.com/mapfiles/kml/shapes/camera.png', iconColor: '#D97706', scale: 0.6 });
const photoPms = { on: [], off: [] };
for (const p of photos) {
  photoFiles[p.file] = fs.readFileSync(path.join(MEDIA, p.file));
  photoPms[p.onSite ? 'on' : 'off'].push(pm(p.source, pst, airPoint(p), photoDesc(p), camView(p)));
}
const byTime = [...photos].sort((a, b) => a.taken.localeCompare(b.taken));
const flightPath = photos.length ? pm(`Flight path ${byTime[0].taken.slice(0, 10)}`, style('flight', { line: '#D97706', width: 2 }),
  `<LineString><altitudeMode>relativeToGround</altitudeMode><coordinates>${byTime.map(p => `${p.lng.toFixed(8)},${p.lat.toFixed(8)},${p.relAltM.toFixed(2)}`).join(' ')}</coordinates></LineString>`) : '';

/* 10 — Terrain (USGS 3DEP 1 m LiDAR via ge-media.py): relief overlay, 0.1 m contours, low spots on the parcels */
const terr = media?.terrain, terrain = [];
if (terr) {
  const b = terr.box;
  mainFiles[`media/${terr.relief}`] = fs.readFileSync(path.join(MEDIA, terr.relief));
  terrain.push(`<GroundOverlay><name>Color relief + hillshade (${terr.minM}–${terr.maxM} m NAVD88)</name><visibility>0</visibility>` +
    `<description>${esc(`${terr.source}. Blue = low, brown = high. 2017 flight — later regrading is not reflected.`)}</description><drawOrder>3</drawOrder>` +
    `<Icon><href>media/${terr.relief}</href></Icon><LatLonBox><north>${b.north}</north><south>${b.south}</south><east>${b.east}</east><west>${b.west}</west></LatLonBox></GroundOverlay>`);
  const cmaj = style('contour-major', { line: '#3B2A1A', width: 2, label: 0.7 }), cmin = style('contour-minor', { line: '#6B5A48', lineA: 'b3', width: 1 });
  terrain.push(folder(`Contours (${terr.contourStepM} m, major every 0.5 m)`, terr.contours.filter(c => c.lines.length).map(c =>
    pm(`${c.elevM.toFixed(1)} m`, c.major ? cmaj : cmin, `<MultiGeometry>${c.lines.map(lineStr).join('')}</MultiGeometry>`, table([['Elevation', `${c.elevM.toFixed(2)} m NAVD88 (${(c.elevM / FT_M).toFixed(1)} ft)`], ['Source', terr.source]])))));
  const lows = terr.lows.filter(l => inRing([l.lng, l.lat], mainRing) || inRing([l.lng, l.lat], lot7Ring)).sort((a, b) => a.elevM - b.elevM);
  terrain.push(folder(`Low spots on the parcels (${lows.length})`, lows.map((l, i) => pm(`Low ${i + 1} · ${l.elevM.toFixed(2)} m`,
    style('low', { icon: 'https://maps.google.com/mapfiles/kml/shapes/water.png', scale: 0.7 }), point([l.lng, l.lat]),
    table([['Ground', `${l.elevM.toFixed(2)} m NAVD88 (${(l.elevM / FT_M).toFixed(1)} ft)`], ['Depth below the 25 m neighbourhood', `${Math.round(l.depthM * 100)} cm`],
      ['Read as', 'Candidate ponding spot or storm inlet — confirm on the ground (2017 LiDAR)']])))));
}

/* 11 — Google Maps Platform snapshot (tools/ge-google.mjs): Street View poses, corridor routes, drive-time catchments, Places */
const gPath = path.join(OUT, 'google', 'snapshot.json');
const gs = fs.existsSync(gPath) ? JSON.parse(fs.readFileSync(gPath, 'utf8')) : null;
const decodePolyline = s => {
  const pts = []; let i = 0, lat = 0, lng = 0;
  while (i < s.length) for (const k of [0, 1]) {
    let r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
    const d = r & 1 ? ~(r >> 1) : r >> 1; if (k === 0) lat += d; else { lng += d; pts.push([lng / 1e5, lat / 1e5]); }
  }
  return pts;
};
const circle = ([lng, lat], m, n = 72) => Array.from({ length: n + 1 }, (_, i) => {
  const t = 2 * Math.PI * i / n; return [lng + m * Math.sin(t) / (LAT_M * Math.cos(lat * Math.PI / 180)), lat + m * Math.cos(t) / LAT_M];
});
const gAsOf = gs ? gs.asOf.slice(0, 10) : '', gNote = gs ? `Google Maps Platform data as of ${gAsOf} — © Google. Temporary cache (≤30 days); refresh with node tools/ge-google.mjs.` : '';
const streetView = [], trade = [], catchment = [], nearby = [];
if (gs) {
  const svst = style('sv', { icon: 'https://maps.google.com/mapfiles/kml/shapes/camera.png', iconColor: '#1976D2', scale: 0.6 });
  const bySt = {};
  for (const p of gs.streetView) {
    const url = `https://www.google.com/maps/@?api=1&amp;map_action=pano&amp;pano=${encodeURIComponent(p.id)}&amp;heading=${p.heading}&amp;pitch=0&amp;fov=80`;
    const cam = `<Camera><longitude>${p.lng}</longitude><latitude>${p.lat}</latitude><altitude>2.5</altitude><heading>${p.heading}</heading><tilt>85</tilt><roll>0</roll><altitudeMode>relativeToGround</altitudeMode></Camera>`;
    (bySt[p.street] ||= []).push(pm(`${p.street} · ${p.date}`, svst, point([p.lng, p.lat]),
      `<p><a href="${url}">Open Google Street View here (captured ${esc(p.date)})</a></p><p>Double-click the pin for a street-level view of Google Earth's 3D, facing the property.</p><p style="font-size:smaller">© Google</p>`, cam));
  }
  for (const [st, items] of Object.entries(bySt)) streetView.push(folder(`${st} (${items.length})`, items));
  const rst = style('route', { line: '#1976D2', width: 4 });
  for (const r of gs.routes) trade.push(pm(`${r.name} — ${r.minutes} min, ${r.miles} mi`, rst, lineStr(decodePolyline(r.polyline)), table([['Destination', r.name], ['Drive (traffic-aware)', `${r.minutes} min`], ['Distance', `${r.miles} mi`], ['As of', gAsOf]])));
  for (const mi of [1, 3, 5]) trade.push(pm(`${mi}-mile ring`, style('ring', { line: '#A87E2F', width: 2 }), lineStr(circle(gs.site, mi * 1609.34)), table([['Radius', `${mi} mi from the main field`]])));
  const CC = { 5: '#2F6B4E', 10: '#D97706', 15: '#C25E33' };
  for (const c of [...gs.catchments].reverse()) catchment.push(pm(`${c.minutes}-minute drive-time catchment`, style(`iso${c.minutes}`, { line: CC[c.minutes], width: 2, fill: CC[c.minutes], fillA: '30' }),
    poly(c.ring), table([['Catchment', `Area within ${c.minutes} min drive of the main field (inbound, free-flow)`], ['Method', 'Google Route Matrix from a 24-bearing × 12-radius grid, interpolated per bearing'], ['As of', gAsOf]])));
  const PC = ['#C25E33', '#2F6B4F', '#1976D2', '#8E24AA', '#00838F', '#5F6E64', '#D97706'];
  const cats = [...new Set(gs.places.map(p => p.cat))];
  for (const [ci, cat] of cats.entries()) {
    const st = style(`pl${ci}`, { icon: DOT, iconColor: PC[ci % PC.length], scale: 0.6 });
    nearby.push(folder(`${cat} (${gs.places.filter(p => p.cat === cat).length})`, gs.places.filter(p => p.cat === cat).map(p =>
      pm(p.name, st, point([p.lng, p.lat]), table([['Business', p.name], ['Type', p.type], ['Rating', p.rating ? `${p.rating} (${p.ratings.toLocaleString('en-US')} reviews)` : ''],
        ['Address', p.address]]) + (p.url ? `<p><a href="${esc(p.url)}">Open in Google Maps</a></p>` : '') + '<p style="font-size:smaller">© Google</p>'))));
  }
}

/* 12 — Earth Pro: COLLADA site twin, 3D photo overlays, narrated tour */
const twin = buildTwin(), T = geo.boundary.transform;
const [a0, b0] = twin.data.transform.originPlatFt;
const modelToLL = (X, Z) => {
  const a = -X / FT_M + a0, b = Z / FT_M + b0;
  return ll([T.envelope.xRight - (a - T.aRangeFt[0]) * T.kxPxPerFt, T.envelope.yBottom + (b - T.bRangeFt[1]) * T.kyPxPerFt]);
};
const [mLng, mLat] = modelToLL(0, 0), mk = LAT_M * Math.cos(mLat * Math.PI / 180);
const { dae, stats } = glbToCollada(twin.glb, (X, Y, Z) => { const [lng, lat] = modelToLL(X, Z); return [(lng - mLng) * mk, (lat - mLat) * LAT_M, Y]; },
  { title: 'OTB site twin' });
const model = `<Placemark><name>OTB site twin (3D)</name><description><![CDATA[${table([['Source', 'tools/build-site-twin.mjs (same model as dist-twin/OTB_Site_Twin/model.glb)'],
  ['Geometry', `${stats.meshes} meshes · ${stats.triangles.toLocaleString('en-US')} triangles`], ['Placement', 'Baked into local east-north-up metres through the A-2 georef (~2 m)']])}]]></description>` +
  `<Model><altitudeMode>relativeToGround</altitudeMode><Location><longitude>${mLng.toFixed(8)}</longitude><latitude>${mLat.toFixed(8)}</latitude><altitude>0</altitude></Location>` +
  `<Orientation><heading>0</heading><tilt>0</tilt><roll>0</roll></Orientation><Scale><x>1</x><y>1</y><z>1</z></Scale><Link><href>models/otb-site-twin.dae</href></Link></Model></Placemark>`;
const photoOverlays = photos.map(p => `<PhotoOverlay><name>${esc(p.source)}</name><visibility>0</visibility>${camView(p)}` +
  `<Icon><href>${p.file}</href></Icon><ViewVolume><leftFov>${(-p.hfov / 2).toFixed(2)}</leftFov><rightFov>${(p.hfov / 2).toFixed(2)}</rightFov>` +
  `<bottomFov>${(-p.vfov / 2).toFixed(2)}</bottomFov><topFov>${(p.vfov / 2).toFixed(2)}</topFov><near>${Math.max(5, p.relAltM * 0.6).toFixed(1)}</near></ViewVolume>` +
  `<Point><altitudeMode>relativeToGround</altitudeMode><coordinates>${p.lng.toFixed(8)},${p.lat.toFixed(8)},${p.relAltM.toFixed(2)}</coordinates></Point><shape>rectangle</shape></PhotoOverlay>`);
const tourStops = VIEWS.map(([n, p, r, t, cap], i) => `<Placemark id="stop${i}"><name>${esc(n)}</name><description><![CDATA[<p>${esc(cap)}</p>]]></description>` +
  `<styleUrl>${vst}</styleUrl>${point(p)}</Placemark>`);
const balloon = (i, on) => `<gx:AnimatedUpdate><gx:duration>0.0</gx:duration><Update><targetHref/><Change><Placemark targetId="stop${i}"><gx:balloonVisibility>${on}</gx:balloonVisibility></Placemark></Change></Update></gx:AnimatedUpdate>`;
const tour = `<gx:Tour><name>▶ OTB narrated fly-through</name><description>Double-click to play in Google Earth Pro. ${VIEWS.length} stops with captions.</description><gx:Playlist>` +
  [...VIEWS, VIEWS[0]].map(([, p, r, t], i) => {
    const s = i % VIEWS.length, last = i === VIEWS.length;
    return `<gx:FlyTo><gx:duration>${i === 0 ? 3 : 5}</gx:duration><gx:flyToMode>smooth</gx:flyToMode>${lookAt(p, r, t)}</gx:FlyTo>` +
      (last ? '' : `${balloon(s, 1)}<gx:Wait><gx:duration>7</gx:duration></gx:Wait>${balloon(s, 0)}`);
  }).join('') + `</gx:Playlist></gx:Tour>`;

/* ---------- assemble ---------- */
const readme = `Generated ${new Date().toISOString().slice(0, 10)} by tools/export-google-earth.mjs from geometry ${geo.rev}. ` +
  `Georef: CAD-feet local-tangent affine fitted to Esri imagery (anchor ${G.anchorLL.join(', ')}, azY ${G.azY}°) — icon-grade (~2 m), not survey. ` +
  'Rent and lease economics are intentionally excluded.';
const doc = (name, desc, parts) => `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>
<name>${esc(name)}</name><description>${esc(desc)}</description>${lookAt(center, 420, 0)}<open>1</open>
${[...styles.values()].join('\n')}
${parts.join('')}
</Document></kml>`;
const mainKml = doc(TITLE, readme, [
  folder('Tenant Zoning & POI Directory', [folder('Suite footprints', tenantPolys), folder('Tenant pins', tenantPins)]),
  folder('3D Massing & Solar Glare Exposure', massing, 'Suites extruded to measured roof heights (src/data/heights.json).'),
  folder('Site Plan Overlay (A-1)', planOverlays),
  folder('Parcels, Easements & Liquor Line', legal),
  folder('Parking Utilization & Logistics Zones', zoneFolders, parkingNote),
  folder('Ingress, Aisles & Islands', [folder('Driveways & aisles', circ), folder('Planting islands', islands)]),
  folder('Belle Property Digital Twin Micro-Facilities & Utilities', regFolder(['rtu', 'panel', 'meter-cluster', 'shutoff', 'lus-point', 'lus-main', 'transformer', 'pole', 'ground-hp', 'timeclock', 'firewall'])),
  folder('Exterior Lighting & Photometric Coverage', regFolder(['lighting'])),
  folder('Digital Twin Master Asset Inventory & POI Directory', regFolder(['column', 'bench', 'can', 'bollard', 'ada', 'sign', 'fence', 'walk', 'tree', ...unknownCats])),
  folder('Security Cameras', camItems),
  folder('Stormwater & Drainage — LiDAR Terrain', terrain, terr?.source || ''),
  folder('Street View — Frontages', streetView, gNote),
  folder('Circulation & Trade Area Analysis', trade, gNote),
  folder('Catchment Zones — Drive Time', catchment, gNote),
  folder('Tenant Mix — Nearby Businesses (Google Places, 1 mi)', nearby, gNote),
  folder('3D Presentation Keyframes & Fly-Through Viewpoints', views, 'Use Present in Google Earth to step through these views with their captions.')
]);
const shotDate = byTime[0]?.taken.slice(0, 10) || '';
const photosKml = doc(`OTB drone photos ${shotDate} (Skydio X10)`, `${photos.length} geotagged photos. Click a pin to open the photo; double-click to fly to the drone's exact viewpoint.`, [
  folder(`Over OTB (${photoPms.on.length})`, photoPms.on), folder(`Adjacent properties (${photoPms.off.length})`, photoPms.off), flightPath]);
const proKml = doc(`${TITLE} — Google Earth Pro extras`, 'COLLADA site twin, 3D photo overlays and a narrated tour. Google Earth Pro (desktop) only; the web client ignores models, photo overlays and tours.', [
  tour, folder('Site twin model', [model]), folder('Tour captions', tourStops),
  folder(`Drone photos in 3D — ${shotDate} (toggle on)`, photoOverlays, 'Each photo is hung in 3D at the drone camera’s pose; double-click one to look through it.')]);

fs.mkdirSync(OUT, { recursive: true });
for (const f of ['OTB-Google-Earth.kml']) fs.rmSync(path.join(OUT, f), { force: true }); // superseded: images need the KMZ
const writeKmz = (name, kml, files) => {
  const buf = zipSync({ 'doc.kml': strToU8(kml), ...Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [new Uint8Array(v), { level: 0 }]])) }, { level: 9 });
  fs.writeFileSync(path.join(OUT, name), buf);
  return `${name} ${(buf.length / 1e6).toFixed(1)} MB · ${(kml.match(/<(Placemark|GroundOverlay|PhotoOverlay)[ >]/g) || []).length} features`;
};
const out = [writeKmz('OTB-Google-Earth.kmz', mainKml, mainFiles)];
if (photos.length) out.push(writeKmz(`OTB-Drone-Photos-${shotDate}.kmz`, photosKml, photoFiles));
out.push(writeKmz('OTB-Google-Earth-Pro.kmz', proKml, { 'models/otb-site-twin.dae': Buffer.from(dae), ...photoFiles }));
fs.writeFileSync(path.join(OUT, 'OTB-assets.csv'),
  csv.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n'));
const lls = [...mainKml.matchAll(/(-9\d\.\d+),(3\d\.\d+),/g)].map(m => [+m[1], +m[2]]);
console.log('OK -> export/google-earth\n  ' + out.join('\n  ') + `\n  OTB-assets.csv ${csv.length - 1} points`);
console.log(`media: ${media ? `plan ${media.plan ? 'yes' : 'no'} · photos ${photos.length} (${photoPms.on.length} over OTB)` : 'none — run python tools/ge-media.py first'}`);
console.log(`terrain: ${terr ? `${terr.contours.length} contour levels · ${terrain.length ? 'relief overlay' : ''}` : 'none — node tools/fetch-otb-lidar.mjs, then python tools/ge-media.py'}`);
if (gs) {
  const ageD = (Date.now() - Date.parse(gs.asOf)) / 864e5;
  console.log(`google: ${gs.streetView.length} panos · ${gs.places.length} places · ${gs.routes.length} routes · ${gs.catchments.length} catchments · as of ${gAsOf}${ageD > 30 ? ' — OLDER THAN 30 DAYS: re-run node tools/ge-google.mjs' : ''}`);
} else console.log('google: none — run node tools/ge-google.mjs');
console.log(`model: ${stats.meshes} meshes · ${stats.triangles} tris · origin ${mLat.toFixed(6)}, ${mLng.toFixed(6)} · reflected ${stats.reflected}`);
console.log(`register items without geometry (not exported): ${skipped.join(', ') || 'none'}`);
console.log(`bbox lng ${Math.min(...lls.map(p => p[0])).toFixed(5)}..${Math.max(...lls.map(p => p[0])).toFixed(5)} lat ${Math.min(...lls.map(p => p[1])).toFixed(5)}..${Math.max(...lls.map(p => p[1])).toFixed(5)}`);
