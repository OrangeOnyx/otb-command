/* Pure geo-projection seam for the A-2 satellite lens (Lens C).
   Bridges the three coordinate spaces:
     plan px  — the A-1 1480×990 viewBox (geometry.units, asset pins, cameras)
     CAD ft   — the DXF bay space extract-georef.py builds its rects in
                (georef.anchorCad lives here)
     WGS84    — footprints-geo.json, via the georef affine carried in that file
   PLAN2CAD was least-squares fitted over all 27 unit-rect edge pairs
   (geometry.json plan rects vs the CAD bay rects): rms 2.1/5.1 px, max 12 px
   ≈ 6.6 ft — icon-grade, not survey-grade. The x scale is NEGATIVE: the plan
   is mirrored in x relative to CAD (unit 101 draws left, sits at high CAD x).
   Re-fit only if geometry.json unit rects or the bay layout change. */

export const PLAN2CAD = { x0: 2091.3125, xs: -1.839437, y0: -178.9971, ys: 1.802662 };

export function planToCad(px, py) {
  return { x: (px - PLAN2CAD.x0) / PLAN2CAD.xs, y: (py - PLAN2CAD.y0) / PLAN2CAD.ys };
}

const FT_M = 0.3048, LAT_M = 111320; // meters per ft / per degree latitude
const rad = d => d * Math.PI / 180;

/* CAD ft -> [lng, lat] — the same local-tangent affine as tools/extract-georef.py
   (keep the two in lockstep; the georef object ships inside footprints-geo.json) */
export function cadToLL(georef, x, y) {
  const [ax, ay] = georef.anchorCad;
  const k = FT_M * (georef.scaleTweak || 1);
  const dx = (x - ax) * k, dy = (y - ay) * k;
  const azy = rad(georef.azY), azx = rad(georef.azY + 90);
  const east = dx * Math.sin(azx) + dy * Math.sin(azy);
  const north = dx * Math.cos(azx) + dy * Math.cos(azy);
  const [lat0, lng0] = georef.anchorLL;
  return [lng0 + east / (LAT_M * Math.cos(rad(lat0))), lat0 + north / LAT_M];
}

export function planToLL(georef, px, py) {
  const c = planToCad(px, py);
  return cadToLL(georef, c.x, c.y);
}

/* Map bearing that reproduces the A-1 plan orientation (Marie Antoinette top,
   Arnould bottom, Johnston left, Patricia right): plan screen-up = CAD −y,
   whose azimuth is azY + 180. */
export function planBearing(georef) {
  return (georef.azY + 180) % 360;
}

/* Area centroid of a GeoJSON ring [[lng,lat],…] (closing vertex optional).
   Computed relative to the first vertex — raw lng/lat magnitudes (~-92, ~30)
   on a ring only ~1e-4° across cancel catastrophically otherwise. Falls back
   to the vertex mean on degenerate rings. */
export function ringCentroid(ring) {
  const pts = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1) : ring;
  const [ox, oy] = pts[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const x1 = pts[i][0] - ox, y1 = pts[i][1] - oy;
    const x2 = pts[(i + 1) % pts.length][0] - ox, y2 = pts[(i + 1) % pts.length][1] - oy;
    const w = x1 * y2 - x2 * y1;
    a += w; cx += (x1 + x2) * w; cy += (y1 + y2) * w;
  }
  if (Math.abs(a) < 1e-20) {
    const n = pts.length || 1;
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }
  return [ox + cx / (3 * a), oy + cy / (3 * a)];
}
