/* A-1 Site Plan — renders geometry.json primitives + interactive unit rects.
   All coordinates live in geometry.json; this module only renders. */
import geometry from "../data/geometry.json";
import { UNITS, getSelected, subscribe, FEATURE_TYPES, getFeatures, addFeature, editFeature, removeFeature } from "../store.js";
import { unitFill, legendFor } from "../lib/colors.js";
import { fmt$0, pDate, fDate, esc, TODAY } from "../lib/format.js";
import { NS, g, rect, text, renderPrims } from "../lib/svg.js";
import { unitsWithAssets, onAssetChange, listAssets, revokeURL } from "../lib/assets.js";
import { openDrawer } from "./drawer.js";
import cameraRegistry from "../data/cameras.json";
import { drawableCameras, frustumPath, dwViewUrl, applyOverrides } from "../lib/cameras.js";
import { getCamOverrides, setCamOverride, clearCamOverride } from "../store.js";
import stallMap from "../data/stall-map.json";
import { latestByStall, rowOverlay } from "../lib/occupancy.js";
import { REMOTE, listOccupancy } from "../lib/remote.js";

let planMode = "status";
let planScope = "main";
let showFeatures = true;   // 📍 site-asset pins (features layer)
let addPinMode = false;    // ＋ Pin: next plan click drops a pin
let showPhotos = true; // 📷 badge on units that have photos/plans
let showParking = true;  // 🅿 plat-traced stall striping (carved-out layer)
let showCameras = false; // 🎥 CCTV mounts + view cones (registry: data/cameras.json)
let showOcc = false;     // 🚗 C3 stall occupancy (REMOTE only; stall-map.json row56)
let camEdit = false;     // ✎ Adjust: drag pins to move, drag the ◆ handle to re-aim
const overlays = { roof: false, signage: false }; // raster overlays (property-scope images)
let showFacility = false; // whole-center floor-plan overlay (static, registered to the unit envelope)
let overlayOpacity = 0.55;
let unitOpacity = 1; // unit-box fill opacity (dial down to read an overlay underneath)
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
  svg.classList.toggle("see-through", unitOpacity < 0.9); // dark, haloed labels when fill is faded
  svg.innerHTML = "";
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = '<pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
    '<rect width="7" height="7" fill="#FCFCF9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#B9BFAD" stroke-width="2"/></pattern>' +
    '<pattern id="hatch2" width="9" height="9" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">' +
    '<rect width="9" height="9" fill="#EDEFE8"/><line x1="0" y1="0" x2="0" y2="9" stroke="#CDD2C2" stroke-width="1.5"/></pattern>';
  svg.appendChild(defs);

  renderPrims(g(svg), geometry.layers.base);
  renderPrims(g(svg), geometry.layers.remoteLot);
  if (showOcc) paintOcc(g(svg, "occ-layer")); // under the stall striping
  if (showParking) renderPrims(g(svg, "parking-layer"), geometry.layers.parking);

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
    if (unitOpacity < 1) r.setAttribute("fill-opacity", unitOpacity);
    r.addEventListener("click", () => openDrawer(u.unit));
    r.addEventListener("mousemove", e => showTT(e, u));
    r.addEventListener("mouseleave", hideTT);
    const dark = u.status === "vacant";
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    // uniform unit numbers: one size, centered both axes, rotated only on tall bays
    const vertical = p.h > p.w; // long-building bays rotate; short-building stay upright
    const t = text(gb, cx, cy, u.unit,
      { class: "u-num" + (dark ? " dk" : ""), "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "15" });
    if (vertical) t.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
  });

  renderPrims(g(svg), geometry.layers.annotations);
  renderPrims(g(svg), geometry.layers.generalNotes);
  renderPrims(g(svg), geometry.layers.titleBlock);

  // photo badges drawn last (topmost, clickable); filled async from IndexedDB
  const badgeLayer = g(svg);
  paintBadges(badgeLayer);

  paintFeatures(g(svg, "feat-layer"));
  paintCameras(g(svg, "cam-layer"));
}

/* ---- C3 occupancy layer: latest classified state per covered row56 stall
   (stall-map.json indices over the plat tick band; samples from Supabase,
   cached 5 min). Occupied = green fill, unclear = slate, empty = outline,
   stale (no recent sample) = nothing. Best-effort like the UniFi card. ---- */
let occCache = { rows: null, at: 0 };
async function paintOcc(layer) {
  if (!REMOTE) return;
  if (!occCache.rows || Date.now() - occCache.at > 5 * 60e3) {
    try {
      occCache = { rows: await listOccupancy(6), at: Date.now() };
    } catch { return; } // overlay simply stays empty
    if (!layer.isConnected) return; // a newer render replaced us
  }
  const latest = latestByStall(occCache.rows);
  for (const s of rowOverlay(latest, stallMap)) {
    if (!s.rect || s.state === "stale") continue;
    const r = rect(layer, s.rect.x, s.rect.y, s.rect.w, s.rect.h, {
      fill: s.state === "occupied" ? "#2F6B4F" : s.state === "unclear" ? "#5F6E64" : "none",
      "fill-opacity": s.state === "occupied" ? 0.5 : 0.25,
      stroke: "#2F6B4F", "stroke-width": 0.6, "stroke-opacity": 0.5, rx: 1,
    });
    const tip = document.createElementNS(NS, "title");
    tip.textContent = "Stall " + s.index + " — " + s.state + " (" + s.id + ")";
    r.appendChild(tip);
  }
}

/* ---- CCTV layer: mounts + view cones (registry: src/data/cameras.json;
   operator drag-corrections persist via the store 'cameras' layer) ---- */
function paintCameras(layer) {
  if (!showCameras) return;
  const svgEl = document.getElementById("plan");
  const toPlan = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svgEl.getScreenCTM().inverse());
  const cams = drawableCameras(applyOverrides(cameraRegistry.cameras, getCamOverrides()));
  cams.forEach(cam => {
    let { x, y } = cam.pos, aim = cam.aimDeg;
    const grp = document.createElementNS(NS, "g");
    grp.setAttribute("class", "cam-pin");
    const cone = document.createElementNS(NS, "path");
    const setCone = () => cone.setAttribute("d", frustumPath({ ...cam, pos: { x, y }, aimDeg: aim }));
    setCone();
    cone.setAttribute("fill", "#A87E2F");
    cone.setAttribute("fill-opacity", "0.10");
    cone.setAttribute("stroke", "#A87E2F");
    cone.setAttribute("stroke-opacity", "0.45");
    cone.setAttribute("stroke-width", "0.8");
    cone.setAttribute("stroke-dasharray", "4 3");
    grp.appendChild(cone);
    const pin = document.createElementNS(NS, "g");
    const setPin = () => pin.setAttribute("transform", "translate(" + x + "," + y + ")");
    setPin();
    pin.innerHTML = '<circle r="9" fill="#1C2B26" stroke="#A87E2F" stroke-width="1.4"/>' +
      '<text y="3.4" text-anchor="middle" font-size="9" style="pointer-events:none">🎥</text>';
    grp.appendChild(pin);
    let aimHandle = null;
    const handlePos = () => {
      const a = aim * Math.PI / 180, r = (cam.rangePx || 150) * 0.8;
      return [x + r * Math.cos(a), y + r * Math.sin(a)];
    };
    if (camEdit) {
      aimHandle = document.createElementNS(NS, "circle");
      const setHandle = () => { const [hx, hy] = handlePos(); aimHandle.setAttribute("cx", hx); aimHandle.setAttribute("cy", hy); };
      setHandle();
      aimHandle.setAttribute("r", "6");
      aimHandle.setAttribute("fill", "#A87E2F");
      aimHandle.setAttribute("stroke", "#F6F7F1");
      aimHandle.setAttribute("stroke-width", "1.5");
      aimHandle.style.cursor = "grab";
      grp.appendChild(aimHandle);
      // drag ◆ handle → re-aim (persist on release)
      aimHandle.addEventListener("pointerdown", e => {
        e.stopPropagation(); e.preventDefault();
        aimHandle.setPointerCapture(e.pointerId);
        const move = ev => {
          const p = toPlan(ev);
          aim = ((Math.atan2(p.y - y, p.x - x) * 180 / Math.PI) % 360 + 360) % 360;
          setCone(); setHandle();
        };
        const up = () => {
          aimHandle.removeEventListener("pointermove", move);
          aimHandle.removeEventListener("pointerup", up);
          setCamOverride(cam.id, { x, y, aimDeg: Math.round(aim) });
        };
        aimHandle.addEventListener("pointermove", move);
        aimHandle.addEventListener("pointerup", up);
      });
      // drag pin → move mount (persist on release)
      pin.style.cursor = "grab";
      pin.addEventListener("pointerdown", e => {
        e.stopPropagation(); e.preventDefault();
        pin.setPointerCapture(e.pointerId);
        const move = ev => {
          const p = toPlan(ev);
          x = Math.round(p.x * 10) / 10; y = Math.round(p.y * 10) / 10;
          setPin(); setCone(); if (aimHandle) { const [hx, hy] = handlePos(); aimHandle.setAttribute("cx", hx); aimHandle.setAttribute("cy", hy); }
        };
        const up = () => {
          pin.removeEventListener("pointermove", move);
          pin.removeEventListener("pointerup", up);
          setCamOverride(cam.id, { x, y, aimDeg: Math.round(aim) });
        };
        pin.addEventListener("pointermove", move);
        pin.addEventListener("pointerup", up);
      });
      // double-click pin → drop the override, back to the seeded estimate
      pin.addEventListener("dblclick", e => { e.stopPropagation(); clearCamOverride(cam.id); });
    } else {
      grp.style.cursor = "pointer";
      grp.addEventListener("click", e => {
        e.stopPropagation();
        window.open(dwViewUrl(cam, cameraRegistry), "_blank", "noopener");
      });
    }
    grp.addEventListener("mousemove", e => showCamTT(e, cam));
    grp.addEventListener("mouseleave", hideTT);
    layer.appendChild(grp);
  });
}

function showCamTT(e, cam) {
  const hint = camEdit
    ? "drag pin to move · drag dot to aim · double-click resets"
    : "click for live view" + (cam.posConfidence === "estimated" ? " · position estimated" : "");
  tt.innerHTML = '<div class="h">🎥 ' + esc(cam.name) + '</div>' +
    '<div class="m">' + esc(cam.zone || "") + '</div>' +
    '<div class="m">' + esc(cam.ip) + ' · ' + hint + '</div>';
  tt.style.display = "block";
  tt.style.left = Math.min(window.innerWidth - 280, e.clientX + 16) + "px";
  tt.style.top = (e.clientY + 14) + "px";
}

/* ---- site-asset pins (digital-twin features layer) ---- */
const FEAT_META = Object.fromEntries(FEATURE_TYPES.map(([id, glyph, label]) => [id, { glyph, label }]));

function paintFeatures(layer) {
  if (!showFeatures) return;
  getFeatures().forEach(f => {
    const m = FEAT_META[f.type] || FEAT_META.other;
    const pin = document.createElementNS(NS, "g");
    pin.setAttribute("class", "feat-pin");
    pin.setAttribute("transform", "translate(" + f.x + "," + f.y + ")");
    pin.innerHTML = '<circle r="10" fill="#F6F7F1" stroke="#A87E2F" stroke-width="1.6"/>' +
      '<text y="3.8" text-anchor="middle" font-size="11" style="pointer-events:none">' + m.glyph + '</text>';
    pin.addEventListener("click", e => { e.stopPropagation(); openFeatureEditor(f, e); });
    pin.addEventListener("mousemove", e => showFeatTT(e, f, m));
    pin.addEventListener("mouseleave", hideTT);
    layer.appendChild(pin);
  });
}

function showFeatTT(e, f, m) {
  tt.innerHTML = '<div class="h">' + m.glyph + ' ' + esc(f.label || m.label) + '</div>' +
    (f.note ? '<div class="m">' + esc(f.note) + '</div>' : '<div class="m">' + m.label + '</div>');
  tt.style.display = "block";
  tt.style.left = Math.min(window.innerWidth - 280, e.clientX + 16) + "px";
  tt.style.top = (e.clientY + 14) + "px";
}

const readOnlyRole = () =>
  document.body.classList.contains("role-owner") || document.body.classList.contains("role-vendor");

let featEd = null; // open editor element
function closeFeatureEditor() { if (featEd) { featEd.remove(); featEd = null; } }
function openFeatureEditor(f, evt) {
  if (readOnlyRole()) { showFeatTT(evt, f, FEAT_META[f.type] || FEAT_META.other); return; }
  closeFeatureEditor();
  const card = document.querySelector("#pg-plan .plan-card");
  const ed = document.createElement("div");
  ed.className = "feat-editor";
  ed.innerHTML =
    '<div class="fe-h">Asset pin</div>' +
    '<select class="fe-type">' + FEATURE_TYPES.map(([id, glyph, label]) =>
      '<option value="' + id + '"' + (id === f.type ? " selected" : "") + '>' + glyph + " " + label + '</option>').join("") + '</select>' +
    '<input class="fe-label" placeholder="Label (e.g. Shutoff — units 101–109)" value="' + esc(f.label) + '">' +
    '<textarea class="fe-note" placeholder="Notes (valve size, access, condition…)">' + esc(f.note) + '</textarea>' +
    '<div class="fe-row"><button class="chip on fe-save">Save</button>' +
    '<button class="chip fe-del">Delete</button><button class="chip fe-x">Close</button></div>';
  card.appendChild(ed);
  const rect_ = card.getBoundingClientRect();
  ed.style.left = Math.min(rect_.width - 280, Math.max(8, evt.clientX - rect_.left + 12)) + "px";
  ed.style.top = Math.max(8, evt.clientY - rect_.top - 10) + "px";
  ed.querySelector(".fe-save").onclick = () => {
    editFeature(f.id, {
      type: ed.querySelector(".fe-type").value,
      label: ed.querySelector(".fe-label").value.trim(),
      note: ed.querySelector(".fe-note").value.trim()
    });
    closeFeatureEditor();
  };
  ed.querySelector(".fe-del").onclick = () => { removeFeature(f.id); closeFeatureEditor(); };
  ed.querySelector(".fe-x").onclick = closeFeatureEditor;
  featEd = ed;
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
  const parkChip = document.querySelector('.plan-tools .chip[data-overlay="parking"]');
  if (parkChip) parkChip.onclick = () => {
    showParking = !showParking;
    parkChip.classList.toggle("on", showParking);
    drawPlan();
  };
  const occChip = document.querySelector('.plan-tools .chip[data-overlay="occupancy"]');
  if (occChip) {
    if (!REMOTE) occChip.style.display = "none"; // samples live in Supabase only
    occChip.onclick = () => {
      showOcc = !showOcc;
      occChip.classList.toggle("on", showOcc);
      drawPlan();
    };
  }
  const camChip = document.querySelector('.plan-tools .chip[data-overlay="cameras"]');
  const camAdj = document.getElementById("camAdjust");
  const camAdjVisible = () => { if (camAdj) camAdj.hidden = !showCameras || readOnlyRole(); };
  if (camChip) camChip.onclick = () => {
    showCameras = !showCameras;
    camChip.classList.toggle("on", showCameras);
    if (!showCameras && camEdit) { camEdit = false; if (camAdj) camAdj.classList.remove("on"); }
    camAdjVisible();
    drawPlan();
  };
  if (camAdj) {
    camAdjVisible();
    camAdj.onclick = () => {
      camEdit = !camEdit;
      camAdj.classList.toggle("on", camEdit);
      drawPlan();
    };
  }
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
  const uop = document.getElementById("unitOpacity");
  const facChip = document.querySelector('.plan-tools .chip[data-overlay="facility"]');
  if (facChip) facChip.onclick = () => {
    showFacility = !showFacility;
    facChip.classList.toggle("on", showFacility);
    // turning the floor plan on fades units so you can read it; off restores
    unitOpacity = showFacility ? 0.4 : 1;
    if (uop) uop.value = unitOpacity * 100;
    opcVisible();
    drawPlan();
  };
  const opc = document.getElementById("overlayOpacity");
  if (opc) opc.oninput = () => { overlayOpacity = +opc.value / 100; drawPlan(); };
  if (uop) uop.oninput = () => { unitOpacity = +uop.value / 100; drawPlan(); };
  /* site-asset pins: show/hide + add mode */
  const featShow = document.getElementById("featShow");
  const featAdd = document.getElementById("featAdd");
  const featType = document.getElementById("featType");
  if (featType) featType.innerHTML = FEATURE_TYPES.map(([id, glyph, label]) =>
    '<option value="' + id + '">' + glyph + " " + label + '</option>').join("");
  if (featShow) featShow.onclick = () => {
    showFeatures = !showFeatures;
    featShow.classList.toggle("on", showFeatures);
    closeFeatureEditor();
    drawPlan();
  };
  if (featAdd) featAdd.onclick = () => {
    addPinMode = !addPinMode;
    featAdd.classList.toggle("on", addPinMode);
    if (featType) featType.hidden = !addPinMode;
    const svg = document.getElementById("plan");
    svg.style.cursor = addPinMode ? "crosshair" : "";
    if (addPinMode && !showFeatures) { showFeatures = true; featShow.classList.add("on"); drawPlan(); }
  };
  // capture-phase click so add-mode wins over unit rects / drawer
  document.getElementById("plan").addEventListener("click", e => {
    if (!addPinMode) return;
    e.stopPropagation(); e.preventDefault();
    const svg = document.getElementById("plan");
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const type = featType ? featType.value : "other";
    const f = addFeature({ type, label: "", note: "", x: pt.x, y: pt.y });
    openFeatureEditor(f, e); // name it right away
  }, true);

  // selection highlight tracks drawer open/close from any sheet
  subscribe(type => {
    if (type === "selection" || type === "cameras") drawPlan();
    if (type === "features" || type === "import") { closeFeatureEditor(); drawPlan(); }
  });
  onAssetChange(() => drawPlan()); // repaint badges when photos are added/removed
  drawPlan();
  renderLegend();
}
