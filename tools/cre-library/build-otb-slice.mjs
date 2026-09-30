/* Build the OTB reference slice of the Cypress Command Platform CRE Asset Library.

   node tools/cre-library/build-otb-slice.mjs

   Reads canonical repo data (read-only). Writes:
     docs/design/cypress-command/cre-asset-library/properties/on-the-boulevard/
       provenance/   source records (hash-pinned to the exact input bytes)
       records/      property · site · buildings · suites · sign · panels · assets
       elevations/   derived frontage geometry (.geometry.json) + leasing elevations (.svg)
       signage/      pylon directory-sign render (.svg)
       site-assets/  site-register layers (library IDs, notes sanitized) + alias table + site plan (.svg)
       preview/      standalone preview (index.html) · ops-overlay.json · slice-checks.json
     src/data/cre-library-otb.json   bundle for the A-6 Asset Library sheet
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

/* Revision = git blob id at HEAD when tracked and unmodified, else a worktree hash. */
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
  heights: source("source-otb-heights-json", "OTB building heights (2019 ALTA survey labels, LiDAR-checked)", "src/data/heights.json"),
  survey: source("source-otb-alta-survey-2019", "ALTA/ACSM survey - Montagnet & Domingue, rev. 7/19/2019", "reference/plats/plat-of-survey-detailed-2019.pdf"),
  siteplan: source("source-otb-site-plan-2020", "Site plan - Montagnet & Domingue (Boulev.dwg), 2020", "reference/plats/site-plan-simple-2020.pdf"),
  cad: source("source-otb-cad-boulev-clean", "Architect CAD — Boulev_CLEAN.dxf", "cad/Boulev_CLEAN.dxf"),
  pylon: source("source-otb-pylon-register", "Pylon panel register (operator)", "src/data/pylon.json"),
  units: source("source-otb-units-public", "Public tenancy fields (from Tier-1 rent roll)", "src/data/units.public.json"),
  register: source("source-otb-site-register", "Digitized site register (270 items)", "src/data/site-register.json"),
  pylonMaster: source("source-otb-pylon-final-v2", "OTB pylon sign — approved master OTB_Pylon_Final_v2 (vector)", "reference/pylon/otb-pylon-final-v2/OTB_Pylon_Final_v2_vector.svg"),
  board: source("source-cc-cre-master-board", "Cypress Command CRE asset library master board v1.0.0", `${LIB}/references/cypress-command-cre-asset-library-master-board.png`)
};

const geometry = readJson(SRC.geometry.path);
const heights = readJson(SRC.heights.path);
const pylon = readJson(SRC.pylon.path);
const unitsPublic = readJson(SRC.units.path);
const register = readJson(SRC.register.path);
const heightsProv = readJson("src/data/heights-provenance.json");

const assetIds = {
  long: "asset-otb-building-long-front-elevation",
  short: "asset-otb-building-short-front-elevation",
  sign: "asset-otb-johnston-pylon-panel-diagram"
};
const files = { layers: {} };
const G = {};
const svgs = {};
for (const which of ["long", "short"]) {
  G[which] = S.elevationGeometry(geometry, heights, which, heightsProv);
  const base = `${OTB}/elevations/on-the-boulevard--building-${which}--front--neutral--v1`;
  const geomSha = putJson(`${base}.geometry.json`, G[which]);
  svgs[which] = S.elevationSvg(G[which], `On The Boulevard — ${S.BUILDINGS[which].name} storefront elevation (leasing illustration, draft)`);
  files[which] = { geomPath: `${base}.geometry.json`, geomSha, svgPath: `${base}.svg`, svgSha: put(`${base}.svg`, svgs[which]) };
}
{
  const p = `${OTB}/signage/on-the-boulevard--sign-johnston-pylon--front--neutral--v1.svg`;
  svgs.sign = S.signSvgApproved(readFileSync(abs(SRC.pylonMaster.path), "utf8"), pylon, "On The Boulevard — Johnston St pylon directory sign (approved v2)");
  files.sign = { svgPath: p, svgSha: put(p, svgs.sign) };
}

const sources = S.sourceRecords(SRC);
const entities = S.entityRecords({ S: SRC, geometry, unitsPublic, pylon, assetIds });
const suiteIds = new Set(entities.filter((r) => r.record_type === "suite").map((r) => r.id));

/* site register → layers, alias table, site plan */
const { layers, aliases } = S.siteLayers(register, suiteIds);
for (const l of Object.values(layers)) {
  const p = `${OTB}/site-assets/on-the-boulevard--site-register--${l.cat}--v1.json`;
  files.layers[l.cat] = { path: p, sha: putJson(p, { layer: l.cat, title: l.title, asset_type: l.asset_type, sensitive: l.sensitive, frame: "a1-plan-px (digitized, not surveyed)", source: SRC.register.path, features: l.features }) };
}
putJson(`${OTB}/site-assets/register-id-aliases.json`, { _comment: "site-register id → library id. Register ids stay canonical in src/data/site-register.json.", aliases });
svgs.plan = S.sitePlanSvg(geometry, layers, "On The Boulevard — site plan vectorization (leasing map, draft)");
files.plan = { path: `${OTB}/site-assets/on-the-boulevard--site-plan--plan--neutral--v1.svg` };
files.plan.sha = put(files.plan.path, svgs.plan);

const assets = S.assetRecords({ S: SRC, G, assetIds, files, pylon });
const siteRecs = S.siteRecords({ S: SRC, layers, files, suiteIds });
for (const r of [...sources, ...siteRecs.filter((r) => r.record_type === "source")]) putJson(`${OTB}/provenance/${r.id}.json`, r);
for (const r of [...entities, ...assets, ...siteRecs.filter((r) => r.record_type !== "source")]) putJson(`${OTB}/records/${r.record_type}--${r.id}.json`, r);

const overlay = S.opsOverlay(unitsPublic, pylon, SRC);
putJson(`${OTB}/preview/ops-overlay.json`, overlay);

const checks = [...S.frontageChecks(geometry, heights, unitsPublic, heightsProv), ...S.joinChecks(unitsPublic, pylon, entities.filter((r) => r.record_type === "suite"))];
putJson(`${OTB}/preview/slice-checks.json`, { tool: S.TOOL, tool_version: S.TOOL_VERSION, checks });

/* ── bundle for the app sheet and the standalone preview ─────────────────── */
const index = {};
for (const r of [...entities, ...assets]) {
  const roof = r.record_type === "suite" ? heightsProv.units[r.suite_label] : null;
  index[r.id] = {
    type: r.record_type, name: r.name, label: r.suite_label || r.panel_key || null,
    verification: r.verification, release: r.release.state,
    sources: (r.source_refs || []).map((s) => ({ id: s.source_id, locator: s.locator || null, sha: s.sha256.slice(0, 12) })),
    measurements: (r.measurements || []).map((m) => ({ name: m.name, value: m.value, unit: m.unit, basis: m.basis, state: m.verification.state })),
    ops: (r.existing_operations_refs || []).map((o) => `${o.entity_type} ${o.entity_id}`),
    ...(roof ? { roofline: `${roof.value_ft} ft (${roof.basis}; attested ${roof.attested})${roof.status === "conflict" ? " — CONFLICT: " + roof.note : ""}` } : {})
  };
}
const items = {};
for (const l of Object.values(layers)) for (const f of l.features) items[f.id] = { label: f.label, cat: f.cat, status: f.status, source: f.source, note: f.note, count: f.count, register_id: f.register_id, suite_entity_id: f.suite_entity_id };
const pxWide = (g) => Math.round((g.bays.reduce((a, b) => a + b.widthFt, 0) + 12) * 4); // true scale, 4 px/ft
const bundle = {
  _comment: `Generated by ${S.TOOL} v${S.TOOL_VERSION} — do not hand-edit. Geometry SVGs carry no tenancy; the sheet binds live unit records by entity ID.`,
  tokensCss: readFileSync(abs(`${LIB}/tokens/visual-tokens.css`), "utf8"),
  svgs, pxWide: { long: pxWide(G.long), short: pxWide(G.short) }, index,
  sources: Object.fromEntries([...sources, siteRecs[0]].map((s) => [s.id, { name: s.name, kind: s.kind, path: s.location.repository_path, state: s.verification.state }])),
  layers: Object.fromEntries(Object.values(layers).map((l) => [l.cat, { title: l.title, asset_type: l.asset_type, sensitive: l.sensitive, count: l.features.length }])),
  items, pylon: S.pylonPanels(pylon),
  checks: checks.filter((c) => !c.check.startsWith("area-")).map((c) => ({ check: c.check, result: c.result, summary: `observed ${c.observed} vs ${c.expected ?? "—"} ${c.unit}` }))
};
putJson("src/data/cre-library-otb.json", bundle);

/* ── standalone preview: inlines the SAME view module the app sheet uses ── */
const previewDir = dirname(abs(`${OTB}/preview/index.html`));
const rel = (p) => posix(relative(previewDir, abs(p)));
const viewSrc = readFileSync(abs("src/lib/cre-library-view.js"), "utf8").replace(/^export /gm, "");
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
put(`${OTB}/preview/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRE Library Slice · On The Boulevard</title>
<style>body{margin:0;background:#F4EFE2}body.dark{background:#161A15}</style>
</head>
<body>
<div id="host"></div>
<script>
${viewSrc}
const BUNDLE=${json(bundle)};
const UNITS=${json(unitsPublic)};
mountCreLibrary(document.getElementById("host"), BUNDLE, {
  units: UNITS, standalone: true, showSensitive: true,
  logo: { light: "${rel("public/brand/cypress/cc-04c-horizontal-primary.svg")}", dark: "${rel("public/brand/cypress/cc-04c-horizontal-reverse.svg")}" },
  dark: matchMedia("(prefers-color-scheme: dark)").matches,
  onTheme: (d) => document.body.classList.toggle("dark", d)
});
</script>
</body>
</html>
`);

const bad = checks.filter((c) => c.result === "fail");
console.log(`OTB slice v${S.TOOL_VERSION}: ${sources.length + 1} sources · ${entities.length} entities · ${assets.length + siteRecs.length - 1} assets · ${aliases.length} site items · ${checks.length} checks (${bad.length} fail)`);
for (const c of checks.filter((c) => !c.check.startsWith("area-"))) console.log(`  ${c.result.padEnd(14)} ${c.check}: observed ${c.observed} vs ${c.expected} ${c.unit}`);
