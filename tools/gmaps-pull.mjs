#!/usr/bin/env node
// gmaps-pull.mjs — snapshot Google Maps Platform data into src/data/corridor.json.
// Build-time only: the key lives in ~/.otb-gmaps.env (never in repo/chat/Vercel);
// the app and the leasing one-pager read the committed snapshot, never Google.
// Re-run to refresh (leasing-package regen picks it up). Deterministic ordering.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(homedir(), ".otb-gmaps.env"), "utf8");
const KEY = (envText.match(/^GOOGLE_MAPS_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error("No key in ~/.otb-gmaps.env"); process.exit(1); }

// Property anchor (same source as the georef fit — see extract-georef.py).
const OTB = { latitude: 30.201689, longitude: -92.053983 };
const DESTS = [
  { id: "downtown", name: "Downtown Lafayette", latitude: 30.22409, longitude: -92.01984 },
  { id: "ul", name: "UL Lafayette campus", latitude: 30.21309, longitude: -92.01875 },
  { id: "i10", name: "I-10 (Ambassador Caffery)", latitude: 30.25453, longitude: -92.07387 },
];

const hdr = { "Content-Type": "application/json", "X-Goog-Api-Key": KEY };

// Places nearby, one ring at a time. Inner ring (120 m) ≈ the center itself
// (tenant storefronts + its own listing); outer ring (400 m) = the corridor.
async function ring(radius) {
  const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: { ...hdr, "X-Goog-FieldMask": "places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.businessStatus" },
    body: JSON.stringify({
      locationRestriction: { circle: { center: OTB, radius } },
      maxResultCount: 20,
      rankPreference: "POPULARITY",
    }),
  });
  if (!r.ok) { console.error(`Places(${radius}m) HTTP ` + r.status); process.exit(1); }
  return ((await r.json()).places || [])
    .filter(p => (p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL" && p.rating)
    .map(p => ({
      name: p.displayName?.text || "",
      type: p.primaryTypeDisplayName?.text || "",
      rating: p.rating,
      ratings: p.userRatingCount || 0,
    }))
    .sort((a, b) => b.ratings - a.ratings || a.name.localeCompare(b.name));
}
const inner = await ring(120);
const outer = await ring(400);
const centerListing = inner.find(p => /on the boulevard/i.test(p.name)) || null;

// 2. Drive times.
const driveTimes = [];
for (const d of DESTS) {
  const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { ...hdr, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters" },
    body: JSON.stringify({
      origin: { location: { latLng: OTB } },
      destination: { location: { latLng: { latitude: d.latitude, longitude: d.longitude } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!r.ok) { console.error(`Routes(${d.id}) HTTP ` + r.status); process.exit(1); }
  const r0 = (await r.json()).routes?.[0];
  driveTimes.push({
    id: d.id, name: d.name,
    minutes: Math.round(parseInt(r0.duration) / 60),
    miles: +(r0.distanceMeters / 1609.34).toFixed(1),
  });
}

const out = {
  _comment: "Google Maps Platform snapshot (tools/gmaps-pull.mjs). Ratings/ratings-counts are Google user data — attribute 'Google' wherever displayed. Re-run the tool to refresh; never fetched at runtime.",
  asOf: new Date().toISOString().slice(0, 10),
  center: OTB,
  centerListing,
  inner: { radiusMeters: 120, places: inner.filter(p => p !== centerListing) },
  outer: { radiusMeters: 400, places: outer },
  driveTimes,
};
const dest = join(ROOT, "src", "data", "corridor.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`corridor.json: ${out.inner.places.length} inner + ${outer.length} outer places, center listing ${centerListing ? centerListing.rating + "★" : "—"}, ${driveTimes.length} drive times, as of ${out.asOf}`);
