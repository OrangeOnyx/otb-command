import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIDAR_RELEASE, HILLSHADE_COORDINATES, ELEVATION_AOI,
  hillshadeUrl, elevationPresent, probeHillshade, LIDAR_FETCH_HINT,
} from "../src/lib/elevation.js";
import { MAP_ASSETS, LAZ_ASSETS, selectedAssets, destFor, shouldSkip, TAG } from "../tools/fetch-otb-lidar.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const satBase = JSON.parse(readFileSync(join(root, "src/data/sat-base.json"), "utf8"));

test("release tag and hillshade URL match the documented pack", () => {
  assert.equal(LIDAR_RELEASE, "lidar-otb-v1");
  assert.equal(TAG, "lidar-otb-v1");
  assert.equal(hillshadeUrl("/"), "/elevation/OTB-hillshade.png");
  assert.equal(hillshadeUrl("/app/"), "/app/elevation/OTB-hillshade.png");
  assert.match(LIDAR_FETCH_HINT, /fetch-otb-lidar/);
});

test("hillshade corners sit on the published WGS84 AOI (1 m UTM snap)", () => {
  assert.equal(HILLSHADE_COORDINATES.length, 4);
  const slop = 0.00012; // ~13 m — covers gdalwarp 1 m snap vs rounded bbox
  for (const [lng, lat] of HILLSHADE_COORDINATES) {
    assert.ok(lng >= ELEVATION_AOI.west - slop && lng <= ELEVATION_AOI.east + slop, lng);
    assert.ok(lat >= ELEVATION_AOI.south - slop && lat <= ELEVATION_AOI.north + slop, lat);
  }
});

test("frozen sat-base is inside the hillshade drape", () => {
  const lngs = HILLSHADE_COORDINATES.map(c => c[0]);
  const lats = HILLSHADE_COORDINATES.map(c => c[1]);
  const west = Math.min(...lngs), east = Math.max(...lngs);
  const south = Math.min(...lats), north = Math.max(...lats);
  for (const [lng, lat] of satBase.coordinates) {
    assert.ok(lng >= west && lng <= east, "sat lng " + lng);
    assert.ok(lat >= south && lat <= north, "sat lat " + lat);
  }
});

test("elevationPresent rejects SPA HTML fallback and 404", () => {
  assert.equal(elevationPresent({ ok: false, headers: { get: () => "image/png" } }), false);
  assert.equal(elevationPresent({ ok: true, headers: { get: () => "text/html; charset=utf-8" } }), false);
  assert.equal(elevationPresent({ ok: true, headers: { get: () => "image/png" } }), true);
});

test("probeHillshade returns null when the file is absent", async () => {
  const url = await probeHillshade(async () => ({ ok: false, headers: { get: () => "" } }), "/");
  assert.equal(url, null);
  const html = await probeHillshade(async () => ({
    ok: true, headers: { get: () => "text/html" },
  }), "/");
  assert.equal(html, null);
  const hit = await probeHillshade(async () => ({
    ok: true, headers: { get: () => "image/png" },
  }), "/");
  assert.equal(hit, "/elevation/OTB-hillshade.png");
});

test("fetch script: maps by default, LAZ only with --with-laz", () => {
  assert.ok(MAP_ASSETS.includes("OTB-hillshade.png"));
  assert.ok(MAP_ASSETS.includes("OTB-dem-1m.tif"));
  assert.ok(!MAP_ASSETS.includes("OTB-site.laz"));
  assert.deepEqual(selectedAssets([]), MAP_ASSETS);
  assert.ok(selectedAssets(["--with-laz"]).includes("OTB-site.laz"));
  assert.equal(destFor("OTB-hillshade.png", "/repo"), join("/repo", "public", "elevation", "OTB-hillshade.png"));
  assert.equal(shouldSkip(join(root, "package.json"), 1), false); // size mismatch → re-fetch
  assert.equal(LAZ_ASSETS.length, 1);
});
