import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { planToCad, cadToLL, planToLL, planBearing, ringCentroid } from "../src/lib/geoproject.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(join(root, "src/data/geometry.json"), "utf8"));
const fpGeo = JSON.parse(readFileSync(join(root, "src/data/footprints-geo.json"), "utf8"));
const georef = fpGeo.georef;

/* rebuild the CAD bay rects exactly like tools/extract-georef.py */
function bayRects() {
  const LB_X0 = 522.5, LB_X1 = 1051.4, LB_Y0 = 172.5, LB_Y1 = 258.6;
  const SB_X0 = 425.7, SB_X1 = 510.2, SB_Y0 = 227.6, SB_Y1 = 436.3;
  const LB = geometry.demising.longBuilding.bays.map(b => [b[0], b[1]]);
  const SB = geometry.demising.shortBuilding.bays.map(b => [b[0], b[1]]);
  const out = [];
  let scale = (LB_X1 - LB_X0) / LB.reduce((s, [, w]) => s + w, 0), cur = LB_X0;
  for (const [u, w] of LB) { out.push([u, cur, cur + w * scale, LB_Y0, LB_Y1]); cur += w * scale; }
  scale = (SB_Y1 - SB_Y0) / SB.reduce((s, [, w]) => s + w, 0); cur = SB_Y0;
  const xmid = (SB_X0 + SB_X1) / 2;
  for (const [u, w] of SB) {
    const y0 = cur, y1 = cur + w * scale;
    if (u === "135") { out.push(["135B", SB_X0, xmid, y0, y1]); out.push(["135A", xmid, SB_X1, y0, y1]); }
    else out.push([u, SB_X0, SB_X1, y0, y1]);
    cur = y1;
  }
  return out;
}

test("planToCad lands every unit's plan center inside ~7 ft of its CAD bay center", () => {
  for (const [u, cx0, cx1, cy0, cy1] of bayRects()) {
    const p = geometry.units[u];
    assert.ok(p, `plan rect missing for ${u}`);
    const c = planToCad(p.x + p.w / 2, p.y + p.h / 2);
    const dx = c.x - (cx0 + cx1) / 2, dy = c.y - (cy0 + cy1) / 2;
    const d = Math.hypot(dx, dy);
    assert.ok(d < 7, `${u}: plan→CAD center off by ${d.toFixed(1)} ft`);
  }
});

test("cadToLL maps the anchor onto anchorLL exactly", () => {
  const [lng, lat] = cadToLL(georef, georef.anchorCad[0], georef.anchorCad[1]);
  assert.equal(lat, georef.anchorLL[0]);
  assert.equal(lng, georef.anchorLL[1]);
});

test("planToLL agrees with the emitted footprint centroids (≤ ~8 ft)", () => {
  const M_LAT = 111320, M_FT = 0.3048;
  for (const f of fpGeo.features) {
    const u = f.properties.unit;
    const p = geometry.units[u];
    if (!p) continue;
    const [glng, glat] = ringCentroid(f.geometry.coordinates[0]);
    const [plng, plat] = planToLL(georef, p.x + p.w / 2, p.y + p.h / 2);
    const dn = (plat - glat) * M_LAT;
    const de = (plng - glng) * M_LAT * Math.cos(glat * Math.PI / 180);
    const dFt = Math.hypot(dn, de) / M_FT;
    assert.ok(dFt < 8, `${u}: planToLL off footprint centroid by ${dFt.toFixed(1)} ft`);
  }
});

test("planBearing turns the fitted azimuth into plan-up (azY+180)", () => {
  assert.equal(planBearing({ azY: 52.25 }), 232.25);
  assert.equal(planBearing({ azY: 200 }), 20);
});

test("ringCentroid: exact on a rectangle, sane on degenerate input", () => {
  const rect = [[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]];
  assert.deepEqual(ringCentroid(rect), [2, 1]);
  assert.deepEqual(ringCentroid([[3, 5], [3, 5], [3, 5]]), [3, 5]);
});
