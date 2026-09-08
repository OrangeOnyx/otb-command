/* Cypress property canvas. Presentation only: every boundary, bay and parking
   primitive comes from the existing REV 12 geometry. No geometry is written.
   The model is a projected SVG, so navigation works without WebGL or a service. */
import geometry from "../data/geometry.json";
import heights from "../data/heights.json";
import { NS, g, path, rect, text, renderPrims } from "./svg.js";
import { isoPoint, prismFaces, facePath, depthKey, COS } from "./iso.js";
import { PLAN_PER_FT } from "./splat-align.js";

const CYPRESS = "#1E4D3A", MOSS = "#2F6B4E", AMBER = "#D97706", BONE = "#F3EDE0";
const MODEL_Y = 0.78;
const derived = new Set(Object.values(geometry.demising).flatMap(b => b.bays)
  .filter(b => /derived/i.test(b[2] || "")).map(b => b[0]));
// The 135 mid-depth division is an interpretation within the plat's 37.4' bay.
derived.add("135A"); derived.add("135B");
let instance = 0;

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
function point(mode, x, y, z = 0) {
  if (mode === "plan") return { x, y };
  const p = isoPoint(x, y, z);
  return { x: p.x, y: p.y * MODEL_Y };
}
function bounds(points, padding = 0) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const x = Math.min(...xs) - padding, y = Math.min(...ys) - padding;
  return { x, y, w: Math.max(...xs) - x + padding, h: Math.max(...ys) - y + padding };
}

export function createCommandMap(host, opts = {}) {
  const id = `ccmap-${++instance}`;
  const units = (opts.units || []).filter(u => geometry.units[u.unit]);
  let mode = "model", selected = null, box, fitBox, disposed = false;
  let issueVisible = false, issueFocused = false, drag = null, dragged = false;
  let frame = 0;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div");
  root.className = "cc-map";
  root.innerHTML = `<style>
    .cc-map{position:relative;width:100%;height:100%;min-height:360px;overflow:hidden;background:#eee9dd;isolation:isolate;touch-action:none}
    .cc-map .cmd-map-svg{display:block;width:100%;height:100%;min-height:360px;position:absolute;inset:0;touch-action:none;cursor:grab;user-select:none}
    .cc-map .cmd-map-svg:active{cursor:grabbing}
    .cc-map .cc-suite{cursor:pointer;outline:none}
    .cc-map .cc-suite .cc-roof{transition:fill .16s,stroke .16s}
    .cc-map .cc-suite:hover .cc-roof,.cc-map .cc-suite:focus-visible .cc-roof{fill:#3c7a5b;stroke:#F3EDE0;stroke-width:3}
    .cc-map .cc-suite[aria-pressed="true"] .cc-roof{fill:#D97706;stroke:#F3EDE0;stroke-width:3}
    .cc-map .cc-suite:focus-visible{filter:drop-shadow(0 0 5px #D97706)}
    .cc-map .cc-suite-label{fill:#F3EDE0;font:600 15px 'JetBrains Mono',monospace;pointer-events:none;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#1E4D3A;stroke-width:1px}
    .cc-map .cc-suite[aria-pressed="true"] .cc-suite-label{fill:#0A1F16;stroke:none}
    .cc-map .cc-street{fill:#677565;font:600 16px 'Inter',sans-serif;letter-spacing:2px;pointer-events:none;text-anchor:middle;paint-order:stroke;stroke:#e8e3d7;stroke-width:4px;stroke-linejoin:round}
    .cc-map .cc-ground-label{fill:#677565;font:500 14px 'Inter',sans-serif;letter-spacing:1px;text-anchor:middle;pointer-events:none}
    .cc-map .cc-hud{position:absolute;right:20px;bottom:18px;display:flex;align-items:center;gap:12px;pointer-events:none;color:#506052;font:11px/1.5 'Inter',sans-serif;max-width:calc(100% - 110px)}
    .cc-map .cc-hud b{display:block;color:#1E4D3A;font-weight:600;letter-spacing:.08em;font-size:10px;text-transform:uppercase}
    .cc-map .cc-compass{width:64px;height:64px;flex:none;background:#f3ede0df;border:1px solid #1e4d3a1f;border-radius:50%}
    .cc-map .cc-note{background:#f3ede0e8;padding:8px 11px;border:1px solid #1e4d3a18;border-radius:5px;backdrop-filter:blur(8px)}
    .cc-map .cc-tip{position:absolute;z-index:5;pointer-events:none;background:#0A1F16f2;color:#F3EDE0;border:1px solid #587360;border-radius:7px;padding:9px 12px;max-width:250px;font:12px/1.4 'Inter',sans-serif;box-shadow:0 8px 20px #0a1f1620}
    .cc-map .cc-tip strong{display:block;font-weight:600}.cc-map .cc-tip span{display:block;font-size:10px;color:#b7c7b5;margin-top:3px}
    .cc-map .cc-issue{cursor:pointer;outline:none}.cc-map .cc-issue:hover .cc-issue-chip,.cc-map .cc-issue:focus-visible .cc-issue-chip{fill:#E79B3B;stroke:#0A1F16;stroke-width:2}
    @media(prefers-reduced-motion:reduce){.cc-map .cc-suite .cc-roof{transition:none}}
    @media(max-width:650px){.cc-map .cc-hud{right:10px;bottom:10px;gap:6px}.cc-map .cc-note{font-size:9px;padding:6px 8px}.cc-map .cc-compass{width:48px;height:48px}}
  </style>`;
  const svg = el("svg", { class: "cmd-map-svg", role: "group", "aria-label": "On The Boulevard property model. Drag to pan, scroll to zoom, or select a suite.", preserveAspectRatio: "xMidYMid meet" });
  root.appendChild(svg);
  const hud = document.createElement("div"); hud.className = "cc-hud";
  const compass = el("svg", { class: "cc-compass", viewBox: "0 0 80 80", "aria-label": "True north from recorded plat bearings", role: "img" });
  const note = document.createElement("div"); note.className = "cc-note";
  hud.append(compass, note); root.appendChild(hud);
  const tip = document.createElement("div"); tip.className = "cc-tip"; tip.hidden = true; root.appendChild(tip);
  host.appendChild(root);

  function showTip(event, unit) {
    tip.replaceChildren();
    const name = document.createElement("strong"); name.textContent = `Suite ${unit.unit} · ${unit.dba || "Record available"}`;
    const detail = document.createElement("span");
    detail.textContent = derived.has(unit.unit) ? "Derived division · select to review sources" : "Plat demising string · select to review sources";
    tip.append(name, detail); tip.hidden = false;
    const r = root.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.width - 265, event.clientX - r.left + 14)) + "px";
    tip.style.top = Math.max(8, Math.min(r.height - 70, event.clientY - r.top + 16)) + "px";
  }
  function applyBox() { svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`); }
  function moveTo(next, animate = false) {
    cancelAnimationFrame(frame);
    if (!animate || reduceMotion || !box) { box = { ...next }; applyBox(); return; }
    const from = { ...box }, start = performance.now();
    const tick = now => {
      if (disposed) return;
      const t = Math.min(1, (now - start) / 320), ease = 1 - (1 - t) ** 3;
      box = Object.fromEntries(Object.keys(next).map(k => [k, from[k] + (next[k] - from[k]) * ease]));
      applyBox(); if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function modelFaces(r, height) {
    const faces = prismFaces(r, height);
    return Object.fromEntries(Object.entries(faces).map(([key, pts]) => [key, pts.map(p => ({ x: p.x, y: p.y * MODEL_Y }))]));
  }
  function drawCompass() {
    compass.replaceChildren();
    // Plan x runs N38°32'W, y runs N51°28'E. Include the documented
    // anisotropy before projecting the true-north vector into this view.
    const angle = (38 + 32 / 60) * Math.PI / 180;
    const scale = geometry.boundary?.transform || {};
    const nx = Math.cos(angle) * (scale.kxPxPerFt || 1.85148);
    const ny = Math.sin(angle) * (scale.kyPxPerFt || 1.88663);
    const vector = point(mode, nx, ny), length = Math.hypot(vector.x, vector.y);
    const dx = vector.x / length, dy = vector.y / length;
    const ex = 40 + dx * 19, ey = 36 + dy * 19;
    path(compass, `M ${40 - dx * 15} ${36 - dy * 15} L ${ex} ${ey}`, { stroke: CYPRESS, "stroke-width": 2 });
    path(compass, `M ${ex} ${ey} L ${ex - dx * 9 - dy * 4} ${ey - dy * 9 + dx * 4} L ${ex - dx * 9 + dy * 4} ${ey - dy * 9 - dx * 4} Z`, { fill: CYPRESS });
    text(compass, 40 + dx * 29, 39 + dy * 29, "N", { fill: CYPRESS, "font-size": 12, "font-weight": 700, "text-anchor": "middle", "font-family": "'Inter',sans-serif" });
  }
  function render() {
    svg.replaceChildren(); tip.hidden = true;
    const defs = el("defs");
    const filter = el("filter", { id: `${id}-shadow`, x: "-40%", y: "-50%", width: "190%", height: "210%" });
    filter.appendChild(el("feDropShadow", { dx: 8, dy: 14, stdDeviation: 8, "flood-color": "#0A1F16", "flood-opacity": .16 }));
    defs.appendChild(filter); svg.appendChild(defs);
    const ground = g(svg, "cc-ground");
    if (mode === "model") ground.setAttribute("transform", `matrix(${COS} ${0.5 * MODEL_Y} ${-COS} ${0.5 * MODEL_Y} 0 0)`);
    // A neutral ground bed is presentation, not a claim about parcel extent.
    rect(ground, -80, -355, 1640, 1170, { fill: "#E9E4D8", rx: 10 });
    const boundary = geometry.layers.base.find(p => p.t === "path" && p.attrs?.["stroke-dasharray"] === "14 5 3 5");
    if (boundary) path(ground, boundary.d, { fill: "#DED8CB", stroke: "none" });
    const palette = { "#DDE0D4": "#D6D6C8", "#E8EBE0": "#DCE0CE", "#E2E5D9": "#D8DCCB", "#CDD2C2": "#A7B49C", "#C9CEBE": "#95A48B", "#C2C8B5": "#95A48B", "#AEB4A2": "#AAB6A0", "#1C2B26": "#55694F", "#FCFCF9": "#F3EDE0", "#8A937F": "#8A987D" };
    const groundPrims = prims => prims.filter(p => p.t !== "text").map(p => ({ ...p, attrs: Object.fromEntries(Object.entries(p.attrs || {}).map(([k, v]) => [k, palette[v] || v])) }));
    renderPrims(g(ground), groundPrims(geometry.layers.base));
    renderPrims(g(ground), groundPrims(geometry.layers.remoteLot));
    renderPrims(g(ground), groundPrims(geometry.layers.parking));
    const labels = g(svg, "cc-labels");
    const streetRows = [
      ["M A R I E", "MARIE ANTOINETTE · SERVICE SIDE", false],
      ["A R N O U L D", "ARNOULD BOULEVARD · STOREFRONTS", false],
      ["P A T R I C I A", "PATRICIA STREET", true],
      ["J O H N S T O N", "JOHNSTON STREET", true]
    ];
    for (const [match, label, vertical] of streetRows) {
      const source = geometry.layers.base.find(p => p.t === "text" && p.s.includes(match));
      if (!source) continue;
      const pos = point(mode, source.x, source.y);
      const angle = mode === "model" ? (vertical ? -1 : 1) * Math.atan2(.5 * MODEL_Y, COS) * 180 / Math.PI : (vertical ? -90 : 0);
      text(labels, pos.x, pos.y, label, { class: "cc-street", transform: `rotate(${angle} ${pos.x} ${pos.y})` });
    }
    const siteLabels = [[655, 490, "MAIN PARKING FIELD"], [178, 500, "JD BANK · NOT A PART"]];
    for (const [x, y, label] of siteLabels) {
      const p = point(mode, x, y); text(labels, p.x, p.y, label, { class: "cc-ground-label", "font-size": label === "LOT 7" ? 20 : 12 });
    }
    // Screen-space line spacing stays legible when ground geometry is projected.
    const remoteCenter = point(mode, 1265, -110);
    [[-22, "LOT 7"], [0, "REMOTE PARKING"], [21, "ACROSS MARIE ANTOINETTE"]].forEach(([dy, label]) => {
      text(labels, remoteCenter.x, remoteCenter.y + dy, label, { class: "cc-ground-label", style: `font-size:${dy === -22 ? 19 : 12}px;${dy === -22 ? "font-weight:700" : ""}` });
    });
    const suiteLayer = g(svg, "cc-suites");
    const rows = units.map(u => ({ ...geometry.units[u.unit], unit: u.unit, record: u })).sort((a, b) => depthKey(a) - depthKey(b));
    for (const r of rows) {
      const group = g(suiteLayer, "cc-suite");
      group.setAttribute("data-suite", r.unit); group.setAttribute("role", "button"); group.setAttribute("tabindex", "0");
      group.setAttribute("aria-label", `Suite ${r.unit} — ${r.record.dba || "Record available"}`);
      group.setAttribute("aria-pressed", String(r.unit === selected));
      const title = el("title"); title.textContent = `Suite ${r.unit} · ${r.record.dba || ""}\n${derived.has(r.unit) ? "Derived suite division" : "Plat demising string"}`; group.appendChild(title);
      const height = (heights[r.unit] || 16.4) * PLAN_PER_FT;
      let roof;
      if (mode === "model") {
        const f = modelFaces(r, height);
        path(group, facePath(f.front), { fill: "#163C2D", stroke: "#173F2F", "stroke-width": .65 });
        path(group, facePath(f.right), { fill: "#102E22", stroke: "#173F2F", "stroke-width": .65 });
        roof = path(group, facePath(f.top), { fill: CYPRESS, stroke: "#7C977C", "stroke-width": .9, class: "cc-roof" });
      } else {
        roof = rect(group, r.x, r.y, r.w, r.h, { fill: CYPRESS, stroke: "#7C977C", "stroke-width": 1, class: "cc-roof", rx: 1 });
      }
      if (derived.has(r.unit)) roof.setAttribute("stroke-dasharray", "5 3");
      const p = point(mode, r.x + r.w / 2, r.y + r.h / 2, mode === "model" ? height : 0);
      const num = text(group, p.x, p.y, r.unit, { class: "cc-suite-label" });
      if (mode === "plan" && r.h > r.w) num.setAttribute("transform", `rotate(-90 ${p.x} ${p.y})`);
      group.addEventListener("click", e => { if (dragged) return; e.stopPropagation(); selectSuite(r.unit); opts.onPick?.(r.unit); });
      group.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectSuite(r.unit); opts.onPick?.(r.unit); } });
      group.addEventListener("pointermove", e => { if (!drag) showTip(e, r.record); });
      group.addEventListener("pointerleave", () => { tip.hidden = true; });
    }
    if (mode === "model") suiteLayer.setAttribute("filter", `url(#${id}-shadow)`);
    drawIssue(); drawCompass();
    note.innerHTML = mode === "model"
      ? "<b>Recorded geometry · visual massing</b>CAD-assigned heights · dashed divisions are derived"
      : "<b>Recorded plan · street-oriented</b>Dashed suite divisions are derived · scroll to zoom";
    const corners = [[-55, -315], [1510, -315], [1510, 780], [-55, 780]].map(([x, y]) => point(mode, x, y));
    fitBox = bounds(corners, 34);
    moveTo(fitBox);
  }
  function drawIssue() {
    svg.querySelector(".cc-issue")?.remove();
    if (!issueVisible) return;
    const layer = g(svg, "cc-issue");
    layer.setAttribute("role", "button"); layer.setAttribute("tabindex", "0");
    layer.setAttribute("aria-label", "Reported maintenance at suites 101 and 103 frontage. Exact point unknown. Open issue records.");
    // Association with source-named storefronts only. These lines follow suite
    // edges; they do not assert a pothole point, polygon, area or extent.
    for (const unit of ["101", "103"]) {
      const r = geometry.units[unit], a = point(mode, r.x, r.y + r.h), b = point(mode, r.x + r.w, r.y + r.h);
      path(layer, `M ${a.x} ${a.y} L ${b.x} ${b.y}`, { fill: "none", stroke: AMBER, "stroke-width": issueFocused ? 7 : 5, "stroke-dasharray": "7 5", "stroke-linecap": "round" });
    }
    const first = geometry.units["101"], last = geometry.units["103"];
    const anchor = point(mode, (first.x + last.x + last.w) / 2, first.y + first.h);
    const labelX = anchor.x - 220, labelY = anchor.y + 132;
    path(layer, `M ${anchor.x} ${anchor.y + 9} L ${anchor.x} ${labelY - 14} L ${labelX - 14} ${labelY - 14}`, { fill: "none", stroke: AMBER, "stroke-width": 1.5 });
    rect(layer, labelX - 14, labelY - 34, 312, 49, { fill: AMBER, rx: 6, class: "cc-issue-chip" });
    text(layer, labelX, labelY - 14, "REPORTED FRONTAGE", { fill: "#0A1F16", "font-size": 13, "font-weight": 700, "font-family": "'Inter',sans-serif", "letter-spacing": "1px", "pointer-events": "none" });
    text(layer, labelX, labelY + 3, "Exact point unknown · open records", { fill: "#0A1F16", "font-size": 11, "font-family": "'Inter',sans-serif", "pointer-events": "none" });
    layer.addEventListener("click", e => { if (dragged) return; e.stopPropagation(); opts.onIssue?.(); });
    layer.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onIssue?.(); } });
  }
  function selectSuite(unit) {
    selected = unit;
    svg.querySelectorAll(".cc-suite").forEach(node => node.setAttribute("aria-pressed", String(node.dataset.suite === unit)));
  }
  function focusSuite(unit) {
    const r = geometry.units[unit]; if (!r) return;
    selectSuite(unit);
    const z = mode === "model" ? (heights[unit] || 16.4) * PLAN_PER_FT : 0;
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].flatMap(([x, y]) => [point(mode, x, y), point(mode, x, y, z)]);
    const b = bounds(pts, 160); moveTo(b, true);
  }
  function focusIssue() {
    if (!issueVisible) return;
    issueFocused = true; drawIssue();
    const a = geometry.units["101"], b = geometry.units["103"];
    const pts = [[a.x, a.y], [b.x + b.w, b.y], [b.x + b.w + 180, b.y + b.h + 180], [a.x, a.y + a.h + 160]].map(([x, y]) => point(mode, x, y));
    moveTo(bounds(pts, 100), true);
  }
  function zoomBy(factor, anchor) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    cancelAnimationFrame(frame);
    const width = Math.min(fitBox.w * 1.8, Math.max(fitBox.w / 9, box.w / factor));
    const scale = width / box.w, cx = anchor?.x ?? box.x + box.w / 2, cy = anchor?.y ?? box.y + box.h / 2;
    moveTo({ x: cx - (cx - box.x) * scale, y: cy - (cy - box.y) * scale, w: width, h: box.h * scale });
  }
  function svgPoint(event) {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  }
  const controller = new AbortController();
  const listen = (event, callback, extra = {}) => svg.addEventListener(event, callback, { signal: controller.signal, ...extra });
  listen("wheel", e => { e.preventDefault(); tip.hidden = true; zoomBy(Math.exp(-Math.max(-140, Math.min(140, e.deltaY)) * .002), svgPoint(e)); }, { passive: false });
  listen("pointerdown", e => {
    if (e.button !== 0) return;
    cancelAnimationFrame(frame); dragged = false; tip.hidden = true;
    const p = svgPoint(e); if (!p) return;
    drag = { pointer: e.pointerId, startX: e.clientX, startY: e.clientY, point: p, box: { ...box } };
    // Capture on the original SVG target so click activation retains its suite.
    e.target.setPointerCapture?.(e.pointerId);
  });
  listen("pointermove", e => {
    if (!drag || drag.pointer !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4 && !dragged) return;
    dragged = true; tip.hidden = true;
    const p = svgPoint(e); if (!p) return;
    box.x += drag.point.x - p.x; box.y += drag.point.y - p.y; applyBox();
  });
  listen("pointerup", () => { drag = null; });
  listen("pointercancel", () => { drag = null; dragged = false; });
  listen("dblclick", e => { if (!e.target.closest(".cc-suite,.cc-issue")) zoomBy(1.5, svgPoint(e)); });
  const observer = new ResizeObserver(() => { if (!disposed && box) applyBox(); }); observer.observe(host);
  render();
  return {
    selectSuite, focusSuite, focusIssue, zoomBy,
    setIssueVisible(value) { issueVisible = Boolean(value); issueFocused = false; drawIssue(); },
    setView(next) { if (!["plan", "model"].includes(next) || next === mode) return; mode = next; render(); },
    reset() { issueFocused = false; drawIssue(); moveTo(fitBox, true); },
    resize() { if (box) applyBox(); },
    dispose() { disposed = true; cancelAnimationFrame(frame); controller.abort(); observer.disconnect(); root.remove(); }
  };
}
