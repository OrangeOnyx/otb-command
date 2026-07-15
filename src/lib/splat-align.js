/* Splat↔world alignment (P6d follow-up) — pure math shared by the offline fit
   (tools/fit-splat-align.mjs) and the Reality lens runtime (scenesplat.js).
   The fitted similarity transform lives in src/data/splat-align.json and maps
   the COLMAP-arbitrary splat frame into Lens-B world space (layout3d: plan
   footprints centered on origin, y up, ground at y=0). No DOM, no Three.js. */
import { layout3d, WORLD } from "./scene3d-layout.js";

/* Plan px per foot (plat-traced average of both building extents: 965.06/522.31,
   161.21/85.45, 391.64/208.65, 156.43/84.49). The Reality lens uses TRUE height
   scale — no Lens-B vertical exaggeration — so draped boxes match the photoreal
   buildings: 1 ft of height = planPerFt * WORLD world units, same as 1 ft of plan. */
export const PLAN_PER_FT = 1.8657;
export const TRUE_FT_WORLD = PLAN_PER_FT * WORLD; // ≈ 0.11194 world units / ft

/* Reality-lens hit boxes: same plan layout as Lens B, true-proportion heights. */
export function realityBoxes(units) {
  const rects = units.map(u => ({ unit: u.unit, x: u.x, y: u.y, w: u.w, h: u.h }));
  const heightFt = r => (units.find(u => u.unit === r.unit)?.heightFt) || 16.4;
  return layout3d(rects, heightFt, { ftWorld: TRUE_FT_WORLD });
}

/* Reality-lens unit overlay (status-colored borders + number chips) — pure
   placement/color math consumed by scenesplat.js. Chips float LABEL_LIFT_FT
   above each box top; ink flips dark on light fills (vacant #E7E9E0). */
export const LABEL_LIFT_FT = 5;

export function inkOn(hex) {
  const h = String(hex).replace("#", "");
  if (h.length < 6) return "#F6F7F1";
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55 ? "#1C2B26" : "#F6F7F1";
}

export function labelSpecs(boxes, colorOf) {
  return boxes.map(b => {
    const color = colorOf(b.unit) || "#5F6E64";
    return {
      unit: b.unit, color, ink: inkOn(color),
      x: b.x, y: b.y + b.h / 2 + LABEL_LIFT_FT * TRUE_FT_WORLD, z: b.z,
    };
  });
}

/* ── quaternions [x,y,z,w] ────────────────────────────────────── */
export function qMul(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function qRotate(q, v) {
  // v' = q v q*  (v as pure quaternion)
  const [qx, qy, qz, qw] = q, [vx, vy, vz] = v;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + qy * tz - qz * ty,
    vy + qw * ty + qz * tx - qx * tz,
    vz + qw * tz + qx * ty - qy * tx,
  ];
}

export function qFromAxisAngle(axis, angle) {
  const [x, y, z] = axis;
  const n = Math.hypot(x, y, z) || 1;
  const s = Math.sin(angle / 2);
  return [x / n * s, y / n * s, z / n * s, Math.cos(angle / 2)];
}

/* Shortest-arc quaternion rotating unit vector `from` onto unit vector `to`. */
export function qBetween(from, to) {
  const [fx, fy, fz] = from, [tx, ty, tz] = to;
  const d = fx * tx + fy * ty + fz * tz;
  if (d > 1 - 1e-9) return [0, 0, 0, 1];
  if (d < -1 + 1e-9) {
    // 180° — any perpendicular axis
    const ax = Math.abs(fx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const c = [fy * ax[2] - fz * ax[1], fz * ax[0] - fx * ax[2], fx * ax[1] - fy * ax[0]];
    return qFromAxisAngle(c, Math.PI);
  }
  const cx = fy * tz - fz * ty, cy = fz * tx - fx * tz, cz = fx * ty - fy * tx;
  const w = 1 + d;
  const n = Math.hypot(cx, cy, cz, w);
  return [cx / n, cy / n, cz / n, w / n];
}

/* Quaternion leveling the fitted ground normal onto world up (+Y). */
export function levelQuat(normal) {
  const n = Math.hypot(...normal);
  return qBetween(normal.map(c => c / n), [0, 1, 0]);
}

/* Apply an align {quaternion, scale, position} to a splat-frame point. */
export function applyAlign(align, p) {
  const r = qRotate(align.quaternion, p);
  return [
    r[0] * align.scale + align.position[0],
    r[1] * align.scale + align.position[1],
    r[2] * align.scale + align.position[2],
  ];
}

/* Compose the final align from fit parameters:
   level quaternion, yaw about +Y (radians), uniform world scale, translation. */
export function composeAlign(levelQ, yawRad, scale, position) {
  return { quaternion: qMul(qFromAxisAngle([0, 1, 0], yawRad), levelQ), scale, position };
}
