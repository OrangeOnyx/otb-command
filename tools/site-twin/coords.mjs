/* Site twin coordinates: A-1 plan px -> plat feet (a,b) -> model metres (X,Y,Z), Y up.
   a runs Patricia (-25) -> Johnston (671.7); b runs Arnould R/W (0) -> Marie Antoinette (-300).
   Transform = geometry.boundary.transform (kx 1.8515 / ky 1.88663 px/ft, ~1.9% anisotropy undone here). */
export const FT = 0.3048;
export const planToFeet = ([x, y], t) => [t.aRangeFt[0] + (t.envelope.xRight - x) / t.kxPxPerFt,
                                          t.bRangeFt[1] + (y - t.envelope.yBottom) / t.kyPxPerFt];
// X = -a, Z = +b (a 180° turn about Y, not a mirror): Johnston toward -X and Marie Antoinette toward -Z, so a
// top-down view with -Z up reads exactly like A-1 (M.A. top, Arnould bottom, Johnston left, Patricia right) — D4.
export const feetToModel = ([a, b], y = 0) => [-a * FT, y, b * FT];
export const planToModel = (p, y, t) => feetToModel(planToFeet(p, t), y);
/* 2D model-plane point (X, Z) — what the mesh primitives take */
export const planToXZ = (p, t) => { const [X, , Z] = planToModel(p, 0, t); return [X, Z]; };
// footprints-geo.json georef.azY = azimuth (deg, clockwise from north) of the CAD +Y (= plat +b) axis. Recorded only (D4).
export const northRotation = georef => (georef.azY * Math.PI) / 180;
