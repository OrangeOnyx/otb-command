#!/usr/bin/env node
/* Google Maps Platform stage of the Google Earth export -> export/google-earth/google/snapshot.json (git-ignored).
   Key: ~/.otb-gmaps.env (never printed, never written to output). Pulls:
     · Street View pano METADATA along the four frontages (ids, dates, positions — no imagery is stored;
       Google's terms bar caching Street View images; the KML links out and flies Earth's own 3D to the pose)
     · Places (New) nearby, by category, 1.6 km trade area
     · Routes: traffic-aware polylines to the corridor destinations
     · Route Matrix: inbound drive times from a 24-bearing × 12-radius grid -> 5/10/15-min catchments
   Google terms allow temporary caching (≤30 days) of this content: the snapshot is dated; re-run to refresh.
   Run: node tools/ge-google.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { planToLL } from '../src/lib/geoproject.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const KEY = (fs.readFileSync(path.join(homedir(), '.otb-gmaps.env'), 'utf8').match(/^GOOGLE_MAPS_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('No key in ~/.otb-gmaps.env'); process.exit(1); }
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/footprints-geo.json'), 'utf8')).georef;
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/geometry.json'), 'utf8'));
const OUT = path.join(ROOT, 'export', 'google-earth', 'google');
const ll = ([x, y]) => planToLL(G, x, y);
const toLatLng = ([lng, lat]) => ({ latitude: lat, longitude: lng });
const hdr = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY };
const redact = s => String(s).split(KEY).join('<key>');
async function jfetch(url, opts = {}) {
  const r = await fetch(url, opts);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status} ${redact(JSON.stringify(body.error?.message || body)).slice(0, 200)}`);
  return body;
}
const bearing = ([lng1, lat1], [lng2, lat2]) => {
  const r = Math.PI / 180, y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};
const T = geo.boundary.transform, kx = T.kxPxPerFt, ky = T.kyPxPerFt;
const SITE = ll([900, 560]); // main field centre — catchment destination

/* 1 — Street View: sample each frontage centreline (plan px, offset half the R/W), aim at the boundary */
const FRONTAGES = [
  { street: 'Arnould Blvd', rw: 80, along: 'x', fixed: 662 + 40 * ky, target: 662, from: 70, to: 1360 },
  { street: 'Marie Antoinette St', rw: 40, along: 'x', fixed: 96 - 20 * ky, target: 96, from: 70, to: 1360 },
  { street: 'Johnston St / US 167', rw: 100, along: 'y', fixed: 70 - 50 * kx, target: 70, from: 96, to: 662 },
  { street: 'Patricia St', rw: 50, along: 'y', fixed: 1360 + 25 * kx, target: 1360, from: -263, to: 662 }
];
const panos = new Map();
for (const f of FRONTAGES) {
  for (let s = f.from; s <= f.to; s += 60) {
    const street = f.along === 'x' ? [s, f.fixed] : [f.fixed, s], face = f.along === 'x' ? [s, f.target] : [f.target, s];
    const [lng, lat] = ll(street);
    const m = await jfetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=30&source=outdoor&key=${KEY}`);
    if (m.status !== 'OK' || panos.has(m.pano_id)) continue;
    const p = [m.location.lng, m.location.lat];
    panos.set(m.pano_id, { id: m.pano_id, street: f.street, date: m.date || '', lng: p[0], lat: p[1], heading: +bearing(p, ll(face)).toFixed(1) });
  }
}
console.log(`street view: ${panos.size} unique panoramas`);

/* 2 — Places (New) nearby by category, 1.6 km (≈1 mi) trade area, 20 per category by popularity */
const CATS = {
  'Restaurants & cafés': ['restaurant', 'cafe', 'coffee_shop', 'bakery', 'fast_food_restaurant', 'bar'],
  'Soft-goods & specialty retail': ['clothing_store', 'shoe_store', 'jewelry_store', 'gift_shop', 'book_store', 'furniture_store', 'home_goods_store', 'sporting_goods_store', 'electronics_store', 'department_store'],
  'Grocery, pharmacy & convenience': ['grocery_store', 'supermarket', 'convenience_store', 'pharmacy', 'drugstore', 'liquor_store'],
  'Personal services & fitness': ['beauty_salon', 'hair_care', 'barber_shop', 'nail_salon', 'spa', 'gym', 'laundry'],
  'Medical & veterinary': ['doctor', 'dentist', 'hospital', 'physiotherapist', 'veterinary_care', 'medical_lab'],
  'Banks, insurance & offices': ['bank', 'insurance_agency', 'real_estate_agency', 'accounting', 'lawyer'],
  'Traffic generators': ['school', 'university', 'church', 'shopping_mall', 'park']
};
const FIELDS = 'places.id,places.displayName,places.primaryType,places.primaryTypeDisplayName,places.location,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.formattedAddress';
const places = [], seen = new Set();
for (const [cat, types] of Object.entries(CATS)) {
  try {
    const b = await jfetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST', headers: { ...hdr, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ includedTypes: types, locationRestriction: { circle: { center: toLatLng(SITE), radius: 1600 } }, maxResultCount: 20, rankPreference: 'POPULARITY' })
    });
    let n = 0;
    for (const p of b.places || []) {
      if (seen.has(p.id) || (p.businessStatus && p.businessStatus !== 'OPERATIONAL')) continue;
      seen.add(p.id); n++;
      places.push({ id: p.id, cat, name: p.displayName?.text || '', type: p.primaryTypeDisplayName?.text || p.primaryType || '',
        lat: p.location.latitude, lng: p.location.longitude, rating: p.rating ?? null, ratings: p.userRatingCount ?? 0,
        address: p.formattedAddress || '', url: p.googleMapsUri || '' });
    }
    console.log(`places: ${cat} ${n}`);
  } catch (e) { console.log(`places: ${cat} skipped — ${e.message}`); }
}

/* 3 — Routes: traffic-aware polylines to the corridor destinations (same set as tools/gmaps-pull.mjs) */
const DESTS = [
  { id: 'downtown', name: 'Downtown Lafayette', latitude: 30.22409, longitude: -92.01984 },
  { id: 'ul', name: 'UL Lafayette campus', latitude: 30.21309, longitude: -92.01875 },
  { id: 'i10', name: 'I-10 (Ambassador Caffery)', latitude: 30.25453, longitude: -92.07387 }
];
const routes = [];
for (const d of DESTS) {
  const b = await jfetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST', headers: { ...hdr, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline' },
    body: JSON.stringify({ origin: { location: { latLng: toLatLng(SITE) } }, destination: { location: { latLng: { latitude: d.latitude, longitude: d.longitude } } },
      travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE' })
  });
  const r0 = b.routes?.[0];
  if (r0) routes.push({ ...d, minutes: Math.round(parseInt(r0.duration) / 60), miles: +(r0.distanceMeters / 1609.34).toFixed(1), polyline: r0.polyline.encodedPolyline });
}
console.log(`routes: ${routes.map(r => `${r.id} ${r.minutes} min`).join(' · ')}`);

/* 4 — Route Matrix catchment: inbound drive time from a polar grid to the site, free-flow (no traffic) */
const BEARINGS = 24, RADII_KM = [0.5, 1, 1.5, 2, 3, 4, 5, 6.5, 8, 10, 12.5, 15];
const grid = [];
for (let bi = 0; bi < BEARINGS; bi++) for (const r of RADII_KM) {
  const t = bi * 360 / BEARINGS * Math.PI / 180, lat0 = SITE[1];
  grid.push({ bi, r, lat: lat0 + r * 1000 * Math.cos(t) / 111320, lng: SITE[0] + r * 1000 * Math.sin(t) / (111320 * Math.cos(lat0 * Math.PI / 180)), min: null });
}
for (let i = 0; i < grid.length; i += 25) {
  const chunk = grid.slice(i, i + 25);
  const rows = await jfetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST', headers: { ...hdr, 'X-Goog-FieldMask': 'originIndex,duration,condition' },
    body: JSON.stringify({ origins: chunk.map(g => ({ waypoint: { location: { latLng: { latitude: g.lat, longitude: g.lng } } } })),
      destinations: [{ waypoint: { location: { latLng: toLatLng(SITE) } } }], travelMode: 'DRIVE' })
  });
  for (const e of rows) if (e.condition === 'ROUTE_EXISTS' && e.duration) chunk[e.originIndex].min = parseInt(e.duration) / 60;
}
const catchments = [5, 10, 15].map(T => {
  const ring = [];
  for (let bi = 0; bi < BEARINGS; bi++) {
    const pts = grid.filter(g => g.bi === bi && g.min != null);
    let rT = RADII_KM.at(-1), prev = { r: 0, min: 0 };
    for (const g of pts) { if (g.min >= T) { rT = prev.r + (g.r - prev.r) * (T - prev.min) / Math.max(1e-6, g.min - prev.min); break; } prev = g; }
    const t = bi * 360 / BEARINGS * Math.PI / 180;
    ring.push([SITE[0] + rT * 1000 * Math.sin(t) / (111320 * Math.cos(SITE[1] * Math.PI / 180)), SITE[1] + rT * 1000 * Math.cos(t) / 111320]);
  }
  return { minutes: T, ring };
});
const reached = grid.filter(g => g.min != null).length;
console.log(`catchment: ${reached}/${grid.length} grid points routed · ${catchments.map(c => `${c.minutes} min`).join(' / ')}`);

fs.mkdirSync(OUT, { recursive: true });
const snap = { asOf: new Date().toISOString(), site: SITE, attribution: 'Google', note: 'Temporary cache of Google Maps Platform content (≤30 days per Google terms). Re-run tools/ge-google.mjs to refresh.',
  streetView: [...panos.values()], places, routes, catchments, grid: grid.map(({ lat, lng, r, bi, min }) => ({ lat, lng, r, bi, min })) };
const txt = JSON.stringify(snap, null, 1);
if (txt.includes(KEY)) throw new Error('refusing to write: key found in output');
fs.writeFileSync(path.join(OUT, 'snapshot.json'), txt);
console.log(`OK -> ${path.relative(ROOT, path.join(OUT, 'snapshot.json'))}`);
