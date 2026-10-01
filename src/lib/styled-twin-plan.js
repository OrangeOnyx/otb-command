/* A-8 Styled Twin — plan-true frame (2026-10-01, operator: "the CAD file
   dimensions must be accurately shown on the twin"). The buildings are laid
   out bay by bay from geometry.json `demising` (plat strings + CAD demising,
   REV 17) in FEET, and every A-1 plan point is mapped through the sheet's own
   documented anisotropic scale (tools/extract-geometry.mjs: kx 1.8515 px/ft,
   ky 1.8866 px/ft), so 1 world metre = 1 metre on the ground in both axes.
   Heights are the 2019 ALTA survey BUILDING HEIGHT labels (heights.json).
   Canopy / fascia / mansard heights are presentation assumptions (not
   surveyed) and are named as such. Pure module: no three.js. */

export const FT = 0.3048;
export const KX = 1.8515, KY = 1.8866;          // A-1 px per foot (x, y)
export const ORIGIN = Object.freeze([740, 380]); // A-1 px at world (0, 0)

/** A-1 plan px → world metres [X, Z] (top view keeps the sheet's handedness). */
export const planToWorld = ([x, y]) => [(x - ORIGIN[0]) / KX * FT, (y - ORIGIN[1]) / KY * FT];
export const ftToM = ft => ft * FT;

/** Twin model metres → A-1 px (inverse of site-context registration matrix3x2). */
export function modelToPlan([mx, mz], m) {
  const [a, b] = m[0], [c, d] = m[1], [e, f] = m[2];
  const det = a * d - b * c, X = mx - e, Z = mz - f;
  return [(X * d - Z * c) / det, (Z * a - X * b) / det];
}
export const modelToWorld = (p, m) => planToWorld(modelToPlan(p, m));

/* Building anchors on the A-1 sheet (px) — the same constants A-1 draws with. */
export const LONG = Object.freeze({ x0: 160.78, rearY: 131.35, frontY: 292.56 });   // 101 end (Johnston), rear (M.A.), storefront face
export const SHORT = Object.freeze({ faceX: 1154.51, y0: 219.31 });                   // storefront face (west), 135 end (breezeway)

/** Presentation assumptions for the covered walkway (feet; NOT surveyed). */
export const CANOPY = Object.freeze({ eaveFt: 11, fasciaTopFt: 14.5, mansardTopFt: 19.5, gableTopFt: 23.6 });

const SPLIT_135 = 42.245; // 135A | 135B mid-depth split (geometry.json demising.shortBuilding.split135)

/**
 * Suites laid out from the demising bay strings. Long building bays run from
 * 101 (Johnston end) toward 133; short building bays from 135 (breezeway end)
 * toward 149 (Arnould end). Returns world-space footprints plus the source feet.
 */
export function layoutSuites(demising, heights = {}) {
  const out = [];
  const L = demising.longBuilding, S = demising.shortBuilding;
  let run = 0;
  for (const [unit, ft, src] of [...L.bays].reverse()) {
    const x0 = LONG.x0 + run * KX, x1 = LONG.x0 + (run + ft) * KX;
    out.push(suite(unit, "long", ft, L.depthFt, src, run, [[x0, LONG.rearY], [x1, LONG.rearY], [x1, LONG.rearY + L.depthFt * KY], [x0, LONG.rearY + L.depthFt * KY]], heights));
    run += ft;
  }
  run = 0;
  for (const [unit, ft, src] of S.bays) {
    const y0 = SHORT.y0 + run * KY, y1 = SHORT.y0 + (run + ft) * KY, xr = SHORT.faceX + S.depthFt * KX;
    if (unit === "135") {
      const xm = SHORT.faceX + SPLIT_135 * KX;
      out.push(suite("135A", "short", ft, SPLIT_135, src, run, [[SHORT.faceX, y0], [xm, y0], [xm, y1], [SHORT.faceX, y1]], heights, "breezeway"));
      out.push(suite("135B", "short", ft, S.depthFt - SPLIT_135, src, run, [[xm, y0], [xr, y0], [xr, y1], [xm, y1]], heights, "patricia"));
    } else {
      out.push(suite(unit, "short", ft, S.depthFt, src, run, [[SHORT.faceX, y0], [xr, y0], [xr, y1], [SHORT.faceX, y1]], heights));
    }
    run += ft;
  }
  return out;
}

function suite(unit, building, frontageFt, depthFt, source, offsetFt, planCorners, heights, face = "storefront") {
  return {
    unit, building, frontageFt, depthFt, source, offsetFt, face,
    heightFt: heights[unit] ?? 16.4,
    plan: planCorners, corners: planCorners.map(planToWorld)
  };
}

/** Footprint edge lengths in feet, measured back out of world space (self-check). */
export function measuredFt(corners) {
  const d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) / FT;
  return { a: d(corners[0], corners[1]), b: d(corners[1], corners[2]) };
}

/**
 * Dimension strings for the overlay — every value comes from the source feet,
 * every endpoint from the laid-out geometry, so a label can never disagree
 * with what is drawn. Returns world-space segments with label text.
 */
export function dimensionStrings(demising, suites) {
  const dims = [];
  const L = demising.longBuilding, S = demising.shortBuilding;
  const fmt = n => +n.toFixed(2) + "'";
  const off = 27; // px in front of the column line, on the paving
  const longFrontY = LONG.frontY + 20.79 + off, shortFrontX = SHORT.faceX - 23.17 - off;
  for (const s of suites) {
    if (s.building === "long") {
      const [a, b] = [s.plan[0][0], s.plan[1][0]];
      dims.push({ kind: "frontage", unit: s.unit, text: s.unit + " · " + fmt(s.frontageFt), from: planToWorld([a, longFrontY]), to: planToWorld([b, longFrontY]) });
    } else if (s.unit !== "135B") {
      const [a, b] = [s.plan[0][1], s.plan[2][1]];
      dims.push({ kind: "frontage", unit: s.unit === "135A" ? "135" : s.unit, text: (s.unit === "135A" ? "135A/B" : s.unit) + " · " + fmt(s.frontageFt), from: planToWorld([shortFrontX, a]), to: planToWorld([shortFrontX, b]) });
    }
  }
  const lx0 = LONG.x0, lx1 = LONG.x0 + L.lengthFt * KX, ry = LONG.rearY - 14;
  dims.push({ kind: "overall", text: "Long building " + fmt(L.lengthFt), from: planToWorld([lx0, ry]), to: planToWorld([lx1, ry]) });
  dims.push({ kind: "overall", text: "Depth " + fmt(L.depthFt), from: planToWorld([LONG.x0 - 26, LONG.rearY]), to: planToWorld([LONG.x0 - 26, LONG.rearY + L.depthFt * KY]) });
  const sx1 = SHORT.faceX + S.depthFt * KX + 12;
  dims.push({ kind: "overall", text: "Short building " + fmt(S.lengthFt), from: planToWorld([sx1, SHORT.y0]), to: planToWorld([sx1, SHORT.y0 + S.lengthFt * KY]) });
  dims.push({ kind: "overall", text: "Depth " + fmt(S.depthFt), from: planToWorld([SHORT.faceX, SHORT.y0 + S.lengthFt * KY + 16]), to: planToWorld([SHORT.faceX + S.depthFt * KX, SHORT.y0 + S.lengthFt * KY + 16]) });
  return dims;
}

/** Sign text per storefront: one sign per tenant, centred on combined suites. */
export function storefrontSigns(suites, units) {
  const name = u => {
    const r = units.find(x => String(x.unit) === String(u));
    if (!r || r.status === "vacant") return null;
    return String(r.dba || "").split(/\s+\/\s+|\s+\(/)[0].trim() || null;
  };
  const signs = [];
  for (const s of suites) {
    if (s.unit === "135B") continue;
    const n = name(s.unit);
    const prev = signs[signs.length - 1];
    if (n && prev && prev.text === n && prev.building === s.building) { prev.suites.push(s.unit); continue; }
    signs.push({ text: n, building: s.building, suites: [s.unit] });
  }
  return signs.filter(s => s.text);
}

/** Rooftop units: the register lists one per suite (27); place one per suite roof. */
export const rtuCount = suites => suites.length;
