/* A-1 Site Plan — renders geometry.json primitives + interactive unit rects.
   All coordinates live in geometry.json; this module only renders. */
import geometry from "../data/geometry.json";
import { UNITS, getSelected, subscribe } from "../store.js";
import { unitFill, legendFor } from "../lib/colors.js";
import { fmt$0, pDate, fDate, esc, TODAY } from "../lib/format.js";
import { NS, g, rect, text, renderPrims } from "../lib/svg.js";
import { openDrawer } from "./drawer.js";

let planMode = "status";
let planScope = "main";

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
  // selection highlight tracks drawer open/close from any sheet
  subscribe(type => { if (type === "selection") drawPlan(); });
  drawPlan();
  renderLegend();
}
