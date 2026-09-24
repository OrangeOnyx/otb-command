/* A-1 site register — the column-twin treatment for the whole site plan:
   highlight by category, pick from the plan or the list, isolate, focus,
   labels, CSV/JSON export (plan: docs/superpowers/plans/2026-09-24-a1-site-register.md).
   Pure data lives in lib/siteassets.js; this module owns the panel DOM and the
   top-most SVG layer. Brass = highlighted, amber = selected; neither is condition. */
import geometry from "../data/geometry.json";
import cameraRegistry from "../data/cameras.json";
import siteRegister from "../data/site-register.json";
import meterDoc from "../data/meters.json";
import { UNITS, getCamOverrides, getFeatures } from "../store.js";
import { drawableCameras, applyOverrides } from "../lib/cameras.js";
import { buildRegister, registerCSV, bboxOf, centerOf, categoryCounts, CATEGORIES, CAT } from "../lib/siteassets.js";
import { esc } from "../lib/format.js";
import { NS } from "../lib/svg.js";

const S = { open: false, cats: new Set(["zone", "column"]), isolate: false, labels: false, sel: null, q: "", group: null };
let reg = [], byId = new Map(), redraw = () => {};

function rebuild() {
  const cams = drawableCameras(applyOverrides(cameraRegistry.cameras, getCamOverrides()));
  const name = id => (UNITS.find(u => String(u.unit) === id) || {}).dba || "";
  reg = buildRegister(geometry, { cameras: cams, unitName: name, items: siteRegister.items, meters: meterDoc.meters, pins: getFeatures() });
  byId = new Map(reg.map(a => [a.id, a]));
  if (S.sel && !byId.has(S.sel)) S.sel = null;
}
export const registerOpen = () => S.open;

function family(a) { // the selection plus its children (zone → stalls, meter cluster → meters)
  const ids = new Set([a.id, ...(a.children || [])]);
  for (const x of reg) if (x.parent === a.id) ids.add(x.id);
  return ids;
}

export function paintRegister(svg) {
  svg.classList.toggle("reg-isolate", S.open && S.isolate);
  if (!S.open) return;
  rebuild();
  const layer = document.createElementNS(NS, "g");
  layer.setAttribute("class", "reg-layer");
  const sel = S.sel && byId.get(S.sel);
  const on = sel ? family(sel) : new Set();
  for (const a of reg) {
    if (a.unlocated || (!S.cats.has(a.cat) && !on.has(a.id))) continue;
    const el = shape(a);
    el.setAttribute("class", "reg-shape" + (a.line ? " reg-line" : "") + (on.has(a.id) ? " reg-on" : ""));
    el.dataset.id = a.id;
    el.addEventListener("click", e => { e.stopPropagation(); select(a.id, false); });
    const t = document.createElementNS(NS, "title"); t.textContent = a.label + " · " + a.id + " · " + a.status; el.appendChild(t);
    layer.appendChild(el);
    if (S.labels && (a.cat !== "stall" || on.has(a.id))) layer.appendChild(label(a));
  }
  svg.appendChild(layer);
}
function shape(a) {
  if (a.point) { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", a.point[0]); c.setAttribute("cy", a.point[1]); c.setAttribute("r", 4.5); return c; }
  if (a.d) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", a.d); return p; }
  if (a.line) { const p = document.createElementNS(NS, "polyline"); p.setAttribute("points", a.line.map(pt => pt.join(",")).join(" ")); return p; }
  const g = document.createElementNS(NS, "g");
  for (const q of a.polys) { const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", q.map(pt => pt.join(",")).join(" ")); g.appendChild(p); }
  return g;
}
function label(a) {
  const [x, y] = centerOf(a), t = document.createElementNS(NS, "text");
  t.setAttribute("x", x); t.setAttribute("y", a.point ? y - 7 : y + 2);
  t.setAttribute("class", "reg-label");
  t.textContent = a.cat === "stall" ? a.label.split("-").pop() : a.cat === "column" ? a.label.replace("Column ", "C")
    : a.label.split(" — ")[0].slice(0, 28);
  return t;
}

function select(id, zoom) { S.sel = S.sel === id && !zoom ? null : id; redraw(); if (zoom && S.sel) focus(id); renderPanel(); }
function focus(id) {
  const a = byId.get(id); if (!a || a.unlocated) return;
  const b = bboxOf(a), pad = Math.max(40, Math.max(b.w, b.h) * 0.6);
  const w = Math.max(160, b.w + pad * 2), h = w * (990 / 1480);
  document.getElementById("plan").setAttribute("viewBox",
    [b.x + b.w / 2 - w / 2, b.y + b.h / 2 - h / 2, w, h].map(n => Math.round(n)).join(" "));
}

function renderPanel() {
  if (!S.open) return;
  const n = categoryCounts(reg);
  const groups = [...new Set(CATEGORIES.map(c => c[2]))];
  document.getElementById("srCats").innerHTML = groups.map(gr =>
    `<div class="sr-group"><span class="sr-gname">${esc(gr)}</span>` +
    CATEGORIES.filter(c => c[2] === gr).map(([id, lab, , ph]) =>
      `<button type="button" class="chip${S.cats.has(id) ? " on" : ""}${ph && !n[id] ? " sr-ph" : ""}" data-cat="${id}" aria-pressed="${S.cats.has(id)}"` +
      ` title="${ph && !n[id] ? "No record on file — drop a 📍 pin of this type to fill it" : esc(lab)}">${esc(lab)} <span class="sr-n">${n[id]}</span></button>`).join("") +
    `</div>`).join("");
  const a = S.sel && byId.get(S.sel);
  document.getElementById("srSel").innerHTML = a
    ? `<h3>${esc(a.label)}</h3><p class="sr-muted">${esc(a.sub || "")}</p><dl>` +
      `<dt>Asset ID</dt><dd><code>${esc(a.id)}</code></dd><dt>Category</dt><dd>${esc(CAT[a.cat]?.label || a.cat)}</dd>` +
      `<dt>Verification</dt><dd>${esc(a.status)}${a.located ? " · placed at " + esc(a.located) : ""}${a.unlocated ? " · <b>not located</b>" : ""}</dd>` +
      (a.count != null ? `<dt>Count</dt><dd>${a.count}</dd>` : "") +
      (a.unit ? `<dt>Suite</dt><dd>${esc(a.unit)}</dd>` : "") +
      (a.codexAssetId ? `<dt>3D twin</dt><dd><code>${esc(a.codexAssetId)}</code> (${esc(a.codexLabel)})</dd>` : "") +
      (a.parent && byId.get(a.parent) ? `<dt>Parent</dt><dd><button type="button" class="linkish" data-pick="${esc(a.parent)}">${esc(byId.get(a.parent).label)}</button></dd>` : "") +
      `<dt>Source</dt><dd>${esc(a.source)}</dd></dl>` +
      (a.unlocated ? "" : `<button type="button" class="chip on" id="srFocus">Focus on this asset</button>`)
    : `<p class="sr-muted">Click a highlighted asset on the plan or pick one below.</p>`;
  const q = S.q.trim().toLowerCase();
  // unfiltered list = the highlighted categories (stalls stay folded) + the selection's own family, so picking a
  // zone lists its stalls and picking a meter cluster lists its meters even when those categories are off
  const fam = a ? family(a) : new Set();
  if (a?.parent) for (const x of reg) if (x.parent === a.parent) fam.add(x.id);
  const rows = reg.filter(x => q ? (x.label + " " + x.id + " " + (x.sub || "") + " " + x.cat + " " + x.status).toLowerCase().includes(q)
    : (S.cats.has(x.cat) && x.cat !== "stall") || fam.has(x.id));
  document.getElementById("srList").innerHTML = rows.slice(0, 500).map(x =>
    `<button type="button" class="sr-row${x.id === S.sel ? " on" : ""}${x.parent ? " child" : ""}" data-pick="${esc(x.id)}">` +
    `<span>${esc(x.label)}</span><span class="sr-muted">${esc(x.status)}${x.unlocated ? " · unlocated" : ""}</span></button>`).join("") ||
    `<p class="sr-muted">${q ? "No matching assets." : "Turn on a category above to list its assets."}</p>`;
  document.getElementById("srCount").textContent = reg.length + " assets · " + CATEGORIES.length + " categories";
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const el = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initRegister(opts) {
  redraw = opts.redraw;
  const panel = document.getElementById("siteRegister"), btn = document.getElementById("regShow");
  if (!panel || !btn) return;
  btn.addEventListener("click", () => {
    S.open = !S.open; btn.classList.toggle("on", S.open); panel.hidden = !S.open;
    document.getElementById("planCard").classList.toggle("with-register", S.open);
    redraw(); renderPanel();
  });
  panel.addEventListener("click", e => {
    const cat = e.target.closest("[data-cat]")?.dataset.cat;
    if (cat) { S.cats.has(cat) ? S.cats.delete(cat) : S.cats.add(cat); redraw(); renderPanel(); return; }
    const pick = e.target.closest("[data-pick]")?.dataset.pick;
    if (pick) { select(pick, true); return; }
    if (e.target.id === "srFocus" && S.sel) focus(S.sel);
  });
  document.getElementById("srIsolate").addEventListener("change", e => { S.isolate = e.target.checked; redraw(); });
  document.getElementById("srLabels").addEventListener("change", e => { S.labels = e.target.checked; redraw(); });
  document.getElementById("srSearch").addEventListener("input", e => { S.q = e.target.value; renderPanel(); });
  document.getElementById("srReset").addEventListener("click", () => { S.sel = null; redraw(); renderPanel(); });
  const stamp = () => new Date().toISOString().slice(0, 10);
  document.getElementById("srCsv").addEventListener("click", () =>
    download(`OTB-site-register-${stamp()}.csv`, registerCSV(reg), "text/csv"));
  document.getElementById("srJson").addEventListener("click", () =>
    download(`OTB-site-register-${stamp()}.json`, JSON.stringify({
      product: "Cypress Command Platform", property: "On The Boulevard Shopping Center", geometryRev: geometry.rev,
      coordinates: "A-1 plan px (viewBox 0 0 1480 990; unequal x/y scale — see geometry.boundary.transform)",
      generated: stamp(), fits: siteRegister.fits, categories: CATEGORIES.map(([id, label, group, ph]) => ({ id, label, group, placeholder: !!ph })),
      assets: reg }, null, 1), "application/json"));
}
