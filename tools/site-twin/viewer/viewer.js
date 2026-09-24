/* OTB site twin inspector — offline, render-on-demand. Every pickable object's
   userData.assetId is the A-1 site register id. Brass = highlighted category,
   amber = selection (and its children); neither indicates condition. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const stage = $("stage");
const S = { mode: "overview", look: "presentation", sel: null, isolate: false, labels: false, q: "", catState: new Map(), tourIdx: 0 };
let renderer, scene, camera, persp, ortho, controls, model, data, pending = false;
const byId = new Map(), nodeById = new Map(), catRoot = new Map(), meshes = [];
const center = new THREE.Vector3(), size = new THREE.Vector3();
const RECORD_BY_MAT = { "canopy soffit + fascia": "#EDE6D3", asphalt: "#E8EBE0", "TPO roof": "#F6F7F1", "shingle canopy": "#CFC6AE", stripe: "#9AA391", "pending stripe": "#D97706", "concrete walk": "#DCD3BF", "unit wall": "#2F6B4F" };
const HI = new THREE.Color("#a87e2f"), SEL = new THREE.Color("#d97706");

const invalidate = () => { if (pending || !renderer) return; pending = true; requestAnimationFrame(() => { pending = false; renderer.render(scene, camera); placeMarkers(); }); };
const announce = t => { $("announcement").textContent = t; };
const ftm = m => (m / 0.3048).toFixed(1) + " ft";

function family(a) {
  const ids = new Set([a.id]);
  for (const x of data.assets) if (x.parent === a.id) ids.add(x.id);
  return ids;
}

function applyState() {
  const fam = S.sel ? family(byId.get(S.sel)) : new Set();
  for (const [cat, root] of catRoot) {
    const st = S.catState.get(cat);
    root.visible = st !== "off" && (!S.isolate || st === "hi" || cat === "parcel" || [...fam].some(id => byId.get(id)?.category === cat));
  }
  if (S.isolate) for (const [id, node] of nodeById) {
    const st = S.catState.get(byId.get(id).category);
    node.visible = st === "hi" || fam.has(id) || byId.get(id).category === "parcel";
  } else for (const node of nodeById.values()) node.visible = true;
  for (const m of meshes) {
    const a = byId.get(m.assetId), hi = S.catState.get(a.category) === "hi", on = fam.has(a.id);
    for (const mat of m.mats) {
      mat.color.set(S.look === "record" ? (RECORD_BY_MAT[mat.userData.srcName] || m.record || mat.userData.base) : mat.userData.base);
      mat.emissive.copy(on ? SEL : hi ? HI : new THREE.Color(0));
      mat.emissiveIntensity = on ? 0.75 : hi ? 0.45 : 0;
    }
  }
  $("scene-status").textContent = (S.look === "record" ? "Record look" : "Presentation look") + (S.isolate ? " · isolated" : "");
  invalidate();
}

function placeMarkers() {
  const host = $("markers"); host.replaceChildren();
  if (!S.labels && !S.sel) return;
  const rect = stage.getBoundingClientRect(), v = new THREE.Vector3();
  const fam = S.sel ? family(byId.get(S.sel)) : new Set();
  let n = 0;
  for (const a of data.assets) {
    if (!a.positionM || n > 160) continue;
    const hi = S.labels && S.catState.get(a.category) === "hi" && a.category !== "stall";
    if (!hi && !(fam.has(a.id) && (a.id === S.sel || a.category !== "stall"))) continue;
    const node = nodeById.get(a.id); if (node && !visible(node)) continue;
    v.fromArray(a.positionM); v.y += 0.6; v.project(camera);
    if (v.z < -1 || v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.96) continue;
    const el = document.createElement("span");
    el.className = "mk" + (a.id === S.sel ? " sel" : "");
    el.textContent = a.category === "column" ? a.label.replace("Column ", "C") : a.label.split(" — ")[0].slice(0, 34);
    el.style.left = (v.x * 0.5 + 0.5) * rect.width + "px"; el.style.top = (-v.y * 0.5 + 0.5) * rect.height + "px";
    host.append(el); n++;
  }
}
const visible = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };

function renderCats() {
  const groups = [...new Set(data.categories.map(c => c.group))];
  $("cats").innerHTML = groups.map(g => `<div class="cat-group"><b>${esc(g)}</b>` + data.categories.filter(c => c.group === g).map(c => {
    const n = c.modeled + c.dataOnly;
    if (c.placeholder) return `<button class="cat ph" title="${esc(c.note)}" aria-disabled="true">${esc(c.label)}<span class="n">${n}</span></button>`;
    if (!c.modeled) return `<button class="cat data" data-list="${c.id}" title="${esc(c.note || "listed as data")}">${esc(c.label)}<span class="n">${n}</span></button>`;
    return `<button class="cat" data-cat="${c.id}" data-state="${S.catState.get(c.id)}" aria-label="${esc(c.label)}: ${S.catState.get(c.id)}">${esc(c.label)}<span class="n">${n}</span></button>`;
  }).join("") + `</div>`).join("");
}

function renderSel() {
  const a = S.sel && byId.get(S.sel);
  $("clear").hidden = !a;
  $("sel-title").textContent = a ? a.label : "Select an asset";
  if (!a) { $("sel-body").innerHTML = `<p class="muted">Click an object in the model or pick one below.</p>`; return; }
  const cat = data.categories.find(c => c.id === a.category);
  const parent = a.parent && byId.get(a.parent);
  const kids = data.assets.filter(x => x.parent === a.id).length;
  $("sel-body").innerHTML = (a.sub ? `<p class="muted">${esc(a.sub)}</p>` : "") + `<dl>` +
    `<dt>Asset ID</dt><dd><code>${esc(a.id)}</code></dd><dt>Category</dt><dd>${esc(cat?.label || a.category)}</dd>` +
    `<dt>Verification</dt><dd>${esc(a.status)}${a.dataOnly ? " · listed as data" + (a.located ? " (" + esc(a.located) + ")" : "") + (a.unlocated ? " · not located" : "") : ""}</dd>` +
    (a.count != null ? `<dt>Count</dt><dd>${a.count}</dd>` : "") + (a.unit ? `<dt>Suite</dt><dd>${esc(a.unit)}</dd>` : "") +
    (kids ? `<dt>Members</dt><dd>${kids}</dd>` : "") +
    (a.codexAssetId ? `<dt>Column twin</dt><dd><code>${esc(a.codexAssetId)}</code> (${esc(a.codexLabel)})</dd>` : "") +
    (parent ? `<dt>Parent</dt><dd><button class="text-button" data-pick="${esc(parent.id)}">${esc(parent.label)}</button></dd>` : "") +
    (a.positionM ? `<dt>Model position</dt><dd><code>${a.positionM.map(v => v.toFixed(1)).join(", ")} m</code></dd>` : "") +
    `<dt>Source</dt><dd>${esc(a.source)}</dd></dl>` +
    (a.positionM ? `<button id="focus">Focus on this asset</button>` : "");
  const f = $("focus"); if (f) f.onclick = () => focus(a);
}

function renderList() {
  const q = S.q.trim().toLowerCase(), a = S.sel && byId.get(S.sel);
  const fam = a ? family(a) : new Set();
  let rows = q ? data.assets.filter(x => (x.label + " " + x.id + " " + (x.sub || "") + " " + x.category + " " + x.status + " " + (x.unit || "")).toLowerCase().includes(q))
    : data.assets.filter(x => (S.catState.get(x.category) === "hi" && x.category !== "stall") || fam.has(x.id) || (a?.category === "unit" && x.unit === a.unit && x.dataOnly));
  $("list").innerHTML = rows.slice(0, 600).map(x => `<button class="row${x.id === S.sel ? " on" : ""}${x.parent || (a?.category === "unit" && x.dataOnly) ? " child" : ""}" data-pick="${esc(x.id)}"><span>${esc(x.label)}</span><span class="m">${esc(x.dataOnly ? "data · " + x.status : x.status)}</span></button>`).join("") ||
    `<p class="muted">${q ? "No matching assets." : "Highlight a category (click it twice) or search to list assets."}</p>`;
}

function select(id, doFocus = false) {
  S.sel = id && byId.has(id) ? id : null;
  const a = S.sel && byId.get(S.sel);
  if (a) announce(`${a.label} selected. ${a.status}.`);
  applyState(); renderSel(); renderList();
  if (doFocus && a?.positionM) focus(a);
}

function focus(a) {
  const node = nodeById.get(a.id), box = new THREE.Box3();
  if (node) box.setFromObject(node); else box.setFromCenterAndSize(new THREE.Vector3().fromArray(a.positionM), new THREE.Vector3(4, 4, 4));
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(6, box.getSize(new THREE.Vector3()).length());
  if (S.mode === "plan") { controls.target.set(c.x, 0, c.z); camera.position.set(c.x, 300, c.z); camera.zoom = Math.min(20, Math.max(1.5, size.x / r / 1.5)); camera.updateProjectionMatrix(); }
  else { if (S.mode === "eye") setMode("overview"); controls.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(r * 0.9, r * 0.8, r * 0.9)); }
  controls.update(); invalidate();
}

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height); persp.aspect = width / height; persp.updateProjectionMatrix();
  const span = Math.max(size.z * 1.1, (size.x * 1.1) / (width / height));
  Object.assign(ortho, { top: span / 2, bottom: -span / 2, left: (-span * width) / height / 2, right: (span * width) / height / 2 }); ortho.updateProjectionMatrix();
  invalidate();
}

function setMode(mode) {
  S.mode = mode;
  for (const id of ["overview", "plan", "eye"]) { $(id).classList.toggle("active", id === mode); $(id).setAttribute("aria-pressed", String(id === mode)); }
  $("tour").hidden = mode !== "eye";
  $("navigation-help").textContent = mode === "eye" ? "Drag to look · WASD to move · ← → step between columns" : mode === "plan" ? "Drag to pan · Scroll to zoom · Click to inspect" : "Drag to orbit · Scroll to zoom · Right-drag to pan · Click to inspect";
  camera = mode === "plan" ? ortho : persp;
  controls.object = camera; controls.enabled = mode !== "eye"; controls.enableRotate = mode === "overview";
  controls.mouseButtons.LEFT = mode === "plan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  persp.fov = mode === "eye" ? 70 : 42; persp.updateProjectionMatrix();
  if (mode === "overview") {
    persp.up.set(0, 1, 0); controls.target.copy(center).setY(0);
    persp.position.set(center.x - size.x * 0.12, size.x * 0.55, center.z + size.x * 0.95); controls.update();
  } else if (mode === "plan") {
    ortho.up.set(0, 0, -1); ortho.position.set(center.x, 300, center.z); ortho.zoom = 1; ortho.updateProjectionMatrix();
    controls.target.set(center.x, 0, center.z); controls.update();
  } else tourTo(S.tourIdx);
  invalidate();
}

function tourTo(i) {
  const t = data.walkTour; S.tourIdx = (i + t.length) % t.length; const w = t[S.tourIdx];
  persp.up.set(0, 1, 0); persp.position.fromArray(w.eye); controls.target.fromArray(w.target); persp.lookAt(controls.target);
  $("tour-label").textContent = `${byId.get(w.id).label} · ${S.tourIdx + 1} of ${t.length}`;
  select(w.id); invalidate();
}

async function start() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor("#dfe4da");
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("aria-label", "3D site model. Use the site register panel for keyboard selection.");
  $("canvas-host").append(renderer.domElement);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#a39d90", 2.4));
  const sun = new THREE.DirectionalLight("#fff6e6", 2.8); sun.position.set(-80, 140, 60); scene.add(sun);
  const fill = new THREE.DirectionalLight("#e6f0ff", 0.9); fill.position.set(90, 50, -80); scene.add(fill);
  persp = new THREE.PerspectiveCamera(42, 1, 0.05, 3000); ortho = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.05, 2000); camera = persp;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.49; controls.maxDistance = 900; controls.addEventListener("change", invalidate);

  const [d, gltf] = await Promise.all([fetch("twin-data.json").then(r => { if (!r.ok) throw new Error("twin-data.json could not be loaded."); return r.json(); }), new GLTFLoader().loadAsync("model.glb")]);
  data = d; model = gltf.scene; scene.add(model);
  for (const a of data.assets) byId.set(a.id, a);
  for (const c of data.categories) S.catState.set(c.id, c.visible ? "on" : "off");
  const recordOf = Object.fromEntries(data.categories.map(c => [c.id, c.record]));
  model.traverse(o => {
    if (o.userData?.category && !o.userData.assetId && data.categories.some(c => c.id === o.userData.category)) catRoot.set(o.userData.category, o);
    if (o.userData?.assetId) nodeById.set(o.userData.assetId, o);
    if (o.isMesh) {
      let n = o; while (n && !n.userData?.assetId) n = n.parent;
      if (!n) return;
      o.material = o.material.clone(); o.material.userData.base = "#" + o.material.color.getHexString(THREE.SRGBColorSpace);
      o.material.userData.srcName = o.material.name; o.material.emissive = new THREE.Color(0);
      const entry = meshes.find(m => m.assetId === n.userData.assetId);
      if (entry) entry.mats.push(o.material); else meshes.push({ assetId: n.userData.assetId, record: recordOf[n.userData.category], mats: [o.material] });
    }
  });
  new THREE.Box3().setFromObject(model).getCenter(center); new THREE.Box3().setFromObject(model).getSize(size);
  const grid = new THREE.GridHelper(Math.ceil(size.x * 1.4), 40, "#c3cbb9", "#d6dccd"); grid.position.set(center.x, -0.05, center.z); scene.add(grid);

  const drawn = data.assets.filter(a => !a.dataOnly).length;
  $("asset-count").textContent = `${data.assets.length} assets · ${drawn} modeled`;
  $("model-summary").textContent = `Cypress Command Platform · OTB site twin · ${ftm(size.x)} × ${ftm(size.z)}`;
  $("basis").innerHTML = `<p>Built from the A-1 site register (${esc(data.generatedFrom.geometryRev)}): plat and CAD geometry plus digitized operator sheets. Positions are not surveyed or field verified.</p>` +
    `<p>Building heights are CAD parapet associations, not ceiling heights. Canopy (eave ${data.decisions.D1.canopyEaveFt}′ / top ${data.decisions.D1.canopyTopFt}′) and one rooftop unit per suite are <b>presentation</b> values. Utility mains are drawn at −1.2 m: depth unverified.</p>` +
    `<p>Per-suite records (panels, electric meters, time clocks) and unlocated rows are listed as data, not drawn. Placeholder categories have no source on file. Model is on plat axes; true-north rotation ${data.northRotationRad} rad is recorded, not applied.</p>`;
  renderCats(); applyState(); renderSel(); renderList(); resize(); setMode("overview");
  $("loading").hidden = true; stage.setAttribute("aria-busy", "false"); stage.dataset.loaded = "true";
  new ResizeObserver(resize).observe(stage);

  $("cats").addEventListener("click", e => {
    const b = e.target.closest("[data-cat]"), l = e.target.closest("[data-list]");
    if (l) { $("search").value = S.q = l.dataset.list; renderList(); return; }
    if (!b) return;
    const next = { off: "on", on: "hi", hi: "off" }[S.catState.get(b.dataset.cat)];
    S.catState.set(b.dataset.cat, next); renderCats(); applyState(); renderList();
  });
  document.body.addEventListener("click", e => { const p = e.target.closest("[data-pick]"); if (p) select(p.dataset.pick, true); });
  $("isolate").addEventListener("change", e => { S.isolate = e.target.checked; applyState(); });
  $("labels").addEventListener("change", e => { S.labels = e.target.checked; invalidate(); });
  $("search").addEventListener("input", e => { S.q = e.target.value; renderList(); });
  $("clear").addEventListener("click", () => select(null));
  $("reset").addEventListener("click", () => { select(null); setMode("overview"); });
  for (const m of ["overview", "plan", "eye"]) $(m).addEventListener("click", () => setMode(m));
  for (const lk of ["presentation", "record"]) $("look-" + lk).addEventListener("click", () => {
    S.look = lk; for (const x of ["presentation", "record"]) { $("look-" + x).classList.toggle("active", x === lk); $("look-" + x).setAttribute("aria-pressed", String(x === lk)); }
    applyState();
  });
  $("previous").addEventListener("click", () => tourTo(S.tourIdx - 1)); $("next").addEventListener("click", () => tourTo(S.tourIdx + 1));

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let press = null;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e => { press = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false }; cv.focus({ preventScroll: true }); if (S.mode === "eye") cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!press) return; if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.moved = true;
    if (S.mode === "eye") {
      const dir = new THREE.Vector3().subVectors(controls.target, camera.position), sp = new THREE.Spherical().setFromVector3(dir);
      sp.theta -= (e.clientX - press.lx) * 0.004; sp.phi = Math.max(0.25, Math.min(Math.PI - 0.25, sp.phi + (e.clientY - press.ly) * 0.004));
      controls.target.copy(camera.position).add(new THREE.Vector3().setFromSpherical(sp)); camera.lookAt(controls.target); invalidate();
    }
    press.lx = e.clientX; press.ly = e.clientY;
  });
  cv.addEventListener("pointerup", e => {
    if (press && !press.moved && e.button === 0) {
      const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObject(model, true).find(h => h.object.isMesh && visible(h.object));
      let n = hit?.object; while (n && !n.userData?.assetId) n = n.parent;
      if (n) select(n.userData.assetId);
    }
    press = null;
  });
  cv.addEventListener("keydown", e => {
    if (e.key === "Escape") { select(null); return; }
    if (S.mode !== "eye") return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); tourTo(S.tourIdx + (e.key === "ArrowLeft" ? -1 : 1)); return; }
    const k = e.key.toLowerCase(); if (!["w", "a", "s", "d"].includes(k)) return; e.preventDefault();
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const dv = (k === "w" || k === "s" ? fwd : right).multiplyScalar((k === "s" || k === "a" ? -1 : 1) * (e.shiftKey ? 1.5 : 0.45));
    camera.position.add(dv); controls.target.add(dv); camera.lookAt(controls.target); invalidate();
  });
  announce(`Site twin ready. ${data.assets.length} register assets, ${drawn} modeled.`);
}

start().catch(err => {
  console.error(err); stage.setAttribute("aria-busy", "false");
  $("loading").innerHTML = `<strong>The model could not open</strong><p>${location.protocol === "file:" ? "Run Start Viewer.cmd in this folder, then open the address it prints." : esc(err.message) + " Enable WebGL and reload."}</p>`;
});
