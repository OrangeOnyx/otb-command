# P6a · SVG Isometric "A-2" Command Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "A-2 Spatial" sheet that renders On The Boulevard as an interactive SVG isometric — buildings extruded to real (CAD-derived) heights, each unit colored by live status, click → the existing unit drawer — plus a plan-room ↔ dark theme switch.

**Architecture:** A pure, DOM-free geometry core (`src/lib/iso.js`) projects the existing plan-space unit footprints (`geometry.units`) to a 2:1 dimetric isometric and builds extruded prism faces. A thin view (`src/views/spatial.js`) renders those faces into an SVG, reusing the app's status colors, store selection, and `openDrawer`. Heights come from a re-runnable CAD extractor (`tools/extract-heights.py` → `src/data/heights.json`), joined to footprints by unit number. The theme switch overrides the existing `:root` CSS variables under `[data-theme="dark"]`.

**Tech Stack:** Vanilla ES modules + Vite (existing), native SVG, Node's built-in `node:test` (zero new deps), Python + ezdxf (existing, for the height extractor).

**Scope:** This plan is **P6a only** (first shippable slice of P6). Lens B (3D twin), Lens C (satellite), and Lens D (reality capture) get their own plans. See `docs/superpowers/specs/2026-07-02-p6-2p5d-spatial-design.md`.

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `src/lib/iso.js` | Pure isometric math: projection, prism faces, shading, depth sort, bounds. No DOM. | Create |
| `test/iso.test.mjs` | `node:test` unit tests for `iso.js`. | Create |
| `tools/extract-heights.py` | Read CAD `BLD_HT` annotations, assign each unit its nearest real height → `heights.json`. | Create |
| `src/data/heights.json` | `{ "<unit>": <feet> }` — CAD-derived parapet heights. | Create (generated) |
| `src/views/spatial.js` | The A-2 view: render iso SVG, click→drawer, selection sync, legend. | Create |
| `index.html` | Add the `pg-spatial` page section + toolbar + legend + theme toggle button. | Modify |
| `src/main.js` | Register A-2 in `PAGES`, import + call `initSpatial()`, apply persisted theme on boot. | Modify |
| `src/styles.css` | `[data-theme="dark"]` variable overrides + `.iso-*` view styles + theme-toggle styles. | Modify |
| `package.json` | Add `test` and `extract-heights` scripts. | Modify |

---

## Task 1: Isometric geometry core (`src/lib/iso.js`)

**Files:**
- Create: `src/lib/iso.js`
- Test: `test/iso.test.mjs`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Add the `test` script to package.json**

In `package.json`, inside `"scripts"`, add after `"extract-geometry"`:

```json
    "test": "node --test",
```

- [ ] **Step 2: Write the failing test** — create `test/iso.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { isoPoint, prismFaces, facePath, depthKey, shade, isoBounds, FT_SCALE } from "../src/lib/iso.js";

test("isoPoint: origin maps to origin", () => {
  const p = isoPoint(0, 0, 0);
  assert.equal(p.x, 0);
  assert.equal(p.y, 0);
});

test("isoPoint: +x goes right and down, +y goes left and down", () => {
  const px = isoPoint(10, 0, 0);
  assert.ok(px.x > 0 && px.y > 0, "+x is right-down");
  const py = isoPoint(0, 10, 0);
  assert.ok(py.x < 0 && py.y > 0, "+y is left-down");
});

test("isoPoint: height raises the point (smaller y)", () => {
  const base = isoPoint(5, 5, 0);
  const top = isoPoint(5, 5, 20);
  assert.equal(top.y, base.y - 20);
});

test("prismFaces: returns top + two walls, each a 4-point quad, top raised by z", () => {
  const f = prismFaces({ x: 0, y: 0, w: 10, h: 10 }, 20);
  assert.equal(f.top.length, 4);
  assert.equal(f.right.length, 4);
  assert.equal(f.front.length, 4);
  // top face A corner sits z above the base A corner
  const baseA = isoPoint(0, 0, 0);
  assert.equal(f.top[0].y, baseA.y - 20);
});

test("facePath: builds a closed path from points", () => {
  const d = facePath([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]);
  assert.match(d, /^M 0.00 0.00 L 1.00 0.00 L 1.00 1.00 Z$/);
});

test("depthKey: a nearer (larger x+y) rect sorts after a farther one", () => {
  const far = depthKey({ x: 0, y: 0, w: 10, h: 10 });
  const near = depthKey({ x: 100, y: 100, w: 10, h: 10 });
  assert.ok(near > far);
});

test("shade: darkens a hex toward black; passes through non-hex", () => {
  assert.equal(shade("#ffffff", 0), "#ffffff");
  assert.equal(shade("#ffffff", 1), "#000000");
  assert.equal(shade("url(#hatch)", 0.3), "url(#hatch)");
});

test("isoBounds: produces a padded box covering the massing", () => {
  const rects = [{ x: 0, y: 0, w: 10, h: 10 }];
  const b = isoBounds(rects, () => 20, 40);
  assert.ok(b.w > 0 && b.h > 0);
  assert.equal(typeof b.x, "number");
});

test("FT_SCALE is a positive constant", () => {
  assert.ok(FT_SCALE > 0);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/lib/iso.js`.

- [ ] **Step 4: Write the implementation** — create `src/lib/iso.js`:

```javascript
/* Pure isometric geometry for the A-2 spatial sheet. No DOM, no imports.
   Projects plan-space unit footprints (geometry.units) to a 2:1 dimetric
   isometric and builds extruded prism faces. Tested in test/iso.test.mjs. */

export const COS = Math.cos(Math.PI / 6); // ≈0.8660 — 2:1 dimetric
export const SIN = Math.sin(Math.PI / 6); // 0.5
export const FT_SCALE = 3.2;              // plan-units per foot for extrusion height (visual, tunable)

// Project a plan point (px,py) at height z (plan units, up) to iso screen space.
export function isoPoint(px, py, z = 0) {
  return { x: (px - py) * COS, y: (px + py) * SIN - z };
}

// rect = {x,y,w,h} in plan space; z = extrusion height in plan units.
// Returns the top face and the two viewer-facing walls (+x "right", +y "front").
export function prismFaces(rect, z) {
  const { x, y, w, h } = rect;
  const A = [x, y], B = [x + w, y], C = [x + w, y + h], D = [x, y + h];
  const P = ([px, py], zz) => isoPoint(px, py, zz);
  return {
    top:   [P(A, z), P(B, z), P(C, z), P(D, z)],
    right: [P(B, 0), P(C, 0), P(C, z), P(B, z)], // +x wall
    front: [P(D, 0), P(C, 0), P(C, z), P(D, z)], // +y wall
  };
}

export function facePath(pts) {
  return "M " + pts.map(q => q.x.toFixed(2) + " " + q.y.toFixed(2)).join(" L ") + " Z";
}

// Painter's-algorithm key: larger = nearer the viewer = drawn later (on top).
export function depthKey(rect) {
  return (rect.x + rect.w / 2) + (rect.y + rect.h / 2);
}

// Darken a #rrggbb toward black by t (0..1). Pass through anything non-hex
// (e.g. "url(#hatch)") unchanged.
export function shade(hex, t) {
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) return hex;
  const ch = i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t));
  const hx = n => n.toString(16).padStart(2, "0");
  return "#" + hx(ch(1)) + hx(ch(3)) + hx(ch(5));
}

// viewBox box covering every base+top corner of every rect, padded.
// zByKey(rect) -> extrusion height in plan units.
export function isoBounds(rects, zByKey, pad = 40) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    const z = zByKey(r);
    const corners = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    for (const zz of [0, z]) {
      for (const [px, py] of corners) {
        const q = isoPoint(px, py, zz);
        if (q.x < minX) minX = q.x;
        if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y;
        if (q.y > maxY) maxY = q.y;
      }
    }
  }
  return { x: minX - pad, y: minY - pad, w: (maxX - minX) + 2 * pad, h: (maxY - minY) + 2 * pad };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all tests in `test/iso.test.mjs` green.

- [ ] **Step 6: Syntax gate + commit**

Run: `node --check src/lib/iso.js`
Expected: no output (clean).

```bash
git add src/lib/iso.js test/iso.test.mjs package.json
git commit -m "Add isometric geometry core (iso.js) + node:test"
```

---

## Task 2: CAD height extractor (`tools/extract-heights.py` → `heights.json`)

**Files:**
- Create: `tools/extract-heights.py`
- Create (generated): `src/data/heights.json`
- Modify: `package.json` (add `extract-heights` script)

- [ ] **Step 1: Write the extractor** — create `tools/extract-heights.py`:

```python
# -*- coding: utf-8 -*-
"""
Assign each demised unit its real parapet height from the CAD BLD_HT layer.

Method: replicate poster.py's bay-rectangle layout (CAD feet space) to get each
unit's centroid, then match the NEAREST "BUILDING HEIGHT: N.N'" annotation.
Output src/data/heights.json = { "<unit>": <feet> }. Fallback 16.4' (the
dominant annotated value) if no annotation is within range.
"""
import ezdxf, json, os, re, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DXF = os.path.join(ROOT, "cad", "Boulev_CLEAN.dxf")
OUT = os.path.join(ROOT, "src", "data", "heights.json")
g = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))

# same envelopes + bay lists poster.py uses (CAD feet)
LB_X0, LB_X1, LB_Y0, LB_Y1 = 522.5, 1051.4, 172.5, 258.6
SB_X0, SB_X1, SB_Y0, SB_Y1 = 425.7, 510.2, 227.6, 436.3
LB = [(b[0], b[1]) for b in g["demising"]["longBuilding"]["bays"]]
SB = [(b[0], b[1]) for b in g["demising"]["shortBuilding"]["bays"]]

def bay_centroids():
    out = {}
    scale = (LB_X1 - LB_X0) / sum(w for _, w in LB); cur = LB_X0
    for unit, w in LB:
        out[unit] = ((cur + cur + w * scale) / 2, (LB_Y0 + LB_Y1) / 2); cur += w * scale
    scale = (SB_Y1 - SB_Y0) / sum(w for _, w in SB); cur = SB_Y0; xmid = (SB_X0 + SB_X1) / 2
    for unit, w in SB:
        y0, y1 = cur, cur + w * scale
        if unit == "135":
            out["135B"] = ((SB_X0 + xmid) / 2, (y0 + y1) / 2)
            out["135A"] = ((xmid + SB_X1) / 2, (y0 + y1) / 2)
        else:
            out[unit] = ((SB_X0 + SB_X1) / 2, (y0 + y1) / 2)
        cur += y1 - y0
    return out

doc = ezdxf.readfile(DXF); msp = doc.modelspace()
annos = []
for e in msp:
    if e.dxf.layer == "BLD_HT" and e.dxftype() == "TEXT":
        m = re.search(r"(\d+\.?\d*)'", e.dxf.text)
        if m:
            annos.append((float(m.group(1)), e.dxf.insert[0], e.dxf.insert[1]))

def nearest(cx, cy):
    best, bh = 1e18, 16.4
    for ht, ax, ay in annos:
        d = (cx - ax) ** 2 + (cy - ay) ** 2
        if d < best:
            best, bh = d, ht
    return bh

heights = {unit: nearest(cx, cy) for unit, (cx, cy) in bay_centroids().items()}
json.dump(heights, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("OK ->", os.path.relpath(OUT, ROOT), "|", len(heights), "units |", len(annos), "annotations")
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add after `"plat"`:

```json
    "extract-heights": "python tools/extract-heights.py",
```

- [ ] **Step 3: Run the extractor**

Run: `npm run extract-heights`
Expected: `OK -> src\data\heights.json | 27 units | 9 annotations` (or similar count).

- [ ] **Step 4: Verify the output is valid JSON keyed by every unit**

Run: `node -e "const h=require('./src/data/heights.json'); const g=require('./src/data/geometry.json'); const miss=Object.keys(g.units).filter(u=>!(u in h)); console.log('units:',Object.keys(h).length,'missing:',miss.length, miss.join(',')); console.log('sample:',h['101'],h['149'],h['135A']);"`
Expected: `missing: 0`, numeric samples (e.g. `16.4`).

- [ ] **Step 5: Commit**

```bash
git add tools/extract-heights.py src/data/heights.json package.json
git commit -m "Add CAD height extractor -> heights.json (real parapet heights)"
```

---

## Task 3: The A-2 view (`src/views/spatial.js`)

**Files:**
- Create: `src/views/spatial.js`

Depends on Tasks 1–2. Reuses `geometry.units`, `UNITS`/`getSelected`/`subscribe` (store), `STATUS_META` (colors), `openDrawer` (drawer), `iso.js`, `heights.json`. Renders into `<svg id="spatial">` and `#spatialLegend` (created in Task 4).

- [ ] **Step 1: Write the module** — create `src/views/spatial.js`:

```javascript
/* A-2 Spatial — SVG isometric of the center. Footprints from geometry.units,
   heights from heights.json (joined by unit number), color = live status.
   Click a unit → the shared drawer; selection stays in sync with every sheet. */
import geometry from "../data/geometry.json";
import heights from "../data/heights.json";
import { UNITS, getSelected, subscribe } from "../store.js";
import { STATUS_META } from "../lib/colors.js";
import { NS, g, path, text } from "../lib/svg.js";
import { prismFaces, facePath, depthKey, shade, isoBounds, FT_SCALE } from "../lib/iso.js";
import { openDrawer } from "./drawer.js";

const DEFAULT_FT = 16.4;              // fallback parapet height
const WALL_RIGHT = 0.14, WALL_FRONT = 0.28; // darkening of the two walls

// vacant status renders as url(#hatch) on the flat plan — give the 3D block a
// solid so shading works; keep it visually "empty".
function baseColor(u) {
  return u.status === "vacant" ? "#E7E9E0" : STATUS_META[u.status].fill;
}

function rectFor(u) {
  const p = geometry.units[u.unit];
  return p ? { unit: u.unit, x: p.x, y: p.y, w: p.w, h: p.h, status: u.status, dba: u.dba } : null;
}

export function drawSpatial() {
  const svg = document.getElementById("spatial");
  if (!svg) return;
  const rects = UNITS.map(rectFor).filter(Boolean);
  const zFor = r => (heights[r.unit] || DEFAULT_FT) * FT_SCALE;

  const box = isoBounds(rects, zFor, 48);
  svg.setAttribute("viewBox", [box.x, box.y, box.w, box.h].map(n => n.toFixed(1)).join(" "));
  svg.innerHTML = "";

  // ground shadow (subtle) then blocks back-to-front
  const ground = g(svg, "iso-ground");
  const layer = g(svg, "iso-blocks");
  const selected = getSelected();

  rects.slice().sort((a, b) => depthKey(a) - depthKey(b)).forEach(r => {
    const z = zFor(r);
    const f = prismFaces(r, z);
    const col = baseColor(r);
    const sel = selected === r.unit;
    const grp = g(layer, "iso-unit" + (sel ? " sel" : ""));
    grp.style.cursor = "pointer";
    // draw walls first, top last
    path(grp, facePath(f.front), { fill: shade(col, WALL_FRONT), stroke: "var(--ink)", "stroke-width": "0.6" });
    path(grp, facePath(f.right), { fill: shade(col, WALL_RIGHT), stroke: "var(--ink)", "stroke-width": "0.6" });
    path(grp, facePath(f.top),   { fill: col, stroke: sel ? "var(--brass)" : "var(--ink)", "stroke-width": sel ? "2" : "0.8" });
    // label at top-face centroid
    const cx = (f.top[0].x + f.top[2].x) / 2, cy = (f.top[0].y + f.top[2].y) / 2;
    text(grp, cx, cy, r.unit, {
      class: "iso-num" + (r.status === "vacant" ? " dk" : ""),
      "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "12",
      "pointer-events": "none",
    });
    grp.addEventListener("click", () => openDrawer(r.unit));
  });
  void ground; // reserved for a future drop shadow; keeps layer order stable
}

function renderLegend() {
  const el = document.getElementById("spatialLegend");
  if (!el) return;
  const items = [["Active", STATUS_META.active.fill], ["Anchor", STATUS_META.anchor.fill],
    ["Holdover", STATUS_META.expired.fill], ["Vacant", "#E7E9E0"], ["Owner", STATUS_META.owner.fill]];
  el.innerHTML = items.map(([l, c]) =>
    '<span class="li"><span class="sw" style="background:' + c + '"></span>' + l + "</span>").join("");
}

export function initSpatial() {
  renderLegend();
  drawSpatial();
  // keep the massing's selection outline in sync with drawer open/close anywhere
  subscribe(type => { if (type === "selection") drawSpatial(); });
}
```

- [ ] **Step 2: Syntax gate**

Run: `node --check src/views/spatial.js`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/views/spatial.js
git commit -m "Add A-2 spatial view (SVG isometric, click->drawer, selection sync)"
```

---

## Task 4: Wire A-2 into the shell (`index.html`, `src/main.js`)

**Files:**
- Modify: `index.html` (add `pg-spatial` section)
- Modify: `src/main.js` (PAGES entry + import + `initSpatial()`)

- [ ] **Step 1: Add the A-2 page section to index.html**

In `index.html`, immediately AFTER the plan section's closing `</section>` (the block that starts `<section class="page" id="pg-plan">` and ends with the `<svg id="plan" ...>` card), insert:

```html
    <section class="page" id="pg-spatial">
      <div class="page-head"><h1>Spatial</h1><div class="sub">A-2 · ISOMETRIC — CLICK A UNIT</div></div>
      <div class="plan-tools">
        <div class="legend" id="spatialLegend"></div>
      </div>
      <div class="card plan-card"><svg id="spatial" role="img" aria-label="On The Boulevard isometric massing"></svg></div>
    </section>
```

- [ ] **Step 2: Register A-2 in the PAGES list**

In `src/main.js`, change the `PAGES` constant to add the spatial entry right after the `plan` entry:

```javascript
const PAGES = [["dash", "D-1", "Dashboard"], ["plan", "A-1", "Site Plan"], ["spatial", "A-2", "Spatial"], ["roll", "R-1", "Rent Roll"], ["comp", "C-1", "Compliance"], ["fin", "P-1", "Financial"], ["dates", "T-1", "Critical Dates"], ["board", "W-1", "Action Board"], ["dir", "K-1", "Directory"]];
```

- [ ] **Step 3: Import and initialize the view**

In `src/main.js`, add the import next to the other view imports (after the `initPlan` import line):

```javascript
import { initSpatial } from "./views/spatial.js";
```

Then in `initViews()`, add the call right after `initPlan();`:

```javascript
  initSpatial();
```

- [ ] **Step 4: Build to verify the app compiles and A-2 is wired**

Run: `npm run build`
Expected: build succeeds, no errors. `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "Wire A-2 spatial sheet into nav + view init"
```

---

## Task 5: Theme switch (plan-room default ↔ dark)

**Files:**
- Modify: `src/styles.css` (dark variable overrides + view/toggle styles)
- Modify: `index.html` (theme toggle button in the sidebar foot)
- Modify: `src/main.js` (apply persisted theme on boot; wire the toggle)

- [ ] **Step 1: Add dark-theme variable overrides + A-2 view styles to styles.css**

Append to the END of `src/styles.css`:

```css
/* ---- A-2 isometric view ---- */
#spatial { width: 100%; height: auto; display: block; }
.iso-num { font-family: var(--disp); fill: var(--white); }
.iso-num.dk { fill: var(--ink); }
.iso-unit:hover .iso-num { font-weight: 700; }

/* ---- theme toggle ---- */
.theme-toggle { margin: 8px 12px; width: calc(100% - 24px); padding: 8px 10px;
  font: 600 12px/1 var(--mono); color: var(--ink70); background: var(--card);
  border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
.theme-toggle:hover { border-color: var(--brass); color: var(--ink); }

/* ---- dark theme: override the :root plan-room tokens ---- */
[data-theme="dark"] {
  --paper: #12151A; --paper2: #0E1116; --card: #1A1F26; --white: #E8EBE6;
  --ink: #E8EBE6; --ink70: rgba(232,235,230,.72); --ink50: rgba(232,235,230,.5); --ink30: rgba(232,235,230,.3);
  --line: #2C333C; --line2: #232A31;
  --brass-bg: #2A2416; --green-bg: #16241D; --brick-bg: #2A1B14; --slate-bg: #1E2420;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 6px 18px rgba(0,0,0,.5);
}
```

- [ ] **Step 2: Add the theme toggle button to index.html**

In `index.html`, inside `<div class="foot">` (opens at line ~29), add as the first child:

```html
      <button class="theme-toggle" id="themeToggle">◐ Dark mode</button>
```

- [ ] **Step 3: Apply persisted theme on boot + wire the toggle in main.js**

In `src/main.js`, add this function above `boot()`:

```javascript
function initTheme() {
  const saved = localStorage.getItem("otb-theme") === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = saved;
  const btn = document.getElementById("themeToggle");
  const label = () => { if (btn) btn.textContent = document.documentElement.dataset.theme === "dark" ? "◑ Light mode" : "◐ Dark mode"; };
  label();
  if (btn) btn.onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("otb-theme", next);
    label();
  };
}
```

Then call it inside `buildShell(account)`, on the last line before the closing brace of `buildShell` (right after `buildShell._applyOwner = applyOwner;`):

```javascript
  initTheme();
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css index.html src/main.js
git commit -m "Add plan-room <-> dark theme switch (default plan-room, persisted)"
```

---

## Task 6: Full verification (build + preview)

**Files:** none (verification only).

- [ ] **Step 1: Unit tests + syntax gate + build all green**

Run: `npm test && node --check src/views/spatial.js && node --check src/main.js && npm run build`
Expected: tests PASS, no syntax errors, build succeeds.

- [ ] **Step 2: Preview the app**

The app is login-gated when `.env` is present (Path B). To view the A-2 sheet locally without login, temporarily move `.env` aside, then start the dev server via Claude_Preview (`otb-command-dev`, port 5173). Restore `.env` after.

- [ ] **Step 3: Verify A-2 renders and behaves**

In the preview:
- Nav shows **A-2 · Spatial** between A-1 and R-1; clicking it shows the isometric massing.
- Buildings read as extruded 3D blocks; the taller entry/anchor sections (20.6′/23.6′ units) are visibly taller than the 16.4′ runs.
- Block colors match live status (green active, dark-green anchor, brick holdover, pale vacant, slate owner); legend matches.
- Clicking a block opens the correct unit drawer; the clicked block gains the brass selection outline; closing the drawer clears it.
- Switching to A-1 and back preserves state; no console errors (`preview_console_logs`).

- [ ] **Step 4: Verify the theme switch**

- Click **◐ Dark mode** in the sidebar: chrome (paper/card/ink/lines) goes dark; status block colors remain semantic; label reads **◑ Light mode**.
- Reload: dark persists (localStorage). Toggle back to light; reload: light persists. Plan-room (light) is the default on a fresh profile.

- [ ] **Step 5: Capture proof + commit any fixes**

Take a `preview_screenshot` of A-2 in both themes for the record. If any issue was found and fixed, commit with a descriptive message. Otherwise no commit needed.

---

## Self-Review

**Spec coverage (against `2026-07-02-p6-2p5d-spatial-design.md`):**
- §3 Shared core → Task 1 (`iso.js`) + Task 2 (heights). Footprints from `geometry.units`, heights CAD-derived, status color, selection via store. ✓
- §3.2 audit-grade heights → Task 2 extractor (nearest `BLD_HT`), stored as data. ✓
- §4 Lens A (SVG isometric A-2) → Task 3 + Task 4. Shaded prisms, real heights, status color, labels, click→drawer, theme-aware. ✓
- §7 theme switch (plan-room default + dark, persisted) → Task 5. ✓
- §10 verification (node --check + build + preview; core unit-tested) → Tasks 1 & 6. ✓
- Out of scope here (correctly deferred to later plans): Lens B/C/D, metric-height toggle, global search, static-SVG export, north arrow/scale polish. Noted, not built.

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output.

**Type/name consistency:** `iso.js` exports (`isoPoint`, `prismFaces`, `facePath`, `depthKey`, `shade`, `isoBounds`, `FT_SCALE`) are used with the same names in `test/iso.test.mjs` and `spatial.js`. View uses `initSpatial`/`drawSpatial`; `main.js` imports `initSpatial`. Page id `spatial` (`pg-spatial`, `#spatial`, `#spatialLegend`) consistent across `index.html`, `main.js`, `spatial.js`. `heights.json` keyed by unit number joins to `geometry.units` keys (verified 27 units incl. 135A/135B).

**Deferred-polish note (not silent):** north arrow, scale bar, and a static-SVG export for A-2 are intentionally omitted from P6a to keep the first slice tight; they belong with the marketing-render spin-off. Flagged here so their absence reads as a decision, not a gap.
