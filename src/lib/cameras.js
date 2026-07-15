/* Camera seam — pure helpers for the CCTV registry (src/data/cameras.json).
   No DOM, no JSON imports: data is passed in (node-testable, reusable by any
   view — A-1 today; satellite lens / Lens B / 4D replay later). Plan-space
   convention: aimDeg 0 = +x (true north / Patricia), 90 = +y (Arnould),
   180 = -x (Johnston), 270 = -y (Marie Antoinette). */

const RAD = Math.PI / 180;

/* Cameras that can be drawn on a plan (mounted outside with a position). */
export function drawableCameras(cameras) {
  return cameras.filter(c => c.pos && !c.interior);
}

/* SVG path for a camera's view cone: a fan from the mount position swept
   across fovDeg at rangePx, aim measured per the plan-space convention. */
export function frustumPath(cam, stepDeg = 10) {
  if (!cam.pos) return null;
  const { x, y } = cam.pos;
  const r = cam.rangePx || 150;
  const fov = cam.fovDeg || 100;
  const a0 = (cam.aimDeg - fov / 2) * RAD;
  const a1 = (cam.aimDeg + fov / 2) * RAD;
  const n = Math.max(2, Math.ceil(fov / stepDeg));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push((x + r * Math.cos(a)).toFixed(1) + " " + (y + r * Math.sin(a)).toFixed(1));
  }
  return "M" + x + " " + y + " L" + pts.join(" L") + " Z";
}

/* Deep link into the DW Spectrum cloud portal for one camera's live view. */
export function dwViewUrl(cam, registry) {
  return registry.cloudBase + "/systems/" + registry.systemId + "/view/" + cam.dwViewId;
}

/* Registry sanity used by tests and any future importer. */
export function validateRegistry(registry) {
  const errs = [];
  const seenIp = new Set(), seenId = new Set(), seenView = new Set();
  for (const c of registry.cameras) {
    if (seenId.has(c.id)) errs.push("duplicate id " + c.id);
    if (seenIp.has(c.ip)) errs.push("duplicate ip " + c.ip);
    if (seenView.has(c.dwViewId)) errs.push("duplicate dwViewId " + c.dwViewId);
    seenId.add(c.id); seenIp.add(c.ip); seenView.add(c.dwViewId);
    if (!c.interior) {
      if (!c.pos || typeof c.pos.x !== "number" || typeof c.pos.y !== "number") errs.push(c.id + ": exterior camera missing pos");
      if (typeof c.aimDeg !== "number") errs.push(c.id + ": exterior camera missing aimDeg");
    }
  }
  return errs;
}
