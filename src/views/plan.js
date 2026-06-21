/* A-1 Site Plan — renders geometry.json primitives + interactive unit rects.
   All coordinates live in geometry.json; this module only renders. */
import geometry from "../data/geometry.json";
import { UNITS, getSelected, subscribe } from "../store.js";
import { unitFill, legendFor } from "../lib/colors.js";
import { fmt$0, pDate, fDate, esc, TODAY } from "../lib/format.js";
import { NS, g, rect, text, renderPrims } from "../lib/svg.js";
import { unitsWithAssets, onAssetChange, listAssets, revokeURL } from "../lib/assets.js";
import { openDrawer } from "./drawer.js";

let planMode = "status";
let planScope = "main";
let showPhotos = true; // 📷 badge on units that have photos/plans
const overlays = { roof: false, signage: false }; // raster overlays (property-scope images)
let showFacility = false; // whole-center floor-plan overlay (static, registered to the unit envelope)
let overlayOpacity = 0.55;
let overlayURLs = []; // object URLs to revoke on redraw

// building envelope (union of unit rects) — target box for roster overlays
const ENV_BOX = (() => {
  const ps = Object.values(geometry.units);
  const x0 = Math.min(...ps.map(p => p.x)), y0 = Math.min(...ps.map(p => p.y));
  const x1 = Math.max(...ps.map(p => p.x + p.w)), y1 = Math.max(...ps.map(p => p.y + p.h));
  const mx = (x1 - x0) * 0.06, my = (y1 - y0) * 0.06;
  return { x: x0 - mx, y: y0 - my, w: x1 - x0 + 2 * mx, h: y1 - y0 + 2 * my };
})();

// floor-plan overlay registration — tunable box over the unit envelope (raster ↔ schematic)
const FAC = (() => {
  const ps = Object.values(geometry.units);
  const x0 = Math.min(...ps.map(p => p.x)), y0 = Math.min(...ps.map(p => p.y));
  const x1 = Math.max(...ps.map(p => p.x + p.w)), y1 = Math.max(...ps.map(p => p.y + p.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, par: "none" };
})();

export function drawPlan() {
  const svg = document.getElementById("plan");
  svg.setAttribute("viewBox", geometry.viewBox[planScope === "full" ? "full" : "main"]);
  svg.innerHTML = "";
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = '<pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
    '<rect width="7" height="7" fill="#FCFCF9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#B9BFAD" stroke-width="2"/></pattern>' +
    '<pattern id="hatch2" width="9" height="9" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">' +
    '<rect width="9" height="9" fill="#EDEFE8"/><line x1="0" y1="0" x2="0" y2="9" stroke="#CDD2C2" stroke-width="1.5"/></pattern>';
  svg.appendChild(defs);

  renderPrims(g(svg), geometry.layers.base);
  renderPrims(g(svg), geometry.layers.remoteLot);
  renderPrims(g(svg), geometry.layers.parking);

  // raster overlay layer — below the unit rects so units stay interactive
  const overlayLayer = g(svg);
  paintFacility(overlayLayer);
  paintOverlays(overlayLayer);

  /* interactive unit rects + labels */
  const gb = g(svg);
  const selected = getSelected();
  UNITS.forEach(u => {
    const p = geometry.units[u.unit];
    if (!p) return;
    const r = rect(gb, p.x, p.y, p.w, p.h, { fill: unitFill(u, planMode), rx: 2 });
    r.setAttribute("class", "u-rect" + (selected === u.unit ? " sel" : ""));
    r.addEventListener("click", () => openDrawer(u.unit));
    r.addEventListener("mousemove", e => showTT(e, u));
    r.addEventListener("mouseleave", hideTT);
    const dark = u.status === "vacant";
    const narrow = p.w < 58 && p.h > p.w;
    const t = text(gb, p.x + p.w / 2, narrow ? p.y + p.h / 2 : p.y + p.h / 2 - (p.w > 120 ? 8 : -1), u.unit,
      { class: "u-num" + (dark ? " dk" : ""), "text-anchor": "middle", "dominant-baseline": "middle", "font-size": narrow ? "15" : (p.w < 96 && p.h < 60 ? "13" : "17") });
    if (narrow) t.setAttribute("transform", "rotate(-90 " + (p.x + p.w / 2) + " " + (p.y + p.h / 2) + ")");
    if (p.w >= 120) {
      const nm = u.dba.length > 22 ? u.dba.slice(0, 21) + "…" : u.dba;
      text(gb, p.x + p.w / 2, p.y + p.h / 2 + 13, nm, { class: "u-dba", "text-anchor": "middle", fill: dark ? "rgba(28,43,38,.6)" : "rgba(252,252,249,.85)" });
    }
  });

  renderPrims(g(svg), geometry.layers.annotations);
  renderPrims(g(svg), geometry.layers.generalNotes);
  renderPrims(g(svg), geometry.layers.titleBlock);

  // photo badges drawn last (topmost, clickable); filled async from IndexedDB
  const badgeLayer = g(svg);
  paintBadges(badgeLayer);
}

function paintFacility(layer) {
  if (!showFacility) return;
  const img = document.createElementNS(NS, "image");
  img.setAttribute("href", import.meta.env.BASE_URL + "floorplan-center.png");
  img.setAttribute("x", FAC.x); img.setAttribute("y", FAC.y);
  img.setAttribute("width", FAC.w); img.setAttribute("height", FAC.h);
  img.setAttribute("preserveAspectRatio", FAC.par);
  img.setAttribute("opacity", overlayOpacity);
  img.setAttribute("pointer-events", "none");
  layer.appendChild(img);
}

async function paintOverlays(layer) {
  overlayURLs.forEach(revokeURL); overlayURLs = [];
  const kinds = Object.keys(overlays).filter(k => overlays[k]);
  if (!kinds.length) return;
  const assets = (await listAssets("property")).filter(a => kinds.includes(a.kind));
  if (!layer.isConnected) return;
  assets.forEach(a => {
    const url = a.url; overlayURLs.push(url);
    const img = document.createElementNS(NS, "image");
    img.setAttribute("href", url);
    img.setAttribute("x", ENV_BOX.x); img.setAttribute("y", ENV_BOX.y);
    img.setAttribute("width", ENV_BOX.w); img.setAttribute("height", ENV_BOX.h);
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    img.setAttribute("opacity", overlayOpacity);
    img.setAttribute("pointer-events", "none");
    layer.appendChild(img);
  });
}

async function paintBadges(layer) {
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  if (!showPhotos) return;
  const have = await unitsWithAssets();
  if (!layer.isConnected) return; // a newer render replaced us
  have.forEach(unit => {
    const p = geometry.units[unit];
    if (!p) return;
    const cx = p.x + p.w - 11, cy = p.y + 11;
    const bg = document.createElementNS(NS, "g");
    bg.setAttribute("class", "photo-badge");
    bg.setAttribute("transform", "translate(" + cx + "," + cy + ")");
    bg.innerHTML = '<circle r="8.5" fill="#1C2B26" stroke="#FCFCF9" stroke-width="1"/>' +
      '<text y="3.2" text-anchor="middle" font-size="9" fill="#FCFCF9">📷</text>';
    bg.addEventListener("click", e => { e.stopPropagation(); openDrawer(unit); });
    layer.appendChild(bg);
  });
}

/* tooltip */
const tt = document.getElementById("tt");
function showTT(e, u) {
  const e1 = u.end ? (pDate(u.end) < TODAY ? "EXPIRED " + fDate(pDate(u.end)) : "to " + fDate(pDate(u.end))) : "";
  tt.innerHTML = '<div class="h">' + u.unit + ' · ' + esc(u.dba) + '</div><div class="m">' + u.sf.toLocaleString() + ' SF' +
    (u.monthly ? ' · ' + fmt$0(u.monthly) + '/mo · $' + u.total.toFixed(2) + ' PSF' : '') + (e1 ? '<br>' + e1 : '') + '</div>';
  tt.style.display = "block";
  tt.style.left = Math.min(window.innerWidth - 280, e.clientX + 16) + "px";
  tt.style.top = (e.clientY + 14) + "px";
}
function hideTT() { tt.style.display = "none"; }

export function renderLegend() {
  document.getElementById("legend").innerHTML = legendFor(planMode).map(([l, c]) =>
    '<span class="li"><span class="sw" style="background:' + c + '"></span>' + l + '</span>').join("");
}

export function initPlan() {
  document.querySelectorAll(".plan-tools .chip[data-mode]").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".plan-tools .chip[data-mode]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); planMode = b.dataset.mode; drawPlan(); renderLegend();
    };
  });
  document.querySelectorAll(".plan-tools .chip[data-scope]").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".plan-tools .chip[data-scope]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); planScope = b.dataset.scope; drawPlan();
    };
  });
  const photoChip = document.querySelector('.plan-tools .chip[data-overlay="photos"]');
  if (photoChip) photoChip.onclick = () => {
    showPhotos = !showPhotos;
    photoChip.classList.toggle("on", showPhotos);
    drawPlan();
  };
  const opcVisible = () => { const opc = document.getElementById("overlayOpacity"); if (opc) opc.style.display = (overlays.roof || overlays.signage || showFacility) ? "" : "none"; };
  document.querySelectorAll('.plan-tools .chip[data-overlay="roof"],.plan-tools .chip[data-overlay="signage"]').forEach(chip => {
    chip.onclick = () => {
      const k = chip.dataset.overlay;
      overlays[k] = !overlays[k];
      chip.classList.toggle("on", overlays[k]);
      opcVisible();
      drawPlan();
    };
  });
  const facChip = document.querySelector('.plan-tools .chip[data-overlay="facility"]');
  if (facChip) facChip.onclick = () => {
    showFacility = !showFacility;
    facChip.classList.toggle("on", showFacility);
    opcVisible();
    drawPlan();
  };
  const opc = document.getElementById("overlayOpacity");
  if (opc) opc.oninput = () => { overlayOpacity = +opc.value / 100; drawPlan(); };
  // selection highlight tracks drawer open/close from any sheet
  subscribe(type => { if (type === "selection") drawPlan(); });
  onAssetChange(() => drawPlan()); // repaint badges when photos are added/removed
  drawPlan();
  renderLegend();
}
