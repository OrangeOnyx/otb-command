/* Parking seam — pure helpers over the plat-traced parking data
   (geometry.parking + geometry.layers.parking). No DOM, no JSON imports:
   data is passed in, so any view (A-1 today; satellite / Lens B / camera
   analytics later) can consume the same stall geometry, and node --test
   can verify plat invariants without a bundler. */

/* Split the parking primitive layer into its parts so other views can
   restyle or re-project them independently. */
export function splitParkingLayer(prims) {
  return {
    paving: prims.filter(p => p.t === "rect"),
    stalls: prims.filter(p => p.t === "line"),
    labels: prims.filter(p => p.t === "text"),
  };
}

/* A stall line is head-on (perpendicular tick) when it is axis-vertical. */
export function isHeadOn(line) {
  return line.x1 === line.x2;
}

/* Stall lines for the storefront row against the long building
   (between the covered walkway and the liquor line; plat: '56 SPACES' ×2). */
export function storefrontStalls(prims, band = { yMin: 300, yMax: 360 }) {
  return prims.filter(p => {
    if (p.t !== "line") return false;
    const ymid = (p.y1 + p.y2) / 2;
    return ymid > band.yMin && ymid < band.yMax;
  });
}

/* Zone-count invariant: plat striping totals must sum to totalPlat (314). */
export function zoneTotal(zones) {
  return zones.reduce((s, z) => s + z.count, 0);
}
