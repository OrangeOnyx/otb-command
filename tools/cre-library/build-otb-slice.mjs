/* Build the OTB reference slice of the Cypress Command Platform CRE Asset Library.

   node tools/cre-library/build-otb-slice.mjs

   Reads canonical repo data (read-only), writes ONLY under
   docs/design/cypress-command/cre-asset-library/properties/on-the-boulevard/:
     provenance/  source records (hash-pinned to the exact input bytes)
     records/     property/site/building/suite/sign/panel/asset exchange records
     elevations/  derived frontage geometry (.geometry.json) + schematic SVGs
     signage/     pylon panel-schedule diagram SVG
     preview/     isolated preview (index.html) + operations overlay
   Deterministic: identical inputs produce identical bytes. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./otb-slice.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIB = "docs/design/cypress-command/cre-asset-library";
const OTB = `${LIB}/properties/on-the-boulevard`;
const posix = (p) => p.split("\\").join("/");
const abs = (p) => join(ROOT, p);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const readJson = (p) => JSON.parse(readFileSync(abs(p), "utf8"));
const put = (p, text) => { mkdirSync(dirname(abs(p)), { recursive: true }); writeFileSync(abs(p), text); return sha(Buffer.from(text)); };
const putJson = (p, obj) => put(p, JSON.stringify(obj, null, 2) + "\n");

/* Revision = git blob id at HEAD when tracked and unmodified, else "worktree". */
function revisionOf(p, bytes) {
  try {
    const head = execFileSync("git", ["rev-parse", `HEAD:${p}`], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const work = execFileSync("git", ["hash-object", "--no-filters", p], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return head === work ? `git-blob:${head}` : `worktree-sha256:${sha(bytes).slice(0, 16)}`;
  } catch { return `worktree-sha256:${sha(bytes).slice(0, 16)}`; }
}
function source(id, name, path) {
  const bytes = readFileSync(abs(path));
  return { id, name, path, sha256: sha(bytes), revision: revisionOf(path, bytes) };
}

const SRC = {
  geometry: source("source-otb-geometry-json", "OTB site geometry (plat transcription + CAD access layer)", "src/data/geometry.json"),
  heights: source("source-otb-heights-json", "OTB parapet heights (CAD BLD_HT annotations)", "src/data/heights.json"),
  cad: source("source-otb-cad-boulev-clean", "Architect CAD — Boulev_CLEAN.dxf", "cad/Boulev_CLEAN.dxf"),
  pylon: source("source-otb-pylon-register", "Pylon panel register (operator)", "src/data/pylon.json"),
  units: source("source-otb-units-public", "Public tenancy fields (from Tier-1 rent roll)", "src/data/units.public.json"),
  board: source("source-cc-cre-master-board", "Cypress Command CRE asset library master board v1.0.0", `${LIB}/references/cypress-command-cre-asset-library-master-board.png`)
};

const geometry = readJson(SRC.geometry.path);
const heights = readJson(SRC.heights.path);
const pylon = readJson(SRC.pylon.path);
const unitsPublic = readJson(SRC.units.path);

const assetIds = {
  long: "asset-otb-building-long-front-elevation",
  short: "asset-otb-building-short-front-elevation",
  sign: "asset-otb-johnston-pylon-panel-diagram"
};
const files = {};
const G = {};
for (const which of ["long", "short"]) {
  G[which] = S.elevationGeometry(geometry, heights, which);
  const base = `${OTB}/elevations/on-the-boulevard--building-${which}--front--neutral--v1`;
  const geomSha = putJson(`${base}.geometry.json`, G[which]);
  const svgSha = put(`${base}.svg`, S.elevationSvg(G[which], `On The Boulevard — ${S.BUILDINGS[which].name} storefront elevation (schematic, draft)`));
  files[which] = { geomPath: `${base}.geometry.json`, geomSha, svgPath: `${base}.svg`, svgSha };
}
{
  const p = `${OTB}/signage/on-the-boulevard--sign-johnston-pylon--front--neutral--v1.svg`;
  files.sign = { svgPath: p, svgSha: put(p, S.signSvg(pylon, "On The Boulevard — Johnston St pylon panel schedule (diagram)")) };
}

const sources = S.sourceRecords(SRC);
const entities = S.entityRecords({ S: SRC, geometry, unitsPublic, pylon, assetIds });
const assets = S.assetRecords({ S: SRC, G, assetIds, files, pylon });
for (const r of sources) putJson(`${OTB}/provenance/${r.id}.json`, r);
for (const r of [...entities, ...assets]) putJson(`${OTB}/records/${r.record_type}--${r.id}.json`, r);

const overlay = S.opsOverlay(unitsPublic, pylon, SRC);
putJson(`${OTB}/preview/ops-overlay.json`, overlay);

const suiteRecs = entities.filter((r) => r.record_type === "suite");
const checks = [...S.frontageChecks(geometry, heights, unitsPublic), ...S.joinChecks(unitsPublic, pylon, suiteRecs)];
putJson(`${OTB}/preview/slice-checks.json`, { tool: S.TOOL, tool_version: S.TOOL_VERSION, checks });

/* ── isolated preview ───────────────────────────────────────────────────── */
const index = {};
for (const r of [...entities, ...assets]) {
  index[r.id] = {
    type: r.record_type, name: r.name, label: r.suite_label || r.panel_key || null,
    verification: r.verification, release: r.release.state,
    sources: (r.source_refs || []).map((s) => ({ id: s.source_id, locator: s.locator || null, sha: s.sha256.slice(0, 12) })),
    measurements: (r.measurements || []).map((m) => ({ name: m.name, value: m.value, unit: m.unit, basis: m.basis, state: m.verification.state })),
    ops: (r.existing_operations_refs || []).map((o) => `${o.entity_type} ${o.entity_id}`)
  };
}
const srcIndex = Object.fromEntries(sources.map((s) => [s.id, { name: s.name, kind: s.kind, path: s.location.repository_path, state: s.verification.state }]));
const svgBody = (p) => readFileSync(abs(p), "utf8").trim();
const logoRel = posix(relative(dirname(abs(`${OTB}/preview/index.html`)), abs("public/brand/cypress/cc-04c-horizontal-primary.svg")));
const logoRevRel = logoRel.replace("primary", "reverse");
const tokensRel = posix(relative(dirname(abs(`${OTB}/preview/index.html`)), abs(`${LIB}/tokens/visual-tokens.css`)));
/* True scale in the preview: 4 px per ft, horizontal scroll — never stretch z. */
const pxWide = (g) => Math.round((g.bays.reduce((a, b) => a + b.widthFt, 0) + 12) * 4);
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRE Library Slice · On The Boulevard</title>
<link rel="stylesheet" href="${tokensRel}">
<style>
  :root{color-scheme:light}
  body{margin:0;background:#F4EFE2}
  body.dark{background:#161A15;color-scheme:dark}
  .cc-cre{background:var(--cc-cre-surface);color:var(--cc-cre-text);font-family:var(--cc-cre-font-ui);min-height:100vh}
  .band{display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid var(--cc-cre-rule)}
  .cc-cre[data-cc-theme="dark"] .band{background:#0A1F16}
  .band img{width:260px;height:auto}
  .band h1{font-family:var(--cc-cre-font-display);font-weight:600;font-size:1.25rem;margin:0}
  .band p{margin:2px 0 0;color:var(--cc-cre-text-muted);font-size:.85rem}
  .draft{font-family:var(--cc-cre-font-meta);font-size:.75rem;letter-spacing:.06em;border:1px solid var(--cc-cre-watch);color:var(--cc-cre-watch);padding:4px 8px;border-radius:4px}
  .controls{margin-left:auto;display:flex;gap:8px}
  button{font:inherit;cursor:pointer}
  .tog{background:var(--cc-cre-surface-raised);color:var(--cc-cre-text);border:1px solid var(--cc-cre-text-muted);border-radius:6px;padding:6px 12px}
  .tog[aria-pressed="true"]{background:var(--cc-cre-action-fill);color:var(--cc-cre-action-text);border-color:var(--cc-cre-action-fill)}
  :focus-visible{outline:3px solid var(--cc-cre-focus);outline-offset:2px}
  main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;padding:24px}
  @media (max-width:900px){main{grid-template-columns:minmax(0,1fr);padding:16px}}
  section h2{font-family:var(--cc-cre-font-display);font-size:1rem;margin:0 0 4px}
  section .sub{font-family:var(--cc-cre-font-meta);font-size:.72rem;color:var(--cc-cre-text-muted);margin:0 0 8px;letter-spacing:.04em;text-transform:uppercase}
  .sheet{background:var(--cc-cre-surface-raised);border:1px solid var(--cc-cre-rule);border-radius:8px;padding:12px;margin-bottom:24px;overflow-x:auto}
  .sheet svg{display:block;width:var(--w,100%);max-width:none;height:auto}
  .sheet.sign svg{width:100%;max-width:340px;margin:0 auto}
  .cc-entity{cursor:pointer}
  .cc-entity:focus{outline:none}
  .cc-entity:focus-visible .cc-face,.cc-entity.sel .cc-face{stroke:var(--cc-cre-focus);stroke-width:3}
  .ov .cc-entity[data-state="vacant"] .cc-face{fill:var(--cc-cre-action);fill-opacity:.28}
  .ov .cc-entity[data-state="owner-occupied"] .cc-face{fill:var(--cc-cre-watch);fill-opacity:.2}
  .ov .cc-entity[data-state="conflict"] .cc-face{fill:var(--cc-cre-stop);fill-opacity:.22}
  .ov .cc-entity[data-state="unknown"] .cc-face{fill:none}
  .ovtext{display:none;font-family:var(--cc-cre-font-ui);fill:var(--cc-cre-text)}
  .ov .ovtext{display:inline}
  .legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.8rem;color:var(--cc-cre-text-muted);margin:8px 0 24px}
  .sw{display:inline-block;width:14px;height:10px;border:1px solid var(--cc-cre-text);vertical-align:-1px;margin-right:4px}
  aside{position:sticky;top:16px;align-self:start}
  .panel{background:var(--cc-cre-surface-raised);border:1px solid var(--cc-cre-rule);border-radius:8px;padding:16px}
  .panel h3{margin:0 0 4px;font-family:var(--cc-cre-font-display);font-size:1.05rem}
  .kv{font-family:var(--cc-cre-font-meta);font-size:.78rem;margin:8px 0;word-break:break-word}
  .kv dt{color:var(--cc-cre-text-muted);text-transform:uppercase;letter-spacing:.05em;font-size:.68rem;margin-top:8px}
  .kv dd{margin:2px 0 0}
  .state{display:inline-block;border:1px solid var(--cc-cre-text-muted);border-radius:4px;padding:1px 6px}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--cc-cre-rule)}
  th{font-family:var(--cc-cre-font-meta);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--cc-cre-text-muted)}
  td button{background:none;border:0;color:var(--cc-cre-action);text-decoration:underline;padding:0}
  tr.sel td{background:color-mix(in srgb,var(--cc-cre-focus) 10%,transparent)}
</style>
</head>
<body>
<div class="cc-cre" id="root">
  <header class="band">
    <img id="logo" src="${logoRel}" alt="Cypress Command Platform">
    <div><h1>CRE Asset Library · On The Boulevard reference slice</h1>
      <p>Geometry from the recorded-plat transcription and CAD heights · operations bound by entity ID · generated by ${S.TOOL}</p></div>
    <span class="draft">DRAFT · GEOMETRY UNVERIFIED</span>
    <div class="controls">
      <button class="tog" id="tOv" aria-pressed="false">Operations overlay</button>
      <button class="tog" id="tTheme" aria-pressed="false">Dark</button>
    </div>
  </header>
  <main>
    <div>
      <section><h2>Long building 101–133 · storefront elevation</h2><p class="sub">Schematic · 1 unit = 1 ft · dashed bay = derived SF split, not a plat string</p>
        <div class="sheet" id="svgLong" style="--w:${pxWide(G.long)}px">${svgBody(files.long.svgPath)}</div></section>
      <section><h2>Short building 135–149 · storefront elevation</h2><p class="sub">Schematic · 135 section field face = 135A (mid-depth split)</p>
        <div class="sheet" id="svgShort" style="--w:${pxWide(G.short)}px">${svgBody(files.short.svgPath)}</div></section>
      <section><h2>Johnston St pylon · panel schedule</h2><p class="sub">Diagram · nominal sizes · cabinet not measured</p>
        <div class="sheet sign" id="svgSign">${svgBody(files.sign.svgPath)}</div>
        <div class="legend" aria-hidden="true"><span><span class="sw" style="background:var(--cc-cre-action);opacity:.5"></span>Vacant</span><span><span class="sw" style="background:var(--cc-cre-watch);opacity:.4"></span>Owner-occupied</span><span><span class="sw" style="background:var(--cc-cre-stop);opacity:.45"></span>Conflict (installed vs record)</span><span><span class="sw"></span>Occupied / tenant panel</span></div></section>
      <section><h2>Entity list</h2><p class="sub">Keyboard / screen-reader alternative to the drawings</p>
        <table><thead><tr><th>Entity</th><th>Label</th><th>Record state</th><th>Operations</th></tr></thead><tbody id="rows"></tbody></table></section>
    </div>
    <aside><div class="panel" id="detail" aria-live="polite"><h3>Select an entity</h3><p>Click a bay or panel, or use the entity list. Every drawing, list row and detail resolves to the same stable ID.</p></div></aside>
  </main>
</div>
<script>
const INDEX=${json(index)};
const SOURCES=${json(srcIndex)};
const OV=${json(overlay)};
const root=document.getElementById("root");
const ops={};OV.suites.forEach(s=>ops[s.entity_id]={state:s.lease_state,text:s.display_name,extra:s.use,lease_sf:s.lease_sf});
OV.panels.forEach(p=>ops[p.entity_id]={state:p.state,text:p.display_name||"(empty)",extra:p.note,suite:p.suite_entity_id});
const groups=[...document.querySelectorAll(".cc-entity")];
groups.forEach(g=>{
  const id=g.dataset.entityId;g.setAttribute("tabindex","0");g.setAttribute("role","button");
  g.setAttribute("aria-label",(INDEX[id]?.name||id)+(ops[id]?" — "+ops[id].state:""));
  g.dataset.state=ops[id]?.state||"unknown";
  const r=g.querySelector("rect");
  if(ops[id]?.text&&r){const t=document.createElementNS("http://www.w3.org/2000/svg","text");
    const x=+r.getAttribute("x"),y=+r.getAttribute("y"),w=+r.getAttribute("width"),h=+r.getAttribute("height");
    const sign=!!g.dataset.panelKey;t.setAttribute("class","ovtext");t.setAttribute("x",x+w/2);t.setAttribute("text-anchor","middle");
    const label=ops[id].text||"";const fs2=sign?(w>=8?0.6:0.4):1.5;
    t.setAttribute("font-size",fs2);t.setAttribute("y",sign?y+h/2+0.3:y+h/2);
    const max=Math.floor((w*0.9)/(0.5*fs2));t.textContent=label.length>max?label.slice(0,Math.max(3,max-1))+"…":label;
    g.appendChild(t);}
  g.addEventListener("click",()=>select(id));
  g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(id);}});
});
const rows=document.getElementById("rows");
const order=Object.keys(INDEX).filter(k=>["suite","panel","sign","building"].includes(INDEX[k].type));
rows.innerHTML=order.map(id=>{const e=INDEX[id],o=ops[id];return '<tr data-id="'+id+'"><td><button data-id="'+id+'">'+id+'</button></td><td>'+(e.label||e.name)+'</td><td>'+e.verification.state+'</td><td>'+(o?o.state+(o.text?" · "+o.text:""):"—")+'</td></tr>'}).join("");
rows.addEventListener("click",e=>{const b=e.target.closest("button[data-id]");if(b)select(b.dataset.id)});
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function select(id){
  document.querySelectorAll(".sel").forEach(n=>n.classList.remove("sel"));
  document.querySelectorAll('[data-entity-id="'+id+'"],tr[data-id="'+id+'"]').forEach(n=>n.classList.add("sel"));
  const e=INDEX[id]||{name:id,verification:{state:"unknown"},sources:[],measurements:[],ops:[]},o=ops[id];
  const ms=e.measurements.map(m=>'<dd>'+esc(m.name)+': '+m.value+' '+m.unit+' <span class="state">'+m.state+'</span><br>'+esc(m.basis)+'</dd>').join("");
  const ss=e.sources.map(s=>'<dd>'+esc(s.id)+(s.locator?' · '+esc(s.locator):'')+'<br>'+esc(SOURCES[s.id]?.path)+' · sha '+s.sha+'… <span class="state">'+esc(SOURCES[s.id]?.state)+'</span></dd>').join("");
  document.getElementById("detail").innerHTML='<h3>'+esc(e.name)+'</h3><dl class="kv"><dt>Entity ID</dt><dd>'+esc(id)+'</dd>'+
    '<dt>Verification</dt><dd><span class="state">'+esc(e.verification.state)+'</span> · release '+esc(e.release||"—")+'<br>'+esc(e.verification.notes)+'</dd>'+
    (ms?'<dt>Measurements</dt>'+ms:'')+'<dt>Evidence</dt>'+(ss||'<dd>none</dd>')+
    '<dt>Operations binding</dt><dd>'+esc(e.ops.join(", ")||"—")+'</dd>'+
    '<dt>Operations overlay</dt><dd>'+(o?'<span class="state">'+esc(o.state)+'</span> '+esc(o.text)+(o.lease_sf?' · lease '+o.lease_sf+' SF':'')+(o.extra?'<br>'+esc(o.extra):''):'unknown — no operational record bound')+'</dd></dl>';
}
const tOv=document.getElementById("tOv"),tTh=document.getElementById("tTheme"),logo=document.getElementById("logo");
tOv.onclick=()=>{const on=tOv.getAttribute("aria-pressed")!=="true";tOv.setAttribute("aria-pressed",on);root.classList.toggle("ov",on)};
function theme(dark){tTh.setAttribute("aria-pressed",dark);if(dark)root.setAttribute("data-cc-theme","dark");else root.removeAttribute("data-cc-theme");document.body.classList.toggle("dark",dark);logo.src=dark?"${logoRevRel}":"${logoRel}"}
tTh.onclick=()=>theme(tTh.getAttribute("aria-pressed")!=="true");
if(matchMedia("(prefers-color-scheme: dark)").matches)theme(true);
</script>
</body>
</html>
`;
put(`${OTB}/preview/index.html`, html);

const bad = checks.filter((c) => c.result === "fail");
console.log(`OTB slice: ${sources.length} sources · ${entities.length} entity records · ${assets.length} assets · ${checks.length} checks (${bad.length} fail)`);
for (const c of checks.filter((c) => !c.check.startsWith("area-"))) console.log(`  ${c.result.padEnd(14)} ${c.check}: observed ${c.observed} vs ${c.expected} ${c.unit}`);
