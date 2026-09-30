/* A-6 Asset Library — Cypress Command Platform CRE library, OTB slice.
   One UI for both the app sheet (src/views/asset-library.js) and the standalone
   preview that tools/cre-library/build-otb-slice.mjs writes under docs/.
   Geometry arrives as script-free SVG from the bundle; tenancy/status is a
   SEPARATE overlay built here from live unit records and bound by entity ID
   only. Pure DOM, no framework; styles scoped to .cc-cre. */

const LEASE = { active: "occupied", anchor: "occupied", owner: "owner-occupied", vacant: "vacant" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const suiteEntityId = (label) => "suite-otb-" + String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* units: [{unit, dba, use, status, sf}] (units.public.json shape / store UNITS);
   panels: [{entity_id, key, unit, physicalReads, note}] from the bundle. */
export function buildOverlay(units, panels) {
  const byUnit = Object.fromEntries(units.map((u) => [u.unit, u]));
  const suites = units.map((u) => ({
    entity_id: suiteEntityId(u.unit), suite_label: u.unit,
    lease_state: LEASE[u.status] ?? "unknown", source_status: u.status ?? null,
    display_name: u.dba || null, use: u.use || null, lease_sf: u.sf ?? null
  }));
  const out = panels.map((p) => {
    const tenant = p.unit ? byUnit[p.unit] : null;
    const reads = p.physicalReads || null;
    const conflict = !!(reads && tenant && reads !== tenant.dba);
    return {
      entity_id: p.entity_id, panel_key: p.key, suite_entity_id: p.unit ? suiteEntityId(p.unit) : null,
      content_mode: p.unit ? "tenant" : "empty", display_name: tenant?.dba ?? null, installed_reads: reads,
      state: conflict ? "conflict" : (p.unit ? "tenant" : "empty"),
      note: conflict ? `Installed panel reads "${reads}"; tenant of record for ${p.unit} is "${tenant.dba}".${/re-skin/i.test(p.note || "") ? " Scheduled: re-skin when the new pylon sign is installed." : ""}` : null
    };
  });
  return { suites, panels: out };
}

const STYLE = `
.cc-lib{background:var(--cc-cre-surface);color:var(--cc-cre-text);font-family:var(--cc-cre-font-ui);border-radius:8px}
.cc-lib .band{display:flex;align-items:center;gap:16px 24px;flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid var(--cc-cre-rule)}
.cc-lib[data-cc-theme="dark"] .band.brand{background:#0A1F16}
.cc-lib .band img{width:260px;height:auto}
.cc-lib .band h1{font-family:var(--cc-cre-font-display);font-weight:600;font-size:1.2rem;margin:0}
.cc-lib .band p{margin:2px 0 0;color:var(--cc-cre-text-muted);font-size:.84rem}
.cc-lib .draft{font-family:var(--cc-cre-font-meta);font-size:.72rem;letter-spacing:.06em;border:1px solid var(--cc-cre-watch);color:var(--cc-cre-watch);padding:4px 8px;border-radius:4px}
.cc-lib .controls{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.cc-lib button{font:inherit;cursor:pointer}
.cc-lib .tog{background:var(--cc-cre-surface-raised);color:var(--cc-cre-text);border:1px solid var(--cc-cre-text-muted);border-radius:6px;padding:6px 12px}
.cc-lib .tog[aria-pressed="true"]{background:var(--cc-cre-action-fill);color:var(--cc-cre-action-text);border-color:var(--cc-cre-action-fill)}
.cc-lib :focus-visible{outline:3px solid var(--cc-cre-focus);outline-offset:2px}
.cc-lib .grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:24px;padding:20px}
@media (max-width:980px){.cc-lib .grid{grid-template-columns:minmax(0,1fr);padding:16px}}
.cc-lib section h2{font-family:var(--cc-cre-font-display);font-size:1rem;margin:0 0 4px}
.cc-lib section .sub{font-family:var(--cc-cre-font-meta);font-size:.7rem;color:var(--cc-cre-text-muted);margin:0 0 8px;letter-spacing:.04em;text-transform:uppercase}
.cc-lib .sheet{background:var(--cc-cre-surface-raised);border:1px solid var(--cc-cre-rule);border-radius:8px;padding:12px;margin-bottom:24px;overflow-x:auto}
.cc-lib .sheet svg{display:block;width:var(--w,100%);max-width:none;height:auto}
.cc-lib .sheet.sign svg{width:100%;max-width:360px;margin:0 auto}
.cc-lib .sheet.plan svg{width:100%;min-width:720px}
.cc-lib .cc-entity{cursor:pointer}
.cc-lib .cc-entity:focus{outline:none}
.cc-lib .cc-entity:focus-visible .cc-hit,.cc-lib .cc-entity.sel .cc-hit,.cc-lib .cc-entity:focus-visible .cc-face,.cc-lib .cc-entity.sel .cc-face,.cc-lib .cc-entity.sel .cc-plan-suite{stroke:var(--cc-cre-focus);stroke-width:3}
.cc-lib.ov .cc-entity[data-state="vacant"] :is(.cc-hit,.cc-face,.cc-plan-suite){fill:var(--cc-cre-action);fill-opacity:.3}
.cc-lib.ov .cc-entity[data-state="owner-occupied"] :is(.cc-hit,.cc-face,.cc-plan-suite){fill:var(--cc-cre-watch);fill-opacity:.25}
.cc-lib.ov .cc-entity[data-state="conflict"] :is(.cc-hit,.cc-face,.cc-plan-suite){fill:var(--cc-cre-stop);fill-opacity:.25}
.cc-lib .ovtext{display:none;font-family:var(--cc-cre-font-ui);fill:#3B342A}
.cc-lib.ov .ovtext{display:inline}
.cc-lib .cc-item{cursor:pointer}
.cc-lib .cc-item.sel *{stroke:var(--cc-cre-focus)!important;stroke-width:3!important}
.cc-lib .legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.8rem;color:var(--cc-cre-text-muted);margin:8px 0 24px}
.cc-lib .sw{display:inline-block;width:14px;height:10px;border:1px solid var(--cc-cre-text);vertical-align:-1px;margin-right:4px}
.cc-lib .layers{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.8rem;margin:0 0 10px}
.cc-lib .layers label{display:inline-flex;gap:4px;align-items:center;cursor:pointer}
.cc-lib aside{position:sticky;top:16px;align-self:start}
.cc-lib .panel{background:var(--cc-cre-surface-raised);border:1px solid var(--cc-cre-rule);border-radius:8px;padding:16px}
.cc-lib .panel h3{margin:0 0 4px;font-family:var(--cc-cre-font-display);font-size:1.05rem}
.cc-lib .kv{font-family:var(--cc-cre-font-meta);font-size:.78rem;margin:8px 0;word-break:break-word}
.cc-lib .kv dt{color:var(--cc-cre-text-muted);text-transform:uppercase;letter-spacing:.05em;font-size:.68rem;margin-top:8px}
.cc-lib .kv dd{margin:2px 0 0}
.cc-lib .state{display:inline-block;border:1px solid var(--cc-cre-text-muted);border-radius:4px;padding:1px 6px}
.cc-lib table{width:100%;border-collapse:collapse;font-size:.82rem}
.cc-lib th,.cc-lib td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--cc-cre-rule)}
.cc-lib th{font-family:var(--cc-cre-font-meta);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--cc-cre-text-muted)}
.cc-lib td button{background:none;border:0;color:var(--cc-cre-action);text-decoration:underline;padding:0}
.cc-lib tr.sel td{background:color-mix(in srgb,var(--cc-cre-focus) 10%,transparent)}
.cc-lib .checks{font-family:var(--cc-cre-font-meta);font-size:.76rem;margin:0;padding-left:18px}`;

function injectStyles(doc, tokensCss) {
  if (doc.getElementById("cc-lib-css")) return;
  const s = doc.createElement("style");
  s.id = "cc-lib-css";
  s.textContent = (tokensCss || "") + STYLE;
  doc.head.appendChild(s);
}

/* opts: { units, standalone, logo:{light,dark}, showSensitive, dark } */
export function mountCreLibrary(host, bundle, opts = {}) {
  const doc = host.ownerDocument;
  injectStyles(doc, bundle.tokensCss);
  const overlay = buildOverlay(opts.units || [], bundle.pylon);
  const ops = {};
  overlay.suites.forEach((s) => (ops[s.entity_id] = { state: s.lease_state, text: s.display_name, extra: s.use, lease_sf: s.lease_sf }));
  overlay.panels.forEach((p) => (ops[p.entity_id] = { state: p.state, text: p.display_name || "(empty)", extra: p.note }));
  const layerEntries = Object.entries(bundle.layers).filter(([, l]) => opts.showSensitive || !l.sensitive);
  const checks = bundle.checks.map((c) => `<li><b>${esc(c.result)}</b> · ${esc(c.check)} — ${esc(c.summary)}</li>`).join("");
  const brand = opts.standalone
    ? `<header class="band brand"><img data-logo src="${esc(opts.logo?.light || "")}" alt="Cypress Command Platform">
        <div><h1>CRE Asset Library · On The Boulevard</h1><p>Plat frontages · survey building heights · digitized site register · operations bound by entity ID</p></div>`
    : `<header class="band"><div><h1>CRE Asset Library · On The Boulevard</h1><p>Plat frontages · survey building heights · digitized site register · operations bound by entity ID</p></div>`;
  host.innerHTML = `<div class="cc-cre cc-lib">
    ${brand}
      <span class="draft">DRAFT · NOT FIELD-VERIFIED</span>
      <div class="controls"><button class="tog" data-act="ov" aria-pressed="false">Operations overlay</button><button class="tog" data-act="theme" aria-pressed="false">Dark</button></div>
    </header>
    <div class="grid"><div>
      <section><h2>Long building 101–133 · storefront elevation</h2><p class="sub">Architectural leasing illustration · orthographic · 1 unit = 1 ft · dashed demising = derived SF split</p>
        <div class="sheet" style="--w:${bundle.pxWide.long}px">${bundle.svgs.long}</div></section>
      <section><h2>Short building 135–149 · storefront elevation</h2><p class="sub">135 section field face = 135A (mid-depth split)</p>
        <div class="sheet" style="--w:${bundle.pxWide.short}px">${bundle.svgs.short}</div></section>
      <section><h2>Johnston St pylon · directory sign</h2><p class="sub">Panel schedule nominal · cabinet &amp; posts illustrative · tenant slots editable</p>
        <div class="sheet sign">${bundle.svgs.sign}</div>
        <div class="legend" aria-hidden="true"><span><span class="sw" style="background:var(--cc-cre-action);opacity:.5"></span>Vacant</span><span><span class="sw" style="background:var(--cc-cre-watch);opacity:.4"></span>Owner-occupied</span><span><span class="sw" style="background:var(--cc-cre-stop);opacity:.45"></span>Conflict (installed vs record)</span><span><span class="sw"></span>Occupied / tenant panel</span></div></section>
      <section><h2>Site plan · site register</h2><p class="sub">Commercial site plan vectorization · positions digitized, not surveyed${opts.showSensitive ? "" : " · utility layers hidden for this role"}</p>
        <div class="layers" role="group" aria-label="Site layers">${layerEntries.map(([cat, l]) => `<label><input type="checkbox" data-layer="${esc(cat)}" checked> ${esc(l.title)} <span class="cc-muted">(${l.count})</span></label>`).join("")}</div>
        <div class="sheet plan">${bundle.svgs.plan}</div></section>
      <section><h2>Entity list</h2><p class="sub">Keyboard / screen-reader alternative to the drawings</p>
        <table><thead><tr><th>Entity</th><th>Label</th><th>Record state</th><th>Operations</th></tr></thead><tbody data-rows></tbody></table></section>
      <section style="margin-top:24px"><h2>Checks</h2><p class="sub">From the deterministic builder</p><ul class="checks">${checks}</ul></section>
    </div>
    <aside><div class="panel" data-detail aria-live="polite"><h3>Select an entity</h3><p>Click a bay, panel, suite or site item, or use the entity list. Every drawing, list row and detail resolves to the same stable ID.</p></div></aside></div>
  </div>`;
  const root = host.querySelector(".cc-lib");
  const detail = root.querySelector("[data-detail]");

  for (const l of root.querySelectorAll('.cc-layer[data-sensitive="true"]')) if (!opts.showSensitive) l.remove();

  const NS = "http://www.w3.org/2000/svg";
  for (const g of root.querySelectorAll(".cc-entity")) {
    const id = g.dataset.entityId;
    g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
    g.setAttribute("aria-label", (bundle.index[id]?.name || id) + (ops[id] ? " — " + ops[id].state : ""));
    g.dataset.state = ops[id]?.state || "unknown";
    const slot = g.querySelector('[data-slot="tenant"]');
    const r = g.querySelector(".cc-hit, .cc-face, .cc-plan-suite");
    const label = ops[id]?.text || "";
    if (slot) { slot.textContent = label; slot.classList.add("ovtext"); }
    else if (label && r && !g.closest(".plan")) {
      const x = +r.getAttribute("x"), y = +r.getAttribute("y"), w = +r.getAttribute("width"), h = +r.getAttribute("height");
      const t = doc.createElementNS(NS, "text"); const fs = 1.5; const max = Math.floor((w * 0.9) / (0.5 * fs));
      t.setAttribute("class", "ovtext"); t.setAttribute("x", x + w / 2); t.setAttribute("y", y + h / 2); t.setAttribute("font-size", fs); t.setAttribute("text-anchor", "middle");
      t.textContent = label.length > max ? label.slice(0, Math.max(3, max - 1)) + "…" : label;
      g.appendChild(t);
    }
  }
  for (const g of root.querySelectorAll(".cc-item")) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", bundle.items[g.dataset.itemId]?.label || g.dataset.itemId); }

  const rows = root.querySelector("[data-rows]");
  const order = Object.keys(bundle.index).filter((k) => ["suite", "panel", "sign", "building"].includes(bundle.index[k].type));
  rows.innerHTML = order.map((id) => {
    const e = bundle.index[id], o = ops[id];
    return `<tr data-id="${esc(id)}"><td><button data-id="${esc(id)}">${esc(id)}</button></td><td>${esc(e.label || e.name)}</td><td>${esc(e.verification.state)}</td><td>${o ? esc(o.state + (o.text ? " · " + o.text : "")) : "—"}</td></tr>`;
  }).join("");

  function clearSel() { root.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel")); }
  function selectEntity(id) {
    clearSel();
    root.querySelectorAll(`[data-entity-id="${CSS.escape(id)}"], tr[data-id="${CSS.escape(id)}"]`).forEach((n) => n.classList.add("sel"));
    const e = bundle.index[id] || { name: id, verification: { state: "unknown" }, sources: [], measurements: [], ops: [] }, o = ops[id];
    const ms = e.measurements.map((m) => `<dd>${esc(m.name)}: ${m.value} ${esc(m.unit)} <span class="state">${esc(m.state)}</span><br>${esc(m.basis)}</dd>`).join("");
    const ss = e.sources.map((s) => `<dd>${esc(s.id)}${s.locator ? " · " + esc(s.locator) : ""}<br>${esc(bundle.sources[s.id]?.path)} · sha ${esc(s.sha)}… <span class="state">${esc(bundle.sources[s.id]?.state)}</span></dd>`).join("");
    const items = Object.values(bundle.items).filter((it) => it.suite_entity_id === id && (opts.showSensitive || !bundle.layers[it.cat]?.sensitive));
    detail.innerHTML = `<h3>${esc(e.name)}</h3><dl class="kv"><dt>Entity ID</dt><dd>${esc(id)}</dd>
      <dt>Verification</dt><dd><span class="state">${esc(e.verification.state)}</span> · release ${esc(e.release || "—")}<br>${esc(e.verification.notes)}</dd>
      ${ms ? "<dt>Measurements</dt>" + ms : ""}${e.roofline ? `<dt>Building height</dt><dd>${esc(e.roofline)}</dd>` : ""}
      <dt>Evidence</dt>${ss || "<dd>none</dd>"}
      <dt>Operations binding</dt><dd>${esc(e.ops.join(", ") || "—")}</dd>
      <dt>Operations overlay</dt><dd>${o ? `<span class="state">${esc(o.state)}</span> ${esc(o.text)}${o.lease_sf ? " · lease " + o.lease_sf + " SF" : ""}${o.extra ? "<br>" + esc(o.extra) : ""}` : "unknown — no operational record bound"}</dd>
      ${items.length ? `<dt>Site items (${items.length})</dt>` + items.map((it) => `<dd>${esc(it.label)} <span class="state">${esc(it.status)}</span></dd>`).join("") : ""}</dl>`;
  }
  function selectItem(id) {
    clearSel();
    root.querySelectorAll(`[data-item-id="${CSS.escape(id)}"]`).forEach((n) => n.classList.add("sel"));
    const it = bundle.items[id]; if (!it) return;
    detail.innerHTML = `<h3>${esc(it.label)}</h3><dl class="kv"><dt>Library ID</dt><dd>${esc(id)}</dd><dt>Register ID (alias)</dt><dd>${esc(it.register_id)}</dd>
      <dt>Layer</dt><dd>${esc(bundle.layers[it.cat]?.title)} · ${esc(bundle.layers[it.cat]?.asset_type)}</dd><dt>Status</dt><dd><span class="state">${esc(it.status)}</span></dd>
      ${it.count != null ? `<dt>Count</dt><dd>${it.count}</dd>` : ""}${it.note ? `<dt>Note</dt><dd>${esc(it.note)}</dd>` : ""}
      <dt>Source</dt><dd>${esc(it.source)}</dd>${it.suite_entity_id ? `<dt>Suite</dt><dd><button class="tog" data-goto="${esc(it.suite_entity_id)}">${esc(it.suite_entity_id)}</button></dd>` : ""}</dl>`;
  }

  root.addEventListener("click", (ev) => {
    const act = ev.target.closest("[data-act]");
    if (act) {
      const on = act.getAttribute("aria-pressed") !== "true";
      act.setAttribute("aria-pressed", on);
      if (act.dataset.act === "ov") root.classList.toggle("ov", on);
      else setTheme(on);
      return;
    }
    const go = ev.target.closest("[data-goto]"); if (go) return selectEntity(go.dataset.goto);
    const b = ev.target.closest("button[data-id]"); if (b) return selectEntity(b.dataset.id);
    const it = ev.target.closest(".cc-item"); if (it) return selectItem(it.dataset.itemId);
    const g = ev.target.closest(".cc-entity"); if (g) selectEntity(g.dataset.entityId);
  });
  root.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const it = ev.target.closest?.(".cc-item"), g = ev.target.closest?.(".cc-entity");
    if (it) { ev.preventDefault(); selectItem(it.dataset.itemId); } else if (g) { ev.preventDefault(); selectEntity(g.dataset.entityId); }
  });
  root.addEventListener("change", (ev) => {
    const cb = ev.target.closest("input[data-layer]"); if (!cb) return;
    const layer = root.querySelector(`.cc-layer[data-layer="${CSS.escape(cb.dataset.layer)}"]`);
    if (layer) layer.style.display = cb.checked ? "" : "none";
  });
  const logo = root.querySelector("[data-logo]");
  function setTheme(dark) {
    root.querySelector('[data-act="theme"]').setAttribute("aria-pressed", dark);
    if (dark) root.setAttribute("data-cc-theme", "dark"); else root.removeAttribute("data-cc-theme");
    if (logo && opts.logo) logo.src = dark ? opts.logo.dark : opts.logo.light;
    opts.onTheme?.(dark);
  }
  if (opts.dark) setTheme(true);
  return { selectEntity, selectItem, setTheme, overlay };
}
