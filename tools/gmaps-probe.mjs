#!/usr/bin/env node
// gmaps-probe.mjs — verify the Google Maps Platform key and see what each API
// returns for On The Boulevard before wiring anything into the app.
// Reads ~/.otb-gmaps.env (same drill as unifi-probe.mjs). NEVER prints the key.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const envText = readFileSync(join(homedir(), '.otb-gmaps.env'), 'utf8');
const m = envText.match(/^GOOGLE_MAPS_API_KEY=(.+)$/m);
const KEY = m && m[1].trim();
if (!KEY) { console.error('No key in ~/.otb-gmaps.env'); process.exit(1); }

// Property anchor (HANDOFF georef) + local landmarks for drive times.
const OTB = { latitude: 30.201689, longitude: -92.053983 };
const DESTS = [
  { name: 'Downtown Lafayette (Jefferson St)', latitude: 30.22409, longitude: -92.01984 },
  { name: 'UL Lafayette (Martin Hall)', latitude: 30.21309, longitude: -92.01875 },
  { name: 'I-10 Exit 101 (Ambassador)', latitude: 30.25453, longitude: -92.07387 },
];

const hdr = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY };
async function call(name, url, opts) {
  try {
    const r = await fetch(url, opts);
    const body = await r.json().catch(() => ({}));
    return { name, status: r.status, body };
  } catch (e) { return { name, status: 0, body: { error: String(e.message) } }; }
}

console.log('— OTB Google Maps probe —\n');

// 1. Places API (New): what surrounds the center?
{
  const res = await call('Places nearby', 'https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { ...hdr, 'X-Goog-FieldMask': 'places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.businessStatus' },
    body: JSON.stringify({
      locationRestriction: { circle: { center: OTB, radius: 400 } },
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
    }),
  });
  console.log(`[Places API (New)] HTTP ${res.status}`);
  if (res.status === 200) {
    const places = res.body.places || [];
    console.log(`  ${places.length} places within 400 m (by popularity):`);
    for (const p of places) {
      const rating = p.rating ? `${p.rating}★ (${p.userRatingCount})` : 'no rating';
      console.log(`  · ${p.displayName?.text} — ${p.primaryTypeDisplayName?.text || '?'} — ${rating} — ${p.businessStatus || ''}`);
    }
  } else console.log('  ', JSON.stringify(res.body.error || res.body).slice(0, 400));
  console.log();
}

// 2. Routes API: drive times from the property.
{
  console.log('[Routes API]');
  for (const d of DESTS) {
    const res = await call('route', 'https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { ...hdr, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
      body: JSON.stringify({
        origin: { location: { latLng: OTB } },
        destination: { location: { latLng: { latitude: d.latitude, longitude: d.longitude } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });
    if (res.status === 200 && res.body.routes?.length) {
      const r0 = res.body.routes[0];
      const min = Math.round(parseInt(r0.duration) / 60);
      const mi = (r0.distanceMeters / 1609.34).toFixed(1);
      console.log(`  · ${d.name}: ~${min} min, ${mi} mi`);
    } else console.log(`  · ${d.name}: HTTP ${res.status} ${JSON.stringify(res.body.error?.message || res.body).slice(0, 200)}`);
  }
  console.log();
}

// 3. Solar API: roof insights for the long building.
{
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${OTB.latitude}&location.longitude=${OTB.longitude}&requiredQuality=BASE`;
  const res = await call('Solar', url, { headers: { 'X-Goog-Api-Key': KEY } });
  console.log(`[Solar API] HTTP ${res.status}`);
  if (res.status === 200) {
    const b = res.body;
    const sp = b.solarPotential || {};
    const areaSqft = sp.wholeRoofStats?.areaMeters2 ? Math.round(sp.wholeRoofStats.areaMeters2 * 10.7639) : null;
    console.log(`  · imagery: ${b.imageryQuality} (${b.imageryDate ? `${b.imageryDate.year}-${b.imageryDate.month}` : '?'})`);
    console.log(`  · roof area: ${areaSqft ? areaSqft.toLocaleString() + ' SF' : '?'} across ${sp.roofSegmentStats?.length ?? '?'} segments`);
    console.log(`  · max panels: ${sp.maxArrayPanelsCount ?? '?'} (${sp.maxArrayAreaMeters2 ? Math.round(sp.maxArrayAreaMeters2 * 10.7639).toLocaleString() + ' SF' : '?'})`);
    console.log(`  · max sunshine: ${sp.maxSunshineHoursPerYear ?? '?'} hrs/yr`);
  } else console.log('  ', JSON.stringify(res.body.error?.message || res.body).slice(0, 300));
  console.log();
}

// 4. Aerial View: is Lafayette in coverage? (Not enabled yet — a 403 tells us the
// key gate works; a 404 with the API enabled would mean "no video for this address".)
{
  const res = await call('AerialView', 'https://aerialview.googleapis.com/v1/videos:lookupVideo?address=' + encodeURIComponent('101 Arnould Blvd, Lafayette, LA 70506'), {
    headers: { 'X-Goog-Api-Key': KEY },
  });
  console.log(`[Aerial View API] HTTP ${res.status} — ${JSON.stringify(res.body.error?.message || res.body.state || res.body).slice(0, 200)}`);
}
