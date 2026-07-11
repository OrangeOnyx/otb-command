/* A-2 Spatial — SVG isometric of the center. Footprints from geometry.units,
   heights from heights.json (joined by unit number), color = live status.
   Click a unit → the shared drawer; selection stays in sync with every sheet. */
import geometry from "../data/geometry.json";
import heights from "../data/heights.json";
import { UNITS, getSelected, subscribe } from "../store.js";
import { STATUS_META } from "../lib/colors.js";
import { NS, g, path, text } from "../lib/svg.js";
import { prismFaces, facePath, depthKey, shade, isoBounds, FT_SCALE, COS, SIN } from "../lib/iso.js";
import { PLAN_PER_FT, TRUE_FT_WORLD } from "../lib/splat-align.js";
import { openDrawer } from "./drawer.js";

const DEFAULT_FT = 16.4;              // fallback parapet height
const WALL_RIGHT = 0.14, WALL_FRONT = 0.28; // darkening of the two walls

let trueScale = false;                // ⇅ toggle: plat-true heights vs presentation exaggeration

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
  const perFt = trueScale ? PLAN_PER_FT : FT_SCALE;
  const zFor = r => (heights[r.unit] || DEFAULT_FT) * perFt;

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

  drawCompass(svg, box);
}

/* North arrow + 100' scale bar, bottom-left. Plan is rotated: true north = +x
   (Patricia St). Along an iso axis projected length equals plan length
   (cos30²+sin30² = 1), so the bar is drawn at true plan scale on the +x axis. */
function drawCompass(svg, box) {
  const grp = g(svg, "iso-compass");
  const ink = "var(--ink)";
  const lab = { class: "iso-num dk", "font-size": "17", "pointer-events": "none" };
  const barFt = 100, barLen = barFt * PLAN_PER_FT;      // plan px, true scale
  const bx = box.x + 34, by = box.y + box.h - 150;      // bar start
  const ex = bx + barLen * COS, ey = by + barLen * SIN; // bar end (+x axis, 30° down-right)
  // scale bar with end ticks
  path(grp, `M ${bx} ${by} L ${ex} ${ey}`, { stroke: ink, "stroke-width": "2", fill: "none" });
  for (const [px, py] of [[bx, by], [ex, ey]])
    path(grp, `M ${px + 6 * SIN} ${py - 6 * COS} L ${px - 6 * SIN} ${py + 6 * COS}`,
      { stroke: ink, "stroke-width": "2", fill: "none" });
  text(grp, (bx + ex) / 2 + 16 * SIN, (by + ey) / 2 - 16 * COS, barFt + "′",
    { ...lab, "text-anchor": "middle" });
  // mode note under the bar
  text(grp, bx, by + 40, trueScale ? "TRUE HEIGHT SCALE" :
    "HEIGHTS ×" + (FT_SCALE / PLAN_PER_FT).toFixed(1) + " FOR READABILITY",
    { ...lab, "font-size": "12", opacity: "0.75" });
  // north arrow above the bar, same +x direction
  const nx = bx, ny = by - 64, len = 56;
  const tx = nx + len * COS, ty = ny + len * SIN;
  path(grp, `M ${nx} ${ny} L ${tx} ${ty}`, { stroke: ink, "stroke-width": "2", fill: "none" });
  path(grp, `M ${tx} ${ty} l ${-13 * COS + 6 * SIN} ${-13 * SIN - 6 * COS} l ${2 * 6 * -SIN} ${2 * 6 * COS} Z`,
    { fill: ink, stroke: "none" });
  text(grp, tx + 17 * COS, ty + 17 * SIN + 6, "N", { ...lab, "text-anchor": "middle" });
}

/* Serialize the iso SVG to a standalone file: inline the class styles, resolve
   CSS custom properties, add a paper background. */
function exportIsoSvg() {
  const src = document.getElementById("spatial");
  if (!src) return;
  const clone = src.cloneNode(true);
  clone.setAttribute("xmlns", NS);
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fb) => (cs.getPropertyValue(name) || "").trim() || fb;
  const ink = v("--ink", "#1C2B26");
  const vb = (clone.getAttribute("viewBox") || "0 0 100 100").split(/\s+/).map(Number);
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", vb[0]); bg.setAttribute("y", vb[1]);
  bg.setAttribute("width", vb[2]); bg.setAttribute("height", vb[3]);
  bg.setAttribute("fill", v("--paper", "#EDEFE8"));
  clone.insertBefore(bg, clone.firstChild);
  const style = document.createElementNS(NS, "style");
  style.textContent =
    `text{font-family:${v("--disp", "'Big Shoulders Display',sans-serif")}}` +
    `.iso-num{fill:${v("--white", "#F6F7F1")}}.iso-num.dk{fill:${ink}}`;
  clone.insertBefore(style, clone.firstChild);
  let s = new XMLSerializer().serializeToString(clone);
  s = s.replaceAll("var(--ink)", ink).replaceAll("var(--brass)", v("--brass", "#A87E2F"));
  const blob = new Blob([s], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "OTB-A2-isometric.svg";
  a.click();
  URL.revokeObjectURL(a.href);
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
  scene = createScene(host, unitData(), { dark, onPick: openDrawer,
    ftWorld: trueScale ? TRUE_FT_WORLD : undefined });
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
  const tBtn = document.getElementById("isoTrue");
  if (tBtn) tBtn.onclick = () => {
    trueScale = !trueScale;
    tBtn.classList.toggle("on", trueScale);
    drawSpatial();
    if (scene) {                      // rebuild Lens B at the new height scale
      scene.dispose(); scene = null;
      open3d().then(() => scene && scene.resize());
    }
  };
  const xBtn = document.getElementById("isoExport");
  if (xBtn) xBtn.onclick = exportIsoSvg;
  subscribe(type => {
    if (type === "selection") {
      drawSpatial();
      if (scene) scene.setSelected(getSelected());
      if (geoScene) geoScene.setSelected(getSelected());
      if (realScene) realScene.setSelected(getSelected());
    }
  });
}
