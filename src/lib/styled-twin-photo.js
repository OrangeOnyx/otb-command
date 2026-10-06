/* A-8 Photo mode (2026-10-06, operator pick "1 and 2"): the drone Gaussian
   splat (the A-2 Reality lens capture) placed in A-8's plan-true metre frame.
   The fitted splat alignment (src/data/splat-align.json) lands the splat in
   Lens-B world: plan px × WORLD about the centre of the suite rects, heights at
   PLAN_PER_FT × WORLD per foot. A-8 world is plan px → metres via the sheet's
   own kx/ky (styled-twin-plan.js). This composes the two as an outer
   scale + offset. Pure module: no three.js. */
import { WORLD } from "./scene3d-layout.js";
import { PLAN_PER_FT } from "./splat-align.js";
import { FT, KX, KY, ORIGIN } from "./styled-twin-plan.js";

/** Centre of the suite rects, as layout3d computes it (A-1 px). */
export function rectsCentre(rects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** Outer transform that carries Lens-B world into A-8 world. */
export function splatToStyled(units) {
  const rects = Object.entries(units).map(([unit, r]) => ({ unit, ...r }));
  const [cx, cy] = rectsCentre(rects);
  return {
    scale: [FT / (WORLD * KX), FT / (WORLD * PLAN_PER_FT), FT / (WORLD * KY)],
    position: [(cx - ORIGIN[0]) / KX * FT, 0, (cy - ORIGIN[1]) / KY * FT]
  };
}

/** Lens-B world point → A-8 world point (for tests and pin placement). */
export function lensBToStyled([x, y, z], t) {
  return [x * t.scale[0] + t.position[0], y * t.scale[1], z * t.scale[2] + t.position[2]];
}
