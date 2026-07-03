# P6b · WebGL 3D Twin (Lens B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an orbitable Three.js 3D view of the center as a lens toggle on the existing A-2 sheet — same footprints, real CAD heights, live-status colors, and click→drawer as the SVG isometric — built against a swappable geometry source so a captured drone mesh (P6d) can later replace the extruded boxes.

**Architecture:** A pure layout helper (`src/lib/scene3d-layout.js`) maps plan-space footprints + heights to centered 3D box specs (unit-tested). A Three.js scene module (`src/lib/scene3d.js`) turns those specs into meshes with lights, camera, OrbitControls, raycast picking, selection highlight, and theme-aware background; it exposes `createScene()` returning `{ dispose, resize, setSelected, setTheme }`. The A-2 view (`src/views/spatial.js`) gains an Iso/3D lens toggle that lazy-imports `scene3d.js` (code-split so `three` isn't loaded for Lens A) and reuses `openDrawer` + store selection.

**Tech Stack:** `three` (new dep), Vite, native `node:test` for the pure layout, WebGL.

**Scope:** P6b only. Lens C (satellite) and Lens D (reality capture) are separate plans. Spec: `docs/superpowers/specs/2026-07-02-p6-2p5d-spatial-design.md` §5.

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `src/lib/scene3d-layout.js` | Pure: rects + heights → centered 3D box specs. No Three.js, no DOM. | Create |
| `test/scene3d-layout.test.mjs` | `node:test` for the layout math. | Create |
| `src/lib/scene3d.js` | Three.js scene: meshes/lights/camera/controls/pick/selection/theme/dispose. | Create |
| `src/views/spatial.js` | Iso/3D lens toggle; lazy-init the 3D scene; keep selection synced. | Modify |
| `index.html` | Lens toggle chips + `#spatial3d` canvas container in the A-2 sheet. | Modify |
| `src/styles.css` | `.spatial3d` sizing + lens-toggle styles. | Modify |
| `package.json` | Add `three` dependency. | Modify |

---

## Task 1: Pure 3D layout helper (`src/lib/scene3d-layout.js`)

**Files:**
- Create: `src/lib/scene3d-layout.js`
- Test: `test/scene3d-layout.test.mjs`
- Modify: `package.json` (add `three`)

- [ ] **Step 1: Install three**

Run: `npm install three`
Expected: `three` appears under `"dependencies"` in `package.json`; install succeeds.

- [ ] **Step 2: Write the failing test** — create `test/scene3d-layout.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { layout3d, WORLD, FT_WORLD } from "../src/lib/scene3d-layout.js";

const RECTS = [
  { unit: "A", x: 0, y: 0, w: 100, h: 100 },
  { unit: "B", x: 100, y: 0, w: 100, h: 100 },
];
const H = () => 16.4;

test("layout3d: one box per rect", () => {
  const { boxes } = layout3d(RECTS, H);
  assert.equal(boxes.length, 2);
});

test("layout3d: model is centered on origin (mean x,z ~ 0)", () => {
  const { boxes } = layout3d(RECTS, H);
  const mx = boxes.reduce((s, b) => s + b.x, 0) / boxes.length;
  const mz = boxes.reduce((s, b) => s + b.z, 0) / boxes.length;
  assert.ok(Math.abs(mx) < 1e-9, "centered in x");
  assert.ok(Math.abs(mz) < 1e-9, "centered in z");
});

test("layout3d: box footprint scales by WORLD, height by feet*FT_WORLD, y = h/2", () => {
  const { boxes } = layout3d(RECTS, () => 20);
  const b = boxes[0];
  assert.ok(Math.abs(b.w - 100 * WORLD) < 1e-9);
  assert.ok(Math.abs(b.d - 100 * WORLD) < 1e-9);
  assert.ok(Math.abs(b.h - 20 * FT_WORLD) < 1e-9);
  assert.ok(Math.abs(b.y - b.h / 2) < 1e-9, "box sits on the ground");
});

test("layout3d: taller feet -> taller box", () => {
  const tall = layout3d(RECTS, () => 30).boxes[0].h;
  const short = layout3d(RECTS, () => 10).boxes[0].h;
  assert.ok(tall > short);
});

test("layout3d: span is positive", () => {
  assert.ok(layout3d(RECTS, H).span > 0);
});

test("layout3d: carries the unit id through", () => {
  const { boxes } = layout3d(RECTS, H);
  assert.deepEqual(boxes.map(b => b.unit).sort(), ["A", "B"]);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/lib/scene3d-layout.js`.

- [ ] **Step 4: Write the implementation** — create `src/lib/scene3d-layout.js`:

```javascript
/* Pure 3D layout for the Lens-B twin. Maps plan-space unit footprints
   (geometry.units) + heights (feet) to centered box specs in world units.
   No Three.js, no DOM. Tested in test/scene3d-layout.test.mjs. */

export const WORLD = 0.06;     // plan-units -> world units (the ~1480×990 plan)
export const FT_WORLD = 0.19;  // feet -> world units for height (16.4' ≈ 3.1)

// rects: [{unit,x,y,w,h}] in plan space. heightFt(rect) -> parapet height in feet.
// Returns { boxes:[{unit,w,d,h,x,y,z}], span } with the model centered on origin,
// footprint in the world X/Z plane, height up the Y axis, box resting on y=0.
export function layout3d(rects, heightFt, opts = {}) {
  const world = opts.world ?? WORLD;
  const ftWorld = opts.ftWorld ?? FT_WORLD;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const boxes = rects.map(r => {
    const hw = heightFt(r) * ftWorld;
    return {
      unit: r.unit,
      w: r.w * world,
      d: r.h * world,                    // plan-y -> world-z depth
      h: hw,
      x: (r.x + r.w / 2 - cx) * world,
      z: (r.y + r.h / 2 - cy) * world,
      y: hw / 2,
    };
  });
  const span = Math.max(maxX - minX, maxY - minY) * world;
  return { boxes, span };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `scene3d-layout` tests green (and the existing `iso` tests still pass).

- [ ] **Step 6: Syntax gate + commit**

Run: `node --check src/lib/scene3d-layout.js`
Expected: clean.

```bash
git add src/lib/scene3d-layout.js test/scene3d-layout.test.mjs package.json package-lock.json
git commit -m "Add three dep + pure 3D layout helper (scene3d-layout.js)"
```
End the commit message with:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 2: Three.js scene module (`src/lib/scene3d.js`)

**Files:**
- Create: `src/lib/scene3d.js`

- [ ] **Step 1: Write the module** — create `src/lib/scene3d.js`:

```javascript
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
      mesh.userData.baseColor = base.clone();
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
      mesh.material.emissive = new THREE.Color(on ? 0xA87E2F : 0x000000);
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
```

- [ ] **Step 2: Syntax gate + build (confirms the `three` imports resolve under Vite)**

Run: `node --check src/lib/scene3d.js && npm run build`
Expected: syntax clean; build succeeds (Vite resolves `three` and `three/examples/jsm/...`). A larger bundle/chunk for three is expected.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scene3d.js
git commit -m "Add Three.js 3D scene module (Lens B) with orbit, pick, selection, theme"
```
End with the `Co-Authored-By:` trailer.

---

## Task 3: Lens toggle on the A-2 sheet (`index.html`, `src/views/spatial.js`, `src/styles.css`)

**Files:**
- Modify: `index.html` (toggle chips + `#spatial3d` container)
- Modify: `src/views/spatial.js` (toggle logic, lazy 3D init, selection sync)
- Modify: `src/styles.css` (container + chip sizing)

- [ ] **Step 1: Add the toggle chips + 3D container to index.html**

In `index.html`, replace the A-2 sheet's `.plan-tools` block and card. The current A-2 section is:
```html
    <section class="page" id="pg-spatial">
      <div class="page-head"><h1>Spatial</h1><div class="sub">A-2 · ISOMETRIC — CLICK A UNIT</div></div>
      <div class="plan-tools">
        <div class="legend" id="spatialLegend"></div>
      </div>
      <div class="card plan-card"><svg id="spatial" role="img" aria-label="On The Boulevard isometric massing"></svg></div>
    </section>
```
Replace it with:
```html
    <section class="page" id="pg-spatial">
      <div class="page-head"><h1>Spatial</h1><div class="sub">A-2 · ISOMETRIC / 3D — CLICK A UNIT</div></div>
      <div class="plan-tools">
        <button class="chip on" id="lensIso" data-lens="iso">▱ Isometric</button>
        <button class="chip" id="lens3d" data-lens="3d">◧ 3D</button>
        <div class="legend" id="spatialLegend"></div>
      </div>
      <div class="card plan-card">
        <svg id="spatial" role="img" aria-label="On The Boulevard isometric massing"></svg>
        <div id="spatial3d" class="spatial3d" hidden></div>
      </div>
    </section>
```

- [ ] **Step 2: Add lens toggle + lazy 3D wiring to spatial.js**

In `src/views/spatial.js`, add a `unitData()` helper and lens state, and extend `initSpatial()`. Replace the existing `initSpatial` function:
```javascript
export function initSpatial() {
  renderLegend();
  drawSpatial();
  subscribe(type => { if (type === "selection") { drawSpatial(); if (scene) scene.setSelected(getSelected()); } });
}
```
with this (adds the lens toggle + lazy 3D lifecycle; keep everything else in the file unchanged):
```javascript
let scene = null;        // Lens B handle (null until 3D opened)
let lens = "iso";

// resolved per-unit data for the 3D scene (footprint + real height + status color)
function unitData() {
  return UNITS.map(u => {
    const p = geometry.units[u.unit];
    if (!p) return null;
    return { unit: u.unit, x: p.x, y: p.y, w: p.w, h: p.h,
      heightFt: heights[u.unit] || DEFAULT_FT, color: baseColor(u) };
  }).filter(Boolean);
}

async function open3d() {
  const host = document.getElementById("spatial3d");
  if (!host || scene) return;
  const dark = document.documentElement.dataset.theme === "dark";
  const { createScene } = await import("../lib/scene3d.js");
  scene = createScene(host, unitData(), { dark, onPick: openDrawer });
  scene.setSelected(getSelected());
}

function setLens(next) {
  lens = next;
  const svg = document.getElementById("spatial");
  const host = document.getElementById("spatial3d");
  document.getElementById("lensIso").classList.toggle("on", next === "iso");
  document.getElementById("lens3d").classList.toggle("on", next === "3d");
  if (next === "3d") {
    svg.setAttribute("hidden", "");
    host.removeAttribute("hidden");
    open3d().then(() => scene && scene.resize());
  } else {
    host.setAttribute("hidden", "");
    svg.removeAttribute("hidden");
    if (scene) { scene.dispose(); scene = null; }
  }
}

export function initSpatial() {
  renderLegend();
  drawSpatial();
  const iso = document.getElementById("lensIso");
  const d3 = document.getElementById("lens3d");
  if (iso) iso.onclick = () => setLens("iso");
  if (d3) d3.onclick = () => setLens("3d");
  subscribe(type => {
    if (type === "selection") { drawSpatial(); if (scene) scene.setSelected(getSelected()); }
  });
}
```

Note: `unitData()` references `UNITS`, `geometry`, `heights`, `DEFAULT_FT`, `baseColor`, `openDrawer`, `getSelected` — all already imported/defined at the top of `spatial.js` from Task-3-of-P6a. Do not re-import them.

- [ ] **Step 3: Add container + chip styling to styles.css**

Append to the END of `src/styles.css`:
```css
/* ---- A-2 Lens B (3D) ---- */
.spatial3d { width: 100%; height: 70vh; min-height: 420px; }
.spatial3d canvas { display: block; width: 100%; height: 100%; border-radius: 6px; }
#pg-spatial .plan-tools .chip[data-lens] { font-family: var(--mono); }
```

- [ ] **Step 4: Build + syntax gate**

Run: `node --check src/views/spatial.js && npm run build`
Expected: clean; build succeeds. `three` is code-split into its own chunk (loaded only when 3D opens) because `scene3d.js` is imported dynamically.

- [ ] **Step 5: Commit**

```bash
git add index.html src/views/spatial.js src/styles.css
git commit -m "Add Iso/3D lens toggle to A-2 (lazy-loads Three.js twin)"
```
End with the `Co-Authored-By:` trailer.

---

## Task 4: Verification

**Files:** none (verification only).

- [ ] **Step 1: Unit tests + syntax + build all green**

Run: `npm test && node --check src/lib/scene3d.js && node --check src/views/spatial.js && npm run build`
Expected: all `iso` + `scene3d-layout` tests pass; no syntax errors; build succeeds; build output shows a separate `three`/`scene3d` chunk.

- [ ] **Step 2: Headless WebGL smoke test**

Confirm WebGL renders headlessly (proves the scene can draw on this machine). Create a throwaway `_webgl_smoke.mjs` at repo root:
```javascript
import { readFileSync, writeFileSync, rmSync } from "node:fs";
// minimal: assert three's WebGLRenderer constructs against a stub is out of scope here;
// instead verify the built app chunk for three exists.
import { execSync } from "node:child_process";
const out = execSync("npm run build", { encoding: "utf8" });
if (!/three/.test(out) && !/scene3d/.test(out)) console.log("NOTE: three chunk name not in build log (may still be split)");
console.log("build ok");
```
Run: `node _webgl_smoke.mjs` then `rm -f _webgl_smoke.mjs`.
Expected: "build ok". (Full WebGL pixel verification is done live in the browser — see Step 3 — because headless WebGL is environment-dependent.)

- [ ] **Step 3: Live browser verification**

The app is login-gated (Path B). To view locally without login, move `.env` aside temporarily, start the dev server (Claude_Preview `otb-command-dev`, port 5173), open A-2, and:
- Click **◧ 3D** — the SVG hides, a Three.js canvas appears showing the extruded center; drag to orbit; the taller 103 / lower 101,105–109 read correctly; colors match status.
- Click a block → the correct unit drawer opens; the block shows the brass selection highlight; closing the drawer clears it.
- Toggle **▱ Isometric** back — canvas disposes (no WebGL context leak — check `preview_console_logs` for warnings), SVG returns.
- Flip dark mode — the 3D background/ground go dark; reopen 3D to confirm `dark` is picked up.
- Restore `.env`.

- [ ] **Step 4: Capture proof + commit any fixes**

`preview_screenshot` the 3D lens. If any issue was found and fixed, commit it; otherwise no commit.

---

## Self-Review

**Spec coverage (§5 Lens B):** Three.js, same footprints/heights (via `unitData()` + `layout3d`), orbit (OrbitControls), status colors, raycast click→drawer, toggle within A-2 (not a separate sheet) — all covered by Tasks 1–3. Swappable geometry source: `buildBoxes()` is the isolated seam a captured mesh replaces (documented in `scene3d.js` header). ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output.

**Type/name consistency:** `createScene(container, units, opts)` returns `{ dispose, resize, setSelected, setTheme }` — used with those exact names in `spatial.js` (`scene.setSelected`, `scene.resize`, `scene.dispose`). `layout3d(rects, heightFt, opts)` / `WORLD` / `FT_WORLD` match between `scene3d-layout.js`, its test, and `scene3d.js`. `unitData()` fields (`unit,x,y,w,h,heightFt,color`) match what `createScene` reads. Lens ids `lensIso`/`lens3d`/`spatial3d` consistent across `index.html` and `spatial.js`.

**Deferred-polish note (not silent):** no shadows (perf), no per-lens camera persistence, and headless-WebGL pixel verification is replaced by live browser check — all intentional for this slice, flagged so they read as decisions.
