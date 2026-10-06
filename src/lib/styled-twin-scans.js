/* A-8 scan layer (2026-10-06, operator option 2): the registered Polycam scans
   (twin frame: EPSG:6344 + NAVD88 local, GLB axes x=E y=Up z=-N) placed in
   A-8's plan-true frame. The fit lives in src/data/a8-scans.json (built by
   tools/visuals/build-a8-scans.mjs from register items present in both
   frames). Pure module: no three.js. */

/** GLB twin-frame point → A-8 world point. */
export function scanToStyled([x, y, z], fit) {
  const c = Math.cos(fit.thetaRad), s = Math.sin(fit.thetaRad);
  return [fit.scale * (c * x - s * z) + fit.tx, fit.scale * (y - fit.groundH), fit.scale * (s * x + c * z) + fit.tz];
}

/** The same transform as a node pose: uniform scale, yaw about +Y, offset. */
export function scanNodePose(fit) {
  return { scale: fit.scale, rotationY: -fit.thetaRad, position: [fit.tx, -fit.scale * fit.groundH, fit.tz] };
}
