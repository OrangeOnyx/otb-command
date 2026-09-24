/* Build the portable OTB site twin (Stage 2 of the A-1 site register).
   Plan: docs/superpowers/plans/2026-09-24-site-twin-stage2.md

   Reads the SAME inputs as the A-1 register and builds it with src/lib/siteassets.js,
   so every GLB node's extras.assetId is the register id. Writes
   dist-twin/OTB_Site_Twin/ = model.glb + twin-data.json + site-register.csv +
   twin-report.json + the offline viewer (tools/site-twin/viewer) + vendored three.js.

     node tools/build-site-twin.mjs            build the package
     node tools/build-site-twin.mjs --check    rebuild in memory; fail unless model.glb is byte-identical
     node tools/build-site-twin.mjs --zip      also write dist-twin/OTB_Site_Twin.zip
     node tools/build-site-twin.mjs --drive    also copy the zip + report to G:\My Drive\00 OTB\site-twin\  */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildRegister, registerCSV, CATEGORIES, CAT, centerOf } from "../src/lib/siteassets.js";
import { drawableCameras } from "../src/lib/cameras.js";
import { planToXZ, FT, northRotation } from "./site-twin/coords.mjs";
import { GltfBuilder, validateGlb } from "./site-twin/glb.mjs";
import { Geo, flatPolygon, prism, boxAt, ribbon, wall, pipe, disc, canopy, tree } from "./site-twin/meshes.mjs";
import { SPEC, DECISIONS, hexToLinear } from "./site-twin/categories.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist-twin", "OTB_Site_Twin");
const DRIVE = "G:/My Drive/00 OTB/site-twin";
const j = f => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const r3 = v => Math.round(v * 1000) / 1000;

/* SVG path (absolute M/L/A/Z, as the generator writes them) -> sampled points */
export function samplePath(d, arcSteps = 12) {
  const tok = d.match(/[MLAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), pts = [];
  let i = 0, cur = [0, 0];
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++].toUpperCase();
    if (c === "M" || c === "L") { cur = [num(), num()]; pts.push(cur); }
    else if (c === "A") {
      const rx = num(), ry = num(); num(); const laf = num(), sw = num(), end = [num(), num()];
      pts.push(...arcPoints(cur, end, rx, ry, laf, sw, arcSteps)); cur = end;
    }
  }
  return pts;
}
function arcPoints([x1, y1], [x2, y2], rx, ry, laf, sw, n) {   // SVG F.6.5, x-axis rotation 0
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const lam = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const s = (laf === sw ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx) / (rx * rx * dy * dy + ry * ry * dx * dx)));
  const cx = s * (rx * dy) / ry + (x1 + x2) / 2, cy = s * -(ry * dx) / rx + (y1 + y2) / 2;
  const a1 = Math.atan2((y1 - cy) / ry, (x1 - cx) / rx);
  let da = Math.atan2((y2 - cy) / ry, (x2 - cx) / rx) - a1;
  if (sw && da < 0) da += 2 * Math.PI; if (!sw && da > 0) da -= 2 * Math.PI;
  return Array.from({ length: n }, (_, k) => [cx + rx * Math.cos(a1 + (da * (k + 1)) / n), cy + ry * Math.sin(a1 + (da * (k + 1)) / n)]);
}

export function buildTwin() {
  const geometry = j("src/data/geometry.json"), siteReg = j("src/data/site-register.json"), meters = j("src/data/meters.json");
  const heights = j("src/data/heights.json"), camReg = j("src/data/cameras.json"), pylon = j("src/data/pylon.json");
  const georef = j("src/data/footprints-geo.json").georef;
  const unitsDoc = j("src/data/units.json"), UL = Array.isArray(unitsDoc) ? unitsDoc : unitsDoc.units;
  const T = geometry.boundary.transform, U = geometry.units;
  const reg = buildRegister(geometry, { cameras: drawableCameras(camReg.cameras), items: siteReg.items, meters: meters.meters,
    unitName: id => (UL.find(u => String(u.unit) === id) || {}).dba || "" });

  // model origin = centre of the two buildings' footprint (plan px -> model m)
  const allXZ = Object.values(U).flatMap(r => [[r.x, r.y], [r.x + r.w, r.y + r.h]].map(p => planToXZ(p, T)));
  const cX = (Math.min(...allXZ.map(p => p[0])) + Math.max(...allXZ.map(p => p[0]))) / 2;
  const cZ = (Math.min(...allXZ.map(p => p[1])) + Math.max(...allXZ.map(p => p[1]))) / 2;
  const xz = p => { const [X, Z] = planToXZ(p, T); return [X - cX, Z - cZ]; };
  const ft = v => v * FT;
  const eave = ft(DECISIONS.D1.canopyEaveFt), top = ft(DECISIONS.D1.canopyTopFt);

  const g = new GltfBuilder();
  const matCache = new Map();
  const mat = (hex, name) => { if (!matCache.has(hex)) matCache.set(hex, g.material(name || hex, { color: hexToLinear(hex) })); return matCache.get(hex); };

  // unit rects grown 1 px each side so neighbours meet (the plan draws 2 px presentation gaps)
  const unitPts = r => [[r.x - 1, r.y - 1], [r.x + r.w + 1, r.y - 1], [r.x + r.w + 1, r.y + r.h + 1], [r.x - 1, r.y + r.h + 1]].map(xz);
  const unitH = id => ft(heights[id] ?? 16.4);
  const nearestUnit = p => {
    let best = null;
    for (const [id, r] of Object.entries(U)) {
      const [a, b] = [xz([r.x, r.y]), xz([r.x + r.w, r.y + r.h])];
      const q = [Math.min(Math.max(p[0], Math.min(a[0], b[0])), Math.max(a[0], b[0])), Math.min(Math.max(p[1], Math.min(a[1], b[1])), Math.max(a[1], b[1]))];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || d < best.d) best = { id, d, q };
    }
    return best;
  };

  const nodesByCat = new Map(), assetsOut = [], counts = {};
  const place = (a, parts, pos) => {
    const mi = g.meshParts(a.id, parts.filter(p => !p.geo.empty).map(p => ({ data: p.geo.typed(), material: p.material })));
    const extras = { assetId: a.id, category: a.cat, label: a.label, status: a.status, source: a.source };
    for (const k of ["unit", "parent", "count", "codexAssetId", "codexLabel", "sub"]) if (a[k] !== undefined) extras[k] = a[k];
    if (!nodesByCat.has(a.cat)) nodesByCat.set(a.cat, []);
    nodesByCat.get(a.cat).push(g.node({ name: a.id, mesh: mi, extras }));
    counts[a.cat] = counts[a.cat] || { modeled: 0, dataOnly: 0 }; counts[a.cat].modeled++;
    assetsOut.push(rec(a, pos));
  };
  const rec = (a, pos, dataOnly = false) => ({ id: a.id, label: a.label, category: a.cat, status: a.status, source: a.source,
    ...(a.sub ? { sub: a.sub } : {}), ...(a.unit ? { unit: a.unit } : {}), ...(a.parent ? { parent: a.parent } : {}),
    ...(a.count != null ? { count: a.count } : {}), ...(a.codexAssetId ? { codexAssetId: a.codexAssetId, codexLabel: a.codexLabel } : {}),
    ...(pos ? { positionM: pos.map(r3) } : {}), ...(dataOnly ? { dataOnly: true, ...(a.located ? { located: a.located } : {}), ...(a.unlocated ? { unlocated: true } : {}) } : {}) });
  const dataOnly = a => { counts[a.cat] = counts[a.cat] || { modeled: 0, dataOnly: 0 }; counts[a.cat].dataOnly++; assetsOut.push(rec(a, null, true)); };

  const walkEdges = { "walk-long": [[3, 2], [0, 1]], "walk-short": [[0, 3], [1, 2]], "walk-101-end": [[0, 3], [1, 2]] };

  for (const a of reg) {
    const s = SPEC[a.cat];
    if (!s || s.mesh === "data" || s.mesh === "none" || a.unlocated || (a.located === "unit-centroid" && a.cat !== "rtu")) { dataOnly(a); continue; }
    const P = a.point ? xz(a.point) : null, C = xz(centerOf(a));
    const polys = (a.polys || []).map(q => q.map(xz));
    const line = a.line ? a.line.map(xz) : a.d ? samplePath(a.d).map(xz) : null;
    const G = () => new Geo();
    switch (s.mesh) {
      case "flat": { const geo = G(); polys.length ? polys.forEach(q => flatPolygon(geo, q, s.y || 0)) : flatPolygon(geo, line, s.y || 0); place(a, [{ geo, material: mat(s.color, a.cat) }], [C[0], 0, C[1]]); break; }
      case "prism": {
        if (a.cat === "unit") {
          const walls = prism(G(), polys[0], 0, unitH(a.unit), { top: false }), roof = flatPolygon(G(), polys[0], unitH(a.unit));
          place(a, [{ geo: walls, material: mat(s.color, "unit wall") }, { geo: roof, material: mat(s.roof, "TPO roof") }], [C[0], unitH(a.unit), C[1]]);
        } else { const geo = G(); polys.forEach(q => prism(geo, q, 0, ft(s.heightFt))); place(a, [{ geo, material: mat(s.color, a.cat) }], [C[0], 0, C[1]]); }
        break;
      }
      case "walk": {
        const slab = G(), roofG = G();
        if (a.line) ribbon(slab, line, ft(4), 0.1);
        else polys.forEach(q => prism(slab, q, 0, ft(0.5)));
        const e = walkEdges[a.id];
        if (e) { const q = polys[0]; canopy(roofG, [q[e[0][0]], q[e[0][1]]], [q[e[1][0]], q[e[1][1]]], eave, top); }
        place(a, [{ geo: slab, material: mat(s.color, "concrete walk") }, { geo: roofG, material: mat(s.shingle, "shingle canopy") }], [C[0], 0, C[1]]);
        break;
      }
      case "tree": place(a, [{ geo: tree(G(), P, ft(s.crownFt), ft(s.heightFt)), material: mat(s.color, "tree") }], [P[0], 0, P[1]]); break;
      case "ribbon": { const geo = G(); if (line) ribbon(geo, line, s.widthM, s.y); polys.forEach(q => ribbon(geo, [...q, q[0]], s.widthM, s.y)); place(a, [{ geo, material: mat(s.color, a.cat) }], [C[0], s.y, C[1]]); break; }
      case "stall": {
        const q = polys[0], stripes = ribbon(G(), [...q, q[0]], s.stripeM, 0.02), fill = flatPolygon(G(), q, 0.015);
        place(a, [{ geo: stripes, material: mat(a.status === "cad-pending" ? s.pending : s.color, a.status === "cad-pending" ? "pending stripe" : "stripe") },
                  { geo: fill, material: mat(SPEC.parcel.color, "asphalt") }], [C[0], 0, C[1]]);
        break;
      }
      case "disc": place(a, [{ geo: disc(G(), P || C, s.rM, s.y), material: mat(s.color, a.cat) }], [(P || C)[0], s.y, (P || C)[1]]); break;
      case "box": {
        const h = s.hFt === "eave" ? eave : ft(s.hFt), y0 = ft(s.y0Ft || 0);
        place(a, [{ geo: boxAt(G(), P, ft(s.wFt), ft(s.dFt), h, y0), material: mat(s.color, a.cat) }], [P[0], y0 + h, P[1]]);
        break;
      }
      case "rtu": { const y0 = unitH(a.unit); place(a, [{ geo: boxAt(G(), P, ft(s.wFt), ft(s.dFt), ft(s.hFt), y0), material: mat(s.color, "RTU proxy") }], [P[0], y0 + ft(s.hFt), P[1]]); break; }
      case "bollards": { const geo = G(); for (const k of [-0.5, 0.5]) boxAt(geo, [P[0], P[1] + k * ft(s.gapFt)], ft(s.wFt), ft(s.wFt), ft(s.hFt)); place(a, [{ geo, material: mat(s.color, "bollard") }], [P[0], ft(s.hFt), P[1]]); break; }
      case "pipe": place(a, [{ geo: pipe(G(), line, s.sizeM, s.y), material: mat(a.id.includes("sewer") ? s.sewer : s.color, a.id.includes("sewer") ? "sewer main" : "water main") }], [C[0], s.y, C[1]]); break;
      case "fence": {
        if (a.polys) place(a, [{ geo: prism(G(), polys[0], 0, ft(s.freezerHFt)), material: mat(s.freezer, "freezer") }], [C[0], ft(s.freezerHFt), C[1]]);
        else place(a, [{ geo: wall(G(), line, s.thickM, 0, ft(s.hFt)), material: mat(s.color, "wood fence") }], [C[0], ft(s.hFt), C[1]]);
        break;
      }
      case "wall": place(a, [{ geo: wall(G(), line, s.thickM, 0, ft(18.4)), material: mat(s.color, a.cat) }], [C[0], ft(18.4), C[1]]); break;
      default: dataOnly(a);
    }
  }

  // hierarchy: group -> category -> asset
  const groups = [...new Set(CATEGORIES.map(c => c[2]))];
  const roots = [];
  for (const gr of groups) {
    const kids = CATEGORIES.filter(c => c[2] === gr && nodesByCat.has(c[0])).map(([id]) => g.node({ name: id, children: nodesByCat.get(id), extras: { category: id } }));
    if (kids.length) roots.push(g.node({ name: gr, children: kids, extras: { group: gr } }));
  }
  g.scene(roots);
  const glb = g.toGlb();
  const validation = validateGlb(glb);

  // eye-level walk tour along the operator's columns: eye 2.2 m toward the building face, 1.65 m high
  const cols = assetsOut.filter(a => a.category === "column").sort((a, b) => a.id.localeCompare(b.id));
  const planOf = id => reg.find(r => r.id === id).point;
  const walkTour = cols.map((c, k) => {
    const p = xz(planOf(c.id)), nu = nearestUnit(p);
    const dx = nu.q[0] - p[0], dz = nu.q[1] - p[1], d = Math.hypot(dx, dz) || 1;
    const eye = [p[0] + (dx / d) * Math.min(2.2, d * 0.6), 1.65, p[1] + (dz / d) * Math.min(2.2, d * 0.6)];
    const nxt = cols[k + 1] ? xz(planOf(cols[k + 1].id)) : p;
    return { id: c.id, eye: eye.map(r3), target: [r3(nxt[0]), 1.4, r3(nxt[1])], column: [r3(p[0]), r3(eave / 2), r3(p[1])] };
  });

  const catList = CATEGORIES.map(([id, label, group, placeholder]) => ({ id, label, group, placeholder: !!placeholder,
    modeled: counts[id]?.modeled || 0, dataOnly: counts[id]?.dataOnly || 0, visible: !!SPEC[id]?.visible,
    presentation: SPEC[id]?.color || null, record: SPEC[id]?.record || null,
    note: placeholder ? "No record on file — the A-1 register's 📍 pins of this type fill it" : SPEC[id]?.mesh === "data" ? "listed as data (no physical position)" : undefined }));
  const data = {
    schema: 1, product: "Cypress Command Platform", property: "On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette LA",
    title: "OTB site twin", units: "metre", upAxis: "Y",
    generatedFrom: { geometryRev: geometry.rev, registerFits: siteReg.fits, register: "src/lib/siteassets.js buildRegister (same ids as A-1 ◫ Register)" },
    transform: { from: "A-1 plan px", plat: T, originPlatFt: [r3(cX / FT), r3(-cZ / FT)], mapping: "X = a·0.3048 − originX, Z = −b·0.3048 − originZ, Y up" },
    northRotationRad: r3(northRotation(georef)), northNote: "azimuth of plat +b (CAD +Y) per footprints-geo.json georef; model is NOT rotated (D4)",
    decisions: DECISIONS, pylonPanels: pylon.panels.map(p => ({ panel: p.panel, size: p.size, unit: p.unit, status: p.status })),
    categories: catList, walkTour, assets: assetsOut,
  };
  const report = {
    validation: { ok: validation.ok, errors: validation.errors, glbBytes: glb.length, nodes: validation.nodes, meshes: validation.meshes, triangles: validation.triangles },
    counts, decisions: DECISIONS,
    omissions: [
      "Data-only (no physical position): unit-centroid rows (electrical panels, electric meters, time clocks) and unlocated rows (Federal Pacific panel, lighting fixture types, sign rows).",
      "Placeholders (0 on file): storm drains, backflow, FDC/risers, grease traps, dumpster pads, roof drains, irrigation controller; operator pins live in the app, not this package.",
      "Interiors, the 101/103 second floor, catalog furniture, signage faces and photogrammetry textures are not modeled.",
      "JD Bank building is NOT A PART and is not modeled; its 13 easement stalls are.",
    ],
    limits: [
      "Positions come from the A-1 register: plat/CAD geometry plus digitized operator sheets (≤6 px ≈ 3 ft), historic trees (≤10 px), LUS context (≈9 ft). Not surveyed, not field verified.",
      "Building heights are CAD BLD_HT parapet associations (heights.json), not ceiling heights. Canopy eave/top and RTU proxies are presentation values (D1, D2).",
      "LUS mains drawn at −1.2 m: depth unverified.",
    ],
  };
  return { glb, data, csv: registerCSV(reg), report };
}

function copyViewer() {
  const v = join(ROOT, "tools/site-twin/viewer");
  for (const f of readdirSync(v)) copyFileSync(join(v, f), join(OUT, f));
  const vend = join(OUT, "vendor"), tj = join(ROOT, "node_modules/three");
  mkdirSync(join(vend, "addons/controls"), { recursive: true }); mkdirSync(join(vend, "addons/loaders"), { recursive: true }); mkdirSync(join(vend, "addons/utils"), { recursive: true });
  copyFileSync(join(tj, "build/three.module.js"), join(vend, "three.module.js"));
  copyFileSync(join(tj, "build/three.core.js"), join(vend, "three.core.js"));
  copyFileSync(join(tj, "examples/jsm/controls/OrbitControls.js"), join(vend, "addons/controls/OrbitControls.js"));
  copyFileSync(join(tj, "examples/jsm/loaders/GLTFLoader.js"), join(vend, "addons/loaders/GLTFLoader.js"));
  copyFileSync(join(tj, "examples/jsm/utils/BufferGeometryUtils.js"), join(vend, "addons/utils/BufferGeometryUtils.js"));
  copyFileSync(join(tj, "LICENSE"), join(vend, "THREE-LICENSE.txt"));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const t = buildTwin();
  if (!t.report.validation.ok) { console.error("GLB validation failed:", t.report.validation.errors); process.exit(1); }
  if (args.has("--check")) {
    const p = join(OUT, "model.glb");
    if (!existsSync(p)) { console.error("no packaged model.glb to check against"); process.exit(1); }
    const same = readFileSync(p).equals(t.glb) && buildTwin().glb.equals(t.glb);
    console.log(same ? "check: rebuild is byte-identical to the packaged model.glb" : "check: DRIFT — rebuild differs from the packaged model.glb");
    process.exit(same ? 0 : 1);
  }
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "model.glb"), t.glb);
  writeFileSync(join(OUT, "twin-data.json"), JSON.stringify(t.data, null, 1) + "\n");
  writeFileSync(join(OUT, "site-register.csv"), t.csv);
  writeFileSync(join(OUT, "twin-report.json"), JSON.stringify(t.report, null, 2) + "\n");
  copyViewer();
  const v = t.report.validation;
  console.log(`site twin: ${(v.glbBytes / 1e6).toFixed(2)} MB · ${v.nodes} nodes · ${v.meshes} meshes · ${v.triangles} triangles → ${OUT}`);
  if (args.has("--zip") || args.has("--drive")) {
    const zip = join(ROOT, "dist-twin", "OTB_Site_Twin.zip");
    rmSync(zip, { force: true });
    execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${OUT}' -DestinationPath '${zip}' -Force`], { stdio: "inherit" });
    console.log("zip:", zip);
    if (args.has("--drive")) {
      mkdirSync(DRIVE, { recursive: true });
      copyFileSync(zip, join(DRIVE, "OTB_Site_Twin.zip")); copyFileSync(join(OUT, "twin-report.json"), join(DRIVE, "twin-report.json"));
      console.log("drive:", DRIVE);
    }
  }
}
