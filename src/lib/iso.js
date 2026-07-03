/* Pure isometric geometry for the A-2 spatial sheet. No DOM, no imports.
   Projects plan-space unit footprints (geometry.units) to a 2:1 dimetric
   isometric and builds extruded prism faces. Tested in test/iso.test.mjs. */

export const COS = Math.cos(Math.PI / 6); // ≈0.8660 — 2:1 dimetric
export const SIN = Math.sin(Math.PI / 6); // 0.5
export const FT_SCALE = 3.2;              // plan-units per foot for extrusion height (visual, tunable)

// Project a plan point (px,py) at height z (plan units, up) to iso screen space.
export function isoPoint(px, py, z = 0) {
  return { x: (px - py) * COS, y: (px + py) * SIN - z };
}

// rect = {x,y,w,h} in plan space; z = extrusion height in plan units.
// Returns the top face and the two viewer-facing walls (+x "right", +y "front").
export function prismFaces(rect, z) {
  const { x, y, w, h } = rect;
  const A = [x, y], B = [x + w, y], C = [x + w, y + h], D = [x, y + h];
  const P = ([px, py], zz) => isoPoint(px, py, zz);
  return {
    top:   [P(A, z), P(B, z), P(C, z), P(D, z)],
    right: [P(B, 0), P(C, 0), P(C, z), P(B, z)], // +x wall
    front: [P(D, 0), P(C, 0), P(C, z), P(D, z)], // +y wall
  };
}

export function facePath(pts) {
  return "M " + pts.map(q => q.x.toFixed(2) + " " + q.y.toFixed(2)).join(" L ") + " Z";
}

// Painter's-algorithm key: larger = nearer the viewer = drawn later (on top).
export function depthKey(rect) {
  return (rect.x + rect.w / 2) + (rect.y + rect.h / 2);
}

// Darken a #rrggbb toward black by t (0..1). Pass through anything non-hex
// (e.g. "url(#hatch)") unchanged.
export function shade(hex, t) {
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) return hex;
  const ch = i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t));
  const hx = n => n.toString(16).padStart(2, "0");
  return "#" + hx(ch(1)) + hx(ch(3)) + hx(ch(5));
}

// viewBox box covering every base+top corner of every rect, padded.
// zByKey(rect) -> extrusion height in plan units.
export function isoBounds(rects, zByKey, pad = 40) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    const z = zByKey(r);
    const corners = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    for (const zz of [0, z]) {
      for (const [px, py] of corners) {
        const q = isoPoint(px, py, zz);
        if (q.x < minX) minX = q.x;
        if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y;
        if (q.y > maxY) maxY = q.y;
      }
    }
  }
  return { x: minX - pad, y: minY - pad, w: (maxX - minX) + 2 * pad, h: (maxY - minY) + 2 * pad };
}
