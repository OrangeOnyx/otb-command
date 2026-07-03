/* Pure 3D layout for the Lens-B twin. Maps plan-space unit footprints
   (geometry.units) + heights (feet) to centered box specs in world units.
   No Three.js, no DOM. Tested in test/scene3d-layout.test.mjs. */

export const WORLD = 0.06;     // plan-units -> world units (the ~1480×990 plan)
export const FT_WORLD = 0.19;  // feet -> world units for height (16.4' ≈ 3.1)

// rects: [{unit,x,y,w,h}] in plan space. heightFt(rect) -> parapet height in feet.
// Returns { boxes:[{unit,w,d,h,x,y,z}], span } with the model centered on origin,
// footprint in the world X/Z plane, height up the Y axis, box resting on y=0.
export function layout3d(rects, heightFt, opts = {}) {
  const world = opts.world ?? WORLD;
  const ftWorld = opts.ftWorld ?? FT_WORLD;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const boxes = rects.map(r => {
    const hw = heightFt(r) * ftWorld;
    return {
      unit: r.unit,
      w: r.w * world,
      d: r.h * world,                    // plan-y -> world-z depth
      h: hw,
      x: (r.x + r.w / 2 - cx) * world,
      z: (r.y + r.h / 2 - cy) * world,
      y: hw / 2,
    };
  });
  const span = Math.max(maxX - minX, maxY - minY) * world;
  return { boxes, span };
}
