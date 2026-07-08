/* Lens D — photoreal reality capture (3D Gaussian Splat, drone-derived).
   Lazy-loaded by the A-2 view; renders public/OTB-splat.ksplat (built by
   tools/convert-splat.mjs from the trained PLY — see Drone Footage RAW).

   v2: the splat is transformed into Lens-B world space via the fitted
   similarity transform (src/data/splat-align.json, from tools/fit-splat-align.mjs
   — re-run it after any re-train). Invisible true-proportion unit hit boxes are
   draped over the buildings: click → opts.onPick(unit); selection renders as a
   brass wireframe. Imagery is physical — no theme inversion. */
import * as GS from "@mkkellogg/gaussian-splats-3d";
import * as THREE from "three";
import align from "../data/splat-align.json";
import { realityBoxes } from "./splat-align.js";

export function createSplatScene(container, units = [], opts = {}) {
  const onPick = opts.onPick || (() => {});
  const { boxes, span } = realityBoxes(units);

  /* our scene rides inside the splat viewer's render loop */
  const threeScene = new THREE.Scene();
  const meshes = new Map(), outlines = new Map();
  boxes.forEach(b => {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, // raycast target only
    }));
    mesh.position.set(b.x, b.y, b.z);
    mesh.userData.unit = b.unit;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xA87E2F, transparent: true, opacity: 0.95 }));
    outline.visible = false;
    mesh.add(outline);
    threeScene.add(mesh);
    meshes.set(b.unit, mesh);
    outlines.set(b.unit, outline);
  });

  const viewer = new GS.Viewer({
    rootElement: container,
    threeScene,
    cameraUp: [0, 1, 0],                  // aligned world is y-up
    initialCameraPosition: [span * 0.55, span * 0.4, span * 0.6],
    initialCameraLookAt: [0, 0, 0],
    sharedMemoryForWorkers: false,        // avoids COOP/COEP header requirements
    sceneRevealMode: GS.SceneRevealMode.Instant,
    antialiased: true,
  });
  let disposed = false;
  viewer.addSplatScene(opts.src || (import.meta.env.BASE_URL + "OTB-splat.ksplat"), {
    showLoadingUI: true,
    progressiveLoad: true,
    position: align.position,
    rotation: align.quaternion,           // [x,y,z,w]
    scale: [align.scale, align.scale, align.scale],
  }).then(() => { if (!disposed) viewer.start(); })
    .catch(e => console.warn("splat load:", e.message));

  /* picking — same click-vs-drag gate as Lens B */
  const raycaster = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downXY = null;
  const onDown = e => { downXY = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 5) return;
    const rect = container.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ptr, viewer.camera);
    const hit = raycaster.intersectObjects([...meshes.values()], false)[0];
    if (hit) onPick(hit.object.userData.unit);
  };
  container.addEventListener("pointerdown", onDown);
  container.addEventListener("pointerup", onUp);

  return {
    resize() { /* viewer tracks its root element automatically */ },
    setSelected(unit) {
      outlines.forEach((o, u) => { o.visible = u === unit; });
    },
    dispose() {
      disposed = true;
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointerup", onUp);
      meshes.forEach(m => {
        m.geometry.dispose(); m.material.dispose();
        m.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
      });
      try { viewer.dispose(); } catch { /* already gone */ }
    },
  };
}
