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
import { realityBoxes, labelSpecs, TRUE_FT_WORLD } from "./splat-align.js";

/* Unit-number chip drawn to a canvas → sprite texture. Fonts are already
   loaded by the page, so the 2D context can use Plex Mono directly. */
function chipTexture(label, color, ink) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 112;
  const x = c.getContext("2d");
  x.fillStyle = color;
  x.beginPath(); x.roundRect(8, 8, 240, 96, 40); x.fill();
  x.font = "700 58px 'IBM Plex Mono', monospace";
  const w = x.measureText(label).width;
  if (w > 208) x.font = "700 " + Math.floor(58 * 208 / w) + "px 'IBM Plex Mono', monospace";
  x.fillStyle = ink;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(label, 128, 60);
  return new THREE.CanvasTexture(c);
}

export function createSplatScene(container, units = [], opts = {}) {
  const onPick = opts.onPick || (() => {});
  const { boxes, span } = realityBoxes(units);
  const colorOf = u => units.find(x => x.unit === u)?.color;

  /* our scene rides inside the splat viewer's render loop */
  const threeScene = new THREE.Scene();
  const meshes = new Map(), outlines = new Map(), borders = new Map(), labels = new Map();
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
    // status-colored border (unit overlay) — same edges, hidden while selected
    // so it never z-fights the brass selection wireframe
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: colorOf(b.unit) || "#5F6E64", transparent: true, opacity: 0.85 }));
    mesh.add(border);
    threeScene.add(mesh);
    meshes.set(b.unit, mesh);
    outlines.set(b.unit, outline);
    borders.set(b.unit, border);
  });

  /* unit-number chips above each box (camera-facing sprites) */
  labelSpecs(boxes, colorOf).forEach(s => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: chipTexture(s.unit, s.color, s.ink), transparent: true, depthTest: false }));
    sprite.renderOrder = 3;
    sprite.position.set(s.x, s.y, s.z);
    sprite.scale.set(16 * TRUE_FT_WORLD, 7 * TRUE_FT_WORLD, 1);
    threeScene.add(sprite);
    labels.set(s.unit, sprite);
  });

  /* in-pane overlay toggle (same pattern as Lens B's mesh toggle) */
  let showUnits = true, selectedUnit = null;
  const applyOverlay = () => {
    borders.forEach((o, u) => { o.visible = showUnits && u !== selectedUnit; });
    labels.forEach(s => { s.visible = showUnits; });
    outlines.forEach((o, u) => { o.visible = u === selectedUnit; });
    unitsBtn.textContent = showUnits ? "▦ Units on" : "▦ Units off";
  };
  const unitsBtn = document.createElement("button");
  unitsBtn.type = "button";
  unitsBtn.className = "mesh-toggle";
  unitsBtn.onclick = () => { showUnits = !showUnits; applyOverlay(); };
  container.style.position = "relative";
  container.appendChild(unitsBtn);
  applyOverlay();

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
      selectedUnit = unit;
      applyOverlay();
    },
    dispose() {
      disposed = true;
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointerup", onUp);
      unitsBtn.remove();
      meshes.forEach(m => {
        m.geometry.dispose(); m.material.dispose();
        m.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
      });
      labels.forEach(s => { s.material.map?.dispose(); s.material.dispose(); });
      try { viewer.dispose(); } catch { /* already gone */ }
    },
  };
}
