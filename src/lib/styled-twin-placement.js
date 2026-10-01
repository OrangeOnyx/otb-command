/* A-8 Styled Twin placement (2026-10-01): where the A-7-style dressing goes in
   the twin's native frame. Pure functions only — no three.js — so the rules are
   unit-testable. Plan points are A-1 drawing pixels; the registration matrix is
   the twin's own (site-context.json · [x,y,1] @ matrix3x2 = [modelX, modelZ]).
   Register items keep their recorded positions; parking-island light poles are
   an illustrative placement (the register lists only the corner luminaire). */

export const STYLED_PALETTE = Object.freeze({
  stucco: "#E2D2B1", column: "#F2EADB", canopy: "#4B5052", roof: "#ECE8DF", glazing: "#2F3B40",
  concrete: "#C9C7C0", walk: "#DEDAD0", lawn: "#6F9358", road: "#9C9E98", offParcel: "#D7D2C5",
  stripe: "#FBFAF5", trunk: "#5B4632", leaf: "#4F7A3B", pole: "#3A3027", bollard: "#E2B52A",
  transformer: "#4F7A55", metal: "#9A9D98", rtu: "#B9BCB6"
});

/** Surface color for a site-context zone: every paved surface is concrete (operator 2026-09-30). */
export function zoneColor(kind) {
  if (kind === "landscape") return STYLED_PALETTE.lawn;
  if (kind === "sidewalk") return STYLED_PALETTE.walk;
  if (kind === "roads") return STYLED_PALETTE.road;
  if (kind === "off-parcel") return STYLED_PALETTE.offParcel;
  return STYLED_PALETTE.concrete;
}

export function planToModel([x, y], matrix) {
  return [x * matrix[0][0] + y * matrix[1][0] + matrix[2][0], x * matrix[0][1] + y * matrix[1][1] + matrix[2][1]];
}

export function polygonCentroid(points) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, , zi] = points[i], [xj, , zj] = points[j], f = xj * zi - xi * zj;
    a += f; cx += (xj + xi) * f; cz += (zj + zi) * f;
  }
  if (Math.abs(a) < 1e-9) return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[2], 0) / points.length];
  return [cx / (3 * a), cz / (3 * a)];
}

/** Parking-field planting islands carry the twin-head poles (illustrative). */
export const isParkingIsland = zone => zone?.kind === "landscape" && /island/i.test(zone.label ?? "");

/** Suite footprint rect (A-1 px) → four model-space corners [x, z]. */
export function rectToModel({ x, y, w, h }, matrix) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => planToModel(p, matrix));
}

/** Register items with a recorded plan point, mapped to model XZ, by category. */
export function registerPlacements(items, matrix, cats) {
  const want = new Set(cats);
  return items.filter(i => want.has(i.cat) && Array.isArray(i.point) && i.point.every(Number.isFinite))
    .map(i => ({ id: i.id, cat: i.cat, label: i.label, xz: planToModel(i.point, matrix) }));
}
