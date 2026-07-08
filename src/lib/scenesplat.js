/* Lens D — photoreal reality capture (3D Gaussian Splat, drone-derived).
   Lazy-loaded by the A-2 view; renders public/OTB-splat.ksplat (built by
   tools/convert-splat.mjs from the trained PLY — see Drone Footage RAW).
   v1 is orbit-only: unit click-through needs the splat↔world alignment pass
   (planned follow-up); the splat frame is COLMAP-arbitrary, so we only set
   the vertical axis (Brush exports Y-vertical). Imagery is physical — no
   theme inversion. */
import * as GS from "@mkkellogg/gaussian-splats-3d";

export function createSplatScene(container, opts = {}) {
  const viewer = new GS.Viewer({
    rootElement: container,
    cameraUp: [0, -1, 0],                 // COLMAP/Brush: +Y down
    initialCameraPosition: [0, -2, -6],
    initialCameraLookAt: [0, 0, 2],
    sharedMemoryForWorkers: false,        // avoids COOP/COEP header requirements
    sceneRevealMode: GS.SceneRevealMode.Instant,
    antialiased: true,
  });
  let disposed = false;
  viewer.addSplatScene(opts.src || (import.meta.env.BASE_URL + "OTB-splat.ksplat"), {
    showLoadingUI: true,
    progressiveLoad: true,
  }).then(() => { if (!disposed) viewer.start(); })
    .catch(e => console.warn("splat load:", e.message));

  return {
    resize() { /* viewer tracks its root element automatically */ },
    setSelected() { /* no unit picking in v1 — needs splat↔world alignment */ },
    dispose() {
      disposed = true;
      try { viewer.dispose(); } catch { /* already gone */ }
    },
  };
}
