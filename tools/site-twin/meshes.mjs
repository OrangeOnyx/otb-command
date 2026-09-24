/* Site-twin mesh primitives (pure). Everything is in model metres, Y up; 2D
   inputs are (X, Z) model-plane points. Each primitive appends to a Geo
   accumulator so one asset (or one merged category) becomes one mesh. */
import { ShapeUtils, Vector2 } from "three";

export class Geo {
  constructor() { this.pos = []; this.nor = []; this.idx = []; }
  get empty() { return this.idx.length === 0; }
  vert(p, n) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); return this.pos.length / 3 - 1; }
  /* triangle with an explicit face normal; winding is fixed to agree with the normal */
  tri(a, b, c, n) {
    const cr = cross(sub(b, a), sub(c, a));
    const [p, q, r] = dot(cr, n) >= 0 ? [a, b, c] : [a, c, b];
    this.idx.push(this.vert(p, n), this.vert(q, n), this.vert(r, n));
  }
  quad(a, b, c, d, n) { this.tri(a, b, c, n); this.tri(a, c, d, n); }
  typed() {
    return { positions: new Float32Array(this.pos.map(r6)), normals: new Float32Array(this.nor.map(r6)), indices: new Uint32Array(this.idx) };
  }
}
const r6 = v => Math.round(v * 1e6) / 1e6;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const UP = [0, 1, 0], DOWN = [0, -1, 0];
const area2 = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);

/* flat polygon at height y (normal +Y, or -Y when down) */
export function flatPolygon(g, pts, y, down = false) {
  const contour = pts.map(([x, z]) => new Vector2(x, z));
  for (const [i, j, k] of ShapeUtils.triangulateShape(contour, []))
    g.tri([pts[i][0], y, pts[i][1]], [pts[j][0], y, pts[j][1]], [pts[k][0], y, pts[k][1]], down ? DOWN : UP);
  return g;
}

/* vertical prism y0 -> y1 over a simple polygon (top + outward walls; bottom only if asked) */
export function prism(g, pts, y0, y1, { bottom = false, top = true } = {}) {
  if (top) flatPolygon(g, pts, y1);
  if (bottom) flatPolygon(g, pts, y0, true);
  const ccw = area2(pts) > 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0], dz = q[1] - p[1];
    const n = norm(ccw ? [dz, 0, -dx] : [-dz, 0, dx]); // outward in the XZ plane
    g.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], n);
  }
  return g;
}

export function rectPts([X, Z], w, d, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [X + x * c - z * s, Z + x * s + z * c]);
}
export const boxAt = (g, xz, w, d, h, y0 = 0, yaw = 0) => prism(g, rectPts(xz, w, d, yaw), y0, y0 + h, { bottom: y0 > 0 });

/* segment-wise rectangles along a polyline: flat (ribbon), upright wall, or square pipe */
function segRects(line, width) {
  const out = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    out.push(rectPts([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len, width, Math.atan2(b[1] - a[1], b[0] - a[0])));
  }
  return out;
}
export const ribbon = (g, line, width, y) => { for (const r of segRects(line, width)) flatPolygon(g, r, y); return g; };
export const wall = (g, line, thickness, y0, y1) => { for (const r of segRects(line, thickness)) prism(g, r, y0, y1); return g; };
export const pipe = (g, line, size, y) => { for (const r of segRects(line, size)) prism(g, r, y - size / 2, y + size / 2, { bottom: true }); return g; };

export function disc(g, [X, Z], r, y, seg = 16) {
  const pts = Array.from({ length: seg }, (_, i) => [X + r * Math.cos((2 * Math.PI * i) / seg), Z + r * Math.sin((2 * Math.PI * i) / seg)]);
  return flatPolygon(g, pts, y);
}

/* Mansard walkway canopy (D1): soffit at eaveY over the whole walk; a sloped
   shingle face rising from the field edge (eaveY) to an inset line (topY);
   a flat top from the inset line back to the building face. field = [f0, f1],
   bldg = [b0, b1] with f0<->b0 and f1<->b1 across the walk. */
export function canopy(g, field, bldg, eaveY, topY) {
  const inset = Math.min(topY - eaveY, 0.8 * Math.hypot(bldg[0][0] - field[0][0], bldg[0][1] - field[0][1]));
  const toward = (f, b) => { const d = Math.hypot(b[0] - f[0], b[1] - f[1]) || 1; return [f[0] + ((b[0] - f[0]) / d) * inset, f[1] + ((b[1] - f[1]) / d) * inset]; };
  const i0 = toward(field[0], bldg[0]), i1 = toward(field[1], bldg[1]);
  const P = (p, y) => [p[0], y, p[1]];
  flatPolygon(g, [field[0], field[1], bldg[1], bldg[0]], eaveY, true);                 // soffit
  const n = norm(cross(sub(P(field[1], eaveY), P(field[0], eaveY)), sub(P(i0, topY), P(field[0], eaveY))));
  const out = n[1] >= 0 ? n : n.map(v => -v);                                           // slope faces up/out
  g.quad(P(field[0], eaveY), P(field[1], eaveY), P(i1, topY), P(i0, topY), out);        // shingle slope
  flatPolygon(g, [i0, i1, bldg[1], bldg[0]], topY);                                     // flat top
  // fascia under the eave line (0.25 m band), facing the field
  const fn = norm([field[0][0] - bldg[0][0], 0, field[0][1] - bldg[0][1]]);
  g.quad(P(field[0], eaveY - 0.25), P(field[1], eaveY - 0.25), P(field[1], eaveY), P(field[0], eaveY), fn);
  return g;
}

/* low-poly presentation tree: trunk + octahedral crown */
export function tree(g, [X, Z], crownR, height) {
  boxAt(g, [X, Z], 0.35, 0.35, height * 0.5);
  const cy = height * 0.68, top = [X, height, Z], bot = [X, height * 0.36, Z];
  const ring = [0, 1, 2, 3].map(i => [X + crownR * Math.cos((i * Math.PI) / 2), cy, Z + crownR * Math.sin((i * Math.PI) / 2)]);
  for (let i = 0; i < 4; i++) {
    const a = ring[i], b = ring[(i + 1) % 4];
    for (const apex of [top, bot]) {
      const c = [(a[0] + b[0] + apex[0]) / 3, (a[1] + b[1] + apex[1]) / 3, (a[2] + b[2] + apex[2]) / 3];
      g.tri(a, b, apex, norm(sub(c, [X, cy, Z]))); // outward from the crown centre
    }
  }
  return g;
}
