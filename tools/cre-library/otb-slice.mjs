/* Cypress Command Platform · CRE Asset Library — OTB reference slice (pure).

   Adapter, not a second property database: reads the repo's canonical records
   (src/data/geometry.json demising strings = recorded-plat transcription,
   src/data/heights.json = 2019 ALTA survey building heights (LiDAR-checked), src/data/pylon.json = operator
   panel register, src/data/units.public.json = public tenancy fields) and emits
   library exchange records (docs/design/cypress-command/cre-asset-library/
   schemas), deterministic SVG derivatives and a SEPARATE operations overlay.

   Rules carried from the library's source-of-truth.md:
   - geometry comes only from measured/transcribed sources — never the board;
   - tenancy/status never enters a geometry file; it binds by stable entity ID;
   - nothing is marked verified (no reviewer evidence exists yet).
   No IO here; tools/cre-library/build-otb-slice.mjs does the reading/writing. */
import { buildOverlay } from "../../src/lib/cre-library-view.js";

export const PROPERTY_ID = "on-the-boulevard";
export const SITE_ID = "site-otb-main";
export const SIGN_ID = "sign-otb-johnston-pylon";
export const BUILDINGS = {
  long: { id: "building-otb-long", key: "longBuilding", name: "Long building (101–133)" },
  short: { id: "building-otb-short", key: "shortBuilding", name: "Short building (135–149)" }
};
export const TOOL = "tools/cre-library/build-otb-slice.mjs";
export const TOOL_VERSION = "1.1.0";

/* Suite labels stay exact ("117.5", "135A"); only the lookup key is normalized
   so it satisfies the library ID pattern ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$. */
export function suiteId(label) {
  return "suite-otb-" + String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function panelId(key) {
  return `panel-otb-johnston-pylon-${String(key).toLowerCase()}`;
}

const ref = (s, locator) => ({ source_id: s.id, revision: s.revision, sha256: s.sha256, ...(locator ? { locator } : {}) });
const draft = (notes) => ({ state: "draft", notes });
const unverified = (notes) => ({ state: "unverified", notes });
const candidate = { state: "candidate" };
const r2 = (n) => Math.round(n * 100) / 100;

/* ── frontage bays in elevation order ─────────────────────────────────────────
   Viewer stands in the main field facing the storefronts. Long building: the
   plat string runs 133→101, Johnston (101) is on the viewer's LEFT, so reverse.
   Short building: 135 (Marie Antoinette end) is on the viewer's left. */
export function frontageBays(geometry, heights, which, heightsProv = null) {
  const b = geometry.demising[BUILDINGS[which].key];
  const bays = which === "long" ? [...b.bays].reverse() : [...b.bays];
  let x = 0;
  return bays.map(([label, widthFt, basisNote]) => {
    const heightFt = heights[label] ?? heights[label + "A"] ?? null;
    const bay = {
      label, x0Ft: r2(x), widthFt, heightFt,
      widthBasis: /^derived/i.test(basisNote) ? "derived" : /^operator/i.test(basisNote) ? "operator" : "plat",
      basisNote,
      entityIds: label === "135" ? [suiteId("135A")] : [suiteId(label)]
    };
    const facade = heightsProv?.units?.[label]?.facade;
    if (facade) bay.facadeFt = facade.survey_note_ft;
    if (label === "135") bay.note = `${widthFt} ft plat section split at mid-depth: the field face belongs to 135A; 135B is the Patricia half. Both suites front Marie Antoinette.`;
    x += widthFt;
    return bay;
  });
}

/* ── deterministic checks (feed geometry-validation.csv) ─────────────────── */
export function frontageChecks(geometry, heights, unitsPublic, heightsProv = null) {
  const out = [];
  for (const which of ["long", "short"]) {
    const b = geometry.demising[BUILDINGS[which].key];
    const sum = r2(b.bays.reduce((a, [, w]) => a + w, 0));
    out.push({
      check: `${which}-frontage-closure`, observed: sum, expected: b.lengthFt, unit: "ft",
      delta: r2(sum - b.lengthFt),
      result: Math.abs(sum - b.lengthFt) <= 0.05 ? "pass" : "fail",
      basis: "Sum of plat demising-string bay widths vs recorded building length in geometry.json. 0.05 ft = the 2-decimal rounding of the transcribed strings; a closure check, not a survey tolerance."
    });
  }
  const sf = Object.fromEntries(unitsPublic.map((u) => [u.unit, u.sf]));
  for (const which of ["long", "short"]) {
    const b = geometry.demising[BUILDINGS[which].key];
    for (const [label, w, note] of b.bays) {
      if (label === "135") continue; // 135A/135B split — compared in their own row below
      const footprint = r2(w * b.depthFt);
      out.push({
        check: `area-${label}`, observed: footprint, expected: sf[label] ?? null, unit: "sqft",
        delta: sf[label] == null ? null : r2(footprint - sf[label]),
        result: "not_applicable",
        basis: `Plat footprint (bay ${w} ft × depth ${b.depthFt} ft; ${note}) vs lease SF (units.public.json). Different measurement definitions — reported, never reconciled or averaged.`
      });
    }
  }
  if (heightsProv) {
    const conflicts = Object.entries(heightsProv.units).filter(([, r]) => r.status === "conflict").map(([u, r]) => `${u} (${r.note})`);
    out.push({
      check: "roofline-attestation", observed: conflicts.length, expected: 0, unit: "count", delta: conflicts.length,
      result: conflicts.length ? "unresolved" : "pass",
      basis: `2019 survey heights vs operator attestation (typical ${heightsProv.typical_ft} ft; 101/103/149 taller, 105 lower).` + (conflicts.length ? " Open: " + conflicts.join("; ") : "")
    });
  }
  return out;
}

export function joinChecks(unitsPublic, pylon, suiteRecords) {
  const ids = new Set(suiteRecords.map((s) => s.id));
  const missing = unitsPublic.filter((u) => !ids.has(suiteId(u.unit))).map((u) => u.unit);
  const orphanPanels = pylon.panels.filter((p) => p.unit && !ids.has(suiteId(p.unit))).map((p) => p.panel);
  return [
    { check: "units-to-suite-records", observed: unitsPublic.length - missing.length, expected: unitsPublic.length, unit: "count", delta: -missing.length, result: missing.length ? "fail" : "pass", basis: "Every units.public.json unit resolves to exactly one suite record by normalized lookup key." + (missing.length ? " Missing: " + missing.join(", ") : "") },
    { check: "pylon-panels-to-suites", observed: pylon.panels.length - orphanPanels.length, expected: pylon.panels.length, unit: "count", delta: -orphanPanels.length, result: orphanPanels.length ? "fail" : "pass", basis: "Every pylon.json panel→unit assignment resolves to a suite record." + (orphanPanels.length ? " Orphans: " + orphanPanels.join(", ") : "") }
  ];
}

/* ── library records ──────────────────────────────────────────────────────── */
export function sourceRecords(S) {
  const base = (s, extra) => ({ schema_version: "1.0.0", record_type: "source", id: s.id, name: s.name, location: { repository_path: s.path }, revision: s.revision, sha256: s.sha256, ...extra });
  return [
    base(S.geometry, { kind: "verified-property-data", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      owner: { party: "Belle Realty of Lafayette, LLC (operator: Orange Ocean, LLC)" },
      verification: unverified("Repo transcription of the recorded plat (Montagnet & Domingue 2019 ALTA survey + 2020 site plan; natives in reference/plats/) plus architect-CAD access layer. REV 15 (2026-09-30): every frontage is a plat string except the 131/133 split inside the 37.2' block. Foot definition not stated; recorded as ft.") }),
    base(S.heights, { kind: "verified-property-data", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      verification: unverified("Per-unit BUILDING HEIGHT labels from the 2019 ALTA survey (reference/plats/plat-of-survey-detailed-2019.pdf), operator-adopted 2026-09-30; heights exclude the facade (survey note, approx. 23.6'). Cross-checked by USGS 3DEP 2017 LiDAR in src/data/heights-provenance.json: every labelled step confirmed, LiDAR ~2 ft higher (parking-field datum).") }),
    base(S.survey, { kind: "survey-plat", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      owner: { party: "Montagnet & Domingue, Inc. (A. E. Montagnet, P.L.S. 4484) for Belle Realty of Lafayette, LLC" },
      verification: unverified("ALTA/ACSM survey, 5/20/1994 last rev. 7/19/2019. Governs boundary, block dimension strings (80.8' LOT 12, 108.00' end block) and building height labels. Foot definition not stated on the sheet. Tenant names on the sheet are historical.") }),
    base(S.siteplan, { kind: "survey-plat", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      owner: { party: "Montagnet & Domingue, Inc. (Boulev.dwg) for Belle Realty of Lafayette, LLC" },
      verification: unverified("2020 site plan (plot stamp Sep 29 2020): per-unit frontage strings for every suite. Label error: 113 printed 32.3' - CAD demising measures 30.79' and 30.8' closes the survey 80.8' block. Tenant names are historical.") }),
    base(S.cad, { kind: "cad", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      verification: unverified("Architect CAD (cleaned). Parent of heights.json and the geometry.json access layer; not a direct input to this slice. Drawing date/author/as-built status not recorded in the repo.") }),
    base(S.pylon, { kind: "operational-record", authority_domains: ["operations"],
      verification: unverified("Operator panel register (D-19b, 2026-09-17): panel order, nominal sizes and panel→unit assignment. Not a measured sign drawing — cabinet, posts, gaps and installed panel dimensions are unmeasured.") }),
    base(S.units, { kind: "operational-record", authority_domains: ["operations"],
      verification: unverified("Public-safe tenancy fields derived from the Tier-1 rent roll (units.json). Lease SF is a lease definition, not a measured footprint.") }),
    base(S.board, { kind: "generated-image", authority_domains: ["appearance"],
      verification: unverified("Cypress Command CRE asset library master board v1.0.0 (generated). Styling reference only; its streets, counts, tenants and geometry are fictional.") })
  ];
}

export function entityRecords({ S, geometry, unitsPublic, pylon, assetIds }) {
  const geo = ref(S.geometry);
  const recs = [];
  const suitesBy = { long: [], short: [] };
  const buildingOf = (label) => (/^1[34]/.test(label) && Number.parseFloat(label) >= 135 ? "short" : "long");
  for (const u of unitsPublic) {
    const which = buildingOf(u.unit);
    const b = geometry.demising[BUILDINGS[which].key];
    const bayLabel = /^135[AB]$/.test(u.unit) ? "135" : u.unit;
    const bay = b.bays.find(([l]) => l === bayLabel);
    const rec = {
      schema_version: "1.0.0", record_type: "suite", id: suiteId(u.unit), name: `Suite ${u.unit}`,
      verification: draft("Physical suite identity adapted from the canonical unit record; frontage from the plat transcription. Not reviewed."),
      source_refs: [geo], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "unit", entity_id: u.unit, record_location: { repository_path: "src/data/units.json" } }],
      property_id: PROPERTY_ID, building_id: BUILDINGS[which].id, suite_label: u.unit,
      asset_ids: [assetIds[which]]
    };
    if (bay && bayLabel !== "135") {
      rec.measurements = [{
        name: "storefront-frontage", value: bay[1], quantity: "length", unit: "ft",
        basis: bay[2].startsWith("derived") ? `Derived, not a plat dimension: ${bay[2]}` : bay[2].startsWith("operator") ? `Operator-confirmed suite line: ${bay[2]}` : `Recorded plat demising string (${bay[2]})`,
        source_refs: [ref(S.geometry, `demising.${BUILDINGS[which].key}.bays[${u.unit}]`)],
        verification: unverified("Transcribed; not field-verified.")
      }];
    }
    suitesBy[which].push(rec.id);
    recs.push(rec);
  }
  for (const which of ["long", "short"]) {
    recs.push({
      schema_version: "1.0.0", record_type: "building", id: BUILDINGS[which].id, name: BUILDINGS[which].name,
      verification: draft("Building identity from geometry.json demising key '" + BUILDINGS[which].key + "'."),
      source_refs: [geo], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "geometry-demising", entity_id: BUILDINGS[which].key, record_location: { repository_path: "src/data/geometry.json" } }],
      property_id: PROPERTY_ID, site_id: SITE_ID, suite_ids: suitesBy[which], asset_ids: [assetIds[which]]
    });
  }
  const panelIds = pylon.panels.map((p) => panelId(p.panel));
  for (const p of pylon.panels) {
    recs.push({
      schema_version: "1.0.0", record_type: "panel", id: panelId(p.panel), name: `Pylon panel ${p.panel}`,
      verification: draft(`Panel slot identity from the operator register. Nominal size ${p.size} ft (operator schedule, unmeasured). Content/tenant binding stays in pylon.json.`),
      source_refs: [ref(S.pylon, `panels[${p.panel}]`)], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "pylon-panel", entity_id: p.panel, record_location: { repository_path: "src/data/pylon.json" } }],
      property_id: PROPERTY_ID, sign_id: SIGN_ID, panel_key: p.panel, asset_ids: [assetIds.sign]
    });
  }
  recs.push({
    schema_version: "1.0.0", record_type: "sign", id: SIGN_ID, name: "Johnston St pylon sign",
    verification: draft(`Operator-confirmed pylon sign (2026-09-29); register name "${pylon.sign.name}".`),
    source_refs: [ref(S.pylon)], release: candidate,
    existing_operations_refs: [{ system: "otb-command", entity_type: "sign", entity_id: "pylon", record_location: { repository_path: "src/data/pylon.json" } }],
    property_id: PROPERTY_ID, site_id: SITE_ID, sign_type: "pylon", panel_ids: panelIds, asset_ids: [assetIds.sign]
  });
  recs.push({
    schema_version: "1.0.0", record_type: "site", id: SITE_ID, name: "On The Boulevard — main tract",
    verification: draft("Site container only; parcel boundary stays in geometry.json (boundary.mainTract). Remote Lot 7 not modelled in this slice."),
    source_refs: [geo], release: candidate,
    property_id: PROPERTY_ID, building_ids: [BUILDINGS.long.id, BUILDINGS.short.id], sign_ids: [SIGN_ID]
  });
  recs.push({
    schema_version: "1.0.0", record_type: "property", id: PROPERTY_ID, name: "On The Boulevard",
    verification: draft("First Cypress Command Platform reference property. Identity only; property facts stay in the repo's canonical records."),
    source_refs: [geo], release: candidate,
    existing_operations_refs: [{ system: "otb-command", entity_type: "property", entity_id: "otb" }],
    slug: PROPERTY_ID, site_ids: [SITE_ID], building_ids: [BUILDINGS.long.id, BUILDINGS.short.id],
    asset_ids: [assetIds.long, assetIds.short, assetIds.sign]
  });
  return recs;
}

export function assetRecords({ S, G, assetIds, files, pylon }) {
  const geo = [ref(S.geometry), ref(S.heights)];
  const recs = [];
  for (const which of ["long", "short"]) {
    const g = G[which];
    recs.push({
      schema_version: "1.0.0", record_type: "asset", id: assetIds[which], name: `${BUILDINGS[which].name} — storefront elevation (schematic)`,
      verification: unverified("Deterministic derivative of unverified transcribed sources. Bay widths and LiDAR roofline heights only; openings, awnings, columns and signage are NOT drawn because no measured source for them was used."),
      source_refs: geo, release: candidate, scope: "property", property_id: PROPERTY_ID,
      subject_refs: [{ record_type: "building", id: BUILDINGS[which].id }],
      asset_type: "elevation", representation: "styled-measured-2d",
      location: { repository_path: files[which].svgPath }, revision: "v1", sha256: files[which].svgSha,
      view: "front", theme: "neutral", style_reference_source_ids: [S.board.id],
      display_label: "DRAFT — schematic massing from plat strings + CAD heights; not field-verified",
      geometry: {
        geometry_id: g.geometry_id, mode: "derived-from-measurement", basis_kind: "verified-property-data",
        location: { repository_path: files[which].geomPath }, revision: "v1", sha256: files[which].geomSha,
        source_refs: geo, length_unit: "ft",
        coordinate_reference: {
          type: "local", identifier: `otb-${which}-frontage-elevation`, axis_order: ["x", "z"], handedness: "right-handed", units: "ft",
          origin: { coordinates: [0, 0], description: which === "long"
            ? "x = 0 at the Johnston-end wall of unit 101, increasing along the storefront toward Patricia; z = 0 at the datum of the 2019 survey building heights (not stated; LiDAR places it ~2 ft above the parking field)."
            : "x = 0 at the Marie Antoinette-end wall of the 135 section, increasing toward Arnould (149); z = 0 at the datum of the 2019 survey building heights (not stated; LiDAR places it ~2 ft above the parking field)." }
        },
        verification: unverified("Frontage closure checked against recorded building length; see geometry-validation.csv. Plat foot definition unresolved. Heights = 2019 survey labels, LiDAR-checked."),
        derivation: { method: "Cumulative sum of plat frontage strings (reversed for viewer-left) × per-unit 2019 survey building height; facade overlay from the survey note; no simplification.", tool: TOOL, tool_version: TOOL_VERSION, input_source_refs: geo }
      },
      render_derivation: { method: "SVG, 1 user unit = 1 ft, y = −z; theme via --cc-cre-* custom properties with light fallbacks.", tool: TOOL, tool_version: TOOL_VERSION, input_source_refs: [...geo, ref(S.board)], geometry_id: g.geometry_id }
    });
  }
  recs.push({
    schema_version: "1.0.0", record_type: "asset", id: assetIds.sign, name: "Johnston St pylon — directory sign vector render",
    verification: unverified(`Panel stack = operator schedule (${pylon.sign.schedule}), nominal feet. Cabinet, header and posts are illustrative proportions (no measured sign drawing in the repo). Tenant slots empty and editable.`),
    source_refs: [ref(S.pylon)], release: candidate, scope: "property", property_id: PROPERTY_ID,
    subject_refs: [{ record_type: "sign", id: SIGN_ID }, ...pylon.panels.map((p) => ({ record_type: "panel", id: panelId(p.panel) }))],
    asset_type: "signage", representation: "diagram",
    location: { repository_path: files.sign.svgPath }, revision: "v1", sha256: files.sign.svgSha,
    view: "front", theme: "neutral", style_reference_source_ids: [S.board.id],
    display_label: "DIRECTORY SIGN RENDER — nominal panels; cabinet/posts illustrative, not measured"
  });
  return recs;
}

/* ── derived geometry payloads (the canonical derivative the SVG renders) ── */
export function elevationGeometry(geometry, heights, which, heightsProv = null) {
  return {
    geometry_id: `geom-otb-${which}-frontage-elevation`,
    units: "ft", frame: `otb-${which}-frontage-elevation`, axis_order: ["x", "z"],
    building_id: BUILDINGS[which].id,
    recorded_length_ft: geometry.demising[BUILDINGS[which].key].lengthFt,
    depth_ft: geometry.demising[BUILDINGS[which].key].depthFt,
    bays: frontageBays(geometry, heights, which, heightsProv)
  };
}

/* ── SVG derivatives: geometry only, no tenancy, no script ────────────────────
   House style (operator 2026-09-29, shared/style-vocabulary.md):
   "Architectural Leasing Asset Illustration" — clean vector, orthographic front
   elevation, transparent background, muted beige/cream materials, crisp linework,
   subtle shadow only. Material colours are physical and do NOT invert in dark
   mode; annotation text follows the --cc-cre-* theme tokens. */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const MATERIAL = { wall: "#EFE6D2", wallShade: "#E2D6BC", line: "#6F6250", panel: "#FBF7EE", panelEdge: "#B9A57E", post: "#E8DEC8", header: "#D9C9A6", ink: "#3B342A" };
const SVG_STYLE = `
    .cc-mass{fill:${MATERIAL.wall}}
    .cc-roof{fill:none;stroke:${MATERIAL.line};stroke-width:1.4;vector-effect:non-scaling-stroke;stroke-linejoin:round}
    .cc-demise{stroke:${MATERIAL.line};stroke-width:.8;vector-effect:non-scaling-stroke;opacity:.75}
    .cc-demise--derived{stroke-dasharray:3 3}
    .cc-hit{fill:transparent;stroke:none}
    .cc-grade{stroke:${MATERIAL.line};stroke-width:1.6;vector-effect:non-scaling-stroke}
    .cc-face{fill:${MATERIAL.panel};stroke:${MATERIAL.panelEdge};stroke-width:1;vector-effect:non-scaling-stroke}
    .cc-cab{fill:${MATERIAL.post};stroke:${MATERIAL.line};stroke-width:1;vector-effect:non-scaling-stroke}
    .cc-head{fill:${MATERIAL.header};stroke:${MATERIAL.line};stroke-width:1;vector-effect:non-scaling-stroke}
    .cc-wordmark{fill:${MATERIAL.panel};font-family:var(--cc-cre-font-display,Besley,Georgia,serif);font-weight:700;letter-spacing:.04em}
    .cc-slot{fill:${MATERIAL.ink};font-family:var(--cc-cre-font-ui,Archivo,Arial,sans-serif)}
    .cc-dim{stroke:var(--cc-cre-text-muted,#5C554A);stroke-width:1;vector-effect:non-scaling-stroke;fill:none}
    .cc-label{fill:var(--cc-cre-text,#1E1B16);font-family:var(--cc-cre-font-meta,"Courier Prime",monospace)}
    .cc-muted{fill:var(--cc-cre-text-muted,#5C554A);font-family:var(--cc-cre-font-meta,"Courier Prime",monospace)}`;
const SHADOW = (id, d) => `<filter id="${id}" x="-5%" y="-5%" width="110%" height="120%"><feDropShadow dx="${d}" dy="${d}" stdDeviation="${d}" flood-color="#3B342A" flood-opacity=".16"/></filter>`;

export function elevationSvg(geom, title) {
  const maxH = Math.max(...geom.bays.map((b) => Math.max(b.heightFt ?? 0, b.facadeFt ?? 0)));
  const L = r2(geom.bays.reduce((a, b) => a + b.widthFt, 0));
  const pad = 6, top = maxH + 12, bottom = 11;
  const vb = [-pad, -top, L + pad * 2, top + bottom].map(r2).join(" ");
  /* skyline = the measured massing outline (bay widths × LiDAR rooflines) */
  let sky = "M0 0";
  for (const b of geom.bays) sky += ` V${r2(-(b.heightFt ?? 0))} H${r2(b.x0Ft + b.widthFt)}`;
  sky += " V0";
  const demises = geom.bays.slice(1).map((b, i) => {
    const prev = geom.bays[i];
    const derived = prev.widthBasis === "derived" && b.widthBasis === "derived";
    return `<line class="cc-demise${derived ? " cc-demise--derived" : ""}" x1="${b.x0Ft}" y1="0" x2="${b.x0Ft}" y2="${r2(-Math.min(prev.heightFt ?? 0, b.heightFt ?? 0))}"/>`;
  }).join("");
  const facades = geom.bays.filter((b) => b.facadeFt).map((b) =>
    `<g class="cc-facade"><title>${esc(`Facade ≈${b.facadeFt} ft (2019 survey note: building height excludes facade)`)}</title><path class="cc-roof cc-demise--derived" d="M${b.x0Ft} ${r2(-(b.heightFt ?? 0))} V${r2(-b.facadeFt)} H${r2(b.x0Ft + b.widthFt)} V${r2(-(b.heightFt ?? 0))}"/><text class="cc-muted" x="${r2(b.x0Ft + b.widthFt / 2)}" y="${r2(-b.facadeFt - 0.8)}" font-size="1.7" text-anchor="middle">facade ≈${b.facadeFt}′</text></g>`).join("");
  const g = geom.bays.map((b) => {
    const ids = b.entityIds.join(" ");
    const h = b.heightFt ?? 0;
    const cx = r2(b.x0Ft + b.widthFt / 2);
    return `  <g id="${esc(b.entityIds[0])}" class="cc-entity" data-entity-id="${esc(b.entityIds[0])}" data-entity-ids="${esc(ids)}" data-suite-label="${esc(b.label)}" data-width-basis="${b.widthBasis}">
    <title>${esc(`${b.label === "135" ? "135 section" : "Suite " + b.label} — frontage ${b.widthFt} ft (${b.widthBasis === "derived" ? "derived SF split" : b.widthBasis === "operator" ? "operator-confirmed line" : "plat"}) · building height ${h} ft (2019 survey)`)}</title>
    <rect class="cc-hit" x="${b.x0Ft}" y="${r2(-h)}" width="${b.widthFt}" height="${h}"/>
    <text class="cc-label" x="${cx}" y="4.2" font-size="2.6" text-anchor="middle">${esc(b.label === "135" ? "135A" : b.label)}</text>
    <text class="cc-muted" x="${cx}" y="7.6" font-size="1.7" text-anchor="middle">${esc(b.widthFt + "′ · " + h + "′h")}</text>
  </g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-labelledby="t d" data-geometry-id="${geom.geometry_id}" data-units="ft">
  <title id="t">${esc(title)}</title>
  <desc id="d">Architectural leasing elevation (orthographic, 1 unit = 1 ft). Massing = plat frontage strings × 2019 ALTA survey building heights (LiDAR-checked); dashed demising = derived split; dashed outline above a bay = facade (survey note ≈23.6′). Storefront glazing, canopy, columns and signage are not drawn (no measured source). Draft — not field-verified.</desc>
  <defs>${SHADOW("cc-shadow", 0.5)}</defs>
  <style>${SVG_STYLE}
  </style>
  <path class="cc-mass" filter="url(#cc-shadow)" d="${sky}"/>
  <g class="cc-demising">${demises}</g>
  <path class="cc-roof" d="${sky}"/>
  ${facades}
${g}
  <line class="cc-grade" x1="${-pad}" y1="0" x2="${r2(L + pad)}" y2="0"/>
  <g class="cc-dimstring">
    <path class="cc-dim" d="M0 ${r2(-maxH - 5)} H${L} M0 ${r2(-maxH - 6.5)} V${r2(-maxH - 3.5)} M${L} ${r2(-maxH - 6.5)} V${r2(-maxH - 3.5)}"/>
    <text class="cc-muted" x="${r2(L / 2)}" y="${r2(-maxH - 6.5)}" font-size="2" text-anchor="middle">${esc(`Σ bays ${L}′ · recorded length ${geom.recorded_length_ft}′`)}</text>
  </g>
</svg>
`;
}

export function signLayout(pylon) {
  /* Operator schedule: P1 2×8 full width, P2 4×8 full width, then P3–P14 as
     2×4 pairs, odd key left / even key right (same order as tools/pylon.py). */
  const nominal = (size) => size.split("x").map(Number); // "2x8" → [h 2, w 8]
  const cells = []; let y = 0; const pairs = [];
  for (const p of pylon.panels) {
    const [h, w] = nominal(p.size);
    if (w >= 8) { cells.push({ key: p.panel, x: 0, y, w, h, size: p.size }); y += h; }
    else pairs.push({ ...p, h, w });
  }
  for (let i = 0; i < pairs.length; i += 2) {
    const L = pairs[i], R = pairs[i + 1];
    cells.push({ key: L.panel, x: 0, y, w: L.w, h: L.h, size: L.size });
    if (R) cells.push({ key: R.panel, x: L.w, y, w: R.w, h: R.h, size: R.size });
    y += L.h;
  }
  return { cells, width: 8, height: y };
}

/* "Commercial Real Estate Directory Sign Vector Render". Panel stack = operator
   schedule (nominal ft). Cabinet, header and posts are ILLUSTRATIVE proportions
   from the operator's reference render — no measured sign drawing exists in the
   repo (Guidry Beazley PA1.01, 1999, is on Drive, unread). Every panel carries an
   empty editable tenant slot; tenancy binds by panel ID, never baked in. */
export const SIGN_FRAME = { post: 1.1, gutter: 0.25, headerH: 3.2, overhang: 0.7, capH: 0.9, base: 3.5, illustrative: true };
export function signSvg(pylon, title) {
  const { cells, width, height } = signLayout(pylon);
  const F = SIGN_FRAME, inset = 0.1;
  const x0 = -(F.gutter + F.post), x1 = width + F.gutter + F.post;
  const headTop = -(F.gutter + F.headerH), capTop = headTop - F.capH;
  const bottom = height + F.gutter + F.base;
  const body = cells.map((c) => {
    const w = r2(c.w - 2 * inset), h = r2(c.h - 2 * inset), fs = c.w >= 8 ? 0.62 : 0.42;
    return `  <g id="${panelId(c.key)}" class="cc-entity" data-entity-id="${panelId(c.key)}" data-panel-key="${c.key}" data-nominal-size="${c.size}">
    <title>${esc(`Panel ${c.key} — nominal ${c.size.replace("x", "′ × ")}′ (operator schedule)`)}</title>
    <rect class="cc-face" x="${r2(c.x + inset)}" y="${r2(c.y + inset)}" width="${w}" height="${h}" rx="0.06"/>
    <text class="cc-slot" data-slot="tenant" x="${r2(c.x + c.w / 2)}" y="${r2(c.y + c.h / 2 + fs * 0.35)}" font-size="${fs}" text-anchor="middle"></text>
    <text class="cc-muted" x="${r2(c.x + 0.28)}" y="${r2(c.y + 0.55)}" font-size="0.3">${c.key}</text>
  </g>`;
  }).join("\n");
  const vbX = r2(x0 - F.overhang - 1), vbY = r2(capTop - 1), vbW = r2(x1 - x0 + 2 * F.overhang + 2), vbH = r2(bottom - capTop + 2.4);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" role="img" aria-labelledby="t d" data-units="ft-nominal">
  <title id="t">${esc(title)}</title>
  <desc id="d">Directory sign vector render, front elevation. Panel sizes/order: operator schedule (src/data/pylon.json), nominal feet. Cabinet, header and posts are illustrative proportions, not measured. Tenant slots are empty and editable; content binds by panel ID.</desc>
  <defs>${SHADOW("cc-sshadow", 0.12)}</defs>
  <style>${SVG_STYLE}
  </style>
  <g class="cc-cabinet" data-illustrative="true" filter="url(#cc-sshadow)">
    <rect class="cc-cab" x="${r2(x0)}" y="${r2(-F.gutter)}" width="${F.post}" height="${r2(bottom + F.gutter)}"/>
    <rect class="cc-cab" x="${r2(width + F.gutter)}" y="${r2(-F.gutter)}" width="${F.post}" height="${r2(bottom + F.gutter)}"/>
    <rect class="cc-cab" x="${r2(-F.gutter)}" y="${r2(-F.gutter)}" width="${r2(width + 2 * F.gutter)}" height="${r2(height + 2 * F.gutter)}"/>
    <path class="cc-head" d="M${r2(x0 - F.overhang)} ${r2(headTop)} L${r2(x0)} ${r2(capTop)} H${r2(x1)} L${r2(x1 + F.overhang)} ${r2(headTop)} Z"/>
    <rect class="cc-head" x="${r2(x0 - F.overhang)}" y="${r2(headTop)}" width="${r2(x1 - x0 + 2 * F.overhang)}" height="${F.headerH}"/>
    <text class="cc-wordmark" x="${width / 2}" y="${r2(headTop + 1.15)}" font-size="0.85" text-anchor="middle">ON THE</text>
    <text class="cc-wordmark" x="${width / 2}" y="${r2(headTop + 2.55)}" font-size="1.35" text-anchor="middle">BOULEVARD</text>
  </g>
${body}
  <line class="cc-grade" x1="${r2(x0 - F.overhang - 0.5)}" y1="${r2(bottom)}" x2="${r2(x1 + F.overhang + 0.5)}" y2="${r2(bottom)}"/>
  <text class="cc-muted" x="${width / 2}" y="${r2(bottom + 1.2)}" font-size="0.32" text-anchor="middle">${esc(pylon.sign.schedule)} · nominal ft · cabinet/posts illustrative</text>
</svg>
`;
}

/* ── site register → library layers ("commercial site plan vectorization") ── */
export const SITE_CATEGORY = {
  column: ["other", "Walkway columns"], can: ["other", "Trash cans"], bench: ["other", "Benches"],
  tree: ["landscaping", "Trees"], ada: ["parking", "ADA stalls"], fence: ["other", "Fences"], walk: ["other", "Covered walkways"],
  sign: ["signage", "Signs"], lighting: ["lighting", "Site lighting"], firewall: ["other", "Fire-rated walls"],
  rtu: ["hvac", "Rooftop HVAC"], "ground-hp": ["hvac", "Ground heat pumps"],
  panel: ["utilities", "Electrical panels"], timeclock: ["utilities", "Lighting time clocks"], "meter-cluster": ["utilities", "City water meter clusters"],
  shutoff: ["utilities", "Tenant water shut-offs"], transformer: ["utilities", "Transformers"], pole: ["utilities", "Utility poles"],
  bollard: ["utilities", "Bollards"], "lus-point": ["utilities", "LUS public water structures"], "lus-main": ["utilities", "LUS public water mains"]
};
/* Taxonomy: "controlled visibility for sensitive infrastructure". */
export const SENSITIVE = new Set(["panel", "timeclock", "meter-cluster", "shutoff", "transformer", "pole", "lus-point", "lus-main", "firewall"]);
export const siteItemId = (registerId) => "asset-otb-" + String(registerId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* Strip money from free text (site-register rtu 'sub' embeds HVAC repair/replace caps). */
export function sanitizeNote(text) {
  if (!text) return null;
  const kept = String(text).split(/\s*·\s*/).filter((part) => !/\$|\bcaps?\b|cost/i.test(part));
  return kept.length ? kept.join(" · ") : null;
}
export function siteLayers(register, unitIds) {
  const layers = {}, aliases = [];
  for (const it of register.items) {
    const [assetType, title] = SITE_CATEGORY[it.cat] || ["other", it.cat];
    const lib = siteItemId(it.id);
    const feat = {
      id: lib, register_id: it.id, cat: it.cat, label: it.label, status: it.status, source: it.source,
      note: sanitizeNote(it.sub), count: it.count ?? null,
      suite_entity_id: it.unit && unitIds.has(suiteId(it.unit)) ? suiteId(it.unit) : null,
      ...(it.point ? { point: it.point } : {}), ...(it.line ? { line: it.line } : {}), ...(it.polys ? { polys: it.polys } : {})
    };
    (layers[it.cat] ||= { cat: it.cat, title, asset_type: assetType, sensitive: SENSITIVE.has(it.cat), features: [] }).features.push(feat);
    aliases.push({ register_id: it.id, library_id: lib, cat: it.cat, suite_entity_id: feat.suite_entity_id });
  }
  return { layers, aliases };
}

/* Orthographic site plan in the A-1 plan frame (px; the frame site-register points
   are digitized in). Suites = geometry.json units rects; register items are
   per-layer symbols. Item positions are digitized from drawings, NOT surveyed. */
export function sitePlanSvg(geometry, layers, title) {
  const U = Object.entries(geometry.units);
  const pts = [];
  for (const [, r] of U) pts.push([r.x, r.y], [r.x + r.w, r.y + r.h]);
  for (const l of Object.values(layers)) for (const f of l.features) {
    if (f.point) pts.push(f.point);
    for (const p of f.line || []) pts.push(p);
    for (const poly of f.polys || []) for (const p of poly) pts.push(p);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = 30, minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const W = Math.max(...xs) + pad - minX, H = Math.max(...ys) + pad - minY;
  const suites = U.map(([unit, r]) => {
    const id = suiteId(unit);
    return `  <g id="plan-${id}" class="cc-entity" data-entity-id="${id}" data-suite-label="${esc(unit)}">
    <title>${esc(`Suite ${unit}`)}</title>
    <rect class="cc-plan-suite" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>
    <text class="cc-label" x="${r2(r.x + r.w / 2)}" y="${r2(r.y + r.h / 2 + 4)}" font-size="${r.w < 40 ? 9 : 12}" text-anchor="middle">${esc(unit)}</text>
  </g>`;
  }).join("\n");
  const sym = (f, cat) => {
    const t = `<title>${esc(`${SITE_CATEGORY[cat]?.[1] || cat} · ${f.register_id}`)}</title>`; // labels can name tenants — kept in data, not geometry
    const open = `<g id="${f.id}" class="cc-item cc-cat-${cat}" data-item-id="${f.id}">${t}`;
    if (f.polys) return `${open}${f.polys.map((poly) => `<polygon points="${poly.map((p) => p.join(",")).join(" ")}"/>`).join("")}</g>`;
    if (f.line) return `${open}<polyline points="${f.line.map((p) => p.join(",")).join(" ")}"/></g>`;
    if (f.point) return `${open}<circle cx="${f.point[0]}" cy="${f.point[1]}" r="${cat === "tree" ? 7 : 4}"/></g>`;
    return "";
  };
  const drawable = Object.values(layers).filter((l) => l.features.some((f) => f.point || f.line || f.polys));
  const walks = drawable.filter((l) => l.cat === "walk"), rest = drawable.filter((l) => l.cat !== "walk");
  const layerG = (l) => `  <g class="cc-layer" data-layer="${l.cat}" data-sensitive="${l.sensitive}">${l.features.map((f) => sym(f, l.cat)).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(minX)} ${r2(minY)} ${r2(W)} ${r2(H)}" role="img" aria-labelledby="t d" data-units="a1-plan-px">
  <title id="t">${esc(title)}</title>
  <desc id="d">Commercial site plan vectorization in the A-1 plan frame. Suite footprints from the recorded-plat transcription (geometry.json); site items from the digitized site register (positions digitized from drawings, NOT surveyed). Utility layers are marked sensitive.</desc>
  <style>${SVG_STYLE}
    .cc-plan-suite{fill:${MATERIAL.wall};stroke:${MATERIAL.line};stroke-width:1;vector-effect:non-scaling-stroke}
    .cc-item{fill:#fff;stroke-width:1.4;vector-effect:non-scaling-stroke}
    .cc-item polyline,.cc-item polygon{fill:none}
    .cc-cat-walk polygon{fill:${MATERIAL.wallShade};fill-opacity:.55;stroke:${MATERIAL.line};stroke-opacity:.5}
    .cc-cat-tree{fill:#9DB08A;fill-opacity:.7;stroke:#5E7250}
    .cc-cat-rtu,.cc-cat-ground-hp{fill:#C9CED0;stroke:#5F6A6E}
    .cc-cat-lighting{fill:#F2D58A;stroke:#8A6D1E}
    .cc-cat-ada{fill:#7FA6C9;stroke:#2F5877}
    .cc-cat-sign{fill:${MATERIAL.header};stroke:${MATERIAL.line}}
    .cc-cat-column,.cc-cat-bench,.cc-cat-can{fill:${MATERIAL.post};stroke:${MATERIAL.line}}
    .cc-cat-fence polyline,.cc-cat-firewall polyline{stroke:${MATERIAL.line};stroke-dasharray:4 3}
    .cc-cat-lus-point,.cc-cat-meter-cluster,.cc-cat-shutoff,.cc-cat-panel,.cc-cat-timeclock,.cc-cat-transformer,.cc-cat-pole,.cc-cat-bollard{fill:#D8CFE0;stroke:#5B4C6E}
    .cc-cat-lus-main polyline{stroke:#5B4C6E;stroke-dasharray:6 3}
  </style>
${walks.map(layerG).join("\n")}
${suites}
${rest.map(layerG).join("\n")}
</svg>
`;
}

/* ── operations overlay: SEPARATE layer, bound only by entity ID ──────────
   Same function the app sheet uses on live unit records (single source). */
export function pylonPanels(pylon) {
  return pylon.panels.map((p) => ({ entity_id: panelId(p.panel), key: p.panel, unit: p.unit || null, physicalReads: p.physicalReads || null, note: p.note || null }));
}
export function opsOverlay(unitsPublic, pylon, S) {
  return {
    _comment: "Operations overlay snapshot for the standalone preview. Bound to geometry by entity ID only; the app sheet rebuilds it from live unit records.",
    sources: [ref(S.units), ref(S.pylon)], ...buildOverlay(unitsPublic, pylonPanels(pylon))
  };
}

/* ── site register records: one source + one layer asset per category + plan ── */
export function siteRecords({ S, layers, files, suiteIds }) {
  const src = {
    schema_version: "1.0.0", record_type: "source", id: S.register.id, name: S.register.name, kind: "operational-record",
    authority_domains: ["operations", "context"], location: { repository_path: S.register.path }, revision: S.register.revision, sha256: S.register.sha256,
    verification: unverified("Digitized site register (tools/digitize-site-sources.py): 270 items positioned from drawings/photos via anchor fits (RMS up to 17 px), NOT surveyed. Operational identity and context only — no geometry authority.")
  };
  const assets = Object.values(layers).map((l) => {
    const suites = [...new Set(l.features.map((f) => f.suite_entity_id).filter(Boolean))].filter((id) => suiteIds.has(id));
    return {
      schema_version: "1.0.0", record_type: "asset", id: `asset-otb-site-layer-${l.cat}`, name: `Site layer — ${l.title}`,
      verification: unverified(`${l.features.length} register item(s); positions digitized, not surveyed.${l.sensitive ? " Sensitive infrastructure: operator-only visibility." : ""}${l.cat === "rtu" ? " Cost caps stripped from notes." : ""}`),
      source_refs: [ref(S.register)], release: candidate, scope: "property", property_id: PROPERTY_ID,
      subject_refs: [{ record_type: "site", id: SITE_ID }, ...suites.map((id) => ({ record_type: "suite", id }))],
      asset_type: l.asset_type, representation: "diagram",
      location: { repository_path: files.layers[l.cat].path }, revision: "v1", sha256: files.layers[l.cat].sha,
      view: "plan", theme: "neutral", display_label: `${l.title} — digitized positions, not surveyed`
    };
  });
  assets.push({
    schema_version: "1.0.0", record_type: "asset", id: "asset-otb-site-plan", name: "On The Boulevard — site plan vectorization",
    verification: unverified("Suite footprints from the plat transcription (geometry.json units, A-1 frame); site items from the digitized register. Leasing-map diagram, not a survey."),
    source_refs: [ref(S.geometry), ref(S.register)], release: candidate, scope: "property", property_id: PROPERTY_ID,
    subject_refs: [{ record_type: "site", id: SITE_ID }, ...[...suiteIds].map((id) => ({ record_type: "suite", id }))],
    asset_type: "site-plan", representation: "diagram",
    location: { repository_path: files.plan.path }, revision: "v1", sha256: files.plan.sha,
    view: "plan", theme: "neutral", style_reference_source_ids: [S.board.id],
    display_label: "LEASING MAP — plat footprints + digitized site items; not surveyed"
  });
  return [src, ...assets];
}
