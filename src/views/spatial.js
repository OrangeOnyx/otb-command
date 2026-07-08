/* A-2 Spatial — SVG isometric of the center. Footprints from geometry.units,
   heights from heights.json (joined by unit number), color = live status.
   Click a unit → the shared drawer; selection stays in sync with every sheet. */
import geometry from "../data/geometry.json";
import heights from "../data/heights.json";
import { UNITS, getSelected, subscribe } from "../store.js";
import { STATUS_META } from "../lib/colors.js";
import { g, path, text } from "../lib/svg.js";
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
}

function renderLegend() {
  const el = document.getElementById("spatialLegend");
  if (!el) return;
  const items = [["Active", STATUS_META.active.fill], ["Anchor", STATUS_META.anchor.fill],
    ["Holdover", STATUS_META.expired.fill], ["Vacant", "#E7E9E0"], ["Owner", STATUS_META.owner.fill]];
  el.innerHTML = items.map(([l, c]) =>
    '<span class="li"><span class="sw" style="background:' + c + '"></span>' + l + "</span>").join("");
}

let scene = null;        // Lens B handle (null until 3D opened)

// resolved per-unit data for the 3D scene (footprint + real height + status color)
function unitData() {
  return UNITS.map(u => {
    const p = geometry.units[u.unit];
    if (!p) return null;
    return { unit: u.unit, x: p.x, y: p.y, w: p.w, h: p.h,
      heightFt: heights[u.unit] || DEFAULT_FT, color: baseColor(u) };
  }).filter(Boolean);
}

let geoScene = null;     // Lens C handle (null until satellite opened)

async function open3d() {
  const host = document.getElementById("spatial3d");
  if (!host || scene) return;
  const dark = document.documentElement.dataset.theme === "dark";
  const { createScene } = await import("../lib/scene3d.js");
  scene = createScene(host, unitData(), { dark, onPick: openDrawer });
  scene.setSelected(getSelected());
}

async function openSat() {
  const host = document.getElementById("spatialSat");
  if (!host || geoScene) return;
  const { createGeoScene } = await import("../lib/scenegeo.js");
  geoScene = createGeoScene(host, unitData(), { onPick: openDrawer });
  geoScene.setSelected(getSelected());
}

let realScene = null;    // Lens D handle (null until reality opened)

async function openReal() {
  const host = document.getElementById("spatialReal");
  if (!host || realScene) return;
  const { createSplatScene } = await import("../lib/scenesplat.js");
  realScene = createSplatScene(host, unitData(), { onPick: openDrawer });
  realScene.setSelected(getSelected());
}

function setLens(next) {
  const panes = {
    iso: document.getElementById("spatial"),
    "3d": document.getElementById("spatial3d"),
    sat: document.getElementById("spatialSat"),
    real: document.getElementById("spatialReal")
  };
  ["lensIso", "lens3d", "lensSat", "lensReal"].forEach((id, i) => {
    document.getElementById(id).classList.toggle("on", ["iso", "3d", "sat", "real"][i] === next);
  });
  Object.entries(panes).forEach(([k, el]) => {
    if (k === next) el.removeAttribute("hidden"); else el.setAttribute("hidden", "");
  });
  if (next !== "3d" && scene) { scene.dispose(); scene = null; }
  if (next !== "sat" && geoScene) { geoScene.dispose(); geoScene = null; }
  if (next !== "real" && realScene) { realScene.dispose(); realScene = null; }
  if (next === "3d") open3d().then(() => scene && scene.resize());
  if (next === "sat") openSat().then(() => geoScene && geoScene.resize());
  if (next === "real") openReal();
}

export function initSpatial() {
  renderLegend();
  drawSpatial();
  [["lensIso", "iso"], ["lens3d", "3d"], ["lensSat", "sat"], ["lensReal", "real"]].forEach(([id, lens]) => {
    const b = document.getElementById(id);
    if (b) b.onclick = () => setLens(lens);
  });
  subscribe(type => {
    if (type === "selection") {
      drawSpatial();
      if (scene) scene.setSelected(getSelected());
      if (geoScene) geoScene.setSelected(getSelected());
      if (realScene) realScene.setSelected(getSelected());
    }
  });
}
