/* A-8 Styled Twin scene (2026-10-01, operator pick "1"): the A-3 twin geometry
   dressed in the A-7 look — cream stucco, charcoal canopy, concrete paving,
   lawns, register trees, twin-head poles, bollards, transformers, meter
   clusters and one representative rooftop unit per suite. Geometry and
   register positions are the twin's; dressing dimensions are presentation
   assumptions. Lighting presets: day · golden · dusk. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createSiteContextModel } from "./asset-twin-site-context.js";
import { STYLED_PALETTE as P, zoneColor, polygonCentroid, isParkingIsland, rectToModel, registerPlacements } from "./styled-twin-placement.js";

const POLE_HEIGHT = 7.6, ROOF_LIFT = 0.03;

export const LIGHTING = Object.freeze({
  day:    { bg: "#F3EDE0", hemi: ["#f4f7ff", "#9c998f", 0.85], sun: ["#fffaf0", 3.4], sunDir: [-0.45, 1, -0.55], exposure: 0.92, night: 0 },
  golden: { bg: "#F4EADA", hemi: ["#fff1de", "#8f877a", 0.75], sun: ["#ffe0b8", 3.6], sunDir: [-1, 0.5, -0.45], exposure: 0.92, night: 0 },
  dusk:   { bg: "#26304A", hemi: ["#6f7fa8", "#2a2a33", 0.55], sun: ["#ff9b6a", 0.3], sunDir: [-1, 0.12, -0.2], exposure: 1.1, night: 1 }
});

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });
const cast = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

function twinHeadPole() {
  const g = new THREE.Group(), bronze = std(P.pole, { roughness: 0.6, metalness: 0.3 });
  const shaft = cast(new THREE.Mesh(new THREE.BoxGeometry(0.16, POLE_HEIGHT, 0.16), bronze)); shaft.position.y = POLE_HEIGHT / 2; g.add(shaft);
  const arm = cast(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), bronze)); arm.position.y = POLE_HEIGHT - 0.1; g.add(arm);
  const lens = std("#d9d6cc", { emissive: "#ffd9a0", emissiveIntensity: 0 });
  for (const side of [-1, 1]) {
    const head = cast(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.42), bronze)); head.position.set(side * 0.95, POLE_HEIGHT - 0.12, 0); g.add(head);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.36), lens); glow.position.set(side * 0.95, POLE_HEIGHT - 0.21, 0); g.add(glow);
  }
  g.userData.lens = lens;
  return g;
}

function tree(scale = 1) {
  const g = new THREE.Group();
  const trunk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 2.6 * scale, 7), std(P.trunk))); trunk.position.y = 1.3 * scale; g.add(trunk);
  const leaf = std(P.leaf, { roughness: 1, flatShading: true });
  for (const [x, y, z, r] of [[0, 3.6, 0, 1.9], [0.9, 3.2, 0.4, 1.3], [-0.8, 3.3, -0.5, 1.4], [0.2, 4.4, -0.3, 1.2]]) {
    const ball = cast(new THREE.Mesh(new THREE.IcosahedronGeometry(r * scale, 1), leaf)); ball.position.set(x * scale, y * scale, z * scale); g.add(ball);
  }
  return g;
}

function rooftopUnit() {
  const g = new THREE.Group(), body = std(P.rtu, { roughness: 0.55, metalness: 0.25 });
  const box = cast(new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 2.0), body)); box.position.y = 0.7; g.add(box);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 20), std("#5f635e")); fan.position.set(0.8, 1.42, 0); g.add(fan);
  return g;
}

function box(w, h, d, color, extra) { const m = cast(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color, extra))); m.position.y = h / 2; return m; }

export function createStyledTwinScene(container, { modelUrl, fixturesUrl, siteData, register, units, onReady = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "none" });
  renderer.domElement.setAttribute("aria-label", "On The Boulevard styled 3D model. Drag to orbit, scroll to zoom, right-drag to pan.");
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(); scene.add(hemi);
  const sun = new THREE.DirectionalLight(); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 120, bottom: -120, near: 1, far: 600 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  const VIEW_DIR = new THREE.Vector3(-0.08, 0.62, -0.78).normalize(), VIEW_TARGET = new THREE.Vector3(-6, 0, 2), HALF_WIDTH = 88;
  function fitView() {
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(HALF_WIDTH / Math.tan(hfov / 2), 60 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.08;
    camera.position.copy(VIEW_TARGET).addScaledVector(VIEW_DIR, dist); controls.target.copy(VIEW_TARGET); controls.update();
  } controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 12; controls.maxDistance = 900; controls.enableDamping = true;

  const glass = std(P.glazing, { roughness: 0.25, metalness: 0.1, emissive: "#ffcf8a", emissiveIntensity: 0 });
  const lenses = [], poleLights = [];
  const matrix = siteData.registration.matrix3x2;
  let frame = 0, disposed = false;

  // Site surfaces: the twin's zones, recolored — paving is concrete.
  const site = createSiteContextModel(siteData);
  site.traverse(m => {
    if (!m.isMesh) return;
    m.receiveShadow = true;
    m.material.color.set(m.userData.surfacePart === "source-striping" ? P.stripe : zoneColor(m.userData.siteCategory));
  });
  scene.add(site);

  // Dressing from the register (recorded positions).
  const dressing = new THREE.Group(); scene.add(dressing);
  const placed = registerPlacements(register.items, matrix, ["tree", "bollard", "transformer", "meter-cluster", "lighting"]);
  for (const p of placed) {
    const [x, z] = p.xz;
    let obj;
    if (p.cat === "tree") obj = tree(0.9 + ((x * 7 + z * 13) % 10 + 10) % 10 / 25);
    else if (p.cat === "bollard") { obj = new THREE.Group(); for (const dx of [-0.45, 0.45]) { const b = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 12), std(P.bollard, { roughness: 0.5 }))); b.position.set(dx, 0.55, 0); obj.add(b); } }
    else if (p.cat === "transformer") obj = box(1.8, 1.4, 1.5, P.transformer, { roughness: 0.6 });
    else if (p.cat === "meter-cluster") obj = box(1.4, 1.7, 0.35, P.metal, { roughness: 0.5, metalness: 0.3 });
    else if (p.cat === "lighting") obj = twinHeadPole();
    obj.position.set(x, 0, z); obj.userData.register = p; dressing.add(obj);
    if (obj.userData.lens) lenses.push(obj.userData.lens);
  }
  // Twin-head poles in the parking-field islands (illustrative placement).
  for (const zone of siteData.zones.filter(isParkingIsland)) {
    const [x, z] = polygonCentroid(zone.polygonMeters), pole = twinHeadPole();
    pole.position.set(x, 0, z); dressing.add(pole); lenses.push(pole.userData.lens);
    const light = new THREE.PointLight("#ffd29a", 0, 38, 1.6); light.position.set(x, POLE_HEIGHT - 0.4, z); scene.add(light); poleLights.push(light);
  }

  const loader = new GLTFLoader();
  const ready = Promise.all([loader.loadAsync(modelUrl), fixturesUrl ? loader.loadAsync(fixturesUrl).catch(() => null) : null]).then(([gltf, fixtures]) => {
    if (disposed) return;
    const model = gltf.scene; scene.add(model);
    const category = o => { for (let n = o; n; n = n.parent) if (n.userData?.category) return n.userData.category; return null; };
    const walls = [];
    model.traverse(m => {
      if (!m.isMesh) return;
      const c = category(m);
      m.castShadow = true; m.receiveShadow = true;
      if (c === "walls") { m.material = std(P.stucco); walls.push(m); }
      else if (c === "columns") m.material = std(P.column);
      else if (c === "canopy") { m.material = std(P.canopy, { roughness: 0.85, side: THREE.DoubleSide }); m.visible = true; for (let n = m.parent; n; n = n.parent) n.visible = true; }
      else if (c === "openings") { m.material = glass; m.castShadow = false; }
      else if (c === "walkway") m.material = std(P.walk);
      else if (c === "floors") m.material = std(P.walk);
      else m.material = std(P.stucco);
    });
    model.updateMatrixWorld(true);
    // Wall-top heights, sampled once, give each suite its roof plane.
    const wallVerts = [];
    const v = new THREE.Vector3();
    for (const w of walls) { const pos = w.geometry.getAttribute("position"); for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(w.matrixWorld); wallVerts.push([v.x, v.y, v.z]); } }
    const roofMat = std(P.roof, { roughness: 0.95 });
    for (const [unit, rect] of Object.entries(units)) {
      const corners = rectToModel(rect, matrix);
      const xs = corners.map(c => c[0]), zs = corners.map(c => c[1]);
      const [x0, x1, z0, z1] = [Math.min(...xs) - 0.6, Math.max(...xs) + 0.6, Math.min(...zs) - 0.6, Math.max(...zs) + 0.6];
      let top = 0; for (const [x, y, z] of wallVerts) if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && y > top) top = y;
      if (top < 1) continue;
      const shape = new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x, -z)));
      const roof = new THREE.Mesh(new THREE.ShapeGeometry(shape), roofMat); roof.geometry.rotateX(-Math.PI / 2);
      roof.position.y = top + ROOF_LIFT; roof.receiveShadow = true; roof.castShadow = true; roof.userData.unit = unit; scene.add(roof);
      const rtu = rooftopUnit(), cx = xs.reduce((s, n) => s + n, 0) / 4, cz = zs.reduce((s, n) => s + n, 0) / 4;
      rtu.position.set(cx, top + ROOF_LIFT, cz); rtu.rotation.y = Math.atan2(corners[1][1] - corners[0][1], corners[1][0] - corners[0][0]); scene.add(rtu);
    }
    if (fixtures) { fixtures.scene.traverse(m => { if (m.isMesh) { m.castShadow = true; m.material = std("#3d3a35", { roughness: 0.6 }); } }); scene.add(fixtures.scene); }
    onReady();
    invalidate();
  });

  function setLighting(name) {
    const L = LIGHTING[name] ?? LIGHTING.day;
    renderer.setClearColor(L.bg); renderer.toneMappingExposure = L.exposure;
    hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
    sun.position.set(...L.sunDir.map(n => n * 260)); sun.target.position.set(0, 0, 0);
    glass.emissiveIntensity = L.night ? 1.6 : 0; glass.color.set(L.night ? "#3d3424" : P.glazing);
    for (const lens of lenses) lens.emissiveIntensity = L.night ? 3 : 0;
    for (const light of poleLights) light.intensity = L.night ? 150 : 0;
    invalidate();
  }

  function render() { frame = 0; if (disposed) return; if (controls.update()) invalidate(); renderer.render(scene, camera); }
  function invalidate() { if (!frame && !disposed) frame = requestAnimationFrame(render); }
  controls.addEventListener("change", invalidate);
  let userMoved = false; controls.addEventListener("start", () => { userMoved = true; });
  function resize() {
    const r = container.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!userMoved) fitView(); invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  setLighting("golden");

  function resetView() { userMoved = false; fitView(); invalidate(); }
  function capture() { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); }
  function dispose() {
    disposed = true; observer.disconnect(); if (frame) cancelAnimationFrame(frame); controls.dispose();
    scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material ?? [])) m.dispose(); });
    renderer.dispose(); renderer.domElement.remove();
  }
  return { ready, setLighting, resetView, capture, dispose, counts: () => ({ registerItems: placed.length, poleLights: poleLights.length }) };
}
