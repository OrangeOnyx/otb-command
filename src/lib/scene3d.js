/* Lens B — Three.js 3D twin of the center. createScene(container, units, opts)
   builds meshes from the pure layout, adds lights/camera/OrbitControls, raycast
   picking (-> opts.onPick(unit)), selection highlight, theme-aware background,
   and returns { dispose, resize, setSelected, setTheme }.

   units: [{ unit, x, y, w, h, heightFt, color }]  (color = resolved status hex).
   The box source is intentionally isolated here so a captured mesh (P6d) can
   replace buildBoxes() without touching callers. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { layout3d } from "./scene3d-layout.js";

const BG = { light: 0xEDEFE8, dark: 0x12151A };
const GROUND = { light: 0xE5E8DD, dark: 0x0E1116 };

export function createScene(container, units, opts = {}) {
  const onPick = opts.onPick || (() => {});
  const rects = units.map(u => ({ unit: u.unit, x: u.x, y: u.y, w: u.w, h: u.h }));
  const heightFt = r => (units.find(u => u.unit === r.unit)?.heightFt) || 16.4;
  const colorOf = unit => units.find(u => u.unit === unit)?.color || "#5F6E64";
  const { boxes, span } = layout3d(rects, heightFt);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(span * 0.8, span * 0.9, span * 0.9);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9088, 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(span, span * 1.5, span * 0.6);
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 3, span * 3),
    new THREE.MeshStandardMaterial({ color: GROUND.light, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // one mesh per unit (the swappable box source)
  const meshes = new Map();
  const buildBoxes = () => {
    boxes.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const base = new THREE.Color(colorOf(b.unit));
      const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.85, metalness: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.userData.unit = b.unit;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x1C2B26, transparent: true, opacity: 0.35 }));
      mesh.add(edges);
      scene.add(mesh);
      meshes.set(b.unit, mesh);
    });
  };
  buildBoxes();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.05; // don't drop below the ground
  controls.update();

  // picking
  const raycaster = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downXY = null;
  renderer.domElement.addEventListener("pointerdown", e => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 5) return; // drag, not click
    const rect = renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ptr, camera);
    const hit = raycaster.intersectObjects([...meshes.values()], false)[0];
    if (hit) onPick(hit.object.userData.unit);
  });

  function setSelected(unit) {
    meshes.forEach((mesh, u) => {
      const on = u === unit;
      mesh.material.emissive.set(on ? 0xA87E2F : 0x000000);
      mesh.material.emissiveIntensity = on ? 0.5 : 0;
    });
  }

  function setTheme(dark) {
    scene.background = new THREE.Color(dark ? BG.dark : BG.light);
    ground.material.color = new THREE.Color(dark ? GROUND.dark : GROUND.light);
  }
  setTheme(opts.dark || false);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight || Math.round(w * 0.6);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0, alive = true;
  (function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    meshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); m.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); }); });
    ground.geometry.dispose(); ground.material.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { dispose, resize, setSelected, setTheme };
}
