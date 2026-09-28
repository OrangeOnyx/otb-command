/* Lens E — Google Photorealistic 3D Tiles, streamed live (Map Tiles API), with the suites draped on top.
   Lazy-loaded by the A-2 view. Nothing is cached or exported: Google's terms allow runtime streaming only,
   and the data attributions + Google credit stay on screen while the lens is open.

   Key: VITE_GOOGLE_MAP_TILES_KEY — a BROWSER key, restricted in Google Cloud to the Map Tiles API and to the
   deployment's HTTP referrers. It is necessarily visible to the browser; it is NOT the server key in
   ~/.otb-gmaps.env. Absent key → the pane explains how to enable the lens instead of loading anything.

   Frame: ReorientationPlugin puts the main field at the origin with +Y up, +Z north, +X west, so an
   east/north/up offset (e, n, u) in metres lands at (−e, u, n). Suites come from footprints-geo.json (the
   same georef as the satellite lens and the Google Earth export, ~2 m) extruded to heights.json; the overlay
   is dropped onto Google's ground by raycasting the field once tiles arrive. CSP: connect-src needs
   https://tile.googleapis.com; the Draco decoder is self-hosted under /draco/. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { TilesRenderer } from "3d-tiles-renderer";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/core/plugins";
import { ReorientationPlugin, GLTFExtensionsPlugin, TileCompressionPlugin, TilesFadePlugin, UpdateOnChangePlugin } from "3d-tiles-renderer/plugins";
import fp from "../data/footprints-geo.json";
import heights from "../data/heights.json";
import { planToLL, planBearing } from "./geoproject.js";

const FT = 0.3048, LAT_M = 111320, DEG = Math.PI / 180;
const GROUND_GUESS = -16.5; // m above the WGS84 ellipsoid: ~10 m NAVD88 ground minus the ~26.5 m geoid here

function chipTexture(label, color) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 112;
  const x = c.getContext("2d");
  x.fillStyle = color; x.beginPath(); x.roundRect(8, 8, 240, 96, 40); x.fill();
  x.font = "700 58px 'IBM Plex Mono', monospace";
  const w = x.measureText(label).width;
  if (w > 208) x.font = "700 " + Math.floor(58 * 208 / w) + "px 'IBM Plex Mono', monospace";
  x.fillStyle = "#FCFCF9"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(label, 128, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function notice(container, html) {
  const p = document.createElement("div");
  p.className = "gtiles-notice";
  p.innerHTML = html;
  container.appendChild(p);
  return { resize() {}, setSelected() {}, dispose() { p.remove(); } };
}

export function createGoogleTilesScene(container, units = [], opts = {}) {
  const key = import.meta.env.VITE_GOOGLE_MAP_TILES_KEY;
  if (!key) return notice(container,
    "<b>Google 3D is not enabled on this deployment.</b><br>Set <code>VITE_GOOGLE_MAP_TILES_KEY</code> to a browser key " +
    "restricted to the Map Tiles API and this site's address, then redeploy.");
  const onPick = opts.onPick || (() => {});
  const colorOf = u => units.find(x => x.unit === u)?.color || "#5F6E64";

  /* origin = main field centre (flat asphalt — the ground probe lands on pavement) */
  const [lng0, lat0] = planToLL(fp.georef, 900, 560);
  const kx = LAT_M * Math.cos(lat0 * DEG);
  const toWorld = ([lng, lat], up = 0) => new THREE.Vector3(-(lng - lng0) * kx, up, (lat - lat0) * LAT_M);

  /* renderer + camera */
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xDCE3E8);
  container.style.position = "relative";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88907f, 2.2));
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
  // open looking the way the A-1 plan reads (Marie Antoinette at the top of the screen)
  const look = planBearing(fp.georef) * DEG;
  camera.position.set(-(-Math.sin(look) * 260), 210, -Math.cos(look) * 260);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.minDistance = 25; controls.maxDistance = 2500;
  controls.maxPolarAngle = 86 * DEG;
  controls.screenSpacePanning = false;

  /* Google tiles */
  const tiles = new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: key, autoRefreshToken: true }));
  tiles.registerPlugin(new ReorientationPlugin({ lat: lat0 * DEG, lon: lng0 * DEG, height: GROUND_GUESS, recenter: true }));
  const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + "draco/");
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());
  tiles.registerPlugin(new UpdateOnChangePlugin());
  tiles.errorTarget = 12;
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  scene.add(tiles.group);

  /* suites overlay: translucent status-coloured prisms + edges + number chips */
  const overlay = new THREE.Group();
  scene.add(overlay);
  const meshes = new Map(), edges = new Map(), chips = new Map();
  for (const f of fp.features) {
    const unit = f.properties.unit, ring = f.geometry.coordinates[0].slice(0, -1);
    const h = (heights[unit] ?? 16.4) * FT + 0.6; // a hair above the parapet so it reads over the roof
    const shape = new THREE.Shape(ring.map(p => { const v = toWorld(p); return new THREE.Vector2(v.x, -v.z); }));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // shape (x, −z) extruded along +Z  →  (x, height, z)
    const color = colorOf(unit);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }));
    mesh.userData.unit = unit;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    mesh.add(edge);
    overlay.add(mesh); meshes.set(unit, mesh); edges.set(unit, edge);
    const c = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
    const chip = new THREE.Sprite(new THREE.SpriteMaterial({ map: chipTexture(unit, color), transparent: true, depthTest: false }));
    chip.position.set((c.min.x + c.max.x) / 2, h + 4, (c.min.z + c.max.z) / 2);
    chip.scale.set(8, 3.5, 1); chip.renderOrder = 3;
    overlay.add(chip); chips.set(unit, chip);
  }

  let showUnits = true, selectedUnit = null;
  const unitsBtn = document.createElement("button");
  unitsBtn.type = "button"; unitsBtn.className = "mesh-toggle";
  const apply = () => {
    meshes.forEach((m, u) => {
      const sel = u === selectedUnit;
      m.material.opacity = showUnits ? (sel ? 0.5 : 0.28) : (sel ? 0.35 : 0);
      edges.get(u).material.color.set(sel ? "#A87E2F" : colorOf(u));
      edges.get(u).visible = showUnits || sel;
      chips.get(u).visible = showUnits || sel;
    });
    unitsBtn.textContent = showUnits ? "▦ Units on" : "▦ Units off";
  };
  unitsBtn.onclick = () => { showUnits = !showUnits; apply(); };
  container.appendChild(unitsBtn);
  apply();

  /* Google credit + live data attributions (required on screen) */
  const credit = document.createElement("div");
  credit.className = "gtiles-credit";
  container.appendChild(credit);
  let lastCredit = "";
  const refreshCredit = () => {
    const text = tiles.getAttributions().filter(a => a.type === "string").map(a => a.value).join(" ");
    const html = `<b class="gtiles-google">Google</b> ${text ? "· " + text.replace(/</g, "&lt;") : ""}`;
    if (html !== lastCredit) { credit.innerHTML = html; lastCredit = html; }
  };

  /* seat the overlay on Google's ground: min of a few pavement probes in the field */
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const probes = [[900, 560], [760, 470], [1040, 470], [760, 620], [1040, 620]].map(p => toWorld(planToLL(fp.georef, ...p)));
  let seated = false;
  const seat = () => {
    const ys = [];
    for (const p of probes) {
      ray.set(new THREE.Vector3(p.x, 400, p.z), down);
      const hit = ray.intersectObject(tiles.group, true)[0];
      if (hit) ys.push(hit.point.y);
    }
    if (ys.length >= 3) { overlay.position.y = Math.min(...ys); seated = true; }
  };

  /* resize + loop */
  const resize = () => {
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    tiles.setResolutionFromRenderer(camera, renderer);
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let frame = 0;
  renderer.setAnimationLoop(() => {
    controls.update();
    camera.updateMatrixWorld();
    tiles.update();
    if (!seated && ++frame % 20 === 0) seat();
    if (frame % 30 === 0) refreshCredit();
    renderer.render(scene, camera);
  });
  tiles.addEventListener("load-error", e => console.warn("google 3d tiles:", e?.error?.message || e));

  /* picking — click, not drag */
  const ptr = new THREE.Vector2();
  let downXY = null;
  const onDown = e => { downXY = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([...meshes.values()], false)[0];
    if (hit) onPick(hit.object.userData.unit);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  return {
    resize,
    setSelected(unit) { selectedUnit = unit; apply(); },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      tiles.dispose();
      draco.dispose();
      meshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
      edges.forEach(l => { l.geometry.dispose(); l.material.dispose(); });
      chips.forEach(s => { s.material.map?.dispose(); s.material.dispose(); });
      renderer.dispose();
      renderer.domElement.remove(); unitsBtn.remove(); credit.remove();
    },
  };
}
