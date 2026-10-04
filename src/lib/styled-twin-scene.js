/* A-8 Styled Twin scene — REV 2 (2026-10-01, operator: "continue refining until
   it looks fantastic · all the assets · the grey sloped part of the roof must be
   there · the CAD file dimensions must be accurately shown on the twin").
   Buildings are built bay-by-bay from geometry.json demising feet (plat + CAD,
   REV 17) at the survey heights, in a plan-true metre frame (styled-twin-plan.js).
   Ground surfaces are the twin's site-context zones re-projected into that
   frame; stall striping is the A-1 drawing's own lines; every site-register
   item with a recorded position is placed at it. Canopy, fascia and mansard
   heights, tree species and the island poles are presentation assumptions. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { STYLED_PALETTE as P, polygonCentroid } from "./styled-twin-placement.js";
import { FT, KX, KY, CANOPY, LONG, SHORT, planToWorld, modelToWorld, layoutSuites, dimensionStrings, storefrontSigns } from "./styled-twin-plan.js";

const POLE_HEIGHT = 9.1, EAVE = CANOPY.eaveFt * FT, FASCIA = CANOPY.fasciaTopFt * FT, MANSARD = CANOPY.mansardTopFt * FT;

export const LIGHTING = Object.freeze({
  day:    { sky: ["#9fc2e6", "#e9eef0"], fog: "#e6ebea", bg: "#EEF0EC", hemi: ["#f4f7ff", "#a39d8e", 0.9], sun: ["#fffaf0", 3.2], sunDir: [-0.35, 1, 0.55], exposure: 0.95, env: 0.35, night: 0, bloom: 0 },
  golden: { sky: ["#c9d3e0", "#f6dcb8"], fog: "#efdcc2", bg: "#F4E6D2", hemi: ["#ffefd9", "#8f857a", 0.7], sun: ["#ffd3a0", 3.8], sunDir: [-1, 0.42, 0.42], exposure: 0.95, env: 0.3, night: 0, bloom: 0 },
  night:  { sky: ["#05070d", "#141a2a"], fog: "#0b0e16", bg: "#070910", hemi: ["#3a4668", "#101014", 0.22], sun: ["#9fb3ff", 0.12], sunDir: [0.3, 1, 0.4], exposure: 1.15, env: 0.03, night: 1, bloom: 0.6 },
  dusk:   { sky: ["#121a30", "#a2604f"], fog: "#262836", bg: "#1F2840", hemi: ["#5f6f9c", "#24242c", 0.42], sun: ["#ff8f5e", 0.35], sunDir: [-1, 0.1, 0.3], exposure: 1.05, env: 0.08, night: 1, bloom: 0.5 }
});

const MAT_CACHE = new Map();
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });
const shared = (key, make) => { if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, make()); return MAT_CACHE.get(key); };
const cast = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

/* ---------- procedural textures (no external files) ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function noise(ctx, w, h, amt, alpha = 0.06) {
  for (let i = 0; i < amt; i++) { const v = Math.random() > 0.5 ? 255 : 0; ctx.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}
// Concrete with saw-cut control joints every 15 ft (texture tile = 15 ft, UVs are metres).
const concreteTex = (base, joint, tileFt) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, 0.05);
  g.strokeStyle = joint; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
}, [1 / (tileFt * FT), 1 / (tileFt * FT)]);
const grassTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#6d9156"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const s = Math.random(); g.fillStyle = s > 0.5 ? "rgba(140,175,100,0.25)" : "rgba(60,90,45,0.25)"; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 3); }
}, [1 / 6, 1 / 6]);
// Architectural shingle courses (the grey sloped mansard).
const shingleTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#7e7d79"; g.fillRect(0, 0, w, h);
  const course = 16;
  for (let y = 0; y < h; y += course) {
    const off = (y / course) % 2 ? 0 : 18;
    for (let x = -off; x < w; x += 36) {
      const tone = 112 + Math.floor(Math.random() * 30);
      g.fillStyle = `rgb(${tone},${tone - 2},${tone - 5})`; g.fillRect(x + 1, y + 1, 34, course - 3);
    }
    g.fillStyle = "rgba(30,30,30,0.55)"; g.fillRect(0, y + course - 2, w, 2);
  }
  noise(g, w, h, 3000, 0.08);
}, [1, 1]);
// Painted brick (cream), 1.2 m × 0.6 m tile = 4 × 8 courses — the storefront piers in the photos.
const brickTex = () => canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = "#d9cdb4"; g.fillRect(0, 0, w, h);
  const rows = 8, ch = h / rows, bw = w / 4;
  for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0), tone = 228 + Math.floor(Math.random() * 10);
    g.fillStyle = `rgb(${tone},${tone - 8},${tone - 22})`; g.fillRect(x + 1.5, r * ch + 1.5, bw - 3, ch - 3);
  }
  noise(g, w, h, 1500, 0.05);
}, [1, 1]);
const membraneTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#ecebe6"; g.fillRect(0, 0, w, h); noise(g, w, h, 4000, 0.04);
  g.strokeStyle = "rgba(160,160,150,0.25)"; g.lineWidth = 1; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
}, [1 / 3, 1 / 3]);

/* ---------- geometry helpers (world XZ, Y up) ---------- */
function flatPoly(pts, y, material) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0);
  const m = new THREE.Mesh(geo, material); m.receiveShadow = true; return m;
}
function slabPoly(pts, y0, h, material) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
  return cast(new THREE.Mesh(geo, material));
}
function boxAt(x0, x1, y0, y1, z0, z1, material) {
  const m = cast(new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m;
}
function quad(a, b, c, d, material) { // four [x,y,z] corners, CCW seen from the front
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), up = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, len, 0, len, up, 0, 0, len, up, 0, up], 2));
  g.computeVertexNormals(); return cast(new THREE.Mesh(g, material));
}
const strip = (a, b, w) => { // thin ground quad between two XZ points
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-6) return null;
  const nx = -(b[1] - a[1]) / len * w / 2, nz = (b[0] - a[0]) / len * w / 2;
  return [[a[0] + nx, a[1] + nz], [a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz]];
};

/* ---------- site furniture ---------- */
function twinHeadPole() {
  const g = new THREE.Group(), bronze = shared("bronze", () => std(P.pole, { roughness: 0.55, metalness: 0.35 }));
  const base = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.75, 12), shared("pier", () => std("#cfc9bb"))));
  base.position.y = 0.37; g.add(base);
  const shaft = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, POLE_HEIGHT, 10), bronze)); shaft.position.y = POLE_HEIGHT / 2 + 0.7; g.add(shaft);
  const lens = std("#d9d6cc", { emissive: "#eef3ff", emissiveIntensity: 0 });
  for (const side of [-1, 1]) {
    const arm = cast(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), bronze)); arm.position.set(side * 0.45, POLE_HEIGHT + 0.55, 0); g.add(arm);
    const head = cast(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.45), bronze)); head.position.set(side * 1.05, POLE_HEIGHT + 0.55, 0); g.add(head);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.38), lens); glow.position.set(side * 1.05, POLE_HEIGHT + 0.46, 0); g.add(glow);
  }
  g.userData.lens = lens; return g;
}
const LEAF = ["#4d7a3a", "#5a8442", "#45703a", "#557d3d"];
function tree(kind, seed) {
  const g = new THREE.Group(), r = n => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const leaf = shared("leaf" + (seed % 4), () => std(LEAF[seed % 4], { roughness: 1, flatShading: true }));
  const trunkMat = shared("trunk", () => std(P.trunk));
  if (kind === "oak") { // live oak: low wide crown
    const s = 1 + r(1) * 0.35;
    const trunk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 3 * s, 8), trunkMat)); trunk.position.y = 1.5 * s; g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + r(i), d = i ? 2.6 * s : 0, rad = (i ? 2.4 : 3) * s * (0.85 + r(i + 9) * 0.3);
      const ball = cast(new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), leaf)); ball.position.set(Math.cos(a) * d, (i ? 4.1 : 4.8) * s, Math.sin(a) * d); ball.scale.y = 0.7; g.add(ball);
    }
  } else { // street tree / crape myrtle: upright oval crown
    const s = 0.8 + r(2) * 0.3;
    const trunk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.4 * s, 7), trunkMat)); trunk.position.y = 1.2 * s; g.add(trunk);
    for (const [x, y, z, rad] of [[0, 3.4, 0, 1.6], [0.6, 3.0, 0.3, 1.1], [-0.6, 3.1, -0.3, 1.15], [0.1, 4.2, -0.1, 1.05]]) {
      const ball = cast(new THREE.Mesh(new THREE.IcosahedronGeometry(rad * s, 1), leaf)); ball.position.set(x * s, y * s, z * s); g.add(ball);
    }
  }
  g.rotation.y = r(5) * Math.PI * 2; return g;
}
function rooftopUnit(scale = 1) {
  const g = new THREE.Group(), body = shared("rtu", () => std(P.rtu, { roughness: 0.5, metalness: 0.35 }));
  const box = cast(new THREE.Mesh(new THREE.BoxGeometry(2.6 * scale, 1.25, 1.6), body)); box.position.y = 0.72; g.add(box);
  const curb = cast(new THREE.Mesh(new THREE.BoxGeometry(2.7 * scale, 0.12, 1.7), shared("curb", () => std("#a9aaa4")))); curb.position.y = 0.06; g.add(curb);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), shared("fan", () => std("#4b4f4c", { roughness: 0.4, metalness: 0.5 })));
  fan.position.set(0.6 * scale, 1.36, 0); g.add(fan);
  const fan2 = fan.clone(); fan2.position.x = -0.5 * scale; if (scale > 1.2) g.add(fan2);
  return g;
}
function bench() {
  const g = new THREE.Group(), wood = shared("wood", () => std("#9a6b40", { roughness: 0.8 })), iron = shared("iron", () => std("#2d2e2c", { roughness: 0.5, metalness: 0.5 }));
  g.add(boxAt(-0.8, 0.8, 0.42, 0.47, -0.22, 0.22, wood), boxAt(-0.8, 0.8, 0.55, 0.85, 0.2, 0.25, wood));
  for (const x of [-0.7, 0.7]) g.add(boxAt(x - 0.04, x + 0.04, 0, 0.45, -0.2, 0.2, iron));
  return g;
}
function trashCan() {
  const g = new THREE.Group();
  const body = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.95, 12), shared("canBody", () => std("#a87443", { roughness: 0.75 })))); body.position.y = 0.48; g.add(body);
  const lid = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.1, 12), shared("iron", () => std("#2d2e2c", { roughness: 0.5, metalness: 0.5 })))); lid.position.y = 1; g.add(lid);
  return g;
}
// The OTB pylon from the approved master art with the tenant panels composited in (public/pylon/,
// tools/build-pylon-face.py). 1023 × 1537 px at 45.1 px/ft (Panel 2 = 8 ft) → 22.7 ft × 34.1 ft.
// Faces ±Z (Johnston traffic); panels + "On The Boulevard" glow from the glow map dusk to dawn.
const PYLON_FT = [1023 / 45.125, 1537 / 45.125], PX = 45.125;
function pylonFromFace(base, onLoad) {
  const g = new THREE.Group(), W = PYLON_FT[0] * FT, H = PYLON_FT[1] * FT, D = 0.86, ft = px => px / PX * FT;
  const cream = shared("pylonCream", () => std("#efe6d4", { roughness: 0.75 })), tan = shared("pylonTan", () => std("#dcc8a4", { roughness: 0.7 }));
  const box = (x0, x1, y0, y1, d, m) => g.add(boxAt(ft(x0) - W / 2, ft(x1) - W / 2, H - ft(y1), H - ft(y0), -d / 2, d / 2, m));
  box(262, 342, 420, 1440, D, cream); box(690, 770, 420, 1440, D, cream);   // posts
  box(330, 692, 415, 1195, D * 0.9, cream);                                  // panel cabinet
  box(200, 830, 170, 470, D * 1.15, tan);                                    // header cabinet
  const loader = new THREE.TextureLoader(), mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.5, roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0, visible: false });
  let left = 2; const done = () => { if (--left === 0) { mat.visible = true; mat.needsUpdate = true; onLoad?.(); } };
  loader.load(base + "otb-pylon-face.webp", t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; done(); });
  loader.load(base + "otb-pylon-glow.webp", t => { mat.emissiveMap = t; done(); });
  for (const side of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); f.position.set(0, H / 2, side * (D * 0.58 + 0.01));
    if (side < 0) f.rotation.y = Math.PI; g.add(f);
  }
  g.userData.face = mat; return g;
}
// Fixed steel roof-access ladder: two rails, rungs at 12", stand-off brackets, rails returning over the parapet.
// Built facing +z (wall behind at z = 0); rotate to the wall's outward normal.
function roofLadder(h, w) {
  const g = new THREE.Group(), m = shared("ladder", () => std("#8e9289", { roughness: 0.5, metalness: 0.6 })), off = 0.18;
  for (const sx of [-w / 2, w / 2]) {
    const r = cast(new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 1.05, 0.05), m)); r.position.set(sx, (h + 1.05) / 2, off); g.add(r);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, off + 0.35), m); top.position.set(sx, h + 1.05, off - (off + 0.35) / 2 + 0.03); g.add(top);
    for (const by of [0.4, h / 2, h - 0.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, off), m); b.position.set(sx, by, off / 2); g.add(b); }
  }
  for (let y = 0.3; y < h + 0.9; y += 0.305) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w, 6), m); r.rotation.z = Math.PI / 2; r.position.set(0, y, off); g.add(r); }
  const guard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.06, 0.06), m); guard.position.set(0, 2.0, off + 0.03); g.add(guard); // the bar the scan shows ~2 m up
  return g;
}

function dumpster(color) {
  const g = new THREE.Group(), c = { yellow: "#e3b520", blue: "#2f5ea8", green: "#2f5d3c", brown: "#6b4a2f" }[color] ?? "#2f5d3c";
  const body = shared("dump-" + color, () => std(c, { roughness: 0.6, metalness: 0.35 })), lid = shared("dumpLid", () => std("#2b2c2a", { roughness: 0.7 }));
  g.add(boxAt(-0.95, 0.95, 0.12, 1.35, -0.8, 0.7, body));
  const top = cast(new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 1.55), lid)); top.position.set(0, 1.42, -0.05); top.rotation.x = 0.12; g.add(top);
  for (const x of [-0.8, 0.8]) for (const z of [-0.65, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), lid); w.rotation.z = Math.PI / 2; w.position.set(x, 0.08, z); g.add(w); }
  return g;
}
function securityCamera() { // DW MEGApix CaaS 4MP vandal dome on the DWC-VFZWM wall arm (cameras.json `hardware`)
  const g = new THREE.Group(), white = shared("camWhite", () => std("#f2f2ef", { roughness: 0.35, metalness: 0.1 }));
  const smoke = shared("camSmoke", () => std("#2a2d2f", { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 })), dark = shared("camDark", () => std("#1d1f20", { roughness: 0.2, metalness: 0.4 }));
  g.add(boxAt(-0.02, 0.02, -0.1, 0.1, -0.06, 0.06, white)); // wall plate
  g.add(boxAt(0, 0.24, 0.0, 0.05, -0.035, 0.035, white));    // arm
  const base = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), white)); base.position.set(0.3, -0.01, 0); g.add(base);
  const dome = cast(new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), smoke)); dome.position.set(0.3, -0.04, 0); g.add(dome);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), dark); lens.position.set(0.335, -0.08, 0); g.add(lens);
  return g;
}

/* ---------- the scene ---------- */
export function createStyledTwinScene(container, { siteData, register, geometry, heights, units, pylonData, lighting = null, logoUnits = [], logoBase = "/tenant-logos/sign/", facadeOpenings = null, roofEquipment = null, serviceItems = null, cameras = null, pylonBase = "/pylon/", onReady = () => {} }) {
  const W0 = p => planToWorld(p);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "none" });
  renderer.domElement.setAttribute("aria-label", "On The Boulevard styled 3D model. Drag to orbit, scroll to zoom, right-drag to pan.");
  container.append(renderer.domElement);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  labels.domElement.className = "st-labels"; container.append(labels.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const hemi = new THREE.HemisphereLight(); scene.add(hemi);
  const sun = new THREE.DirectionalLight(); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -135, right: 135, top: 110, bottom: -110, near: 1, far: 700 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  const VIEW_DIR = new THREE.Vector3(0.1, 0.62, 0.78).normalize(), VIEW_TARGET = new THREE.Vector3(4, 0, -4), HALF_WIDTH = 96;
  const SHOTS = {
    storefronts: { pos: [-62, 10, 24], target: [-30, 4, -13] },
    corner: { pos: [38, 13, 72], target: [76, 4, 28] },
    pylon: { pos: [-84, 7, 30], target: [-105, 6, 3] },
    breezeway: { pos: [36, 10, 6], target: [66, 5, -20] },
    rear: { pos: [116, 7, 34], target: [94, 3.5, 17] },
    johnston: { pos: [-121, 5.5, -18], target: [-97, 3, -36] }
  };
  function shot(name) {
    const s = SHOTS[name]; if (!s) { userMoved = false; fitView(); invalidate(); return; }
    userMoved = true; camera.position.set(...s.pos); controls.target.set(...s.target); controls.update(); invalidate();
  }
  function fitView() {
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(HALF_WIDTH / Math.tan(hfov / 2), 62 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.04;
    camera.position.copy(VIEW_TARGET).addScaledVector(VIEW_DIR, dist); controls.target.copy(VIEW_TARGET); controls.update();
  }
  controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 8; controls.maxDistance = 1200; controls.enableDamping = true;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.35, 0.92); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const night = { glass: [], lenses: [], lights: [], soffit: [], signs: [], pylon: [] };
  const matrix = siteData.registration.matrix3x2;
  let frame = 0, disposed = false;

  /* ---- ground ---- */
  const tex = { concrete: concreteTex("#d9d7d0", "rgba(120,118,110,0.35)", 15), walk: concreteTex("#dedbd2", "rgba(120,115,105,0.5)", 5), grass: grassTex(), road: concreteTex("#a9aaa6", "rgba(80,80,78,0.4)", 20), shingle: shingleTex(), membrane: membraneTex(), brick: brickTex() };
  const ground = new THREE.Group(); ground.name = "ground"; scene.add(ground);
  ground.add(flatPoly([[-600, -500], [600, -500], [600, 500], [-600, 500]], -0.05, std("#c3c8b0", { roughness: 1 })));
  const LIFT = { service: 0, "off-parcel": 0.004, roads: 0.006, parking: 0.012, sidewalk: 0.15, landscape: 0.15 };
  const zoneMat = kind => shared("zone-" + kind, () => {
    if (kind === "landscape") return std("#ffffff", { map: tex.grass, roughness: 1 });
    if (kind === "sidewalk") return std("#ffffff", { map: tex.walk, roughness: 0.95 });
    if (kind === "roads") return std("#ffffff", { map: tex.road, roughness: 0.95 });
    if (kind === "off-parcel") return std(P.offParcel, { roughness: 1 });
    return std("#ffffff", { map: tex.concrete, roughness: 0.95 });
  });
  const curbMat = shared("curb", () => std("#e4e1d8", { roughness: 0.9 }));
  const worldZones = siteData.zones.map(z => ({ ...z, world: z.polygonMeters.map(([x, , zz]) => modelToWorld([x, zz], matrix)) }));
  for (const z of worldZones) {
    const lift = LIFT[z.kind] ?? 0;
    if (lift >= 0.1 && !/median/.test(z.id)) { ground.add(slabPoly(z.world, 0, lift, curbMat)); ground.add(flatPoly(z.world, lift + 0.002, zoneMat(z.kind))); }
    else ground.add(flatPoly(z.world, lift, zoneMat(z.kind)));
  }
  // Covered walkways (register `walk` polygons, plan-true).
  const walkMat = zoneMat("sidewalk");
  const walks = register.items.filter(i => i.cat === "walk" && i.polys);
  for (const w of walks) for (const poly of w.polys) { const pts = poly.map(planToWorld); ground.add(slabPoly(pts, 0, 0.16, curbMat)); ground.add(flatPoly(pts, 0.162, walkMat)); }

  // Stall striping: the A-1 drawing's own stall lines (main site + Lot 7) — 324 + Lot 7.
  const stripeVerts = [];
  const addStrip = (a, b, w, y) => { const q = strip(a, b, w); if (!q) return; for (const i of [0, 2, 1, 0, 3, 2]) stripeVerts.push(q[i][0], y, q[i][1]); };
  const stallLines = [...geometry.layers.parking, ...geometry.layers.remoteLot].filter(e => e.t === "line" && e.attrs?.stroke === "#C9CEBE");
  for (const l of stallLines) addStrip(planToWorld([l.x1, l.y1]), planToWorld([l.x2, l.y2]), 0.13, 0.03);
  const stripeGeo = new THREE.BufferGeometry(); stripeGeo.setAttribute("position", new THREE.Float32BufferAttribute(stripeVerts, 3)); stripeGeo.computeVertexNormals();
  const stripes = new THREE.Mesh(stripeGeo, std("#ffffff", { roughness: 0.6, side: THREE.DoubleSide })); stripes.receiveShadow = true; ground.add(stripes);
  // ADA stalls: blue paint + symbol, oriented to the nearest stall line.
  const adaTex = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = "#2f5fa8"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#f6f6f2"; c.beginPath(); c.arc(w / 2, h * 0.62, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2f5fa8"; c.beginPath(); c.arc(w / 2, h * 0.62, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#f6f6f2"; c.beginPath(); c.arc(w / 2, h * 0.47, 8, 0, Math.PI * 2); c.fill();
  });
  const adaMat = new THREE.MeshStandardMaterial({ map: adaTex, roughness: 0.8 });
  for (const a of register.items.filter(i => i.cat === "ada" && i.point)) {
    let best = null, bd = Infinity;
    for (const l of stallLines) { const d = Math.hypot((l.x1 + l.x2) / 2 - a.point[0], (l.y1 + l.y2) / 2 - a.point[1]); if (d < bd) { bd = d; best = l; } }
    const [x, z] = planToWorld(a.point);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.2), adaMat); m.rotation.x = -Math.PI / 2;
    if (best) { const [ax, az] = planToWorld([best.x1, best.y1]), [bx, bz] = planToWorld([best.x2, best.y2]); m.rotation.z = Math.atan2(bx - ax, bz - az); }
    m.position.set(x, 0.035, z); m.receiveShadow = true; ground.add(m);
  }

  /* ---- buildings: bay by bay from the demising feet ---- */
  const suites = layoutSuites(geometry.demising, heights);
  const bld = new THREE.Group(); bld.name = "buildings"; scene.add(bld);
  const stucco = shared("stucco", () => std("#E4D6BA", { roughness: 0.92 }));
  const rearWall = shared("rearWall", () => std("#DCCDB0", { roughness: 0.95 }));
  const roofMat = shared("roof", () => std("#ffffff", { map: tex.membrane, roughness: 0.85 }));
  const capMat = shared("cap", () => std("#d7d2c6", { roughness: 0.6, metalness: 0.15 }));
  const glassMat = () => { const g = std("#3e5058", { roughness: 0.05, metalness: 0.55, envMapIntensity: 2.2, emissive: "#ffcf8a", emissiveIntensity: 0 }); night.glass.push(g); return g; };
  const mullion = shared("mullion", () => std("#2b2c2a", { roughness: 0.45, metalness: 0.6 }));
  const kick = shared("kick", () => std("#cfc4ad"));
  for (const s of suites) {
    const xs = s.corners.map(c => c[0]), zs = s.corners.map(c => c[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)], h = s.heightFt * FT;
    const body = boxAt(x0, x1, 0, h, z0, z1, stucco); body.material = [stucco, stucco, roofMat, rearWall, stucco, s.building === "long" ? rearWall : stucco]; body.userData = { unit: s.unit };
    bld.add(body);
    // Parapet cap + roof membrane inset.
    const t = 0.22;
    bld.add(boxAt(x0, x1, h, h + 0.5, z0, z0 + t, capMat), boxAt(x0, x1, h, h + 0.5, z1 - t, z1, capMat), boxAt(x0, x0 + t, h, h + 0.5, z0, z1, capMat), boxAt(x1 - t, x1, h, h + 0.5, z0, z1, capMat));
    // Electrical panel + lighting time clock on the rear wall (records: one per suite; position approximate).
    const grey = shared("svc", () => std("#8d918c", { roughness: 0.5, metalness: 0.4 }));
    if (s.building === "long") {
      const cx = (x0 + x1) / 2;
      bld.add(boxAt(cx + 1, cx + 1.6, 1.2, 2.0, z0 - 0.18, z0, grey), boxAt(cx + 1.8, cx + 2.05, 1.4, 1.75, z0 - 0.1, z0, grey));
    } else if (s.unit !== "135A") {
      const cz = (z0 + z1) / 2;
      bld.add(boxAt(x1, x1 + 0.18, 1.2, 2.0, cz + 1, cz + 1.6, grey), boxAt(x1, x1 + 0.1, 1.4, 1.75, cz + 1.8, cz + 2.05, grey));
    }
    // Painted-brick storefront wall (the storefront photos), courses scaled to the face.
    const front = s.building === "long" ? 4 : 1, faceW = s.building === "long" ? x1 - x0 : z1 - z0;
    const bt = tex.brick.clone(); bt.needsUpdate = true; bt.repeat.set(faceW / 1.2, h / 0.6);
    const mats = body.material.slice(); mats[front] = std("#ffffff", { map: bt, roughness: 0.9 }); body.material = mats;
  }
  // Storefront doors and windows: the Floorplanner twin's openings (facade-openings.json), plan-true.
  const faceFrames = {
    "long-front": { n: [0, 1], at: W0([0, LONG.frontY])[1], axis: "x" },
    "long-rear": { n: [0, -1], at: W0([0, LONG.rearY])[1], axis: "x" },
    "long-west": { n: [-1, 0], at: W0([LONG.x0, 0])[0], axis: "z" },
    "short-front": { n: [-1, 0], at: W0([SHORT.faceX, 0])[0], axis: "z" },
    "short-rear": { n: [1, 0], at: W0([SHORT.faceX + geometry.demising.shortBuilding.depthFt * KX, 0])[0], axis: "z" },
    "short-south": { n: [0, 1], at: W0([0, SHORT.y0 + geometry.demising.shortBuilding.lengthFt * KY])[1], axis: "x" }
  };
  const shopGlass = glassMat(), frameMat = shared("shopFrame", () => std("#3b3530", { roughness: 0.4, metalness: 0.6 }));
  const steelDoor = shared("rearDoor", () => std("#7c7466", { roughness: 0.6, metalness: 0.3 }));
  const sillMat = shared("sill", () => std("#e7dfcf", { roughness: 0.7 }));
  function opening(o) {
    const F = faceFrames[o.face]; if (!F) return;
    const a = F.axis === "x" ? W0([o.along, 0])[0] : W0([0, o.along])[1];
    const g = new THREE.Group();
    g.position.set(F.axis === "x" ? a : F.at, 0, F.axis === "x" ? F.at : a);
    g.rotation.y = F.n[1] === 1 ? 0 : F.n[1] === -1 ? Math.PI : F.n[0] === -1 ? -Math.PI / 2 : Math.PI / 2;
    const w = o.widthFt * FT, h = o.heightFt * FT, sill = o.type === "door" ? 0.16 : Math.max(0.5, o.sillFt * FT), fr = 0.06;
    const service = o.face === "long-rear" || o.face === "short-rear";
    if (service) { g.add(boxAt(-w / 2, w / 2, 0.02, Math.max(2.1, h), 0, 0.05, steelDoor)); bld.add(g); return; }
    const glass = boxAt(-w / 2 + fr, w / 2 - fr, sill + fr, sill + h - fr, 0.005, 0.02, shopGlass); glass.castShadow = false; g.add(glass);
    g.add(boxAt(-w / 2, w / 2, sill + h - fr, sill + h, 0, 0.07, frameMat), boxAt(-w / 2, -w / 2 + fr, sill, sill + h, 0, 0.07, frameMat), boxAt(w / 2 - fr, w / 2, sill, sill + h, 0, 0.07, frameMat));
    if (o.type === "door") {
      g.add(boxAt(-w / 2, w / 2, sill, sill + 0.12, 0, 0.07, frameMat));                    // bottom rail
      if (w > 1.4) g.add(boxAt(-0.03, 0.03, sill, sill + h, 0, 0.07, frameMat));           // pair of leaves
      g.add(boxAt(-w / 4 - 0.1, -w / 4 + 0.1, sill + 1.0, sill + 1.04, 0.07, 0.1, frameMat)); // push bar
    } else {
      g.add(boxAt(-w / 2 - 0.05, w / 2 + 0.05, sill - 0.06, sill, 0, 0.12, sillMat));       // sill
      g.add(boxAt(-w / 2, w / 2, sill, sill + fr, 0, 0.07, frameMat));
      const n = Math.max(1, Math.round(w / 0.9));                                             // divided lites
      for (let i = 1; i < n; i++) { const x = -w / 2 + w * i / n; g.add(boxAt(x - 0.02, x + 0.02, sill, sill + h, 0, 0.05, frameMat)); }
    }
    bld.add(g);
  }
  for (const o of facadeOpenings?.openings ?? []) opening(o);
  // Suites the Floorplanner export leaves without a storefront opening keep a plain glazed front.
  for (const s of suites) {
    if (s.unit === "135B") continue;
    const xs = s.corners.map(c => c[0]), zs = s.corners.map(c => c[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const face = s.building === "long" ? "long-front" : "short-front";
    const has = (facadeOpenings?.openings ?? []).some(o => o.face === face && (s.building === "long"
      ? (a => a >= x0 && a <= x1)(W0([o.along, 0])[0]) : (a => a >= z0 && a <= z1)(W0([0, o.along])[1])));
    if (has) continue;
    const top = EAVE - 0.55, inset = 0.45;
    if (s.building === "long") { const g = boxAt(x0 + inset, x1 - inset, 0.6, top, z1 + 0.02, z1 + 0.04, shopGlass); g.castShadow = false; bld.add(g); }
    else { const g = boxAt(x0 - 0.04, x0 - 0.02, 0.6, top, z0 + inset, z1 - inset, shopGlass); g.castShadow = false; bld.add(g); }
  }
  // Rooftop HVAC at the positions the satellite base shows (roof-equipment.json).
  for (const it of roofEquipment?.items ?? []) {
    const su = suites.find(s => s.unit === it.unit); if (!su) continue;
    const [x, z] = planToWorld(it.point), h = su.heightFt * FT;
    if (it.kind === "rtu") {
      const u = rooftopUnit(1); const [wf, df] = it.sizeFt;
      u.scale.set(Math.min(Math.max(wf * FT / 2.6, 0.7), 1.9), 1, Math.min(Math.max(df * FT / 1.6, 0.7), 1.9));
      u.position.set(x, h, z); bld.add(u);
    } else {
      const f = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.5, 14), shared("fanHood", () => std("#c9cbc6", { roughness: 0.4, metalness: 0.5 }))));
      f.position.set(x, h + 0.25, z); bld.add(f);
    }
  }
  // Fire-rated walls: parapets proud of the roof (register `firewall`).
  for (const f of register.items.filter(i => i.cat === "firewall" && i.line)) {
    const [a, b] = [planToWorld(f.line[0]), planToWorld(f.line[1])];
    const near = suites.find(s => { const xs = s.corners.map(c => c[0]), zs = s.corners.map(c => c[1]); return a[0] >= Math.min(...xs) - 1 && a[0] <= Math.max(...xs) + 1 && a[1] >= Math.min(...zs) - 1 && a[1] <= Math.max(...zs) + 1; });
    const h = (near?.heightFt ?? 16.4) * FT;
    const horiz = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    bld.add(horiz ? boxAt(a[0], b[0], h, h + 0.9, a[1] - 0.18, a[1] + 0.18, capMat) : boxAt(a[0] - 0.18, a[0] + 0.18, h, h + 0.9, Math.min(a[1], b[1]), Math.min(Math.max(a[1], b[1]), planToWorld([0, LONG.frontY])[1]), capMat));
  }

  /* ---- covered walkway: columns, soffit, fascia and the grey mansard ---- */
  const colMat = shared("column", () => std("#EFE7D6", { roughness: 0.85 }));
  const fasciaMat = shared("fascia", () => std("#E9DDC4", { roughness: 0.8, side: THREE.DoubleSide }));
  const soffitMat = shared("soffit", () => std("#efe9dc", { roughness: 0.9, side: THREE.DoubleSide }));
  const mansardMat = shared("mansard", () => std("#ffffff", { map: tex.shingle, roughness: 0.95, side: THREE.DoubleSide }));
  for (const c of register.items.filter(i => i.cat === "column" && i.point)) {
    const [x, z] = planToWorld(c.point), w = 2 * FT;
    bld.add(boxAt(x - w / 2, x + w / 2, 0.16, EAVE, z - w / 2, z + w / 2, colMat));
    bld.add(boxAt(x - w / 2 - 0.06, x + w / 2 + 0.06, 0.16, 0.45, z - w / 2 - 0.06, z + w / 2 + 0.06, kick));
    // Column-mounted fixture on the parking-lot face (operator 2026-10-01); the two corner columns
    // carry a second one on their open end (operator 2026-10-02: one facing Johnston, one facing Arnould).
    const outs = [c.point[0] < LONG.x0 || c.point[0] > 1128 ? [-1, 0] : [0, 1]];
    if ((lighting?.cornerColumns ?? []).some(k => k.column === c.id)) outs.push([0, 1]);
    for (const out of outs) {
      const fx = x + out[0] * (w / 2 + 0.22), fz = z + out[1] * (w / 2 + 0.22), fy = 2.75;
      const iron = shared("fixtureIron", () => std("#24282a", { roughness: 0.45, metalness: 0.6 }));
      bld.add(boxAt(x + out[0] * w / 2 - 0.03 + out[0] * 0.11, x + out[0] * w / 2 + 0.03 + out[0] * 0.11, fy + 0.18, fy + 0.24, z + out[1] * w / 2 - 0.03 + out[1] * 0.11, z + out[1] * w / 2 + 0.03 + out[1] * 0.11, iron));
      const shade = cast(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 16, 1, true), iron)); shade.position.set(fx, fy + 0.1, fz); bld.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), shared("fixtureLens", () => { const m = std("#f1f3f6", { emissive: "#eef3ff", emissiveIntensity: 0 }); night.lenses.push(m); return m; }));
      bulb.position.set(fx, fy + 0.02, fz); bld.add(bulb);
    }
  }
  // Runs: outer (column-line) edge, inward direction, depth to the wall face, optional hip at either end.
  const W = p => planToWorld(p);
  const lf = W([0, LONG.frontY])[1], lo = W([0, 313.35])[1];      // long: storefront face z, column-line z
  const ex = W([146.58, 0])[0], exIn = W([LONG.x0, 0])[0];        // 101 end: column line x, wall x
  const sf = W([SHORT.faceX, 0])[0], so = W([1131.34, 0])[0];       // short: face x, column line x
  const sEnd = W([0, SHORT.y0 + geometry.demising.shortBuilding.lengthFt * KY])[1], sWalkEnd = W([0, 627.33])[1];
  const sRight = W([SHORT.faceX + geometry.demising.shortBuilding.depthFt * KX, 0])[0];
  const lRear = W([0, LONG.rearY])[1];
  const sTop = W([0, SHORT.y0])[1];
  function canopyRun(a, b, inward, depth, { hipA = 0, hipB = 0, top = MANSARD, soffit = true } = {}) {
    // a, b: outer-edge XZ; inward: unit XZ toward the wall.
    const dir = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(...dir), u = [dir[0] / len, dir[1] / len];
    const ai = [a[0] + inward[0] * depth + u[0] * hipA, a[1] + inward[1] * depth + u[1] * hipA];
    const bi = [b[0] + inward[0] * depth - u[0] * hipB, b[1] + inward[1] * depth - u[1] * hipB];
    const ao = [a[0] - inward[0] * 0.12, a[1] - inward[1] * 0.12], bo = [b[0] - inward[0] * 0.12, b[1] - inward[1] * 0.12];
    // Fascia band (sign band) at the column line.
    const fa = quad([ao[0], EAVE, ao[1]], [bo[0], EAVE, bo[1]], [bo[0], FASCIA, bo[1]], [ao[0], FASCIA, ao[1]], fasciaMat); bld.add(fa);
    // Trim lines.
    const trimMat = shared("trim", () => std("#f6f1e6", { roughness: 0.6, side: THREE.DoubleSide }));
    bld.add(quad([ao[0] - inward[0] * 0.05, FASCIA - 0.12, ao[1] - inward[1] * 0.05], [bo[0] - inward[0] * 0.05, FASCIA - 0.12, bo[1] - inward[1] * 0.05], [bo[0] - inward[0] * 0.05, FASCIA, bo[1] - inward[1] * 0.05], [ao[0] - inward[0] * 0.05, FASCIA, ao[1] - inward[1] * 0.05], trimMat));
    // Sloped shingle mansard: outer edge at fascia top → wall face at the mansard top.
    const m = quad([ao[0], FASCIA, ao[1]], [bo[0], FASCIA, bo[1]], [bi[0], top, bi[1]], [ai[0], top, ai[1]], mansardMat);
    m.geometry.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v / 2.2; }); bld.add(m);
    if (soffit) {
      const s = flatPoly([a, b, [b[0] + inward[0] * depth, b[1] + inward[1] * depth], [a[0] + inward[0] * depth, a[1] + inward[1] * depth]], EAVE, soffitMat);
      s.castShadow = true; bld.add(s);
      // Recessed downlights (lit at dusk).
      const n = Math.floor(len / 4.6), lamp = shared("downlight", () => { const mm = std("#f4f6fb", { emissive: "#eaf0ff", emissiveIntensity: 0 }); night.soffit.push(mm); return mm; });
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, p = [a[0] + dir[0] * t + inward[0] * depth / 2, a[1] + dir[1] * t + inward[1] * depth / 2];
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), lamp); d.rotation.x = Math.PI / 2; d.position.set(p[0], EAVE - 0.01, p[1]); bld.add(d);
      }
    }
  }
  const longDepth = lo - lf, endDepth = exIn - ex, shortDepth = sf - so;
  canopyRun([ex, lo], [W([1125.84, 0])[0], lo], [0, -1], longDepth, { hipA: endDepth });          // long storefront
  canopyRun([ex, W([0, 121.35])[1]], [ex, lo], [1, 0], endDepth, { hipB: longDepth });              // 101 Johnston end
  canopyRun([so, sWalkEnd], [so, sTop], [1, 0], shortDepth, { hipA: sWalkEnd - sEnd });             // short storefront
  canopyRun([sRight + 0.6, sWalkEnd], [so, sWalkEnd], [0, -1], sWalkEnd - sEnd, { hipB: shortDepth, soffit: false }); // 149 Arnould face
  canopyRun([sRight + 0.6, W([0, 509.94])[1]], [sRight + 0.6, sWalkEnd], [-1, 0], 0.6, { hipB: sWalkEnd - sEnd, soffit: false }); // 149 Patricia return
  // Breezeway roof between the buildings (133 end ↔ 135A).
  const bx0 = W([1125.84, 0])[0], bz0 = W([0, 219.31])[1], bz1 = lf;
  bld.add(flatPoly([[bx0, bz0], [so, bz0], [so, bz1], [bx0, bz1]], EAVE, soffitMat));
  bld.add(boxAt(bx0, sf, MANSARD - 0.3, MANSARD, bz0, bz1, capMat));
  // Gable tower at the breezeway corner (the "P" tower) and the 149 Arnould entry gable.
  function gable(cx, cz, w, d, base, eave, ridge, rot) {
    const g = new THREE.Group();
    g.add(boxAt(-w / 2, w / 2, base, eave, -d / 2, d / 2, stucco));
    const shape = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.3, eave), new THREE.Vector2(w / 2 + 0.3, eave), new THREE.Vector2(0, ridge)]);
    const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d - 0.4, bevelEnabled: false }), stucco); tri.position.z = -d / 2 + 0.2; g.add(cast(tri));
    const half = Math.hypot(w / 2 + 0.5, ridge - eave);
    for (const s of [-1, 1]) {
      const r = cast(new THREE.Mesh(new THREE.BoxGeometry(half, 0.12, d + 0.6), mansardMat));
      r.position.set(s * (w / 4 + 0.2), (eave + ridge) / 2 + 0.06, 0); r.rotation.z = -s * Math.atan2(ridge - eave, w / 2 + 0.3); g.add(r);
    }
    g.position.set(cx, 0, cz); g.rotation.y = rot; bld.add(g);
  }
  const gableEave = 18.2 * FT, ridge = CANOPY.gableTopFt * FT;
  { const [tx, tz] = W([1138, 306]); gable(tx, tz, 5.6, 4.6, 0, gableEave, ridge, -Math.PI / 4); } // "P" tower: inside corner of the two walkways, facing the field
  gable((sf + sRight) / 2, sEnd + 1.25, 8, 2.5, EAVE, gableEave, ridge, 0);                                          // 149 Arnould entry

  // Storefront signs on the fascia (tenant of record; one per tenant).
  for (const sg of storefrontSigns(suites, units)) {
    const ss = sg.suites.map(u => suites.find(s => s.unit === u));
    const len = ss.reduce((t, s) => t + s.frontageFt * FT, 0), text = sg.text.toUpperCase();
    const w = Math.min(len * 0.82, Math.max(3.2, text.length * 0.42)), h = 0.62;
    const letters = (fill, stroke) => canvasTex(1024, 160, (c, cw, ch) => {
      let fs = 120; c.font = `800 ${fs}px "Big Shoulders Display", "Public Sans", Arial, sans-serif`;
      while (c.measureText(text).width > cw * 0.96 && fs > 30) { fs -= 4; c.font = `800 ${fs}px "Big Shoulders Display", "Public Sans", Arial, sans-serif`; }
      c.textAlign = "center"; c.textBaseline = "middle"; if (stroke) { c.lineWidth = 8; c.strokeStyle = stroke; c.strokeText(text, cw / 2, ch / 2); } c.fillStyle = fill; c.fillText(text, cw / 2, ch / 2);
    });
    const logoUnit = sg.suites.find(u => logoUnits.includes(String(u)));
    let mat, plane;
    let ym = (EAVE + FASCIA) / 2;
    if (logoUnit) {
      ym = EAVE + 0.06 + 1.25 / 2;
      // Tenant's own logo (G:\My Drive\00 OTB\…\Tenant Logo, vendored in tools/brand-assets/tenant-logos).
      mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.05, roughness: 0.55, emissive: "#ffffff", emissiveIntensity: 0, visible: false });
      plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      const maxW = Math.min(len * 0.8, 7.5), maxH = 1.25; // may rise slightly past the fascia, like a sign cabinet
      const backer = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shared("logoBacker", () => std("#fbf9f4", { roughness: 0.6, transparent: true, opacity: 0.92 })));
      backer.visible = false; backer.renderOrder = 1; plane.renderOrder = 2; plane.add(backer); backer.position.z = -0.01;
      new THREE.TextureLoader().load(logoBase + encodeURIComponent(logoUnit) + ".webp", tx => {
        tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
        const a = tx.image.width / tx.image.height, sw = Math.min(maxW, maxH * a), sh = sw / a;
        mat.map = tx; mat.emissiveMap = tx; mat.visible = true; mat.needsUpdate = true; plane.scale.set(sw, sh, 1);
        backer.scale.set(1 + 0.24 / sw, 1 + 0.16 / sh, 1); backer.visible = true; invalidate();
      });
      plane.userData.logo = logoUnit;
    } else {
      const t = letters("#2c2620", "rgba(250,246,236,0.9)");
      mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.08, roughness: 0.5, emissive: "#fff2d8", emissiveMap: letters("#ffffff"), emissiveIntensity: 0 });
      plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    }
    night.signs.push(mat);
    if (sg.building === "long") {
      const xs = ss.flatMap(s => s.corners.map(c => c[0])), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      plane.position.set(cx, ym, lo + 0.14);
    } else {
      const zs = ss.flatMap(s => s.corners.map(c => c[1])), cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      plane.position.set(so - 0.14, ym, cz); plane.rotation.y = -Math.PI / 2;
    }
    bld.add(plane);
  }
  // 149 Arnould-face sign (the anchor reads from Arnould too).
  {
    const anchor = storefrontSigns(suites, units).find(s => s.suites.includes("149"));
    if (anchor && logoUnits.includes("149")) {
      const mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.05, emissive: "#ffffff", emissiveIntensity: 0, visible: false }); night.signs.push(mat);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); p.position.set((sf + sRight) / 2, (EAVE + gableEave) / 2, sEnd + 2.52); bld.add(p);
      new THREE.TextureLoader().load(logoBase + "149.webp", tx => { tx.colorSpace = THREE.SRGBColorSpace; const a = tx.image.width / tx.image.height, h = 1.2; mat.map = tx; mat.emissiveMap = tx; mat.visible = true; mat.needsUpdate = true; p.scale.set(Math.min(6, h * a), Math.min(6, h * a) / a, 1); invalidate(); });
    } else if (anchor) {
      const t = canvasTex(1024, 160, (c, cw, ch) => { c.font = '800 110px "Big Shoulders Display", Arial, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 10; c.strokeStyle = "rgba(40,36,30,0.85)"; c.strokeText(anchor.text.toUpperCase(), cw / 2, ch / 2); c.fillStyle = "#c8312b"; c.fillText(anchor.text.toUpperCase(), cw / 2, ch / 2); });
      const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.08, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0 }); night.signs.push(mat);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.86), mat); p.position.set((sf + sRight) / 2, (EAVE + gableEave) / 2, sEnd + 2.52); bld.add(p);
    }
  }

  /* ---- register assets at their recorded positions ---- */
  const dressing = new THREE.Group(); dressing.name = "register"; scene.add(dressing);
  const at = (obj, p, y = 0) => { const [x, z] = planToWorld(p); obj.position.set(x, y, z); dressing.add(obj); return obj; };
  const onWalk = p => walks.some(w => w.polys.some(poly => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside; } return inside; }));
  let seed = 1;
  const skippedTrees = [];
  const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) c = !c; } return c; };
  // 1990s-plan trees that fall on today's striped paving or walks are not drawn (register: "confirm against current aerials").
  const paved = p => { if (worldZones.some(z => z.kind === "landscape" && inPoly(p, z.world))) return null; const z = worldZones.find(z => (z.kind === "parking" || z.kind === "sidewalk") && inPoly(p, z.world)); return z ? z.id : null; };
  for (const i of register.items) {
    if (!i.point && !i.line && !i.polys) continue;
    const y = i.point && onWalk(i.point) ? 0.16 : 0;
    switch (i.cat) {
      case "tree": {
        const w = planToWorld(i.point), zone = paved(w);
        if (zone && zone !== "lot-7") { skippedTrees.push(i.id); break; }
        const t = at(tree(/Arnould R\/W/.test(i.sub || "") ? "street" : "oak", seed++), i.point, 0.15);
        if (zone !== "lot-7" && !/Arnould R\/W/.test(i.sub || "")) t.scale.setScalar(0.72);
        break;
      }
      case "bench": { const b = at(bench(), i.point, y); b.rotation.y = i.point[0] > 1128 ? Math.PI / 2 : 0; break; }
      case "can": at(trashCan(), i.point, y); break;
      case "bollard": { const g = new THREE.Group(); for (const dx of [-0.6, 0.6]) { const b = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 14), shared("bollard", () => std(P.bollard, { roughness: 0.45 })))); b.position.set(dx, 0.55, 0); g.add(b); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shared("bollard", () => std(P.bollard))); cap.position.set(dx, 1.1, 0); g.add(cap); } at(g, i.point); break; }
      case "transformer": { const g = new THREE.Group(); g.add(boxAt(-1.1, 1.1, 0, 0.12, -0.95, 0.95, shared("pad", () => std("#c8c4b8"))), boxAt(-0.9, 0.9, 0.12, 1.45, -0.75, 0.75, shared("xfmr", () => std("#4f7a55", { roughness: 0.55, metalness: 0.2 })))); at(g, i.point); break; }
      case "ground-hp": { const g = new THREE.Group(); g.add(boxAt(-0.55, 0.55, 0, 0.1, -0.55, 0.55, shared("pad", () => std("#c8c4b8"))), boxAt(-0.45, 0.45, 0.1, 0.95, -0.45, 0.45, shared("condenser", () => std("#bfc1bb", { roughness: 0.45, metalness: 0.4 })))); const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 18), shared("fan", () => std("#4b4f4c"))); fan.position.y = 0.97; g.add(fan); at(g, i.point); break; }
      case "meter-cluster": { const g = new THREE.Group(); const n = Math.min(i.count || 4, 8); for (let k = 0; k < n; k++) { const m = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), shared("meterBox", () => std("#2f3a33")))); m.position.set((k - n / 2) * 0.32, 0.06, 0); g.add(m); } at(g, i.point); break; }
      case "shutoff": case "lus-point": { const m = new THREE.Mesh(new THREE.CylinderGeometry(i.cat === "shutoff" ? 0.18 : 0.26, i.cat === "shutoff" ? 0.18 : 0.26, 0.03, 14), shared(i.cat, () => std(i.cat === "shutoff" ? "#3b3e3a" : "#4a5a6a", { roughness: 0.6, metalness: 0.4 }))); m.receiveShadow = true; at(m, i.point, y + 0.015); break; }
      case "pole": { const g = new THREE.Group(); const p = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 11, 8), shared("woodPole", () => std("#6b5843")))); p.position.y = 5.5; g.add(p); g.add(boxAt(-1.1, 1.1, 10.2, 10.35, -0.07, 0.07, shared("woodPole", () => std("#6b5843")))); const can = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10), shared("xfmrCan", () => std("#9ea19b", { metalness: 0.4 })))); can.position.set(0.3, 9.2, 0); g.add(can); at(g, i.point); break; }
      case "lighting": { if (!i.point || (lighting?.suppressRegister ?? []).includes(i.id) || (lighting?.doublePoles ?? []).some(p => p.register === i.id)) break; const p = at(twinHeadPole(), i.point); night.lenses.push(p.userData.lens); break; }
      case "sign": { if (i.id !== "sign-pylon") break; const p = at(pylonFromFace(pylonBase, invalidate), i.point); night.pylon.push(p.userData.face); break; }
      case "fence": {
        if (i.line) { const wood = shared("fence", () => std("#8a6a48", { roughness: 0.9 })); for (let k = 1; k < i.line.length; k++) { const a = planToWorld(i.line[k - 1]), b = planToWorld(i.line[k]); const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const f = cast(new THREE.Mesh(new THREE.BoxGeometry(len, 1.83, 0.08), wood)); f.position.set((a[0] + b[0]) / 2, 0.915, (a[1] + b[1]) / 2); f.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); dressing.add(f); } }
        if (i.polys) for (const poly of i.polys) dressing.add(slabPoly(poly.map(planToWorld), 0, 3, shared("freezer", () => std("#e9ebe7", { roughness: 0.4, metalness: 0.3 }))));
        break;
      }
      default: break;
    }
  }
  // Island planting: hedge edges, and twin-head poles (illustrative placement).
  const shrub = shared("shrub", () => std("#3f6b34", { roughness: 1, flatShading: true }));
  const shrubGeo = new THREE.IcosahedronGeometry(0.55, 0), shrubs = [];
  const poleAt = (x, z, y = 0.15) => { const pole = twinHeadPole(); pole.position.set(x, y, z); dressing.add(pole); night.lenses.push(pole.userData.lens); const light = new THREE.PointLight("#e9efff", 0, 34, 2); light.position.set(x, POLE_HEIGHT + 0.3, z); scene.add(light); night.lights.push(light); return pole; };
  // Double light poles: operator inventory (5 main field + 1 Lot 7), positions from the night aerial.
  for (const p of lighting?.doublePoles ?? []) { const [x, z] = planToWorld(p.point); poleAt(x, z, 0.02).userData.lighting = p; }
  for (const z of worldZones.filter(z => z.kind === "landscape" && !/median/.test(z.id))) {
    const pts = z.world, c = polygonCentroid(pts.map(([x, z2]) => [x, 0, z2]));
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / 1.4);
      for (let j = 0; j < n; j++) { const t = (j + 0.5) / n, px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t, v = [c[0] - px, c[1] - pz], vl = Math.hypot(...v) || 1; shrubs.push([px + v[0] / vl * 0.9, pz + v[1] / vl * 0.9, 0.7 + ((j * 7 + k) % 5) / 10]); }
    }
  }
  const inst = new THREE.InstancedMesh(shrubGeo, shrub, shrubs.length), mtx = new THREE.Matrix4();
  shrubs.forEach(([x, z, s], k) => { mtx.compose(new THREE.Vector3(x, 0.15 + 0.35 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k, 0)), new THREE.Vector3(s, s * 0.8, s)); inst.setMatrixAt(k, mtx); });
  inst.castShadow = true; inst.receiveShadow = true; dressing.add(inst);
  // Wall packs over each rear service door (lit at dusk).
  const pack = shared("wallpack", () => { const m = std("#3a3a37", { emissive: "#ffd9a0", emissiveIntensity: 0 }); night.lenses.push(m); return m; });
  for (const s of suites.filter(s => s.building === "long")) { const cx = (s.corners[0][0] + s.corners[1][0]) / 2; bld.add(boxAt(cx - 0.18, cx + 0.18, 2.6, 2.85, lRear - 0.2, lRear, pack)); }
  // Building-mounted lights over Lot 8 (operator 2026-10-01), on the 135A/B wall that faces the lot.
  for (const wp of lighting?.wallPacks ?? []) {
    const [x, z] = planToWorld(wp.point), east = wp.face === "east";
    bld.add(east ? boxAt(x, x + 0.32, 3.9, 4.25, z - 0.25, z + 0.25, pack) : boxAt(x - 0.25, x + 0.25, 3.9, 4.25, z - 0.32, z, pack));
    const l = new THREE.PointLight("#e9efff", 0, 18, 2); l.position.set(east ? x + 1 : x, 3.8, east ? z : z - 1); scene.add(l); night.lights.push(l);
  }
  // 135A / 135B double doors with standing-seam metal awnings on the Lot 8 wall (operator 2026-10-02).
  for (const dd of lighting?.lot8Doors ?? []) {
    const [x, z] = planToWorld(dd.point);
    bld.add(boxAt(x - 0.95, x + 0.95, 0, 2.25, z - 0.06, z, steelDoor), boxAt(x - 0.02, x + 0.02, 0, 2.25, z - 0.08, z - 0.06, frameMat));
    const seam = shared("awning", () => std("#c7cbcc", { roughness: 0.45, metalness: 0.55 }));
    const aw = cast(new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 1.15), seam)); aw.position.set(x, 2.75, z - 0.55); aw.rotation.x = -0.32; bld.add(aw);
    for (let i = -6; i <= 6; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 1.15), seam); rib.position.set(x + i * 0.2, 2.79, z - 0.55); rib.rotation.x = -0.32; bld.add(rib); }
  }

  // Rear / side service items (site-service-items.json: rear drone photo + satellite).
  for (const it of serviceItems?.items ?? []) {
    const [x, z] = planToWorld(it.point);
    let o;
    if (it.kind === "roof-ladder") { const l = roofLadder((it.heightFt ?? 16.4) * FT, it.railSpacingM ?? 0.5); if (it.face === "east") l.rotation.y = Math.PI / 2; l.position.set(x, 0, z); l.userData.service = it; dressing.add(l); continue; }
    if (it.kind === "enclosure") { // closed bays / the 101 end projection (9/28 end-cap scan)
      const [p0, p1] = it.box.map(planToWorld);
      dressing.add(boxAt(Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0]), 0, it.heightFt * FT, Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1]), shared("endBlock", () => std("#EFE7D6", { roughness: 0.85 }))));
      continue;
    }
    if (it.kind === "billboard") { // the scan's own panel faces, textured from the end-cap capture
      const [a, b] = it.span.map(planToWorld), w = Math.hypot(b[0] - a[0], b[1] - a[1]), h = (it.topFt - it.bottomFt) * FT;
      const n = { west: [-1, 0], north: [0, -1], east: [1, 0], south: [0, 1] }[it.face];
      const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55 });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      panel.position.set((a[0] + b[0]) / 2 + n[0] * 0.06, (it.bottomFt * FT) + h / 2, (a[1] + b[1]) / 2 + n[1] * 0.06);
      panel.rotation.y = Math.atan2(n[0], n[1]); panel.userData.service = it; dressing.add(panel);
      const frame = cast(new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), shared("bbFrame", () => std("#d9d6cf", { roughness: 0.5, metalness: 0.3 }))));
      frame.position.copy(panel.position).addScaledVector(new THREE.Vector3(n[0], 0, n[1]), -0.045); frame.rotation.y = panel.rotation.y; dressing.add(frame);
      new THREE.TextureLoader().load(it.texture, tx => { tx.colorSpace = THREE.SRGBColorSpace; mat.map = tx; mat.needsUpdate = true; invalidate(); });
      continue;
    }
    if (it.kind === "dumpster") o = dumpster(it.color);
    else if (it.kind === "carts") { o = new THREE.Group(); for (const dx of [-0.4, 0.4]) { const c = boxAt(dx - 0.33, dx + 0.33, 0.05, 1.05, -0.36, 0.36, shared("cart-" + it.color, () => std(it.color === "green" ? "#2f6b3e" : "#2d5d9f", { roughness: 0.6 }))); o.add(c); } }
    else if (it.kind === "grease-bin") o = boxAt(-0.5, 0.5, 0, 1.1, -0.45, 0.45, shared("grease", () => std("#6b4a2f", { roughness: 0.6, metalness: 0.3 })));
    else o = boxAt(-0.6, 0.6, 0, 1.5, -0.35, 0.35, shared("cabinet", () => std("#4f6b52", { roughness: 0.55, metalness: 0.3 })));
    const g = new THREE.Group(); g.add(o); g.position.set(x, 0, z); g.userData.service = it; dressing.add(g);
  }
  // Security cameras at their recorded mounts and aims (cameras.json; aim frame-verified 2026-07-16).
  const walkTop = EAVE - 0.25;
  for (const c of cameras?.cameras ?? []) {
    const [x, z] = planToWorld([c.pos.x, c.pos.y]), cam = securityCamera();
    const underCanopy = c.pos.y > 285 && c.pos.y < 320 || c.pos.x > 1128 && c.pos.x < 1160;
    cam.position.set(x, underCanopy ? walkTop : 3.4, z);
    cam.rotation.y = -THREE.MathUtils.degToRad(c.aimDeg); cam.rotation.z = -0.22; cam.userData.camera = c.id;
    dressing.add(cam);
  }

  /* ---- dimension overlay (CAD/plat feet; toggled) ---- */
  const dimGroup = new THREE.Group(); dimGroup.name = "dimensions"; scene.add(dimGroup);
  const dimMat = new THREE.LineBasicMaterial({ color: "#A87E2F", depthTest: false, transparent: true });
  const dimLabels = [];
  const label = (text, pos, cls = "") => { const el = document.createElement("div"); el.className = "st-dim " + cls; el.textContent = text; const o = new CSS2DObject(el); o.position.copy(pos); o.userData.rank = cls === "overall" ? 0 : cls === "height" ? 1 : 2; dimGroup.add(o); dimLabels.push(o); return o; };
  for (const d of dimensionStrings(geometry.demising, suites)) {
    const y = d.kind === "overall" ? 0.25 : 0.2, a = new THREE.Vector3(d.from[0], y, d.from[1]), b = new THREE.Vector3(d.to[0], y, d.to[1]);
    const dir = b.clone().sub(a).normalize(), n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.7);
    const g = new THREE.BufferGeometry().setFromPoints([a, b, a.clone().add(n), a.clone().sub(n), b.clone().add(n), b.clone().sub(n)]);
    g.setIndex([0, 1, 2, 3, 4, 5]); const line = new THREE.LineSegments(g, dimMat); line.renderOrder = 10; dimGroup.add(line);
    label(d.text, a.clone().add(b).multiplyScalar(0.5), d.kind);
  }
  // Survey building heights where they change (heights.json — 2019 ALTA).
  let lastH = null;
  for (const s of suites) {
    if (s.heightFt === lastH && s.unit !== "137") continue; lastH = s.heightFt;
    const xs = s.corners.map(c => c[0]), zs = s.corners.map(c => c[1]);
    label("▲ " + s.heightFt + "'", new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, s.heightFt * FT + 1.4, (Math.min(...zs) + Math.max(...zs)) / 2), "height");
  }

  function setLighting(name) {
    const L = LIGHTING[name] ?? LIGHTING.day;
    renderer.setClearColor(L.bg); renderer.toneMappingExposure = L.exposure;
    scene.background?.dispose?.(); scene.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, L.sky[0]); g.addColorStop(0.62, L.sky[1]); g.addColorStop(1, L.sky[1]); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog(L.fog, 300, 900);
    scene.environmentIntensity = L.env;
    hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
    sun.position.set(...L.sunDir.map(n => n * 300)); sun.target.position.set(0, 0, 0);
    for (const g of night.glass) { g.emissiveIntensity = L.night ? 0.9 : 0.06; g.color.set(L.night ? "#3d3424" : "#3e5058"); }
    for (const m of night.lenses) m.emissiveIntensity = L.night ? 4 : 0;
    for (const m of night.soffit) m.emissiveIntensity = L.night ? 3 : 0;
    for (const m of night.signs) m.emissiveIntensity = L.night ? 0.55 : 0;
    for (const m of night.pylon) m.emissiveIntensity = L.night ? 0.85 : 0; // dusk to dawn
    for (const l of night.lights) l.intensity = L.night ? 70 : 0;
    bloom.strength = L.bloom; bloom.enabled = L.bloom > 0;
    invalidate();
  }

  function render() {
    frame = 0; if (disposed) return; if (controls.update()) invalidate();
    if (bloom.enabled) composer.render(); else renderer.render(scene, camera);
    labels.render(scene, camera);
    if (dimGroup.visible) declutter();
  }
  function declutter() { // hide lower-priority labels that collide on screen
    const shown = [];
    for (const o of [...dimLabels].sort((a, b) => a.userData.rank - b.userData.rank)) {
      o.element.style.visibility = "";
      const r = o.element.getBoundingClientRect();
      if (!r.width || shown.some(q => r.left < q.right + 3 && r.right + 3 > q.left && r.top < q.bottom + 2 && r.bottom + 2 > q.top)) { o.element.style.visibility = "hidden"; continue; }
      shown.push(r);
    }
  }
  function invalidate() { if (!frame && !disposed) frame = requestAnimationFrame(render); }
  controls.addEventListener("change", invalidate);
  let userMoved = false; controls.addEventListener("start", () => { userMoved = true; });
  function resize() {
    const r = container.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); composer.setSize(w, h); labels.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); if (!userMoved) fitView(); invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  setLighting("golden");
  const ready = (document.fonts?.ready ?? Promise.resolve()).then(() => { onReady(); invalidate(); });

  function setDimensions(on) { dimGroup.visible = on; labels.domElement.style.display = on ? "" : "none"; invalidate(); }
  function resetView() { userMoved = false; fitView(); invalidate(); }
  function capture() { if (bloom.enabled) composer.render(); else renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); }
  function dispose() {
    disposed = true; observer.disconnect(); if (frame) cancelAnimationFrame(frame); controls.dispose();
    scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); } });
    MAT_CACHE.clear(); pmrem.dispose(); composer.dispose?.(); renderer.dispose(); renderer.domElement.remove(); labels.domElement.remove();
  }
  return { ready, setLighting, setDimensions, resetView, shot, skippedTrees, capture, dispose, suites, counts: () => ({ suites: suites.length, poleLights: night.lights.length, stallLines: stallLines.length }) };
}
